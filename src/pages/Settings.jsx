
import React, { useState } from "react";
import {
  User,
  Shield,
  Bell,
  Settings as SettingsIcon
} from "lucide-react";

import "./Settings.css";

function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  
  const [profile, setProfile] = useState({
  name: "Admin User",
  email: "admin@calibratrack.com",
  role: "Administrator",
  department: "Administration",
  phone: ""
});

const [isEditingProfile, setIsEditingProfile] = useState(false);

const [notifications, setNotifications] = useState({
  calibrationDue: true,
  overdueInstruments: true,
  failedCalibration: true,
  workOrderUpdates: true,
  invalidProductionUsage: true
});
const [generalSettings, setGeneralSettings] = useState({
  applicationName: "CalibraTrack",
  companyName: "ABC Manufacturing",
  dateFormat: "DD/MM/YYYY",
  timeZone: "Asia/Kolkata",
  reminderDays: 30
});

  const [users, setUsers] = useState([
  {
    id: 1,
    name: "Admin User",
    email: "admin@calibratrack.com",
    role: "Administrator",
    status: "Active"
  },
  {
    id: 2,
    name: "John Smith",
    email: "john@calibratrack.com",
    role: "Quality Engineer",
    status: "Active"
  },
  {
    id: 3,
    name: "David Wilson",
    email: "david@calibratrack.com",
    role: "Maintenance Technician",
    status: "Active"
  },
  {
    id: 4,
    name: "Robert Brown",
    email: "robert@calibratrack.com",
    role: "Production Operator",
    status: "Inactive"
  }
]);

const [showUserForm, setShowUserForm] = useState(false);
const [editingUserId, setEditingUserId] = useState(null);
const [userForm, setUserForm] = useState({
  name: "",
  email: "",
  role: "Quality Engineer"
});
const handleUserInput = (e) => {
  const { name, value } = e.target;

  setUserForm((previous) => ({
    ...previous,
    [name]: value
  }));
};
const handleAddUser = (e) => {
  e.preventDefault();

  const emailExists = users.some(
    (user) =>
      user.id !== editingUserId &&
      user.email.toLowerCase() === userForm.email.trim().toLowerCase()
  );

  if (emailExists) {
    alert("This email address is already registered.");
    return;
  }

  if (editingUserId) {
    setUsers((previous) =>
      previous.map((user) =>
        user.id === editingUserId
          ? {
              ...user,
              name: userForm.name.trim(),
              email: userForm.email.trim(),
              role: userForm.role
            }
          : user
      )
    );

    alert("User updated successfully!");
  } else {
    const newUser = {
      id: Date.now(),
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      role: userForm.role,
      status: "Active"
    };

    setUsers((previous) => [...previous, newUser]);

    alert("User added successfully!");
  }

  setUserForm({
    name: "",
    email: "",
    role: "Quality Engineer"
  });

  setEditingUserId(null);
  setShowUserForm(false);
};

const handleEditUser = (user) => {
  if (user.role === "Administrator") {
    alert("The Administrator account cannot be edited.");
    return;
  }

  setUserForm({
    name: user.name,
    email: user.email,
    role: user.role
  });

  setEditingUserId(user.id);
  setShowUserForm(true);
};

