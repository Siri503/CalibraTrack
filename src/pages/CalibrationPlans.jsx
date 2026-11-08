import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  CalendarDays,
  X
} from "lucide-react";

import "./CalibrationPlans.css";

function CalibrationPlans() {

  
const [plans, setPlans] = useState([]);
const [instrumentTypes, setInstrumentTypes] = useState([]);

useEffect(() => {
  const loadCalibrationData = async () => {
    try {
      const [plansResponse, typesResponse] = await Promise.all([
        fetch("http://localhost:5000/api/calibration-plans"),
        fetch("http://localhost:5000/api/instrument-types")
      ]);

      const plansResult = await plansResponse.json();
      const typesResult = await typesResponse.json();

      if (!plansResponse.ok || !plansResult.success) {
        throw new Error("Unable to load calibration plans.");
      }

      if (!typesResponse.ok || !typesResult.success) {
        throw new Error("Unable to load instrument types.");
      }

      setPlans(plansResult.data || []);
      setInstrumentTypes(typesResult.data || []);

      setFormData((previous) => ({
        ...previous,
        type: previous.type || typesResult.data?.[0]?.name || ""
      }));
    } catch (error) {
      console.error("Calibration Plans API Error:", error);
      alert(error.message);
    }
  };

  loadCalibrationData();
}, []);


  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "Pressure",
    interval: "6",
    tolerance: "",
    effectiveFrom: "",
    effectiveTo: "",
    status: "Active"
  });

  
async function handleSubmit(event) {
  event.preventDefault();

  if (
    formData.effectiveTo &&
    formData.effectiveTo < formData.effectiveFrom
  ) {
    alert("End date cannot be before the effective date.");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/calibration-plans",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          interval: formData.interval,
          tolerance: formData.tolerance,
          effectiveFrom: formData.effectiveFrom,
          effectiveTo: formData.effectiveTo,
          status: formData.status
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to create calibration plan."
      );
    }

    setPlans((previous) => [...previous, result.data]);

    setFormData({
      name: "",
      type: instrumentTypes[0]?.name || "",
      interval: "6",
      tolerance: "",
      effectiveFrom: "",
      effectiveTo: "",
      status: "Active"
    });

    setShowForm(false);

    alert("Calibration plan created successfully!");
  } catch (error) {
    console.error("Create calibration plan error:", error);
    alert(error.message);
  }
}

  const filteredPlans = plans.filter((plan) => {

    const matchesSearch = [
      plan.id,
      plan.name,
      plan.type
    ].some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    );

    const matchesStatus =
      statusFilter === "All" ||
      plan.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = plans.filter(
    (plan) => plan.status === "Active"
  ).length;

  const inactiveCount = plans.filter(
    (plan) => plan.status === "Inactive"
  ).length;

  return (
    <div className="plans-page">

      {/* Page Header */}
      <div className="plans-header">
        <div>
          <h1>Calibration Plans</h1>
          <p>
            Define calibration intervals and accuracy requirements.
          </p>
        </div>

        <button
          className="add-plan-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Close Form" : "Create Calibration Plan"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="plans-stats">

        <div className="plan-stat">
          <CalendarDays size={23} color="#2563eb" />
          <h2>{plans.length}</h2>
          <p>Total Plans</p>
        </div>

        <div className="plan-stat">
          <CalendarDays size={23} color="#16a34a" />
          <h2>{activeCount}</h2>
          <p>Active Plans</p>
        </div>

        <div className="plan-stat">
          <CalendarDays size={23} color="#dc2626" />
          <h2>{inactiveCount}</h2>
          <p>Inactive Plans</p>
        </div>

      </div>

      {/* Create Plan Form */}
      {showForm && (

        <div className="plan-form-panel">

          <h2>Create New Calibration Plan</h2>

          <p>
            Enter the calibration requirements for an instrument type.
          </p>

          <form onSubmit={handleSubmit}>

            <div className="plan-form-grid">

              <div className="plan-field">
                <label>Plan Name</label>

                <input
                  required
                  placeholder="e.g. Pressure Annual Plan"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value
                    })
                  }
                />
              </div>

              <div className="plan-field">
                <label>Instrument Type</label>

                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value
                    })
                  }
                >
                  <option value="" disabled>
                    Select Instrument Type
                  </option>

                  {instrumentTypes.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="plan-field">
                <label>Calibration Interval</label>

                <select
                  value={formData.interval}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interval: e.target.value
                    })
                  }
                >
                  <option value="1">Every 1 Month</option>
                  <option value="3">Every 3 Months</option>
                  <option value="6">Every 6 Months</option>
                  <option value="12">Every 12 Months</option>
                  <option value="24">Every 24 Months</option>
                </select>
              </div>

              <div className="plan-field">
                <label>Allowed Tolerance</label>

                <input
                  required
                  placeholder="e.g. ±0.5%"
                  value={formData.tolerance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tolerance: e.target.value
                    })
                  }
                />
              </div>

              <div className="plan-field">
                <label>Effective From</label>

                <input
                  type="date"
                  required
                  value={formData.effectiveFrom}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      effectiveFrom: e.target.value
                    })
                  }
                />
              </div>

              <div className="plan-field">
                <label>Effective To (Optional)</label>

                <input
                  type="date"
                  min={formData.effectiveFrom || undefined}
                  value={formData.effectiveTo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      effectiveTo: e.target.value
                    })
                  }
                />
              </div>

              <div className="plan-field">
                <label>Plan Status</label>

                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value
                    })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

            </div>

            <div className="plan-form-actions">

              <button
                type="submit"
                className="save-plan-button"
              >
                Save Calibration Plan
              </button>

              <button
                type="button"
                className="cancel-plan-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}

      {/* Registered Plans */}
      <div className="plans-table-panel">

        <h2>Registered Calibration Plans</h2>

        <p>View and manage calibration schedules.</p>

        {/* Search and Filter */}
        <div className="plans-toolbar">

          <div className="plans-search">
            <Search size={18} />

            <input
              placeholder="Search by plan ID, name or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="plans-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

        </div>

        {/* Table */}
        <div className="plans-table-scroll">

          <table className="plans-table">

            <thead>
              <tr>
                <th>Plan ID</th>
                <th>Plan Name</th>
                <th>Instrument Type</th>
                <th>Interval</th>
                <th>Tolerance</th>
                <th>Effective From</th>
                <th>Effective To</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {filteredPlans.map((plan) => (

                <tr key={plan.id}>

                  <td>{plan.id}</td>

                  <td>{plan.name}</td>

                  <td>{plan.type}</td>

                  <td>{plan.interval} Months</td>

                  <td>{plan.tolerance}</td>

                  <td>{plan.effectiveFrom}</td>

                  <td>{plan.effectiveTo || "No expiry"}</td>

                  <td>
                    <span
                      className={`plan-status ${plan.status.toLowerCase()}`}
                    >
                      {plan.status}
                    </span>
                  </td>

                </tr>

              ))}

              {filteredPlans.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-plans">
                    No calibration plans found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      <p className="plans-note">
        Calibration plans are stored in the SQLite database.
      </p>

    </div>
  );
}

export default CalibrationPlans;
