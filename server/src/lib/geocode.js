const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'TalentHub-Recruiting-Tool/1.0';
const MIN_REQUEST_INTERVAL_MS = 1100; // Nominatim's usage policy caps at 1 req/sec

let lastRequestAt = 0;

async function throttle() {
  const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

/**
 * Geocodes free-text like "Marine Park, Brooklyn" to coordinates via
 * OpenStreetMap's Nominatim — free, no API key required. Returns null on
 * any failure (no match, network error, timeout) rather than throwing:
 * a location that can't be geocoded should fall back to exact-string
 * matching in the scoring logic, not block saving the record.
 */
export async function geocodeLocation(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) return null;

  try {
    await throttle();
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return null;
    const results = await res.json();
    if (!results?.length) return null;
    const { lat, lon } = results[0];
    if (lat == null || lon == null) return null;
    return { latitude: Number(lat), longitude: Number(lon) };
  } catch (err) {
    console.error(`[geocode] failed for "${trimmed}":`, err.message);
    return null;
  }
}

/**
 * Resolves coordinates for a location field on create/update, re-geocoding
 * only when the location text actually changed (or previous geocoding
 * failed) — keeps write volume against Nominatim low and respects its
 * rate limit even under normal usage.
 */
export async function resolveCoordinates(newLocation, previous) {
  const trimmed = (newLocation || '').trim();
  if (!trimmed) return { latitude: null, longitude: null };

  const unchanged =
    previous &&
    (previous.location || '').trim().toLowerCase() === trimmed.toLowerCase() &&
    previous.latitude != null &&
    previous.longitude != null;

  if (unchanged) {
    return { latitude: previous.latitude, longitude: previous.longitude };
  }

  const geocoded = await geocodeLocation(trimmed);
  return geocoded || { latitude: null, longitude: null };
}

/**
 * Great-circle distance between two {latitude, longitude} points, in miles.
 */
export function distanceMiles(a, b) {
  if (!a || !b) return null;
  const R = 3958.8; // Earth radius, miles
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
