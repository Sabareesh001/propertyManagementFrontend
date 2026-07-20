/**
 * Base URL for the Property Management backend API.
 * All feature services build their endpoints from this constant so the
 * host/port lives in exactly one place.
 */
export const API_BASE_URL = 'http://52.140.62.79/';

/** Default HttpClient options for authenticated calls — sends the `jwt_token` cookie. */
export const WITH_CREDENTIALS = { withCredentials: true } as const;

/**
 * Extracts a human-readable message from a backend error response.
 * The API returns either `{ detail }`, `{ message }`, or `{ errors: { Field: [msgs] } }`.
 */
export function extractApiError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { error?: { detail?: string; message?: string; errors?: Record<string, string[]> } };
  const body = e?.error;
  if (!body) return fallback;
  if (body.detail) return body.detail;
  if (body.message) return body.message;
  if (body.errors) {
    const first = Object.values(body.errors)[0];
    if (first?.length) return first[0];
  }
  return fallback;
}
