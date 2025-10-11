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
    <div className="mx-auto w-full max-w-sm rounded-lg border border-blue-300 p-6 bg-white shadow-lg">
      <div className="flex animate-pulse space-x-4">
        {/* Circle */}
        <div className="h-12 w-12 rounded-full bg-gray-200"></div>
        {/* Lines */}
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 rounded bg-gray-200 w-3/4"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 h-4 rounded bg-gray-200"></div>
              <div className="col-span-1 h-4 rounded bg-gray-200"></div>
            </div>
            <div className="h-4 rounded bg-gray-200 w-full"></div>
          </div>
        </div>

        
      </div>
        <div className="flex animate-pulse space-x-4">
        {/* Circle */}
        <div className="h-12 w-12 rounded-full bg-gray-200"></div>
        {/* Lines */}
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 rounded bg-gray-200 w-3/4"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 h-4 rounded bg-gray-200"></div>
              <div className="col-span-1 h-4 rounded bg-gray-200"></div>
            </div>
            <div className="h-4 rounded bg-gray-200 w-full"></div>
          </div>
        </div>

        
      </div>
    </div>
  );
}


if (!table) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center">
        <div className="text-6xl mb-4 animate-bounce">🚫</div>
        <p className="text-xl font-semibold text-red-600 mb-2">Table not found</p>
        <p className="text-gray-600 mb-4">
          The table you are looking for does not exist or has been removed.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold shadow-lg transition duration-200"
        >
          Back to Tables
        </button>
      </div>
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
            <span className="font-medium text-sm sm:text-base">Back </span>
          </button>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-800">Table {table.id}</h2>

           <span
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
                table.status === "occupied" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {table.status === "occupied" ? "Occupied" : "Available"}
            </span>
        </div>

        {/* Table Info */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
         
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
  <div className="space-y-6 sm:space-y-8">
    {["unpaid", "paid"].map((type) => {
      const filteredBills = table.bills.filter((b) =>
        type === "paid" ? b.status === "completed" : b.status !== "completed"
      );
      return (
        <div key={type} className="bg-white rounded-2xl shadow-lg p-5 sm:p-7">
          <h4 className="text-lg sm:text-xl font-semibold text-slate-800 mb-4 flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                type === "paid" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            ></span>
            {type === "paid" ? "Paid Bills" : "Unpaid Bills"}
          </h4>

          {filteredBills.length > 0 ? (
            <div className="space-y-4">
              {filteredBills.map((bill) => (
                <div
                  key={bill.id}
                  onClick={() => {
                    setShowBillDetail(bill);
                    setDiscount(bill.discount || 0);
                    setFine(bill.fine || 0);
                    setView("billing");
                  }}
                  className="group flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-emerald-50 to-white border border-emerald-300 rounded-xl p-4 cursor-pointer shadow-sm transition-transform transform hover:scale-[1.02] hover:shadow-lg duration-200"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-base sm:text-lg mb-1">
                      Bill #{bill.id.slice(-4)}
                    </p>
                    <p className="text-slate-600 text-sm sm:text-base truncate">
                      {bill.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 sm:mt-0">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                        bill.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : bill.status === "preparing"
                          ? "bg-blue-100 text-blue-800"
                          : bill.status === "served"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {bill.status}
                    </span>

                    <span className="font-bold text-emerald-700 text-lg sm:text-xl">
                      ₹{bill.subtotal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 italic text-sm sm:text-base pt-4">
              No {type} bills
            </p>
          )}
        </div>
      );
    })}
  </div>
) : (
  <div className="text-center py-14 sm:py-16">
    <div className="text-6xl sm:text-7xl mb-5">📋</div>
    <p className="text-slate-500 text-lg sm:text-xl font-medium mb-1">No running bills</p>
    <p className="text-slate-400 text-sm sm:text-base">
      Bills will appear here once orders are placed
    </p>
  </div>
)}


      </div>
    </div>
  );
}
