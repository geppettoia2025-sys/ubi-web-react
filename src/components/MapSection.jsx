import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./MapSection.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const BRANDSEN_CENTER = [-35.168, -58.233];

const defaultMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function normalizeBusinesses(businesses) {
  return (businesses || [])
    .map((business) => {
      const lat = Number.parseFloat(business?.lat);
      const lng = Number.parseFloat(business?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      return {
        ...business,
        lat,
        lng,
      };
    })
    .filter(Boolean);
}

export default function MapSection({ businesses = [] }) {
  const mapBusinesses = normalizeBusinesses(businesses);

  return (
    <section className="map-section stack-section">
      <div className="map-section-inner">
        <h2>Mapa de Comercios</h2>
        <p className="map-section-subtitle">Explora todos los comercios cargados en Brandsen.</p>

        <div className="map-shell">
          <MapContainer
            center={BRANDSEN_CENTER}
            zoom={13}
            scrollWheelZoom={false}
            className="map-canvas"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mapBusinesses.map((business) => (
              <Marker
                key={business.id || `${business.name}-${business.lat}-${business.lng}`}
                position={[business.lat, business.lng]}
                icon={defaultMarkerIcon}
              >
                <Popup>
                  <div className="map-popup">
                    <h3>{business.name || "Comercio"}</h3>
                    <p>{business.address || "Dirección no disponible"}</p>
                    <span className="map-popup-label">Ir en:</span>
                    <div className="map-popup-links">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}&travelmode=driving`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Auto
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}&travelmode=walking`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Caminando
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}&travelmode=bicycling`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Bici
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </section>
  );
}
