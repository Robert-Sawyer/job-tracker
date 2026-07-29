import type { AuthResponse, LoginInput, RegisterInput, UserDto } from "@job-tracker/shared";
import { apiFetch, tokenStore } from "../api-client.ts";

export async function login(input: LoginInput): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/auth/login", { method: "POST", body: input });
  tokenStore.set(res.accessToken);
  return res;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/auth/register", { method: "POST", body: input });
  tokenStore.set(res.accessToken);
  return res;
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/auth/logout", { method: "POST", skipAuthRetry: true });
  tokenStore.set(null);
}

export function fetchMe(): Promise<UserDto> {
  return apiFetch<UserDto>("/auth/me");
}
