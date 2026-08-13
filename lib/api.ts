export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

export function decodeToken(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  
  const customHeaders: Record<string, string> = {};
  if (token) {
    customHeaders["Authorization"] = `Bearer ${token}`;
  }
  
  const isFormData = options.body instanceof FormData;
  if (!isFormData) {
    customHeaders["Content-Type"] = "application/json";
  }

  const mergedHeaders = {
    ...customHeaders,
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: mergedHeaders,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  return response;
}
