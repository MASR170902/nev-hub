export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== "undefined" ? "/api" : "http://127.0.0.1:3001/api");
export const TOKEN_KEY = "nevhub_access_token";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
    throw new Error(message || `Permintaan gagal (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.assign("/login");
}
