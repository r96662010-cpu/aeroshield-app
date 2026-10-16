export interface GeocodedPlace {
  name: string;
  category: string;
  coords: [number, number];
  isCustom?: boolean;
}

/**
 * Searches ANY place, street, address, or landmark using free OpenStreetMap Nominatim
 */
export async function searchAnyLocation(query: string, cityHint?: string): Promise<GeocodedPlace[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();

  // 1. Check if user typed direct latitude, longitude coordinates (e.g. "28.5355, 77.3910")
  const coordRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
  const coordMatch = trimmed.match(coordRegex);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[3]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [
        {
          name: `Custom Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          category: 'Exact GPS Coordinate',
          coords: [lat, lng],
          isCustom: true
        }
      ];
    }
  }

  // 2. Query OpenStreetMap Nominatim for ANY location (free public geocoding)
  try {
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed + (cityHint ? `, ${cityHint}` : '')
    )}&limit=6&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AeroShield-Free-AirQuality-App'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const shortName = item.display_name.split(',').slice(0, 3).join(', ');
          const type = item.type ? item.type.replace(/_/g, ' ') : 'Location';

          return {
            name: shortName,
            category: type.charAt(0).toUpperCase() + type.slice(1),
            coords: [lat, lon],
            isCustom: true
          };
        });
      }
    }
  } catch (err) {
    // If network or CORS timeout occurs, fallback gracefully
  }

  return [];
}
