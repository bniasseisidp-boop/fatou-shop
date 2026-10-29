import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const icons = {
  store: L.divIcon({ className: "delivery-map-pin store-pin", html: "<span>F</span>", iconSize: [32, 32], iconAnchor: [16, 29] }),
  customer: L.divIcon({ className: "delivery-map-pin customer-pin", html: "<span>●</span>", iconSize: [30, 30], iconAnchor: [15, 28] }),
  driver: L.divIcon({ className: "delivery-map-pin driver-pin", html: "<span>↗</span>", iconSize: [34, 34], iconAnchor: [17, 30] }),
};

function MapEvents({ interactive, onPick }) {
  useMapEvents({
    click(event) {
      if (interactive) onPick?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function MapViewport({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points.map((point) => [point.latitude, point.longitude]), { padding: [35, 35], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 15);
    }
  }, [map, points]);
  return null;
}

export default function DeliveryMap({
  storeLocation,
  customerLocation,
  driverLocation,
  interactive = false,
  onPick,
  className = "",
}) {
  const points = [
    storeLocation && { ...storeLocation },
    customerLocation && { ...customerLocation },
    driverLocation && { ...driverLocation },
  ].filter((point) => point && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude)));
  const fallback = storeLocation || { latitude: 14.712, longitude: -17.454 };

  return (
    <div className={`delivery-map ${className}`}>
      <MapContainer center={[Number(fallback.latitude), Number(fallback.longitude)]} zoom={14} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents interactive={interactive} onPick={onPick} />
        <MapViewport points={points} />
        {storeLocation && <Marker position={[Number(storeLocation.latitude), Number(storeLocation.longitude)]} icon={icons.store} title="Fatou Shop" />}
        {customerLocation && (
          <Marker
            position={[Number(customerLocation.latitude), Number(customerLocation.longitude)]}
            icon={icons.customer}
            draggable={interactive}
            eventHandlers={{
              dragend(event) {
                const position = event.target.getLatLng();
                onPick?.({ latitude: position.lat, longitude: position.lng });
              },
            }}
            title={interactive ? "Déplacez le repère à votre adresse exacte" : "Adresse de livraison"}
          />
        )}
        {driverLocation && <Marker position={[Number(driverLocation.latitude), Number(driverLocation.longitude)]} icon={icons.driver} title="Livreur" />}
      </MapContainer>
      {interactive && <div className="delivery-map-prompt">Touchez la carte ou déplacez le repère pour choisir l’adresse exacte.</div>}
    </div>
  );
}
