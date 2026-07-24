import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { pickerIcon } from '../../lib/mapIcons.js';
import { searchPlace, reverseGeocode } from '../../lib/geocoding.js';

const DEFAULT_CENTER = [22.9734, 78.6569]; // geographic centre of India
const DEFAULT_ZOOM = 5;
const PIN_ZOOM = 15;

// Keeps the map view in sync whenever the marker position changes from
// outside a direct drag (current-location button, search result click).
function FlyToPosition({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, Math.max(map.getZoom(), PIN_ZOOM), { duration: 0.6 });
    }
  }, [position, map]);
  return null;
}

// Lets a tap/click anywhere on the map drop the pin there too, not just
// dragging the existing marker — friendlier on mobile.
function ClickToPlace({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  height = 260,
}) {
    const hasInitialPosition =
        Number.isFinite(latitude) &&
        Number.isFinite(longitude);  
    const [position, setPosition] = useState(
        hasInitialPosition ? [latitude, longitude] : null
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState(null);
  const searchTimeout = useRef(null);
  const markerRef = useRef(null);

  // Keep in sync if the parent resets/loads values (e.g. edit form data
  // arriving after the initial render).
  useEffect(() => {
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    setPosition((prev) => {
      if (prev && prev[0] === latitude && prev[1] === longitude) {
        return prev;
      }
      return [latitude, longitude];
    });
  } else {
    setPosition(null);
  }
}, [latitude, longitude]);

  const commitPosition = useCallback(
    async ([lat, lng]) => {
      setPosition([lat, lng]);
      setMapError(null);
      onLocationChange?.({ lat, lng });
      const address = await reverseGeocode(lat, lng);
      if (address) {
        onLocationChange?.({ lat, lng, address });
      }
    },
    [onLocationChange]
  );

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError("Your browser doesn't support geolocation.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        commitPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        setIsLocating(false);
        setMapError("Couldn't get your current location. Try searching or dropping a pin instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const found = await searchPlace(value);
        setResults(found);
      } catch {
        setMapError("Couldn't search for that place right now.");
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectResult = (result) => {
    setResults([]);
    setQuery(result.label);
    setPosition([result.lat, result.lng]);
    onLocationChange?.({ lat: result.lat, lng: result.lng, address: result.label });
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Type a location name to search…"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm focus:border-trust transition-colors duration-200"
          />
          {(results.length > 0 || isSearching) && (
            <div className="absolute z-[1000] mt-1 w-full rounded-xl border border-line bg-paper shadow-soft max-h-48 overflow-auto">
              {isSearching && (
                <p className="px-4 py-2 text-xs text-ink-faint">Searching…</p>
              )}
              {!isSearching &&
                results.map((r, i) => (
                  <button
                    type="button"
                    key={`${r.lat}-${r.lng}-${i}`}
                    onClick={() => handleSelectResult(r)}
                    className="block w-full text-left px-4 py-2 text-xs text-ink-soft hover:bg-paper-alt transition-colors duration-200 line-clamp-2"
                  >
                    {r.label}
                  </button>
                ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="shrink-0 text-xs font-medium bg-paper-alt text-trust border border-line px-3 py-1.5 rounded-full hover:border-trust transition-colors duration-200 disabled:opacity-60"
        >
          {isLocating ? 'Locating…' : '📍 Use current location'}
        </button>
      </div>

      {mapError && <p className="text-xs text-red-500 mb-2">{mapError}</p>}

      <div
        className="rounded-xl overflow-hidden border border-line"
        style={{ height }}
      >
        <MapContainer
          center={position || DEFAULT_CENTER}
          zoom={position ? PIN_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onSelect={commitPosition} />
          {position && <FlyToPosition position={position} />}
          {position && (
            <Marker
              position={position}
              icon={pickerIcon}
              draggable
              ref={markerRef}
              eventHandlers={{
                dragend: () => {
                  const marker = markerRef.current;
                  if (!marker) return;
                  const latlng = marker.getLatLng();
                  commitPosition([latlng.lat, latlng.lng]);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-ink-faint mt-1.5">
        Search a place, tap "Use current location", or click/drag the pin to fine-tune it.
      </p>
    </div>
  );
}