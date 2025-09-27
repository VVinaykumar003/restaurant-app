import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import TableLanding from "./pages/TableLanding";
import MenuPage from "./pages/MenuPage";
import OrderPage from "./pages/OrderPage"; // optional placeholder

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TableLanding />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/order/:orderId" element={<OrderPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
