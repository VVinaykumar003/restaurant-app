import { api } from "./client"; // ✅ update path accordingly

// Define TypeScript type (optional, adjust as needed)
export interface TableDetails {
  _id: string;
  restaurantId: string;
  tableNumber: number;
  capacity: number;
  isActive: boolean;
  currentSessionId: string | null;
  sessionExpiresAt: string | null;
  staffAlias: string | null;
  lastUsed: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ✅ Fetch Table By ID
export async function getTableById(rid: string, tableId: string) {
  return api<TableDetails>(`/api/${rid}/tables/${tableId}`, {
    method: "GET",
  });
}
