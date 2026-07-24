import L from 'leaflet';

// Small colored pin (CSS, no image assets) so map markers match the
// app's palette (trust/signal/verified from tailwind.config.js) instead
// of Leaflet's default blue teardrop. One shared factory keeps every
// map on the same visual language.
function pinIcon(color) {
  return L.divIcon({
    className: '',
    html: `
      <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27c0-8.3-6.7-15-15-15z"
          fill="${color}" stroke="white" stroke-width="1.5" />
        <circle cx="15" cy="15" r="5.5" fill="white" />
      </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });
}

// trust (deep blue) — used for the draggable location picker pin
export const pickerIcon = pinIcon('#2B4C5C');
// signal (amber) — missing person last-known-location pins
export const missingPersonIcon = pinIcon('#E0A458');
// verified (green) — sighting report pins
export const sightingIcon = pinIcon('#7A9B76');