const handleDeleteUser = (user) => {
  if (user.role === "Administrator") {
    alert("The Administrator account cannot be deleted.");
    return;
  }

  const confirmDelete = window.confirm(
    `Are you sure you want to delete ${user.name}?`
  );

  if (!confirmDelete) {
    return;
  }

  setUsers((previous) =>
    previous.filter((item) => item.id !== user.id)
  );

  alert("User deleted successfully!");
};

  return (
    <div className="settings-page">

      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your profile, users and application preferences.</p>
      </div>

      <div className="settings-layout">

        <div className="settings-sidebar">

          <button
            className={activeTab === "profile" ? "active" : ""}
            onClick={() => setActiveTab("profile")}
          >
            <User size={18} />
            My Profile
          </button>

          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            <Shield size={18} />
            User Management
          </button>

          <button
            className={activeTab === "notifications" ? "active" : ""}
            onClick={() => setActiveTab("notifications")}
          >
            <Bell size={18} />
            Notifications
          </button>

          <button
            className={activeTab === "general" ? "active" : ""}
            onClick={() => setActiveTab("general")}
          >
            <SettingsIcon size={18} />
            General Settings
          </button>

        </div>

        <div className="settings-content">

          {activeTab === "profile" && (
        <div className="profile-section">
            <h2>My Profile</h2>
            <p>Manage your personal account information.</p>

            <div className="profile-form">

            <div className="user-form-group">
                <label>Full Name</label>
                <input
                type="text"
                value={profile.name}
                disabled={!isEditingProfile}
                onChange={(e) =>
                    setProfile({
                    ...profile,
                    name: e.target.value
                    })
                }
                />
            </div>

            <div className="user-form-group">
                <label>Email Address</label>
                <input
                type="email"
                value={profile.email}
                disabled={!isEditingProfile}
                onChange={(e) =>
                    setProfile({
                    ...profile,
                    email: e.target.value
                    })
                }
                />
            </div>

            <div className="user-form-group">
                <label>Role</label>
                <input
                type="text"
                value={profile.role}
                disabled
                />
            </div>

            <div className="user-form-group">
                <label>Department</label>
                <input
                type="text"
                value={profile.department}
                disabled={!isEditingProfile}
                onChange={(e) =>
                    setProfile({
                    ...profile,
                    department: e.target.value
                    })
                }
                />
            </div>

            <div className="user-form-group">
                <label>Phone Number</label>
                <input
                type="tel"
                value={profile.phone}
                disabled={!isEditingProfile}
                onChange={(e) =>
                    setProfile({
                    ...profile,
                    phone: e.target.value
                    })
                }
                placeholder="Enter phone number"
                />
            </div>

            <button
                type="button"
                className="add-user-btn"
                onClick={() => {
                if (isEditingProfile) {
                    alert("Profile updated successfully!");
                }
                setIsEditingProfile(!isEditingProfile);
                }}
            >
                {isEditingProfile ? "Save Profile" : "Edit Profile"}
            </button>

            </div>
        </div>
        )}

         
{activeTab === "users" && (
  <div className="user-management">

    <div className="user-management-header">
      <div>
        <h2>User Management</h2>
        <p>Manage registered users and their access roles.</p>
      </div>
        <button
    type="button"
    className="add-user-btn"
    onClick={() => {
      setEditingUserId(null);
      setUserForm({
        name: "",
        email: "",
        role: "Quality Engineer"
      });
      setShowUserForm(!showUserForm);
    }}
  >
    + Add User
  </button>

    </div>

    {showUserForm && (
      <form className="user-form" onSubmit={handleAddUser}>

        <div className="user-form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            value={userForm.name}
            onChange={handleUserInput}
            placeholder="Enter full name"
            required
          />
        </div>

        <div className="user-form-group">
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={userForm.email}
            onChange={handleUserInput}
            placeholder="Enter email address"
            required
          />
        </div>

        <div className="user-form-group">
          <label>Role</label>
          <select
            name="role"
            value={userForm.role}
            onChange={handleUserInput}
          >
            <option>Administrator</option>
            <option>Quality Engineer</option>
            <option>Maintenance Technician</option>
            <option>Production Operator</option>
          </select>
        </div>

        <div className="user-form-actions">
         <button type="submit" className="add-user-btn">
            {editingUserId ? "Update User" : "Save User"}
          </button>

          <button
            type="button"
            className="cancel-user-btn"
            onClick={() => setShowUserForm(false)}
          >
            Cancel
          </button>
        </div>

      </form>
    )}

    <div className="users-table-wrapper">
      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
            <span className={`user-status ${user.status.toLowerCase()}`}>
                {user.status}
            </span>
            </td>
             <td>
            <button
                className="user-action-btn"
                disabled={user.role === "Administrator"}
                onClick={() => handleEditUser(user)}
            >
                Edit
            </button>

            <button
                className="user-action-btn"
                disabled={user.role === "Administrator"}
                onClick={() => {
                setUsers((previous) =>
                    previous.map((item) =>
                    item.id === user.id
                        ? {
                            ...item,
                            status: item.status === "Active" ? "Inactive" : "Active"
                        }
                        : item
                    )
                );
                }}
            >
                {user.role === "Administrator"
                ? "Protected"
                : user.status === "Active"
                ? "Deactivate"
                : "Activate"}
            </button>
            <button
                    className="user-action-btn delete-user-btn"
                    disabled={user.role === "Administrator"}
                    onClick={() => handleDeleteUser(user)}
                    >
                    Delete
            </button>
            </td>
            
            </tr>
          ))}
        </tbody>
      </table>
    </div>

  </div>
)}

         {activeTab === "notifications" && (
  <div className="notification-section">
    <h2>Notification Preferences</h2>
    <p>Choose which alerts you want to receive.</p>

    <div className="notification-list">

      {[
        {
          key: "calibrationDue",
          title: "Upcoming Calibration",
          description: "Get notified when an instrument is approaching its calibration due date."
        },
        {
          key: "overdueInstruments",
          title: "Overdue Instruments",
          description: "Get notified when an instrument passes its calibration due date."
        },
        {
          key: "failedCalibration",
          title: "Failed Calibration",
          description: "Get notified when an instrument fails calibration."
        },
        {
          key: "workOrderUpdates",
          title: "Work Order Updates",
          description: "Get notified when maintenance work orders are updated."
        },
        {
          key: "invalidProductionUsage",
          title: "Invalid Production Usage",
          description: "Get notified when an instrument is used outside its valid calibration period."
        }
      ].map((item) => (
        <div className="notification-item" key={item.key}>
          <div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>

          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notifications[item.key]}
              onChange={(e) =>
                setNotifications((previous) => ({
                  ...previous,
                  [item.key]: e.target.checked
                }))
              }
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      ))}

    </div>
  </div>
)}
{activeTab === "general" && (
  <div className="general-settings-section">
    <h2>General Settings</h2>
    <p>Configure your application preferences.</p>

    <form
      className="general-settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        alert("General settings saved successfully!");
      }}
    >

      <div className="user-form-group">
        <label>Application Name</label>
        <input
          type="text"
          value={generalSettings.applicationName}
          onChange={(e) =>
            setGeneralSettings({
              ...generalSettings,
              applicationName: e.target.value
            })
          }
        />
      </div>

      <div className="user-form-group">
        <label>Company Name</label>
        <input
          type="text"
          value={generalSettings.companyName}
          onChange={(e) =>
            setGeneralSettings({
              ...generalSettings,
              companyName: e.target.value
            })
          }
        />
      </div>

      <div className="user-form-group">
        <label>Date Format</label>
        <select
          value={generalSettings.dateFormat}
          onChange={(e) =>
            setGeneralSettings({
              ...generalSettings,
              dateFormat: e.target.value
            })
          }
        >
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>

      <div className="user-form-group">
        <label>Time Zone</label>
        <select
          value={generalSettings.timeZone}
          onChange={(e) =>
            setGeneralSettings({
              ...generalSettings,
              timeZone: e.target.value
            })
          }
        >
          <option value="Asia/Kolkata">India Standard Time</option>
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern Time</option>
          <option value="Europe/London">London Time</option>
        </select>
      </div>

      <div className="user-form-group">
        <label>Calibration Reminder (Days)</label>
        <input
          type="number"
          min="1"
          max="365"
          value={generalSettings.reminderDays}
          onChange={(e) =>
                setGeneralSettings((previous) => ({
                    ...previous,
                    reminderDays: e.target.value === ""
                    ? ""
                    : Number(e.target.value)
                }))
                }
        />
      </div>

      <button type="submit" className="add-user-btn">
        Save Settings
      </button>

    </form>
  </div>
)}
        </div>

      </div>

    </div>
  );
}

export default Settings;
