const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

const UNAUTHORIZED_EVENT = "api:unauthorized";

type QueryValue = string | number | boolean | undefined;

type ApiListResponse<T> = {
  success: boolean;
  items: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};

type ApiItemResponse<T> = {
  success: boolean;
  item: T;
};

let authToken: string | null = null;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function emitUnauthorized(): void {
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    emitUnauthorized();
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function apiFetch<T>(path: string, options?: RequestInit, query?: Record<string, QueryValue>): Promise<T> {
  const headers = new Headers(options?.headers);

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  if (!headers.has("Content-Type") && options?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, query), {
    ...options,
    headers
  });

  return parseJson<T>(response);
}

export function setApiToken(token: string | null): void {
  authToken = token;
}

export function getUnauthorizedEventName(): string {
  return UNAUTHORIZED_EVENT;
}

export async function apiGet<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
  return apiFetch<T>(path, undefined, query);
}

export async function apiPost<T, B extends Record<string, unknown>>(path: string, body: B): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPatch<T, B extends Record<string, unknown>>(path: string, body: B): Promise<T> {
  return apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}

export type { ApiItemResponse, ApiListResponse };
export { API_BASE_URL };
