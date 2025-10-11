import { useState, useEffect } from "react";
import { Bell, Users, Clock, ChevronRight } from "lucide-react";
import BillingComponent from "../components copy/staffBilling/BillingComponent";
import { fetchTable } from "../api/table.api";
import { fetchBill } from "../api/bill.api";
// import TableSelect from "./TableSelect";
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
  
  <div className="min-h-screen bg-gray-50 flex flex-col">
    {/* Header Bar */}
    <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 shadow-xl flex items-center justify-between sticky top-0 z-50">
      <h1 className="text-white font-bold text-lg tracking-wide">Dining Overview</h1>
      <button className="bg-white text-emerald-600 p-2 rounded-full shadow-lg">
        <Bell size={22} />
      </button>
    </div>

    {/* Summary Row */}
    <div className="px-4 py-3 flex gap-4 justify-between bg-white shadow-md rounded-b-xl mb-2">
      <div className="flex flex-col items-center flex-1">
        <span className="text-lg font-semibold text-indigo-600">
          {tables.filter(t => t.status === 'occupied').length}
        </span>
        <span className="text-xs text-gray-600 mt-1">Occupied</span>
      </div>
      <div className="flex flex-col items-center flex-1">
        <span className="text-lg font-semibold text-emerald-600">
          {tables.filter(t => t.status === 'available').length}
        </span>
        <span className="text-xs text-gray-600 mt-1">Available</span>
      </div>
      <div className="flex flex-col items-center flex-1">
        <span className="text-lg font-semibold text-gray-800">{tables.length}</span>
        <span className="text-xs text-gray-600 mt-1">Total</span>
      </div>
    </div>

    {/* Tables List */}
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {tables.map(table => (
        <div
          key={table.id}
          onClick={() => navigate(`/staff-dashboard/${table.id}`)}
          className={`rounded-2xl shadow-lg border-l-4 mb-4 transition hover:scale-[1.01] cursor-pointer ${
            table.status === 'occupied' ? 'border-red-400 bg-white' : 'border-emerald-500 bg-white'
          }`}
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Users
                  className={table.status === 'occupied' ? "text-red-400" : "text-emerald-500"}
                  size={22}
                />
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">
                    Table {table.tableNumber}
                  </h3>
                  <p className="text-xs text-gray-500">Capacity: {table.capacity}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ml-2
                  ${table.status === 'occupied'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-indigo-100 text-indigo-500'
                  }`}>
                {table.status === 'occupied' ? "Occupied" : "Available"}
              </span>
            </div>

            {/* Occupied Table Details */}
            {table.status === "occupied" && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="text-xs text-gray-400">Waiter</span>
                    <span className="block font-semibold text-gray-700">{table.waiterAssigned}</span>
                  </div>
                  <button
                    disabled={table.waiterCalled}
                    onClick={e => {
                      e.stopPropagation();
                      handleCallWaiter(table.id);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold gap-1 flex items-center
                      ${table.waiterCalled
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      }`}
                  >
                    <Bell size={16} /> {table.waiterCalled ? "Called" : "Call"}
                  </button>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-600">Bills</span>
                  {table.bills.length > 0 ? (
                    table.bills.map(bill => (
                      <div key={bill.id} className="mt-2 p-3 rounded-lg bg-gray-50 flex justify-between items-center"
                        onClick={() => {
                          setSelectedTable(table);
                          setShowBillDetail(bill);
                          setDiscount(bill.discount || 0);
                          setFine(bill.fine || 0);
                          setView("billing");
                        }}>
                        <div>
                          <div className="flex gap-2 items-center mb-1">
                            <span className="font-bold text-gray-700">#{bill.id.slice(-4)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              getStatusColor(bill.status)
                            }`}>
                              {bill.status}
                            </span>
                          </div>
                          <span className="text-xs text-gray-600">
                            {bill.items.map(i => `${i.name} x${i.qty}`).join(', ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-600 font-bold text-base">₹{bill.subtotal}</span>
                          <Clock size={12} className="text-gray-400 inline ml-1" />
                          <span className="text-xs text-gray-500 ml-1">{bill.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs italic text-gray-400">No bills</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>

   
  </div>
);

  
}
