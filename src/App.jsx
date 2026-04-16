import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
console.log("ESTE ES EL APP NUEVO");
import "./App.css";
import AdminSection from "./AdminSection";
import MapBackground from "./components/MapBackground";
import MapSection from "./components/MapSection";

function App() {
   const [businesses, setBusinesses] = useState([]);
  const [events, setEvents] = useState([]);
   const [search, setSearch] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState(null);
   const [selectedCity, setSelectedCity] = useState("all");
   const [adminAuthenticated, setAdminAuthenticated] = useState(false);
   const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("danyricoart@gmail.com");
   const [passwordInput, setPasswordInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const carouselRef = useRef(null);
  const hasScrolledToHashRef = useRef(false);
  const lastHashRef = useRef("");
  const carouselRepeatCount = 6;

  const fetchBusinesses = async () => {
    const querySnapshot = await getDocs(collection(db, "businesses"));

    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log("COMERCIOS COMPLETOS:", data);

    // Debug: Mostrar estructura de un comercio
    if (data.length > 0) {
      console.log("Estructura de primer comercio:", data[0]);
      console.log("Campo whatsapp del primer comercio:", data[0].whatsapp);
      console.log("Campo ciudad del primer comercio:", data[0].ciudad || data[0].city);
      console.log("Todas las ciudades en los datos:", data.map(b => ({
        name: b.name,
        ciudad: b.ciudad,
        city: b.city,
        cityValue: b.ciudad || b.city
      })));
    }

    setBusinesses(data);
  };

  const fetchEvents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "events"));
      const data = querySnapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
        title: eventDoc.data()?.title || "",
        description: eventDoc.data()?.description || "",
        category: (eventDoc.data()?.category || "").toString().trim().toLowerCase(),
      }));
      setEvents(data);
    } catch (error) {
      console.error("Error cargando eventos:", error);
    }
  };

  const handleEventsUpdated = async () => {
    await fetchEvents();
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    const fetchEventsData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "events"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          title: doc.data()?.title || "",
          description: doc.data()?.description || "",
          category: (doc.data()?.category || "").toString().trim().toLowerCase(),
        }));
        setEvents(data);
      } catch (error) {
        console.error("Error cargando eventos:", error);
      }
    };

    fetchEventsData();
  }, []);

  useEffect(() => {
    console.log("EVENTOS FIREBASE:", events);
  }, [events]);

  useEffect(() => {
    if (!selectedBusiness) {
      return;
    }

    const updatedSelectedBusiness = businesses.find(business => business.id === selectedBusiness.id);
    if (updatedSelectedBusiness) {
      setSelectedBusiness(updatedSelectedBusiness);
    }
  }, [businesses, selectedBusiness]);

  useEffect(() => {
    const handleScrollToHash = () => {
      const hash = window.location.hash;
      if (!hash) {
        hasScrolledToHashRef.current = false;
        lastHashRef.current = "";
        return;
      }

      if (lastHashRef.current !== hash) {
        hasScrolledToHashRef.current = false;
        lastHashRef.current = hash;
      }

      if (hasScrolledToHashRef.current) {
        return;
      }

      const id = hash.replace('#', '');

      let attempts = 0;
      const maxAttempts = 15;

      const tryScroll = () => {
        const el = document.getElementById(id);

        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          hasScrolledToHashRef.current = true;
        } else if (attempts < maxAttempts && !hasScrolledToHashRef.current) {
          attempts++;
          setTimeout(tryScroll, 300);
        }
      };

      setTimeout(tryScroll, 100);
    };

    handleScrollToHash();
    window.addEventListener('hashchange', handleScrollToHash);

    return () => {
      window.removeEventListener('hashchange', handleScrollToHash);
    };
  }, []);

  // Función auxiliar para obtener la ciudad del comercio
  const getBusinessCity = (business) => {
    // Intenta obtener ciudad de los campos existentes
    const cityValue = business.city || business.ciudad;
    
    // Si no tiene ciudad definida, asume "Brandsen" por defecto
    const defaultCity = cityValue ? cityValue.toUpperCase().trim() : "BRANDSEN";
    
    return defaultCity;
  };

  // Lista de ciudades disponibles
  const cities = ["all", "Brandsen", "San Vicente", "La Plata", "Jeppener"];

  const normalizeText = (value = "") =>
    value
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const parseBooleanish = (value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "si" || normalized === "sí";
    }

    return false;
  };

  const isRaffleDonor = (business) => {
    return (
      parseBooleanish(business?.supportsRaffle) ||
      parseBooleanish(business?.offers?.supportsRaffle) ||
      parseBooleanish(business?.isDonor) ||
      parseBooleanish(business?.offers?.isDonor) ||
      parseBooleanish(business?.donatesRaffle)
    );
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminAuthenticated(Boolean(user));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 320);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (businesses.length === 0) {
      return;
    }

    if (window.location.hash) {
      return;
    }

    let animationFrameId;
    let lastTimestamp = 0;
    let currentScroll = 0;
    const speed = 18;
    let loopWidth = 1;

    const measureCarousel = () => {
      const currentCarousel = carouselRef.current;
      if (!currentCarousel) {
        return;
      }

      const firstCard = currentCarousel.querySelector(".carousel-card");
      const gap = Number.parseFloat(window.getComputedStyle(currentCarousel).gap || "0");
      const cardWidth = firstCard?.getBoundingClientRect().width || 200;
      loopWidth = Math.max(businesses.length * (cardWidth + gap), 1);
    };

    const animate = (timestamp) => {
      const currentCarousel = carouselRef.current;
      if (!currentCarousel) {
        animationFrameId = window.requestAnimationFrame(animate);
        return;
      }

      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }

      const delta = Math.min(timestamp - lastTimestamp, 32);
      lastTimestamp = timestamp;

      const scrollStep = (speed * delta) / 1000;
      const nextScrollLeft = currentScroll + scrollStep;

      currentScroll = nextScrollLeft >= loopWidth
        ? nextScrollLeft - loopWidth
        : nextScrollLeft;

      currentCarousel.scrollLeft = currentScroll;

      animationFrameId = window.requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (!carouselRef.current) {
        animationFrameId = window.requestAnimationFrame(startAnimation);
        return;
      }

      measureCarousel();
      currentScroll = carouselRef.current.scrollLeft;
      animationFrameId = window.requestAnimationFrame(animate);
    };

    window.addEventListener("resize", measureCarousel);
    animationFrameId = window.requestAnimationFrame(startAnimation);

    return () => {
      window.removeEventListener("resize", measureCarousel);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [businesses.length, carouselRepeatCount]);

  // Función para validar contraseña del admin
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      await signInWithEmailAndPassword(auth, adminEmail.trim(), passwordInput);

      setShowPasswordModal(false);
      setPasswordInput("");
    } catch (error) {
      console.error("Error de autenticacion admin:", error);
      alert("Contraseña incorrecta");
      setPasswordInput("");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogoutAdmin = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error cerrando sesion admin:", error);
    } finally {
      setAdminAuthenticated(false);
      setPasswordInput("");
    }
  };

  const handleSelectBusiness = (business) => {
    setSearch(business.name);
    setSelectedBusiness(business);
  };

  const handleScrollTop = () => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Filtrar por ciudad y búsqueda
  const filteredBusinesses = businesses.filter(business => {
    // Obtener la ciudad del comercio (por defecto "Brandsen" si no existe)
    const businessCity = getBusinessCity(business);
    
    // Convertir la ciudad seleccionada a mayúsculas para comparación
    const selectedCityUpper = selectedCity === "all" ? "ALL" : selectedCity.toUpperCase().trim();
    
    // Filtro por ciudad: coincide si es "ALL" o si la ciudad es igual
    const matchCity = selectedCityUpper === "ALL" || businessCity === selectedCityUpper;
    
    // Filtro por búsqueda: búsqueda en el nombre y descripción sin importar mayúsculas
    const searchLower = normalizeText(search);
    const businessName = normalizeText(business.name);
    const businessDescription = normalizeText(business.description);
    const matchSearch = businessName.includes(searchLower) ||
              businessDescription.includes(searchLower);
    
    // Retornar true solo si coinciden ambos filtros
    return matchCity && matchSearch;
  });

  const visibleBusinesses = selectedBusiness ? [selectedBusiness] : filteredBusinesses;
  const featuredBusinesses = businesses.filter(isRaffleDonor);
  const heroWhatsappLink = "https://wa.me/5492223410741";
  const carouselBusinesses =
    businesses.length > 0
      ? Array.from({ length: carouselRepeatCount }, () => businesses).flat()
      : [];
  const carouselCardThemes = [
    "carousel-card--coral",
    "carousel-card--teal",
    "carousel-card--blue",
    "carousel-card--gold",
    "carousel-card--peach",
    "carousel-card--pink",
    "carousel-card--graphite"
  ];
  const categories = ["todos", "municipalidad", "instituciones", "cultura", "bandas", "iglesias"];
  const filteredEvents = selectedCategory === "todos"
    ? events
    : events.filter((e) => e.category === selectedCategory);

  useEffect(() => {
    console.log("EVENTOS FILTRADOS:", selectedCategory, filteredEvents);
  }, [selectedCategory, filteredEvents]);

  const eventsHeaderVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
    }
  };
  const eventsGridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.08
      }
    }
  };
  const eventCardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
    }
  };
  const stackedSectionVariants = {
    hidden: {
      opacity: 0,
      y: 56,
      scale: 0.985,
      filter: "blur(2px)",
      clipPath: "inset(12% 0 0 0 round 24px)"
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      clipPath: "inset(0% 0 0 0 round 0px)",
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <>
      <MapBackground />
      <div className="app">
    <section id="inicio" className="hero">
  
<video autoPlay loop muted playsInline className="hero-video">
  <source src="/video/ubi-banner.mp4" type="video/mp4" />
</video>


  <div className="hero-overlay"></div>

  <div className="hero-content">
    
    <h1 className="hero-title">
  Ubi
</h1>

<h2 className="hero-subtitle">
  Brandsen
</h2>

<p className="hero-claim">
  Conectamos personas con comercios locales
</p>

    

    <div className="hero-buttons">
      <a href="#" className="btn btn-primary">
        Descargar app
      </a>

      <a href={heroWhatsappLink} target="_blank" rel="noreferrer" className="btn btn-secondary">
        Quiero sumar mi negocio
      </a>
    </div>
  </div>

  <button
    type="button"
    className="hero-menu-toggle"
    aria-label="Abrir menu de secciones"
    aria-expanded={mobileMenuOpen}
    onClick={() => setMobileMenuOpen((prev) => !prev)}
  >
    ☰
  </button>

  <a
    className="hero-whatsapp-cta"
    href={heroWhatsappLink}
    target="_blank"
    rel="noreferrer"
    aria-label="Contactar por WhatsApp"
    title="WhatsApp"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.02 2C6.49 2 2 6.4 2 11.83c0 2.1.68 4.05 1.83 5.64L2.64 22l4.71-1.15a10.15 10.15 0 0 0 4.67 1.13h.01c5.53 0 10.02-4.4 10.02-9.83C22.05 6.4 17.56 2 12.02 2zm0 18.05h-.01a8.34 8.34 0 0 1-4.26-1.17l-.3-.18-2.8.68.75-2.7-.2-.28a7.96 7.96 0 0 1-1.37-4.46c0-4.41 3.67-8 8.18-8 4.5 0 8.17 3.59 8.17 8s-3.66 8.11-8.16 8.11zm4.48-6.04c-.25-.12-1.49-.72-1.72-.8-.23-.08-.4-.12-.57.12-.17.24-.66.8-.8.96-.15.16-.3.18-.56.06-.25-.12-1.07-.39-2.03-1.26-.75-.67-1.25-1.5-1.4-1.74-.15-.24-.02-.37.1-.49.12-.12.25-.3.38-.44.13-.14.17-.24.25-.4.08-.16.04-.3-.02-.42-.07-.12-.57-1.34-.78-1.84-.2-.48-.42-.42-.57-.43h-.49c-.16 0-.42.06-.64.3-.22.24-.84.8-.84 1.95s.86 2.26.98 2.42c.12.16 1.68 2.64 4.08 3.7.57.24 1.01.39 1.36.5.57.18 1.09.16 1.5.1.46-.07 1.49-.6 1.7-1.17.21-.57.21-1.06.15-1.17-.06-.1-.23-.16-.48-.28z" />
    </svg>
  </a>

  <nav
    className={`hero-section-nav ${mobileMenuOpen ? "is-open" : ""}`}
    aria-label="Navegación de secciones"
  >
    <a href="#que-es-ubi" onClick={() => setMobileMenuOpen(false)}>Qué es Ubi</a>
    <a href="#buscador" onClick={() => setMobileMenuOpen(false)}>Buscador</a>
    <a href="#mapa-comercios" onClick={() => setMobileMenuOpen(false)}>Mapa</a>
    {featuredBusinesses.length > 0 && <a href="#destacados" onClick={() => setMobileMenuOpen(false)}>Destacados</a>}
    <a href="#comercios-ubi" onClick={() => setMobileMenuOpen(false)}>Comercios</a>
    <a href="#eventos" onClick={() => setMobileMenuOpen(false)}>Eventos</a>
    <a href="#legales" onClick={() => setMobileMenuOpen(false)}>Legales</a>
  </nav>
</section> 

<motion.section
  id="que-es-ubi"
  className="about stack-section"
  variants={stackedSectionVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.22 }}
>
  
  <div className="about-content">
    
    <h2 className="about-title">¿Qué es Ubi?</h2>

    <p className="about-text">
      Ubi nació en Brandsen y es mucho más que una app. Es una herramienta pensada para conectar a las personas con los comercios y servicios de nuestra ciudad de una forma simple, rápida e inteligente.
    </p>

    <p className="about-text">
      Con Ubi podés encontrar negocios cerca tuyo, descubrir recomendaciones personalizadas y acceder a toda la información que necesitás en segundos.
    </p>

    <p className="about-text">
      Pero además, Ubi impulsa lo más importante: el crecimiento del comercio local. Porque cada búsqueda, cada recomendación y cada visita ayuda a fortalecer la economía de nuestra comunidad.
    </p>

    <p className="about-text highlight">
      Ubi no es solo una app. Es una nueva forma de conectar.
    </p>

  </div>
</motion.section>

<motion.section
  id="buscador"
  className="search-section stack-section"
  variants={stackedSectionVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.18 }}
