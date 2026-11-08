
import {
  Search,
  Bell,
  UserCircle,
  ChevronDown
} from "lucide-react";

import "./Navbar.css";

function Navbar() {
  return (
    <header className="navbar">

      <div className="navbar-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Search instruments, certificates..."
        />
      </div>

      <div className="navbar-right">

        <button className="notification-button">
          <Bell size={21} />
          <span className="notification-dot"></span>
        </button>

        <div className="profile">
          <UserCircle size={35} />

          <div className="profile-info">
            <h4>Admin User</h4>
            <p>Administrator</p>
          </div>

          <ChevronDown size={17} />
        </div>

      </div>

    </header>
  );
}

export default Navbar;
