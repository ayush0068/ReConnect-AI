import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { missingPersonIcon, sightingIcon } from '../../lib/mapIcons.js';

const DEFAULT_CENTER = [22.9734, 78.6569]; // geographic centre of India
const DEFAULT_ZOOM = 5;

function FitToMarkers({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
  }, [points, map]);
  return null;
}

function coordsToLatLng(coordinates) {
  // Stored as [longitude, latitude]
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [lng, lat] = coordinates;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return [lat, lng];
}

export default function SightingsMapView({
  sightings = [],
  missingPersons = [],
  height = 340,
}) {
  const sightingPins = useMemo(
    () =>
      sightings
        .map((s) => ({ item: s, position: coordsToLatLng(s.location?.coordinates) }))
        .filter((p) => p.position),
    [sightings]
  );

  const missingPersonPins = useMemo(
    () =>
      missingPersons
        .map((mp) => ({ item: mp, position: coordsToLatLng(mp.lastKnownLocation?.coordinates) }))
        .filter((p) => p.position),
    [missingPersons]
  );

  const allPoints = useMemo(
    () => [...sightingPins, ...missingPersonPins].map((p) => p.position),
    [sightingPins, missingPersonPins]
  );

  return (
    <div className="rounded-xl overflow-hidden border border-line" style={{ height }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToMarkers points={allPoints} />

        {missingPersonPins.map(({ item, position }) => (
          <Marker key={`mp-${item._id}`} position={position} icon={missingPersonIcon}>
            <Popup>
              <p className="font-medium text-sm mb-1">{item.fullName}</p>
              <p className="text-xs text-ink-faint mb-2">
                {item.lastKnownLocation?.address || 'Last known location'}
              </p>
              <Link to={`/missing-persons/${item._id}`} className="text-xs text-trust hover:underline">
                View case →
              </Link>
            </Popup>
          </Marker>
        ))}

        {sightingPins.map(({ item, position }) => (
          <Marker key={`s-${item._id}`} position={position} icon={sightingIcon}>
            <Popup>
              <p className="font-medium text-sm mb-1 line-clamp-2">{item.description}</p>
              <p className="text-xs text-ink-faint">
                {item.location?.address || 'Sighted location'}
                {item.isAnonymous && ' · anonymous'}
              </p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}