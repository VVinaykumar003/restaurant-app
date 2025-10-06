import { api } from "./client";

export async function fetchTable<T>(rid: string, token?: string): Promise<T> {
  return api<T>(`/api/${rid}/tables`, {
    method: "GET",
    headers: token
      ? { Authorization: `Bearer ${token}` } // Add token only if passed
      : {},
  });
}
