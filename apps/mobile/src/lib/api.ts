import { supabase } from "./supabase";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });
  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(body.error ?? "API request failed");
  }

  return body.data as T;
}

