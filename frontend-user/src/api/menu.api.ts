import { api } from "./client";

export async function fetchMenu(rid: string) {
  const res = await api(`/api/${rid}/admin/menu`, { method: "GET" });
  console.log("fetchMenu response:", res);
  return res;
}
