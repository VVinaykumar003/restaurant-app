// App.tsx
import {  Routes, Route } from "react-router-dom";

import Landing from "./pages/HomePage";
// import AdminLogin from "./pages/AdminLogin";
import StaffLogin from "./pages/StaffLogin";
import TableSelect from "./pages/TableSelect";
// import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";

function App() {
  
  return (
    
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* <Route path="/admin-login" element={<AdminLogin />} /> */}
        <Route path="/staff-login" element={<StaffLogin />} />
        <Route path="/staff-dashboard/:id" element={ <TableSelect
      onBack={() => window.history.back()}
      onOpenBilling={(bill) => console.log("Open billing:", bill)}
    />} />
         {/* <Route path="/admin-dashboard" element={<AdminDashboard />} />*/}
        <Route path="/staff-dashboard" element={<StaffDashboard />} /> 
      </Routes>
    
  );
}

export default App;
