/**
 * Extract GPS coordinates from MP4/MOV file metadata in the browser.
 *
 * MP4 containers store GPS in several different places depending on the
 * camera and tagging tool: the legacy QuickTime `©xyz` atom, the modern
 * `Keys/ilst` metadata block, and/or an embedded XMP packet. Rather than
 * implementing three different binary box parsers, we just scan the first
 * ~24 MB of the file as bytes and try a few regex strategies in order.
 *
 * Returns `{ latitude: null, longitude: null }` when nothing is found, so
 * the form simply falls back to user-entered coordinates.
 */

export interface VideoGps {
  latitude: number | null;
  longitude: number | null;
}

const NULL_GPS: VideoGps = { latitude: null, longitude: null };
const HEAD_LIMIT = 24 * 1024 * 1024;

/**
 * Convert XMP-style DDD,MM.MMMM[NSEW] to a signed decimal.
 * Example: "18,48.252N" → 18.8042, "98,56.952E" → 98.9492.
 */
function dmsToDecimal(deg: number, min: number, hemi: string): number {
  const sign = hemi === "S" || hemi === "W" ? -1 : 1;
  return sign * (deg + min / 60);
}

export async function extractVideoGps(file: File): Promise<VideoGps> {
  try {
    const slice = file.slice(0, Math.min(file.size, HEAD_LIMIT));
    const buf = await slice.arrayBuffer();
    // The metadata strings we care about are pure ASCII, so a latin1 decode is
    // both lossless and fast — no UTF-8 BOM / surrogate concerns.
    const text = new TextDecoder("latin1").decode(buf);

    // Strategy 1: ISO 6709 string written by `©xyz` atom or
    // `Keys:GPSCoordinates="+lat+lng/"` — the standard format.
    const iso = text.match(/([+-]\d{1,3}(?:\.\d+)?)([+-]\d{1,3}(?:\.\d+)?)\/?/);
    if (iso) {
      const lat = parseFloat(iso[1]);
      const lng = parseFloat(iso[2]);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        return { latitude: lat, longitude: lng };
      }
    }

    // Strategy 2: XMP `<exif:GPSLatitude>18,48.252N</exif:GPSLatitude>`
    // and matching longitude — exiftool's default for MP4 metadata writes.
    const xmpLat = text.match(
      /<exif:GPSLatitude>\s*(\d+),(\d+(?:\.\d+)?)([NS])\s*<\/exif:GPSLatitude>/i
    );
    const xmpLng = text.match(
      /<exif:GPSLongitude>\s*(\d+),(\d+(?:\.\d+)?)([EW])\s*<\/exif:GPSLongitude>/i
    );
    if (xmpLat && xmpLng) {
      const lat = dmsToDecimal(parseInt(xmpLat[1], 10), parseFloat(xmpLat[2]), xmpLat[3]);
      const lng = dmsToDecimal(parseInt(xmpLng[1], 10), parseFloat(xmpLng[2]), xmpLng[3]);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        return { latitude: lat, longitude: lng };
      }
    }

    return NULL_GPS;
  } catch {
    return NULL_GPS;
  }
}
