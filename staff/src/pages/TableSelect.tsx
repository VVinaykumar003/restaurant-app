import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getTableById } from "../api/tableById.api";
import { fetchBill } from "../api/bill.api";
import BillingComponent from "../components copy/staffBilling/BillingComponent";

type BillStatus = "pending" | "preparing" | "served" | "completed";

interface BillItem {
  name: string;
  qty: number;
  price: number;
  notes?: string;
}

interface Bill {
  id: string;
  items: BillItem[];
  subtotal: number;
  amount: number;
  discount: number;
  fine: number;
  status: BillStatus;
  time: string;
  extras: { label: string; amount: number }[];
  taxes: { name: string; rate: number; taxAmount: number }[];
  waiterCalled?: boolean;
}

interface Table {
  id: number;
  status: "occupied" | "available";
  capacity: number;
  waiterAssigned: string;
  bills: Bill[];
}

interface TableSelectProps {
  onBack: () => void;
}

export default function TableSelect({ onBack }: TableSelectProps) {
  const { id } = useParams<{ id: string }>();
  const rid = import.meta.env.VITE_RID;
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBillDetail, setShowBillDetail] = useState<Bill | null>(null);
  const [view, setView] = useState<"table" | "billing">("table");
  const [discount, setDiscount] = useState(0);
  const [fine, setFine] = useState(0);

  useEffect(() => {
    async function fetchTableData() {
      try {
        if (!id) return;

        // Fetch table info
        const tableData = await getTableById(rid, id);

        // Fetch all bills
        const allBills: any[] = await fetchBill(rid);

        const mapStatus = (status: string): BillStatus => {
          switch (status) {
            case "draft":
              return "pending";
            case "unpaid":
              return "served";
            case "paid":
              return "completed";
            default:
              return "pending";
          }
        };

        const activeBills: Bill[] = allBills
          .filter((b: any) => String(b.tableId) === String(tableData.tableNumber))
          .map((b: any) => ({
            id: b._id,
            items: b.items.map((i: any) => ({
              name: i.name,
              qty: i.qty,
              price: i.price || i.priceAtOrder,
              notes: i.notes || "",
            })),
            subtotal: b.subtotal,
            amount: b.totalAmount,
            discount: b.discount || 0,
            fine: b.fine || 0,
            status: mapStatus(b.status),
            time: new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            extras: b.extras || [],
            taxes: b.taxes || [],
            waiterCalled: false,
          }));

        setTable({
          id: tableData.tableNumber,
          capacity: tableData.capacity,
          status: tableData.currentSessionId ? "occupied" : "available",
          waiterAssigned: tableData.staffAlias || "-",
          bills: activeBills,
        });
      } catch (err) {
        console.error("Error fetching table or bills:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTableData();
  }, [id, rid]);

  // Render BillingComponent
  if (view === "billing" && showBillDetail && table) {
    return (
      <BillingComponent
        bill={showBillDetail}
        table={table} // Pass the whole table
        customer={null}
        discount={discount}
        fine={fine}
        setDiscount={setDiscount}
        setFine={setFine}
        onAddItem={() => {}}
        onPay={() => {}}
        onBack={() => setView("table")}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-slate-500 text-lg">Loading table...</p>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-red-500 text-lg">Table not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-emerald-600 hover:text-emerald-900"
        >
          Back to Tables
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 sm:p-6">
      <div className="max-w-full sm:max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 sm:gap-2 text-emerald-600 hover:text-emerald-900 transition-colors group"
          >
            <span className="text-xl sm:text-2xl group-hover:-translate-x-1 transition-transform">⬅</span>
            <span className="font-medium text-sm sm:text-base">Back to Tables</span>
          </button>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-800">Table {table.id}</h2>
        </div>

        {/* Table Info */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <span
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
                table.status === "occupied" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {table.status === "occupied" ? "Occupied" : "Available"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Capacity</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{table.capacity} guests</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Assigned Waiter</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{table.waiterAssigned}</p>
            </div>
          </div>
        </div>

        {/* Bills */}
        {table.bills.length > 0 ? (
          <div className="space-y-5 sm:space-y-6">
            {["unpaid", "paid"].map((type) => {
              const filteredBills = table.bills.filter(b => type === "paid" ? b.status === "completed" : b.status !== "completed");
              return (
                <div key={type}>
                  <h4 className="text-base sm:text-lg font-semibold text-slate-700 mb-2 sm:mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    {type === "paid" ? "Paid Bills" : "Unpaid Bills"}
                  </h4>
                  <div className="space-y-2 sm:space-y-3">
                    {filteredBills.length > 0 ? (
                      filteredBills.map(bill => (
                        <div
                          key={bill.id}
                          onClick={() => {
                            setShowBillDetail(bill);
                            setDiscount(bill.discount || 0);
                            setFine(bill.fine || 0);
                            setView("billing");
                          }}
                          className="group bg-gradient-to-r from-emerald-50 to-white border-2 border-emerald-200 rounded-xl p-3 sm:p-4 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all duration-200"
                        >
                          <p className="font-semibold sm:font-bold text-slate-800 text-sm sm:text-base">
                            Bill #{bill.id.slice(-4)}
                          </p>
                          <p className="text-slate-600 text-xs sm:text-sm">
                            {bill.items.map(i => `${i.name} x${i.qty}`).join(", ")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs sm:text-sm italic pl-4">
                        No {type} bills
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 sm:py-12">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">📋</div>
            <p className="text-slate-500 text-base sm:text-lg">No running bills</p>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 sm:mt-2">
              Bills will appear here once orders are placed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
