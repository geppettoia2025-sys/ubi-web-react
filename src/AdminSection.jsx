import { useEffect, useRef, useState } from "react";
import { db, storage } from "./firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

export default function AdminSection({ onBusinessesUpdated, onEventsUpdated }) {
  // Estado del formulario
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    city: "Brandsen",
    whatsapp: "",
    lat: "",
    lng: "",
    isActive: true,
    supportsRaffle: false,
    images: [],
  });

  // Estados para feedback y lista
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" o "error"
  const [businesses, setBusinesses] = useState([]);
  const [showList, setShowList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState(false);
  const [editingBusinessId, setEditingBusinessId] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [events, setEvents] = useState([]);
  const [showEventList, setShowEventList] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [selectedEventImageFile, setSelectedEventImageFile] = useState(null);
  const [eventImagePreviewUrl, setEventImagePreviewUrl] = useState("");
  const [eventFormData, setEventFormData] = useState({
    title: "",
    description: "",
    category: "cultura",
    images: [],
  });
  const uploadBusinessIdRef = useRef(null);
  const uploadEventIdRef = useRef(null);

  const getSafeImages = (images) =>
    Array.isArray(images) ? images.filter((image) => typeof image === "string" && image.trim()) : [];

  // Cargar comercios existentes
  const loadBusinesses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "businesses"));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBusinesses(data);
      setShowList(true);
    } catch (error) {
      console.error("Error cargando comercios:", error);
      setMessage("Error al cargar comercios");
      setMessageType("error");
    }
  };

  const loadEvents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "events"));
      const data = querySnapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
      }));
      setEvents(data);
      setShowEventList(true);
    } catch (error) {
      console.error("Error cargando eventos:", error);
      setMessage("Error al cargar eventos");
      setMessageType("error");
    }
  };

  // Manejar cambios en inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEventInputChange = (e) => {
    const { name, value } = e.target;
    setEventFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = async (file) => {
    if (!file) {
      return null;
    }

    const businessId = uploadBusinessIdRef.current;
    if (!businessId) {
      throw new Error("No se pudo determinar el ID del comercio para la imagen");
    }

    const storagePath = `businesses/${businessId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleEventImageUpload = async (file) => {
    if (!file) {
      return null;
    }

    const eventId = uploadEventIdRef.current;
    if (!eventId) {
      throw new Error("No se pudo determinar el ID del evento para la imagen");
    }

    const storagePath = `events/${eventId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("El archivo seleccionado no es una imagen válida");
      setMessageType("error");
      e.target.value = "";
      return;
    }

    // Liberar la URL anterior para evitar memory leaks
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleEventImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("El archivo seleccionado no es una imagen válida");
      setMessageType("error");
      e.target.value = "";
      return;
    }

    if (eventImagePreviewUrl) {
      URL.revokeObjectURL(eventImagePreviewUrl);
    }

    setSelectedEventImageFile(file);
    setEventImagePreviewUrl(URL.createObjectURL(file));
  };

  // Liberar memoria del preview si el componente se desmonta
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      if (eventImagePreviewUrl) {
        URL.revokeObjectURL(eventImagePreviewUrl);
      }
    };
  }, [imagePreviewUrl, eventImagePreviewUrl]);

  const validateEventForm = () => {
    if (!eventFormData.title.trim()) {
      setMessage("El título del evento es requerido");
      setMessageType("error");
      return false;
    }

    if (!eventFormData.category.trim()) {
      setMessage("La categoría del evento es requerida");
      setMessageType("error");
      return false;
    }

    return true;
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!validateEventForm()) {
      return;
    }

    setLoading(true);

    try {
      const newEventRef = isEditingEvent ? null : doc(collection(db, "events"));
      const targetEventId = isEditingEvent ? editingEventId : newEventRef.id;
      uploadEventIdRef.current = targetEventId;

      const safeImages = getSafeImages(eventFormData.images);
      let nextImages = [...safeImages];
      if (selectedEventImageFile) {
        const uploadedImageUrl = await handleEventImageUpload(selectedEventImageFile);
        if (uploadedImageUrl) {
          nextImages.push(uploadedImageUrl);
        }
      }

      const eventData = {
        title: eventFormData.title.trim(),
        description: eventFormData.description.trim(),
        category: eventFormData.category.trim().toLowerCase(),
        images: getSafeImages(nextImages),
      };

      if (isEditingEvent) {
        await updateDoc(doc(db, "events", editingEventId), eventData);
        setMessage("✅ Evento actualizado correctamente");
      } else {
        await setDoc(newEventRef, {
          ...eventData,
          createdAt: serverTimestamp(),
        });
        setMessage("✅ Evento agregado correctamente");
      }

      setMessageType("success");
      setEventFormData({
        title: "",
        description: "",
        category: "cultura",
        images: [],
      });
      setIsEditingEvent(false);
      setEditingEventId(null);
      setSelectedEventImageFile(null);
      if (eventImagePreviewUrl) {
        URL.revokeObjectURL(eventImagePreviewUrl);
      }
      setEventImagePreviewUrl("");
      uploadEventIdRef.current = null;

      if (showEventList) {
        loadEvents();
      }

      if (onEventsUpdated) {
        await onEventsUpdated({
          type: "upsert",
          event: {
            id: targetEventId,
            ...eventData,
          },
        });
      }

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error guardando evento:", error);
      setMessage("❌ Error al guardar el evento");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (eventItem) => {
    setEventFormData({
      title: eventItem.title ?? "",
      description: eventItem.description ?? "",
      category: eventItem.category ?? "cultura",
      images: getSafeImages(eventItem.images),
    });
    setSelectedEventImageFile(null);
    if (eventImagePreviewUrl) {
      URL.revokeObjectURL(eventImagePreviewUrl);
    }
    setEventImagePreviewUrl("");
    setIsEditingEvent(true);
    setEditingEventId(eventItem.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este evento?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "events", id));
      setMessage("✅ Evento eliminado");
      setMessageType("success");
      loadEvents();

      if (onEventsUpdated) {
        await onEventsUpdated({ type: "delete", id });
      }

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error eliminando evento:", error);
      setMessage("❌ Error al eliminar el evento");
      setMessageType("error");
    }
  };

  // Validar formulario
  const validateForm = () => {
    // Campos requeridos
    if (!formData.name.trim()) {
      setMessage("El nombre es requerido");
      setMessageType("error");
      return false;
    }
    if (!formData.address.trim()) {
      setMessage("La dirección es requerida");
      setMessageType("error");
      return false;
    }
    if (!formData.description.trim()) {
      setMessage("La descripción es requerida");
      setMessageType("error");
      return false;
    }
    const normalizedCity = String(formData.city ?? "").trim();
    if (!normalizedCity) {
      setFormData(prev => ({ ...prev, city: "Brandsen" }));
    }

    // Validar teléfono (solo números)
    if (formData.whatsapp && !/^\d+$/.test(formData.whatsapp.replace(/[\s\-]/g, ""))) {
      setMessage("El teléfono debe contener solo números");
      setMessageType("error");
      return false;
    }

    // Validar coordenadas (si están presentes)
    if (formData.lat && isNaN(parseFloat(formData.lat))) {
      setMessage("La latitud debe ser un número");
      setMessageType("error");
      return false;
    }
    if (formData.lng && isNaN(parseFloat(formData.lng))) {
      setMessage("La longitud debe ser un número");
      setMessageType("error");
      return false;
    }

    return true;
  };

  // Agregar comercio a Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setRecentlyUpdated(false);

    // Validar
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const newBusinessRef = isEditing ? null : doc(collection(db, "businesses"));
      const targetBusinessId = isEditing ? editingBusinessId : newBusinessRef.id;
      uploadBusinessIdRef.current = targetBusinessId;
      const supportsRaffleValue = !!formData.supportsRaffle;

      const safeImages = getSafeImages(formData.images);
      let nextImages = [...safeImages];
      if (selectedImageFile) {
        const uploadedImageUrl = await handleImageUpload(selectedImageFile);
        if (uploadedImageUrl) {
          nextImages.push(uploadedImageUrl);
        }
      }

      // Preparar datos
      const businessData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        description: formData.description.trim(),
        city: String(formData.city ?? "").trim() || "Brandsen",
        whatsapp: formData.whatsapp.trim(),
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        isActive: formData.isActive,
        supportsRaffle: supportsRaffleValue,
        images: getSafeImages(nextImages),
      };

      if (isEditing) {
        // Actualizar en Firestore
        await updateDoc(doc(db, "businesses", editingBusinessId), {
          ...businessData,
          "offers.supportsRaffle": supportsRaffleValue,
        });
        setRecentlyUpdated(true);
        setMessage("✅ Comercio actualizado correctamente");
      } else {
        // Agregar a Firestore
        await setDoc(newBusinessRef, {
          ...businessData,
          offers: { supportsRaffle: supportsRaffleValue },
          createdAt: new Date(),
        });
        setRecentlyUpdated(false);
        console.log("Comercio creado con ID:", targetBusinessId);
        setMessage("✅ Comercio agregado correctamente");
      }
      setMessageType("success");

      // Limpiar formulario y estados de edición
      setFormData({
        name: "",
        address: "",
        description: "",
        city: "Brandsen",
        whatsapp: "",
        lat: "",
        lng: "",
        isActive: true,
        supportsRaffle: false,
        images: [],
      });
      setIsEditing(false);
      setEditingBusinessId(null);
      setSelectedImageFile(null);
      setImagePreviewUrl("");
      uploadBusinessIdRef.current = null;

      // Recargar lista si está visible
      if (showList) {
        loadBusinesses();
      }

      if (onBusinessesUpdated) {
        await onBusinessesUpdated();
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error agregando comercio:", error);
      setMessage("❌ Error al guardar el comercio");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Editar comercio
  const handleEdit = (business) => {
    setFormData({
      name: business.name ?? "",
      address: business.address ?? "",
      description: business.description ?? "",
      city: String(business.city ?? "").trim() || String(business.ciudad ?? "").trim() || "Brandsen",
      whatsapp: business.whatsapp ?? "",
      lat: business.lat != null ? String(business.lat) : "",
      lng: business.lng != null ? String(business.lng) : "",
      isActive: business.isActive !== false,
      supportsRaffle: business.supportsRaffle ?? business.offers?.supportsRaffle ?? false,
      images: getSafeImages(business.images),
    });
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setRecentlyUpdated(false);
    setIsEditing(true);
    setEditingBusinessId(business.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleValidateAddress = async () => {
    if (!formData.address.trim()) {
      setMessage("Ingresa una dirección para validar");
      setMessageType("error");
      return;
    }

    const query = `${formData.address.trim()}, ${formData.city.trim()}, Buenos Aires, Argentina`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      setMessage("🔍 Buscando coordenadas...");
      setMessageType("");

      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "es" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      if (!data.length) {
        setMessage("❌ No se encontraron coordenadas para esa dirección");
        setMessageType("error");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      const { lat, lon } = data[0];
      setFormData(prev => ({ ...prev, lat: String(parseFloat(lat).toFixed(6)), lng: String(parseFloat(lon).toFixed(6)) }));
      setMessage(`✅ Dirección válida — coordenadas cargadas correctamente`);
      setMessageType("success");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        setMessage("❌ La búsqueda tardó demasiado. Intentá de nuevo.");
      } else {
        setMessage("❌ Error al buscar coordenadas. Intentá de nuevo.");
      }
      setMessageType("error");
      console.error("Error obteniendo coordenadas:", error);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Eliminar comercio
  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este comercio?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "businesses", id));
      setMessage("✅ Comercio eliminado");
      setMessageType("success");
      loadBusinesses();
      if (onBusinessesUpdated) {
        await onBusinessesUpdated();
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error eliminando comercio:", error);
      setMessage("❌ Error al eliminar el comercio");
      setMessageType("error");
    }
  };

  return (
    <section className="admin-section">
      <div className="admin-container">
        <h2>Administrador de Comercios</h2>

        {/* Mensaje de feedback */}
        {message && (
          <div className={`admin-message admin-message-${messageType}`}>
            {message}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={`admin-form${isEditing ? " admin-form--editing" : ""}`}>
          {isEditing && (
            <p className="edit-mode-banner">✏️ Editando comercio — completá los cambios y guardá</p>
          )}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Nombre del comercio *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="ej: Almacén La Tienda"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="city">Ciudad *</label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="Brandsen">Brandsen</option>
                <option value="San Vicente">San Vicente</option>
                <option value="La Plata">La Plata</option>
                <option value="Jeppener">Jeppener</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Dirección *</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="ej: Calle Principal 123"
              disabled={loading}
            />
            <button
              type="button"
              className="btn-validate-address"
              onClick={handleValidateAddress}
              disabled={loading}
            >
              📍 Validar dirección
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descripción *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="ej: Productos de limpieza, alimentos, etc."
              rows="3"
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="whatsapp">WhatsApp</label>
              <input
                type="text"
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleInputChange}
                placeholder="ej: 5492231234567"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="lat">Latitud (opcional)</label>
              <input
                type="number"
                id="lat"
                name="lat"
                value={formData.lat}
                onChange={handleInputChange}
                placeholder="ej: -35.1698"
                step="0.0001"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lng">Longitud (opcional)</label>
              <input
                type="number"
                id="lng"
                name="lng"
                value={formData.lng}
                onChange={handleInputChange}
                placeholder="ej: -58.2339"
                step="0.0001"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group form-group--checkbox">
            <label htmlFor="isActive">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                disabled={loading}
              />
              {" "}Activo
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.supportsRaffle}
                onChange={(e) =>
                  setFormData({ ...formData, supportsRaffle: e.target.checked })
                }
              />
              🎁 Donante del sorteo
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="businessImage">Imagen del comercio</label>
            <input
              type="file"
              id="businessImage"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
            />
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Vista previa"
                style={{ width: "100%", maxWidth: "280px", marginTop: "10px", borderRadius: "12px", border: "2px solid rgba(255,255,255,0.2)" }}
              />
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "⏳ Guardando..." : isEditing ? "Actualizar comercio" : recentlyUpdated ? "✅ Comercio actualizado" : "✅ Agregar Comercio"}
            </button>
            {isEditing && (
              <button
                type="button"
                className="btn-cancel"
                disabled={loading}
                onClick={() => {
                  setIsEditing(false);
                  setRecentlyUpdated(false);
                  setEditingBusinessId(null);
                  setSelectedImageFile(null);
                  setImagePreviewUrl("");
                  setFormData({ name: "", address: "", description: "", city: "Brandsen", whatsapp: "", lat: "", lng: "", isActive: true, supportsRaffle: false, images: [] });
                }}
              >
                ✖ Cancelar edición
              </button>
            )}
          </div>
        </form>

        {/* Botón para ver/ocultar lista */}
        <button
          className="btn-toggle-list"
          onClick={() => {
            if (showList) {
              setShowList(false);
            } else {
              loadBusinesses();
              setShowList(true);
            }
          }}
        >
          {showList ? "Ocultar lista" : "Ver comercios existentes"}
        </button>

        {/* Lista de comercios */}
        {showList && (
          <div className="admin-list">
            <h3>Comercios existentes ({businesses.length})</h3>
            {businesses.length === 0 ? (
              <p className="no-businesses">No hay comercios agregados aún</p>
            ) : (
              <div className="businesses-table">
                {businesses.map(business => (
                  <div key={business.id} className="business-row">
                    <div className="business-info">
                      <h4>{business.name}</h4>
                      <p><strong>Ciudad:</strong> {business.city}</p>
                      <p><strong>Dirección:</strong> {business.address}</p>
                    </div>
                    <div className="business-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(business)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(business.id)}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleEventSubmit} className={`admin-form${isEditingEvent ? " admin-form--editing" : ""}`}>
          {isEditingEvent && (
            <p className="edit-mode-banner">✏️ Editando evento — completá los cambios y guardá</p>
          )}

          <h3 style={{ marginBottom: "16px", color: "#ff8c1a" }}>Administrador de Eventos</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="eventTitle">Título del evento *</label>
              <input
                type="text"
                id="eventTitle"
                name="title"
                value={eventFormData.title}
                onChange={handleEventInputChange}
                placeholder="ej: Feria gastronómica"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="eventCategory">Categoría *</label>
              <select
                id="eventCategory"
                name="category"
                value={eventFormData.category}
                onChange={handleEventInputChange}
                disabled={loading}
              >
                <option value="municipalidad">municipalidad</option>
                <option value="instituciones">instituciones</option>
                <option value="cultura">cultura</option>
                <option value="bandas">bandas</option>
                <option value="iglesias">iglesias</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="eventDescription">Descripción</label>
            <textarea
              id="eventDescription"
              name="description"
              value={eventFormData.description}
              onChange={handleEventInputChange}
              placeholder="ej: Música en vivo, patio gastronómico y actividades"
              rows="3"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="eventImage">Imagen del evento</label>
            <input
              type="file"
              id="eventImage"
              accept="image/*"
              onChange={handleEventImageChange}
              disabled={loading}
            />
            {eventImagePreviewUrl && (
              <img
                src={eventImagePreviewUrl}
                alt="Vista previa del evento"
                style={{ width: "100%", maxWidth: "280px", marginTop: "10px", borderRadius: "12px", border: "2px solid rgba(255,255,255,0.2)" }}
              />
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "⏳ Guardando..." : isEditingEvent ? "Actualizar evento" : "✅ Agregar Evento"}
            </button>
            {isEditingEvent && (
              <button
                type="button"
                className="btn-cancel"
                disabled={loading}
                onClick={() => {
                  setIsEditingEvent(false);
                  setEditingEventId(null);
                  setSelectedEventImageFile(null);
                  if (eventImagePreviewUrl) {
                    URL.revokeObjectURL(eventImagePreviewUrl);
                  }
                  setEventImagePreviewUrl("");
                  setEventFormData({ title: "", description: "", category: "cultura", images: [] });
                }}
              >
                ✖ Cancelar edición
              </button>
            )}
          </div>
        </form>

        <button
          className="btn-toggle-list"
          onClick={() => {
            if (showEventList) {
              setShowEventList(false);
            } else {
              loadEvents();
              setShowEventList(true);
            }
          }}
        >
          {showEventList ? "Ocultar eventos" : "Ver eventos existentes"}
        </button>

        {showEventList && (
          <div className="admin-list">
            <h3>Eventos existentes ({events.length})</h3>
            {events.length === 0 ? (
              <p className="no-businesses">No hay eventos agregados aún</p>
            ) : (
              <div className="businesses-table">
                {events.map((eventItem) => (
                  <div key={eventItem.id} className="business-row">
                    <div className="business-info">
                      <h4>{eventItem.title}</h4>
                      <p><strong>Categoría:</strong> {eventItem.category}</p>
                      {eventItem.description && <p><strong>Descripción:</strong> {eventItem.description}</p>}
                    </div>
                    <div className="business-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditEvent(eventItem)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteEvent(eventItem.id)}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
