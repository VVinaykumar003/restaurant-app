import { Routes, Route, Navigate } from "react-router-dom";
import TableLanding from "./pages/TableLanding";
import MenuPage from "./pages/MenuPage";
import OrderPage from "./pages/OrderPage"; // optional placeholder
import StaffLogin from "./pages/staff/StaffLogin";
import EditableBill from "./pages/staff/EditableBill";
import TableDashboard from "./pages/staff/TableDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TableLanding />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/order/:orderId" element={<OrderPage />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff/bill/:tableId" element={<EditableBill />} />
      <Route path="/staff/tabledashboard" element={<TableDashboard />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
