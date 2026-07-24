import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

export default function LocationDisplayMap({
  latitude,
  longitude,
  label,
  icon,
  height = 220,
  zoom = 14,
}) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  const position = [latitude, longitude];

  return (
    <div className="rounded-xl overflow-hidden border border-line" style={{ height }}>
      <MapContainer
        center={position}
        zoom={zoom}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={icon}>
          {label && <Popup>{label}</Popup>}
        </Marker>
      </MapContainer>
    </div>
  );
}