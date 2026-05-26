const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Base fetch helper for all Nolan API calls.
 * Automatically attaches Content-Type.
 *
 * @param {string} path - e.g. "/api/projects"
 * @param {object} options - standard fetch options
 * @param {string} [token] - kept for backwards compatibility; ignored in demo mode
 */
export async function apiFetch(path, options = {}, token = null) {
  const headers = {
    "Content-Type": "application/json",
    // Demo mode bypasses bearer-token gating for database requests.
    // ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // Remove Content-Type for FormData (multipart), let the browser set it
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error ${res.status}`);
  }

  // 204 No Content — no body to parse
  if (res.status === 204) return null;

  return res.json();
}

export { API_URL };
