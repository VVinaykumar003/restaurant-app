import { Routes, Route, Navigate } from "react-router-dom";
import TableLanding from "./pages/TableLanding";
import MenuPage from "./pages/MenuPage";
import OrderPage from "./pages/OrderPage";
import RunningBillPage from "./components/Order/RunningBill";
import CallWaiter from "./components/Layout/Bell";

export default function App() {
  const handleCallWaiter = () => {
    // Replace with API call to notify staff
    alert("Waiter has been called! 🍽️");
  };

  return (
    <div className="relative min-h-screen">
      {/* Routes */}
      <Routes>
        <Route path="/" element={<TableLanding />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/bill" element={<RunningBillPage />} />
        <Route path="/order/:orderId" element={<OrderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>


       {/* Floating Call Waiter button */}
      <div className="fixed bottom-32 right-5 z-50">
        <CallWaiter onClick={handleCallWaiter} />
      </div>
    </div>
  );
}
