const ALLOWED_HOST_HINTS: Record<string, string[]> = {
  facebook: ['facebook.com', 'fb.com'],
  linkedin: ['linkedin.com'],
  instagram: ['instagram.com'],
};

export function isHttpsUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeHttpsUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isHttpsUrl(trimmed)) {
    throw new Error('Only HTTPS URLs are allowed.');
  }
  return trimmed;
}

export function validateSocialUrl(kind: keyof typeof ALLOWED_HOST_HINTS, value: string): string | null {
  const normalized = normalizeHttpsUrl(value);
  if (!normalized) return null;
  const host = new URL(normalized).hostname.toLowerCase();
  const allowed = ALLOWED_HOST_HINTS[kind];
  if (!allowed.some((h) => host === h || host.endsWith(`.${h}`))) {
    throw new Error(`That does not look like an official ${kind} URL.`);
  }
  return normalized;
}
