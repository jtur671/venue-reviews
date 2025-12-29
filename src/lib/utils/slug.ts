function normalizeSegment(value?: string) {
  if (!value) return '';

  return value
    .toString()
    .trim()
    .toLowerCase()
    // Use "and" for ampersands so URLs read naturally
    .replace(/&/g, ' and ')
    // Replace non-alphanumeric with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Collapse duplicate hyphens
    .replace(/-+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a human-readable slug for a venue that still contains the stable id.
 * Example: "bowery-ballroom-new-york~123e4567-e89b-12d3-a456-426614174000"
 */
export function buildVenueSlug({
  id,
  name,
  city,
}: {
  id: string;
  name?: string;
  city?: string;
}) {
  const namePart = normalizeSegment(name);
  const cityPart = normalizeSegment(city);
  const humanPart = [namePart, cityPart].filter(Boolean).join('-') || 'venue';

  return `${humanPart}~${id}`;
}

/**
 * Convenience helper to build the full venue path.
 */
export function buildVenuePath(venue: { id: string; name?: string; city?: string }) {
  return `/venues/${buildVenueSlug(venue)}`;
}

/**
 * Extract the stable venue id from a slug or plain id.
 * - "bowery-ballroom-new-york~abc-123" -> "abc-123"
 * - "abc-123" -> "abc-123"
 */
export function extractVenueId(slugOrId?: string) {
  if (!slugOrId) return '';

  // Route params are already decoded by Next, but decode defensively for safety
  const decoded = decodeURIComponent(slugOrId);
  const tildeIndex = decoded.lastIndexOf('~');

  if (tildeIndex === -1) {
    return decoded;
  }

  const id = decoded.slice(tildeIndex + 1);
  return id || decoded;
}

