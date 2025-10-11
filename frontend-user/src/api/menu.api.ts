// menu.api.ts
import { api } from "./client";

export async function fetchMenu(rid : string) {
  return api(`/api/${rid}/admin/menu`, { method: "GET" });
}
