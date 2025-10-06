import { useState, useEffect } from "react";
import { Bell, Users, Clock, ChevronRight } from "lucide-react";
import BillingComponent from "../components copy/staffBilling/BillingComponent";
import { fetchTable } from "../api/table.api";
import { fetchBill } from "../api/bill.api";
import TableSelect from "./TableSelect";
import { useNavigate } from "react-router-dom";



type TableStatus = "available" | "occupied";
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
  extras: { label: string; amount: number }[];
  taxes: { name: string; rate: number; taxAmount: number }[];
  status: BillStatus;
  time: string;
}

interface Table {
  id: number;
  status: TableStatus;
  capacity: number;
  waiterAssigned?: string;
  bills: Bill[];
  waiterCalled: boolean;
}

export default function StaffDashboard() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showBillDetail, setShowBillDetail] = useState<Bill | null>(null);
  const [view, setView] = useState<"dashboard" | "table" | "billing">("dashboard");
  const [tableId, setTableId] = useState<string>("");
  const [discount, setDiscount] = useState(0);
  const [fine, setFine] = useState(0);
const navigate = useNavigate();

  const rid = import.meta.env.VITE_RID || "restro10";

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const tableData = await fetchTable(rid);
      const billData = await fetchBill(rid);
      

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

      
      const formatted: Table[] = tableData.map((t: any) => ({
        id: t._id, // Assuming `t.id` exists
        tableNumber: t.tableNumber,
        status: t.currentSessionId !== null ? "occupied" : "available",
        capacity: t.capacity,
        waiterAssigned: t.staffAlias || "-",
        bills: billData
          .filter((b: any) => b.tableId === String(t.tableNumber))
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
          })),
        waiterCalled: false,
      }));

      setTables(formatted);

    } catch (err) {
      console.error("Error fetching tables:", err);
    }
  };

  const handleCallWaiter = (tableId: number) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, waiterCalled: true } : t))
    );
  };

  const getStatusColor = (status: BillStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "preparing":
        return "bg-blue-100 text-blue-700";
      case "served":
        return "bg-green-100 text-green-700";
      case "completed":
        return "bg-gray-100 text-gray-700";
    }
  };

  // Render BillingComponent
  if (view === "billing" && showBillDetail && selectedTable) {
    return (
      <BillingComponent
        bill={showBillDetail}
        table={selectedTable}
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

 

  // Render Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Active Tables</h1>
            <p className="text-emerald-100 text-sm">
              {tables.filter((t) => t.status === "occupied").length} occupied •{" "}
              {tables.filter((t) => t.status === "available").length} available
            </p>
          </div>
          <button className="bg-white text-emerald-600 p-3 rounded-full shadow-lg">
            <Bell size={24} />
          </button>
        </div>
      </div>

      {/* Tables List */}
      <div className="p-4 space-y-3">
        {tables.map((table) => (
          <div
            key={table.id}
            onClick={() => {
              navigate(`/staff-dashboard/${table.id}`);
              // setSelectedTable(table);
              // setView("table");
            }}
            className={`bg-white rounded-xl shadow-md overflow-hidden cursor-pointer border-2 ${
              table.status === "occupied" ? "border-red-200" : "border-emerald-500"
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-full ${
                      table.status === "occupied" ? "bg-red-100" : "bg-emerald-100"
                    }`}
                  >
                    <Users
                      className={table.status === "occupied" ? "text-red-300" : "text-gray-400"}
                      size={24}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Table {table.tableNumber}</h3>
                    <p className="text-sm text-gray-500">Capacity: {table.capacity} people</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    table.status === "occupied"
                      ? "bg-emerald-100 text-red-400"
                      : "bg-gray-100 text-emerald-700"
                  }`}
                >
                  {table.status === "occupied" ? "Occupied" : "Available"}
                </span>
              </div>

              {/* Occupied Table Details */}
              {table.status === "occupied" && (
                <>
                  <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Assigned Waiter</p>
                      <p className="font-semibold text-gray-800">{table.waiterAssigned}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCallWaiter(table.id);
                      }}
                      disabled={table.waiterCalled}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 ${
                        table.waiterCalled
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-emerald-500 text-white hover:bg-emerald-600"
                      }`}
                    >
                      <Bell size={16} />
                      {table.waiterCalled ? "Called" : "Call"}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700">Running Bills</p>
                      <span className="text-xs text-gray-500">{table.bills.length} order(s)</span>
                    </div>

                    {table.bills.length > 0 ? (
                      table.bills.map((bill) => (
                        <div
                          key={bill.id}
                          onClick={() => {
                            setSelectedTable(table);
                            setShowBillDetail(bill);
                            setDiscount(bill.discount || 0);
                            setFine(bill.fine || 0);
                            setView("billing");
                          }}
                          className="bg-gray-50 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-800">Bill #{bill.id.slice(-4)}</p>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                    bill.status
                                  )}`}
                                >
                                  {bill.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 truncate">
                                {bill.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Clock size={12} />
                                {bill.time}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <p className="font-bold text-emerald-600">₹{bill.subtotal}</p>
                              <ChevronRight size={20} className="text-gray-400" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-sm italic">No running bills</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
