import { env } from "./env.ts";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};

let inFlightRefresh: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  inFlightRefresh ??= (async () => {
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        tokenStore.set(null);
        return null;
      }

      const data = (await res.json()) as { accessToken: string };
      tokenStore.set(data.accessToken);
      return data.accessToken;
    } catch {
      tokenStore.set(null);
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRetry, headers, ...rest } = options;

  async function send(token: string | null): Promise<Response> {
    return fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  let response = await send(tokenStore.get());

  if (response.status === 401 && !skipAuthRetry) {
    const renewed = await refreshAccessToken();
    if (renewed) response = await send(renewed);
  }

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as {
    error?: { code: string; message: string; details?: unknown };
    requestId?: string;
  } | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "UNKNOWN",
      payload?.error?.message ?? response.statusText,
      payload?.error?.details,
      payload?.requestId,
    );
  }

  return payload as T;
}
