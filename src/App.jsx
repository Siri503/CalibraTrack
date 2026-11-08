
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import PagePlaceholder from "./pages/PagePlaceholder";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import InstrumentTypes from "./pages/InstrumentTypes";
import CalibrationPlans from "./pages/CalibrationPlans";
import Calibration from "./pages/Calibration";
import { CalibrationProvider } from "./context/CalibrationContext";
import Certificates from "./pages/Certificates";
import WorkOrders from "./pages/WorkOrders";
import ProductionUsage from "./pages/ProductionUsage";
import Alerts from "./pages/Alerts";
import AuditHistory from "./pages/AuditHistory";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import ForgotPassword from "./pages/ForgotPassword";
import "./App.css";

function AppContent() {
  const location = useLocation();
  const isAuthPage =
  location.pathname === "/login" ||
  location.pathname === "/forgot-password";

  return (
    <div className={isAuthPage? "app-layout auth-layout" : "app-layout"}>

      {!isAuthPage && <Sidebar />}

      <main className={isAuthPage? "auth-main-content" : "main-content"}>

        {!isAuthPage && <Navbar />}

        <div className={isAuthPage ? "auth-page-content" : "page-content"}>

          
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/instrument-types" element={<InstrumentTypes />} />
              <Route path="/calibration-plans" element={<CalibrationPlans />} />
              <Route path="/calibrations" element={<Calibration />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/work-orders" element={<WorkOrders />} />
              <Route path="/production-usage" element={<ProductionUsage />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/audit-history" element={<AuditHistory />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Page not found */}
            <Route
              path="*"
              element={
                <PagePlaceholder
                  title="Page Not Found"
                  description="The requested page does not exist."
                />
              }
            />
          </Routes>


        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <CalibrationProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </CalibrationProvider>
  );
}

export default App;
