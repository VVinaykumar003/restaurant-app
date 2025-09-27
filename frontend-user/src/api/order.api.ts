import { api } from "./client";

export async function createOrder(rid: string, payload: any) {
  return api(`/api/${rid}/orders`, {
    method: "POST",
    body: JSON.stringify(payload),
    idempotency: true,
  });
}
