/**
 * Server-side helper for calling the Django backend.
 *
 * Always injects the X-Internal-Auth shared-secret header so that the
 * Django InternalAuthMiddleware accepts the request. Never use raw
 * `fetch` to call Django — this helper is the only sanctioned path.
 *
 * Usage:
 *   const res = await djangoFetch("/api/schools-2026/", { next: { revalidate: 300 } });
 *   if (!res.ok) { ... }
 *   const data = await res.json();
 */
export async function djangoFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = process.env.DJANGO_API_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("DJANGO_API_URL is not set");
  }

  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is not set");
  }

  // Ensure the path starts with "/"
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  const headers = new Headers(init?.headers);
  headers.set("X-Internal-Auth", secret);

  return fetch(url, { ...init, headers });
}

/**
 * POST a JSON body to Django. Mirrors djangoFetch but adds Content-Type
 * and serialises the body. Use this for any Next.js → Django write path.
 *
 * Returns the raw Response so the caller can decide how to handle 429s,
 * 404s, etc.
 */
export async function djangoPost(
  path: string,
  body: unknown,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return djangoFetch(path, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
}
