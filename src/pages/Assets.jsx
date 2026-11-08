import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  CalendarDays,
  X
} from "lucide-react";

import "./Assets.css";

function Assets() {
  const [instrumentTypes, setInstrumentTypes] = useState([]);
const [calibrationPlans, setCalibrationPlans] = useState([]);
const [assets, setAssets] = useState([]);

useEffect(() => {
  const loadData = async () => {
    try {
      const [typesRes, plansRes] = await Promise.all([
        fetch("http://localhost:5000/api/instrument-types?limit=500"),
        fetch("http://localhost:5000/api/calibration-plans?limit=500")
      ]);

      const typesData = await typesRes.json();
      const plansData = await plansRes.json();

      if (!typesRes.ok || !typesData.success) {
        throw new Error("Could not load instrument types.");
      }

      if (!plansRes.ok || !plansData.success) {
        throw new Error("Could not load calibration plans.");
      }

      setInstrumentTypes(typesData.data || []);

      const plans = (plansData.data || []).map((plan) => {
        const type = typesData.data.find(
          (item) => String(item.id) === String(plan.instrumentTypeId)
        );

        return {
          ...plan,
          type: type?.name || ""
        };
      });

      setCalibrationPlans(plans);

      const assetsRes = await fetch(
        "http://localhost:5000/api/assets?limit=500"
      );
      const assetsData = await assetsRes.json();

      if (!assetsRes.ok || !assetsData.success) {
        throw new Error("Could not load instruments.");
      }

      let allAssets = assetsData.data || [];
      const totalPages = assetsData.pagination?.totalPages || 1;

      for (let page = 2; page <= totalPages; page++) {
        const response = await fetch(
          `http://localhost:5000/api/assets?page=${page}&limit=500`
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("Could not load all instruments.");
        }

        allAssets = [...allAssets, ...(result.data || [])];
      }

      setAssets(allAssets);
    } catch (error) {
      console.error("Assets API Error:", error);
      alert(error.message);
    }
  };

  loadData();
}, []);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [formData, setFormData] = useState({
  name: "",
  type: "",
  serialNumber: "",
  manufacturer: "",
  location: "",
  lastCalibration: "",
  calibrationPlanId: "",
  referenceValue: ""
});

  // Calculate instrument status from its due date
  function getStatus(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(`${dueDate}T00:00:00`);
    const difference = Math.ceil(
      (due - today) / (1000 * 60 * 60 * 24)
    );

    if (difference < 0) return "Overdue";
    if (difference <= 30) return "Due Soon";

    return "Valid";
  }

  // Calculate next due date
  function calculateDueDate(lastDate, months) {
    const date = new Date(`${lastDate}T00:00:00`);

    const originalDay = date.getDate();

    date.setDate(1);
    date.setMonth(date.getMonth() + Number(months));

    const lastDay = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    ).getDate();

    date.setDate(Math.min(originalDay, lastDay));

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // Register a new instrument
  // Register a new instrument in SQLite
const handleSubmit = async (event) => {
  event.preventDefault();

  const selectedType = instrumentTypes.find(
    (item) => item.name === formData.type
  );

  const selectedPlan = calibrationPlans.find(
    (item) => String(item.id) === String(formData.calibrationPlanId)
  );

  if (!selectedType || !selectedPlan) {
    alert("Please select a valid instrument type and calibration plan.");
    return;
  }

  try {
  console.log("Submitting instrument:", {
  name: formData.name,
  type: formData.type,
  selectedType,
  serialNumber: formData.serialNumber,
  manufacturer: formData.manufacturer,
  location: formData.location,
  lastCalibration: formData.lastCalibration,
  calibrationPlanId: selectedPlan.id,
  referenceValue: formData.referenceValue
});
    const response = await fetch("http://localhost:5000/api/assets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: formData.name,
        instrumentTypeId: selectedType.id,
        serialNumber: formData.serialNumber,
        manufacturer: formData.manufacturer,
        location: formData.location,
        lastCalibration: formData.lastCalibration,
        calibrationPlanId: selectedPlan.id,
        referenceValue: Number(formData.referenceValue)
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Registration failed.");
    }

    setAssets((previous) => [...previous, result.data]);

    setFormData({
      name: "",
      type: "",
      serialNumber: "",
      manufacturer: "",
      location: "",
      lastCalibration: "",
      calibrationPlanId: "",
      referenceValue: ""
    });

    setShowForm(false);
    alert("Instrument registered successfully!");
  } catch (error) {
    console.error("Registration error:", error);
    alert(error.message);
  }
};
  // Search and filter instruments
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = [
      asset.id,
      asset.name,
      asset.serialNumber
    ].some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    );

    const matchesStatus =
      statusFilter === "All" ||
      getStatus(asset.dueDate) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const total = assets.length;

  const valid = assets.filter(
    (asset) => getStatus(asset.dueDate) === "Valid"
  ).length;

  const dueSoon = assets.filter(
    (asset) => getStatus(asset.dueDate) === "Due Soon"
  ).length;

  const overdue = assets.filter(
    (asset) => getStatus(asset.dueDate) === "Overdue"
  ).length;

  return (
    <div className="assets-page">

      {/* Page Heading */}
      <div className="assets-header">
        <div>
          <h1>Instrument Management</h1>
          <p>Register and manage factory instruments.</p>
        </div>

        <button
          className="add-asset-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Close Form" : "Register Instrument"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="asset-stats">

        <div className="asset-stat">
          <Package size={22} color="#2563eb" />
          <h2>{total}</h2>
          <p>Total Instruments</p>
        </div>

        <div className="asset-stat">
          <CalendarDays size={22} color="#16a34a" />
          <h2>{valid}</h2>
          <p>Currently Valid</p>
        </div>

        <div className="asset-stat">
          <CalendarDays size={22} color="#d97706" />
          <h2>{dueSoon}</h2>
          <p>Due Soon</p>
        </div>

        <div className="asset-stat">
          <CalendarDays size={22} color="#dc2626" />
          <h2>{overdue}</h2>
          <p>Overdue</p>
        </div>

      </div>

      {/* Registration Form */}
      {showForm && (
        <div className="asset-form-panel">

          <h2>Register New Instrument</h2>
          <p>Enter the instrument information below.</p>

          <form onSubmit={handleSubmit}>

            <div className="asset-form-grid">

              <div className="form-field">
                <label>Instrument Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pressure Gauge"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>Instrument Type</label>
                <select
                required
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value,
                      calibrationPlanId: ""
                    })
                  }
                >
                  <option value="" disabled>Select Instrument Type</option>

                  {instrumentTypes.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-field">
                <label>Serial Number</label>
                <input
                  type="text"
                  placeholder="Enter serial number"
                  required
                  value={formData.serialNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serialNumber: e.target.value
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>Manufacturer</label>
                <input
                  type="text"
                  placeholder="Manufacturer name"
                  required
                  value={formData.manufacturer}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      manufacturer: e.target.value
                    })
                  }
                />
              </div>
              <div className="form-field">
                <label>Reference Value</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="e.g. 50"
                  value={formData.referenceValue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      referenceValue: e.target.value
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="Factory unit"
                  required
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: e.target.value
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>Last Calibration Date</label>
                <input
                  type="date"
                  required
                  value={formData.lastCalibration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastCalibration: e.target.value
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>Calibration Plan</label>

                <select
                  required
                  value={formData.calibrationPlanId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      calibrationPlanId: e.target.value
                    })
                  }
                >
                  <option value="" disabled>
                    Select Calibration Plan
                  </option>

                  {calibrationPlans
                    .filter(
                        (plan) =>
                          String(plan.instrumentTypeId) ===
                          String(instrumentTypes.find((item) => item.name === formData.type)?.id)
                      )
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.interval} Months)
                      </option>
                    ))}
                </select>
              </div>

            </div>

            <div className="form-actions">
              <button type="submit" className="save-asset-button">
                Register Instrument
              </button>

              <button
                type="button"
                className="cancel-asset-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Instrument Table */}
      <div className="assets-table-panel">

        <div className="assets-table-heading">
          <div>
            <h2>Registered Instruments</h2>
            <p>View and manage your factory instruments.</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="asset-toolbar">

          <div className="asset-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search by ID, name or serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="asset-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Valid">Valid</option>
            <option value="Due Soon">Due Soon</option>
            <option value="Overdue">Overdue</option>
          </select>

        </div>

        <div className="asset-table-scroll">

          <table className="asset-table">

            <thead>
              <tr>
                <th>Instrument ID</th>
                <th>Instrument Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Next Due Date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {filteredAssets.map((asset) => {
                const status = getStatus(asset.dueDate);

                return (
                  <tr key={asset.id}>
                    <td>{asset.id}</td>
                    <td>{asset.name}</td>
                    <td>{asset.type}</td>
                    <td>{asset.location}</td>
                    <td>{asset.dueDate}</td>

                    <td>
                      <span
                        className={`asset-status ${status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-assets">
                    No instruments found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

     <p className="asset-disclaimer">
        Instrument data is stored in the SQLite database.
      </p>

    </div>
  );
}

export default Assets;
