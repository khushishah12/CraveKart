export function ownerFetch(url: string, init?: RequestInit): Promise<Response> {
  if (typeof window === "undefined") {
    return fetch(url, init);
  }
  const token = localStorage.getItem("foodrush_access_token");
  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...init, headers });
}
