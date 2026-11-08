
import React from "react";
import { useNavigate } from "react-router-dom";
import { useCalibration } from "../context/CalibrationContext";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle
} from "lucide-react";

import "./Alerts.css";

function Alerts() {
const navigate = useNavigate();
const [searchTerm, setSearchTerm] = React.useState("");
const [selectedType, setSelectedType] = React.useState("All");
const [selectedSeverity, setSelectedSeverity] = React.useState("All");
const [selectedStatus, setSelectedStatus] = React.useState("All");
const [alertView, setAlertView] = React.useState("Active");
const [selectedAlert, setSelectedAlert] = React.useState(null);
const {
  calibrations,
  workOrders,
  usageRecords,
  alertStatuses,
  setAlertStatuses
} = useCalibration();

const [instruments, setInstruments] = React.useState([]);
const [databaseAlerts, setDatabaseAlerts] = React.useState([]);

// Load every page from the backend.
const loadAllPages = async (endpoint) => {
  const firstResponse = await fetch(
    `http://localhost:5000/api/${endpoint}?page=1&limit=500`
  );

  if (!firstResponse.ok) {
    throw new Error(`Unable to load ${endpoint}.`);
  }

  const firstResult = await firstResponse.json();

  if (!firstResult.success) {
    throw new Error(firstResult.message || `Unable to load ${endpoint}.`);
  }

  let records = firstResult.data || [];
  const totalPages = firstResult.pagination?.totalPages || 1;

  for (let page = 2; page <= totalPages; page++) {
    const response = await fetch(
      `http://localhost:5000/api/${endpoint}?page=${page}&limit=500`
    );

    if (!response.ok) {
      throw new Error(`Unable to load ${endpoint}, page ${page}.`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || `Unable to load ${endpoint}.`);
    }

    records = records.concat(result.data || []);
  }

  return records;
};

// Load alerts and instruments from SQLite.
React.useEffect(() => {
  const loadAlerts = async () => {
    try {
      const [alertRecords, assetRecords] = await Promise.all([
        loadAllPages("alerts"),
        loadAllPages("assets")
      ]);

      setInstruments(assetRecords);
      setDatabaseAlerts(alertRecords);

      const savedStatuses = {};

      alertRecords.forEach((item) => {
        savedStatuses[item.id] =
          item.status === "Active" ? "Open" : item.status;
      });

      setAlertStatuses(savedStatuses);
    } catch (error) {
      console.error("Load alerts error:", error);
      alert(error.message);
    }
  };

  loadAlerts();
}, [setAlertStatuses]);

// Convert SQLite alert fields into the fields used by the existing UI.
const detailedAlerts = databaseAlerts.map((item) => {
  const instrument = instruments.find(
    (asset) => asset.id === item.assetId
  );

  return {
    id: item.id,
    instrumentId: item.assetId,
    instrumentName: instrument?.name || item.assetId,
    type: item.alertType,
    description: item.description,
    date: item.date,
    severity: item.severity,
    status: item.status === "Active" ? "Open" : item.status,
    referenceId: item.referenceId
  };
});

const overdueInstruments = detailedAlerts.filter(
  (alert) => alert.type === "Overdue Calibration"
).length;

const failedCalibrations = detailedAlerts.filter(
  (alert) => alert.type === "Calibration Failed" ||
             alert.type === "Failed Calibration"
).length;

const invalidProductionUsage = detailedAlerts.filter(
  (alert) => alert.type === "Invalid Production Usage"
).length;

const upcomingCalibrations = detailedAlerts.filter(
  (alert) => alert.type === "Upcoming Calibration"
).length;

// Save a status change directly to SQLite.
const handleAlertStatusChange = async (alert, newStatus) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/alerts/${encodeURIComponent(alert.id)}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to update alert status.");
    }

    setAlertStatuses((previous) => ({
      ...previous,
      [alert.id]: newStatus
    }));

    setDatabaseAlerts((previous) =>
      previous.map((item) =>
        item.id === alert.id
          ? { ...item, status: newStatus }
          : item
      )
    );
  } catch (error) {
    console.error("Update alert status error:", error);
    alert(error.message);
  }
};

