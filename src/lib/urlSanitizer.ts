/**
 * URL sanitization for AI-generated URLs.
 * Only allows safe protocols to prevent XSS via javascript: or data: URIs.
 */

const SAFE_PROTOCOLS = ["https:", "http:"];

/**
 * Normalize a URL string: prepend https:// if no protocol is present.
 * This handles AI-generated URLs like "www.example.com" or "example.com/path".
 */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Reject dangerous protocols before prepending
  if (/^(javascript|data|vbscript|blob):/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  try {
    const parsed = new URL(normalizeUrl(url));
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Returns a safe, normalized URL or undefined.
 * Prepends https:// to bare domains (e.g. "www.example.com" → "https://www.example.com").
 * Blocks javascript:, data:, and other dangerous protocols.
 */
export function safeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const normalized = normalizeUrl(url);
  return isSafeUrl(normalized) ? normalized : undefined;
}