>
  <div className="search-container">
    <h2>Encontrá negocios según ciudad</h2>
    
    <div className="search-filters">
      <select
        value={selectedCity}
        onChange={(e) => {
          setSelectedCity(e.target.value);
          setSelectedBusiness(null);
        }}
        className="city-select"
      >
        <option value="all">Todas las ciudades</option>
        {cities.filter(city => city !== "all").map(city => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
      
      <input
        type="text"
        placeholder="Escribe el nombre del comercio..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelectedBusiness(null);
        }}
        className="search-input"
      />
      <button
        onClick={() => setShowPasswordModal(true)}
        className="admin-lock-button"
        title="Acceso administrativo"
      >
        🔐
      </button>
    </div>

    {/* Solo mostramos la caja de resultados si hay algo escrito */}
    {search.trim() !== "" && (
      <div className="results">
        {visibleBusinesses.length === 0 ? (
          <p className="no-results-message">❌ No se encontraron comercios</p>
        ) : (
          visibleBusinesses.map(business => (
              <div
                key={business.id}
                className="business-card"
                onClick={() => handleSelectBusiness(business)}
              >
                {Array.isArray(business.images) && business.images.length > 0 ? (
                  <img
                    src={business.images[0]}
                    alt={`Imagen de ${business.name}`}
                    loading="lazy"
                    className="card-cover"
                  />
                ) : (
                  <div className="card-cover-placeholder" aria-hidden="true" />
                )}
                <div className="card-content">
                  <h3 className="card-title">
                    {business.name}
                    {isRaffleDonor(business) && (
                      <span className="card-raffle-icon" title="Comercio donante del sorteo">🎁</span>
                    )}
                  </h3>
                  <p className="card-address">📍 {business.address}</p>
                  <p className="card-description">{business.description}</p>
                  {business.hours && <p className="card-hours">⏰ {business.hours}</p>}
                  <div className="card-buttons">
                    {business.whatsapp ? (
                      <button
                        className="btn-whatsapp"
                        onClick={() => {
                          const wa = business.whatsapp.toString().trim();
                          const waLink = wa.startsWith('549') || wa.startsWith('54') ? `https://wa.me/${wa}` : `https://wa.me/549${wa}`;
                          window.open(waLink, '_blank');
                        }}
                        title="Contactar por WhatsApp"
                      >
                        💬 WhatsApp
                      </button>
                    ) : (
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textAlign: 'center' }}>Sin WhatsApp</p>
                    )}
                    {business.lat && business.lng && (
                      <button
                        className="btn-maps"
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                const userLat = position.coords.latitude;
                                const userLng = position.coords.longitude;
                                const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${business.lat},${business.lng}&travelmode=driving`;
                                window.open(mapsUrl, '_blank');
                              },
                              (error) => {
                                console.log("Geolocalización rechazada");
                                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${business.lat},${business.lng}`;
                                window.open(mapsUrl, '_blank');
                              }
                            );
                          } else {
                            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${business.lat},${business.lng}`;
                            window.open(mapsUrl, '_blank');
                          }
                        }}
                        title="Ver ruta en Google Maps"
                      >
                        🗺️ Cómo llegar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    )}
  </div>
</motion.section>

<div id="mapa-comercios">
  <MapSection businesses={businesses} />
</div>

{featuredBusinesses.length > 0 && (
  <motion.section
    id="destacados"
    className="featured-business stack-section"
    variants={stackedSectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.18 }}
  >
    {featuredBusinesses.map(featuredBusiness => (
      <div key={featuredBusiness.id} className="featured-card">
        {featuredBusiness.images?.[0] && (
          <img
            src={featuredBusiness.images[0]}
            alt={featuredBusiness.name}
            className="featured-image"
          />
        )}

        <div className="featured-content">
          <h2>🎁 Recomendado por Ubi</h2>
          <h3>{featuredBusiness.name}</h3>
          <p>{featuredBusiness.description}</p>

          <div className="featured-buttons">
            {featuredBusiness.whatsapp && (
              <a
                className="featured-btn-whatsapp"
                href={`https://wa.me/${featuredBusiness.whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            )}

            {featuredBusiness.lat && featuredBusiness.lng && (
              <a
                className="featured-btn-maps"
                href={`https://www.google.com/maps?q=${featuredBusiness.lat},${featuredBusiness.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Cómo llegar
              </a>
            )}
          </div>
        </div>

      </div>
    ))}
  </motion.section>
)}

<motion.section
  id="comercios-ubi"
  className="carousel-section stack-section"
  variants={stackedSectionVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.18 }}
>
  <h2>Comercios que confían en Ubi</h2>

  <div className="carousel-container" ref={carouselRef}>
    {carouselBusinesses.map((b, index) => (
      <div
        key={`${b.id}-${index}`}
        className={`carousel-card ${carouselCardThemes[index % carouselCardThemes.length]}`}
      >
        {b.images?.[0] && (
          <img src={b.images[0]} alt={b.name} />
        )}

        <h3>{b.name}</h3>
      </div>
    ))}
  </div>
</motion.section>

<motion.section
  id="eventos"
  className="events-section stack-section"
  variants={stackedSectionVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.18 }}
>
  <motion.h2
    variants={eventsHeaderVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.45 }}
  >
    🎉 Eventos en Brandsen
  </motion.h2>

  <div className="event-filters">
    {categories.map(cat => (
      <button
        key={cat}
        className={selectedCategory === cat ? "active" : ""}
        onClick={() => setSelectedCategory(cat)}
      >
        {cat}
      </button>
    ))}
  </div>

  <motion.div
    className="events-grid"
    variants={eventsGridVariants}
    initial="visible"
    animate="visible"
  >
    {filteredEvents.length === 0 ? (
      <motion.div className="event-card event-card-empty" variants={eventCardVariants}>
        <h3>No hay eventos para esta categoría</h3>
        <p>Probá con otro filtro o cargá eventos desde el panel admin.</p>
      </motion.div>
    ) : (
      filteredEvents.map((e, i) => (
        <motion.div
          key={e.id || i}
          className="event-card"
          variants={eventCardVariants}
          whileHover={{ y: -6, scale: 1.015 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
        >
          {e.images?.[0] && <img src={e.images[0]} alt={e.title} className="event-card-image" />}
          <h3>{e.title || e.name || "Evento"}</h3>
          {e.description && <p>{e.description}</p>}
        </motion.div>
      ))
    )}
  </motion.div>
</motion.section>

<div style={{ height: '30px' }}></div>

      {/* Modal de Contraseña */}
      {showPasswordModal && !adminAuthenticated && (
        <div className="password-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Acceso Administrativo</h2>
            <form onSubmit={handlePasswordSubmit}>
                <input
                  type="email"
                  placeholder="Email admin"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={authLoading}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'white',
                    marginBottom: '12px',
                    backdropFilter: 'blur(10px)',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#ff8c1a';
                    e.target.style.boxShadow = '0 0 20px rgba(255, 140, 26, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              <input
                type="password"
                placeholder="Ingresa la contraseña"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                disabled={authLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '1rem',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  marginBottom: '20px',
                  backdropFilter: 'blur(10px)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ff8c1a';
                  e.target.style.boxShadow = '0 0 20px rgba(255, 140, 26, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #ff8c1a 0%, #ff7a00 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {authLoading ? "Ingresando..." : "Ingresar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput("");
                  }}
                  disabled={authLoading}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Panel Flotante de Admin - Solo visible si está autenticado */}
      {adminAuthenticated && (
        <div className="floating-admin-panel">
          <div className="floating-admin-header">
            <h3>Panel Administrativo</h3>
            <button
              onClick={handleLogoutAdmin}
              className="floating-admin-close"
              title="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="floating-admin-content">
            <AdminSection onBusinessesUpdated={fetchBusinesses} onEventsUpdated={handleEventsUpdated} />
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          type="button"
          className="scroll-top-button"
          onClick={handleScrollTop}
          aria-label="Subir al inicio"
          title="Subir"
        >
          ↑
        </button>
      )}

      <motion.section
        className="final-cta-section stack-section"
        variants={stackedSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.22 }}
      >
        <div className="final-cta-container">
          <p className="final-cta-text">
            Ubi está creciendo con cada comercio que se suma.
            <br />
            Y vos podés ser parte desde hoy.
          </p>
          <a
            href={heroWhatsappLink}
            target="_blank"
            rel="noreferrer"
            className="final-cta-button"
          >
            Quiero sumar mi negocio
          </a>
        </div>
      </motion.section>

      <motion.section
        id="legales"
        className="legal-section stack-section"
        variants={stackedSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <div className="legal-container">
          <button
            type="button"
            className="legal-toggle"
            onClick={() => setLegalOpen((prev) => !prev)}
            aria-expanded={legalOpen}
          >
            <span>Información Legal y Política de Uso</span>
            <span className={`legal-toggle-icon ${legalOpen ? "is-open" : ""}`}>▾</span>
          </button>

          {legalOpen && (
            <div className="legal-body">
              <div className="legal-block">
                <h3>1. Protección de Datos Personales</h3>
                <p>En Ubi respetamos la privacidad de nuestros usuarios. La información que se solicita dentro de la aplicación o el sitio web (como ubicación, nombre o datos de contacto) es utilizada exclusivamente para mejorar la experiencia del usuario y brindar resultados más precisos. Ubi no vende, alquila ni comparte datos personales con terceros.</p>
              </div>

              <div className="legal-block">
                <h3>2. Uso de Ubicación</h3>
                <p>La aplicación puede solicitar acceso a la ubicación del usuario con el fin de mostrar comercios cercanos y mejorar la experiencia de búsqueda. Esta información no se almacena de forma permanente ni se utiliza para otros fines.</p>
              </div>

              <div className="legal-block">
                <h3>3. Uso del Micrófono</h3>
                <p>Ubi puede utilizar el micrófono del dispositivo únicamente cuando el usuario activa la función de búsqueda por voz. El audio no se guarda ni se utiliza fuera de esa interacción.</p>
              </div>

              <div className="legal-block">
                <h3>4. Información de Comercios</h3>
                <p>Los datos de los comercios publicados en Ubi son proporcionados por los propios titulares o recopilados con fines informativos. Ubi no se responsabiliza por cambios en precios, horarios, disponibilidad de productos o servicios, ni por la calidad de los mismos.</p>
              </div>

              <div className="legal-block">
                <h3>5. Responsabilidad del Usuario</h3>
                <p>El uso de la aplicación y del sitio web es responsabilidad del usuario. Ubi no se hace responsable por el uso indebido de la información presentada ni por acciones derivadas del contacto con los comercios.</p>
              </div>

              <div className="legal-block">
                <h3>6. Contenido y Propiedad Intelectual</h3>
                <p>El diseño, marca, logotipo y contenido visual de Ubi son propiedad de sus creadores. Queda prohibida su reproducción total o parcial sin autorización previa.</p>
              </div>

              <div className="legal-block">
                <h3>7. Modificaciones del Servicio</h3>
                <p>Ubi se reserva el derecho de modificar, actualizar o discontinuar funcionalidades de la aplicación o el sitio web en cualquier momento sin previo aviso.</p>
              </div>

              <div className="legal-block">
                <h3>8. Aceptación de Términos</h3>
                <p>Al utilizar la aplicación o el sitio web, el usuario acepta estas condiciones de uso.</p>
              </div>

              <p className="legal-update">Última actualización: 2026</p>
            </div>
          )}
        </div>
      </motion.section>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-text">
            <p>© {new Date().getFullYear()} Ubi. Todos los derechos reservados.</p>
            <p>Hecho con creatividad por Pin Estudio.</p>
          </div>
          <img src="/images/PinOveja.png" alt="Mascota Ubi" className="site-footer-mascot" />
        </div>
      </footer>
    </div>
    </>
  );
}

export default App;