const filteredAlerts = detailedAlerts.filter((alert) => {
  const search = searchTerm.toLowerCase();

  const matchesSearch =
    alert.instrumentId.toLowerCase().includes(search) ||
    alert.type.toLowerCase().includes(search) ||
    alert.severity.toLowerCase().includes(search);

  const matchesType =
    selectedType === "All" || alert.type === selectedType;

  const matchesSeverity =
    selectedSeverity === "All" ||
    alert.severity === selectedSeverity;

  // NEW: Status filter
const currentStatus =
  alertStatuses[alert.id] || alert.status || "Open";

const matchesStatus =
  selectedStatus === "All" ||
  currentStatus === selectedStatus;

    const matchesView =
      alertView === "All" ||
      (alertView === "Active" && currentStatus !== "Resolved") ||
      (alertView === "Resolved" && currentStatus === "Resolved");

      return (
        matchesSearch &&
        matchesType &&
        matchesSeverity &&
        matchesStatus &&
        matchesView
      );
});
const openAlertsCount = detailedAlerts.filter(
  (alert) => (alertStatuses[alert.id] || "Open") === "Open"
).length;

const acknowledgedAlertsCount = detailedAlerts.filter(
  (alert) => alertStatuses[alert.id] === "Acknowledged"
).length;

const resolvedAlertsCount = detailedAlerts.filter(
  (alert) => alertStatuses[alert.id] === "Resolved"
).length;


  const alertCards = [
    {
      title: "Overdue Instruments",
      value: overdueInstruments,
      icon: Clock,
      color: "orange",
      description: "Instruments past their calibration due date"
    },
    {
        title: "Failed Calibrations",
        value: failedCalibrations,
        icon: AlertTriangle,
        color: "red",
        description: "Failed calibration records"
        },
    {
      title: "Invalid Production Usage",
      value: invalidProductionUsage,
      icon: AlertCircle,
      color: "red",
      description: "Usage recorded outside valid calibration"
    },
    {
      title: "Upcoming Calibrations",
      value: upcomingCalibrations,
      icon: CheckCircle,
      color: "blue",
      description: "Instruments approaching their due date"
    }
  ];

  
  return (
    <div className="alerts-page">

      <div className="page-header">
        <div>
          <h1>Alerts Management</h1>
          <p>
            Monitor calibration issues, overdue instruments
            and production compliance alerts.
          </p>
        </div>
      </div>
      <div className="alert-status-summary">
  <div className="status-summary-card open">
    <h3>Open Alerts</h3>
    <h2>{openAlertsCount}</h2>
  </div>

  <div className="status-summary-card acknowledged">
    <h3>Acknowledged Alerts</h3>
    <h2>{acknowledgedAlertsCount}</h2>
  </div>

  <div className="status-summary-card resolved">
    <h3>Resolved Alerts</h3>
    <h2>{resolvedAlertsCount}</h2>
  </div>
</div>
      <div className="alerts-summary-grid">
        {alertCards.map((card) => {
          const Icon = card.icon;

          return (
            <div className="alert-summary-card" key={card.title}>
              <div className={`alert-icon ${card.color}`}>
                <Icon size={25} />
              </div>

              <h2>{card.value}</h2>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          );
        })}
      </div>

     {/* Detailed Alerts Table */}
      <div className="alerts-table-section">
        <div className="alert-view-tabs">
            <button
              className={alertView === "Active" ? "active" : ""}
              onClick={() => setAlertView("Active")}
            >
              Active Alerts ({openAlertsCount + acknowledgedAlertsCount})
            </button>

            <button
              className={alertView === "Resolved" ? "active" : ""}
              onClick={() => setAlertView("Resolved")}
            >
              Resolved History ({resolvedAlertsCount})
            </button>

            <button
              className={alertView === "All" ? "active" : ""}
              onClick={() => setAlertView("All")}
            >
              All Alerts ({detailedAlerts.length})
            </button>
          </div>
        <div className="section-header">
          <h2>Recent Alerts</h2>
          <p>Review calibration failures and production exceptions.</p>
        </div>
        
          <div className="alerts-filters">
            <div className="alerts-search">
              <input
                type="text"
                placeholder="Search by Instrument ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="All">All Alert Types</option>
              <option value="Calibration Failed">Calibration Failed</option>
              <option value="Failed Calibration">Failed Calibration</option>
              <option value="Invalid Production Usage">Invalid Production Usage</option>
              <option value="Overdue Calibration">Overdue Calibration</option>
              <option value="Upcoming Calibration">Upcoming Calibration</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
            </select>
            <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </select>

            <button
            className="reset-filters-btn"
            onClick={() => {
              setSearchTerm("");
              setSelectedType("All");
              setSelectedSeverity("All");
              setSelectedStatus("All");
            }}
          >
            Reset Filters
          </button>
          </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Instrument</th>
                <th>Alert Type</th>
                <th>Description</th>
                <th>Date</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>{alert.id}</td>
                    <td>{alert.instrumentId}</td>
                    <td>{alert.type}</td>
                    <td>{alert.description}</td>
                    <td>{alert.date}</td>
                    <td>
                      <span className={`severity-badge ${alert.severity.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                    </td>
                  <td>
                    <select
                      className={`alert-status-select ${(alertStatuses[alert.id] || "Open").toLowerCase()}`}
                      value={alertStatuses[alert.id] || alert.status || "Open"}
                      onChange={(e) =>handleAlertStatusChange(alert, e.target.value)}
                    >
                      <option value="Open">Open</option>
                      <option value="Acknowledged">Acknowledged</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </td>
                  <td>
                    <button
                        className="alert-action-btn"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        View Details
                      </button>
                      {["Failed Calibration", "Calibration Failed"].includes(alert.type) ? (
                        <button
                          className="alert-action-btn"
                          onClick={() =>
                            navigate(
                              `/work-orders?search=${encodeURIComponent(
                                alert.referenceId || alert.instrumentId
                              )}`
                            )
                          }
                        >
                          View Work Orders
                        </button>
                      ) : alert.type === "Invalid Production Usage" ? (
                        <button
                          className="alert-action-btn"
                          onClick={() => navigate("/production-usage")}
                        >
                          View Usage
                        </button>
                      ) : (
                        <button
                          className="alert-action-btn"
                          onClick={() => navigate("/assets")}
                        >
                          View Instrument
                        </button>
                      )}

                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-alerts">
                    No active alerts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
     {selectedAlert && (
  <div className="alert-modal-overlay">
    <div className="alert-modal">

      <div className="alert-modal-header">
        <h2>Alert Details</h2>
        <button
          className="alert-modal-close"
          onClick={() => setSelectedAlert(null)}
        >
          ×
        </button>
      </div>

      <div className="alert-modal-body">
        <p><strong>Alert ID:</strong> {selectedAlert.id}</p>
        <p><strong>Instrument ID:</strong> {selectedAlert.instrumentId}</p>
        <p>
          <strong>Instrument Name:</strong>{" "}
          {selectedAlert.instrumentName || "Not Available"}
        </p>
        <p><strong>Alert Type:</strong> {selectedAlert.type}</p>
        <p><strong>Description:</strong> {selectedAlert.description}</p>
        <p><strong>Date:</strong> {selectedAlert.date}</p>
        <p><strong>Severity:</strong> {selectedAlert.severity}</p>
        <p>
          <strong>Status:</strong>{" "}
          {alertStatuses[selectedAlert.id] || "Open"}
        </p>
        <p>
          <strong>Recommended Action:</strong>{" "}
          {["Failed Calibration", "Calibration Failed"].includes(selectedAlert.type)
            ? "Send the instrument for maintenance and perform verification calibration."
            : selectedAlert.type === "Invalid Production Usage"
            ? "Investigate the production usage and verify instrument calibration validity."
            : selectedAlert.type === "Overdue Calibration"
            ? "Schedule calibration immediately and restrict usage until calibration is completed."
            : selectedAlert.type === "Upcoming Calibration"
            ? "Schedule calibration before the due date."
            : "Review the alert and take appropriate action."}
        </p>
      </div>

      <div className="alert-modal-footer">
        <button onClick={() => setSelectedAlert(null)}>
          Close
        </button>
      </div>

    </div>
  </div>
)}

    </div>
  );

}

export default Alerts;
