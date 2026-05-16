/**
 * Reverse-geocode a (lat, lng) pair into a human-readable address using
 * OpenStreetMap Nominatim. Free, no API key required.
 *
 * Nominatim's public usage policy asks for:
 *   - max 1 request/second per machine — we debounce at the call site
 *   - a descriptive User-Agent / Referer — browsers set these automatically
 *   - no bulk/scraping use — we only call on user-driven map/GPS changes
 *
 * If the call fails (offline, rate-limited, no result), returns `null` and
 * the form keeps whatever address the user already typed.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";

export interface ReverseGeocodeResult {
  /** A short, comma-joined address suitable for the form's Address field. */
  shortAddress: string;
  /** Nominatim's full `display_name`, useful as a tooltip or fallback. */
  displayName: string;
}

/** Pull the most useful parts out of Nominatim's `address` object. */
function buildShortAddress(address: Record<string, string | undefined>): string {
  const parts: string[] = [];
  const road = address.road ?? address.pedestrian ?? address.footway ?? address.path;
  if (road) {
    const num = address.house_number;
    parts.push(num ? `${num} ${road}` : road);
  }
  const subDistrict =
    address.neighbourhood ?? address.suburb ?? address.quarter ?? address.village;
  if (subDistrict) parts.push(subDistrict);
  const district =
    address.city_district ?? address.district ?? address.county ?? address.town ?? address.city;
  if (district) parts.push(district);
  const region = address.state ?? address.province;
  if (region && parts.length < 3) parts.push(region);
  return parts.filter(Boolean).join(", ");
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // `accept-language` lets Nominatim return localized names when available
  // (Thai first, English fallback) — useful since Chiang Mai roads are bilingual.
  const url =
    `${NOMINATIM}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}` +
    `&format=jsonv2&zoom=18&addressdetails=1&accept-language=th,en`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const body = await res.json();
    const display: string | undefined = body?.display_name;
    const address = (body?.address ?? {}) as Record<string, string | undefined>;
    const short = buildShortAddress(address);
    if (!short && !display) return null;
    return {
      shortAddress: short || display || "",
      displayName: display ?? short ?? ""
    };
  } catch {
    return null;
  }
}
