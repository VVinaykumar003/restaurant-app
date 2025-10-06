import { api } from "./client";

export async function fetchBill(rid: string) {
    const token = localStorage.getItem("staff_token"); // ✅ Auto grab token
  const res = await api(`/api/${rid}/bills/active`, {
    method: "GET",
    headers: token
      ? { Authorization: `Bearer ${token}` } // Add token only if passed
      : {},
  });
  
  // console.log("response from fetchBill API:", res);
  return res;
}
