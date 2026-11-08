
import {
  LayoutDashboard,
  Package,
  Layers,
  CalendarDays,
  ClipboardCheck,
  FileCheck,
  Wrench,
  Factory,
  Bell,
  History,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  ShieldCheck
} from "lucide-react";

import "./Sidebar.css";
import { NavLink} from "react-router-dom";
function Sidebar() {
  

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Instruments", icon: Package, path: "/assets" },
    { name: "Instrument Types", icon: Layers, path: "/instrument-types" },
    { name: "Calibration Plans", icon: CalendarDays, path: "/calibration-plans" },
    { name: "Calibration", icon: ClipboardCheck, path: "/calibrations" },
    { name: "Certificates", icon: FileCheck, path: "/certificates" },
    { name: "Work Orders", icon: Wrench, path: "/work-orders" },
    { name: "Production Usage", icon: Factory, path: "/production-usage" },
    { name: "Alerts", icon: Bell, path: "/alerts" },
    { name: "Audit History", icon: History, path: "/audit-history" },
    { name: "Reports", icon: ChartNoAxesCombined, path: "/reports" },
  ];

  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        <ShieldCheck size={30} />
        <h2>CalibraTrack</h2>
      </div>

      <p className="menu-heading">MAIN MENU</p>

      <nav className="sidebar-menu">

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
                to={item.path}
                className={({ isActive }) =>
                    `menu-item ${isActive ? "active" : ""}`
                }
                key={item.name}
                >
                <Icon size={19} />
                <span>{item.name}</span>
            </NavLink>
          );
        })}   
        </nav>     

      <div className="sidebar-bottom">
        <NavLink
            to="/settings"
            className={({ isActive }) =>
                `menu-item ${isActive ? "active" : ""}`
            }
            >
            <Settings size={19} />
            <span>Settings</span>
        </NavLink>
         <NavLink
            to="/login"
            className="menu-item"
            onClick={() => {
              localStorage.removeItem("isAuthenticated");
              sessionStorage.removeItem("isAuthenticated");
            }}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </NavLink>
        
      </div>

    </aside>
  );
}

export default Sidebar;
