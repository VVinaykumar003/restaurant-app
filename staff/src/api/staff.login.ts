import { api } from "../api/client"; // adjust the path

export async function loginAsStaff(pin: string ,rid :string) {
  try {
    const res = await api<{ token: string }>(`/api/${rid}/admin/auth/staff-login`, {
      method: "POST",
      body: JSON.stringify({ pin ,rid}),
      idempotency: true // optional
    });
     if (res.token) {
    localStorage.setItem("staff_token", res.token);
    return true;
  }

  return false;
  } catch (err) {
    alert("Login Failed: " + err);
  }
}
