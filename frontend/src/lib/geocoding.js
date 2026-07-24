// Lightweight geocoding for the Leaflet location picker. Uses OSM's public
// Nominatim API directly from the browser — no backend route needed, and
// no API key required. Usage is best-effort: if a lookup fails, the map
// still works with raw coordinates, it just won't have a place name.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * searchPlace(query) — turn a typed place name into candidate locations.
 * Returns [{ label, lat, lng }] (may be empty).
 */
export async function searchPlace(query) {
  if (!query || query.trim().length < 3) return [];

  const url = `${NOMINATIM_BASE}/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];

  const results = await res.json();
  return results.map((r) => ({
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

/**
 * reverseGeocode(lat, lng) — turn coordinates into a readable place name.
 * Returns a string, or null if the lookup fails.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}