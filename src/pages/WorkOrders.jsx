

import { useState, useEffect } from "react";
import {
  Wrench,
  ClipboardList,
  AlertTriangle,
  Search,
  ClipboardCheck
} from "lucide-react";

import { useCalibration } from "../context/CalibrationContext";
import "./WorkOrders.css";

function WorkOrders() {
  const {
    workOrders,
    setWorkOrders,
    setAuditRecords
  } = useCalibration();

  const [search, setSearch] = useState(() => {
  return new URLSearchParams(window.location.search).get("search") || "";
});

const [selectedOrder, setSelectedOrder] = useState(null);

  const [assessmentData, setAssessmentData] = useState({
    assessmentDate: new Date().toISOString().slice(0, 10),
    assessedBy: "",
    productionAffected: "",
    affectedBatches: "",
    immediateAction: "",
    notes: ""
  });

  const [maintenanceOrder, setMaintenanceOrder] = useState(null);

  const [maintenanceData, setMaintenanceData] = useState({
    technician: "",
    completionDate: new Date().toISOString().slice(0, 10),
    correctiveAction: "",
    remarks: ""
  });

  // Load all work orders from SQLite through the backend
  useEffect(() => {
    const loadWorkOrders = async () => {
      try {
        const firstResponse = await fetch(
          "http://localhost:5000/api/work-orders?page=1&limit=500"
        );

        if (!firstResponse.ok) {
          throw new Error("Unable to load work orders.");
        }

        const firstData = await firstResponse.json();

        if (!firstData.success) {
          throw new Error(firstData.message || "Unable to load work orders.");
        }

        let allOrders = firstData.data || [];

        const totalPages = firstData.pagination?.totalPages || 1;

        for (let page = 2; page <= totalPages; page++) {
          const response = await fetch(
            `http://localhost:5000/api/work-orders?page=${page}&limit=500`
          );

          if (!response.ok) {
            throw new Error(`Unable to load work orders page ${page}.`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || "Unable to load work orders.");
          }

          allOrders = [...allOrders, ...(result.data || [])];
        }

        setWorkOrders(allOrders);
      } catch (error) {
        console.error("Load work orders error:", error);
        alert(error.message);
      }
    };

    const loadAuditHistory = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/audit-history?limit=100"
        );

        if (!response.ok) return;

        const result = await response.json();

        if (result.success) {
          setAuditRecords(result.data || []);
        }
      } catch (error) {
        console.error("Load audit history error:", error);
      }
    };

    loadWorkOrders();
    loadAuditHistory();
  }, [setWorkOrders, setAuditRecords]);

  const filteredOrders = workOrders.filter((item) => {
  const searchValue = search.toLowerCase();

  return (
    String(item.id || "").toLowerCase().includes(searchValue) ||
    String(item.assetId || "").toLowerCase().includes(searchValue) ||
    String(item.instrumentName || "").toLowerCase().includes(searchValue) ||
    String(item.calibrationId || "").toLowerCase().includes(searchValue)
  );
});

  const openOrders = workOrders.filter(
    (item) =>
      item.status === "Open" ||
      item.status === "Pending Verification"
  ).length;

  const impactRequired = workOrders.filter(
    (item) => item.impactAssessment === "Required"
  ).length;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setAssessmentData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // Save impact assessment to SQLite
  const handleAssessmentSubmit = async (e) => {
    e.preventDefault();

    if (!selectedOrder) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/work-orders/${encodeURIComponent(selectedOrder.id)}/assessment`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(assessmentData)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save impact assessment.");
      }

      const updatedOrder = result.data;

      setWorkOrders((previous) =>
        previous.map((item) =>
          item.id === updatedOrder.id ? updatedOrder : item
        )
      );

      // Reload audit history from SQLite
      const auditResponse = await fetch(
        "http://localhost:5000/api/audit-history?limit=100"
      );

      if (auditResponse.ok) {
        const auditResult = await auditResponse.json();

        if (auditResult.success) {
          setAuditRecords(auditResult.data || []);
        }
      }

      alert("Impact assessment saved successfully!");

      setSelectedOrder(null);

      setAssessmentData({
        assessmentDate: new Date().toISOString().slice(0, 10),
        assessedBy: "",
        productionAffected: "",
        affectedBatches: "",
        immediateAction: "",
        notes: ""
      });
    } catch (error) {
      console.error("Save assessment error:", error);
      alert(error.message);
    }
  };

  const handleOpenAssessment = (order) => {
    setSelectedOrder(order);

    setAssessmentData({
      assessmentDate: new Date().toISOString().slice(0, 10),
      assessedBy: "",
      productionAffected: "",
      affectedBatches: "",
      immediateAction: "",
      notes: ""
    });
  };

  const handleMaintenanceChange = (e) => {
    const { name, value } = e.target;

    setMaintenanceData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleOpenMaintenance = (order) => {
    setMaintenanceOrder(order);

    setMaintenanceData({
      technician: "",
      completionDate: new Date().toISOString().slice(0, 10),
      correctiveAction: "",
      remarks: ""
    });
  };

  // Save corrective maintenance to SQLite
  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();

    if (!maintenanceOrder) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/work-orders/${encodeURIComponent(maintenanceOrder.id)}/maintenance`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(maintenanceData)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save maintenance details.");
      }

      const updatedOrder = result.data;

      setWorkOrders((previous) =>
        previous.map((item) =>
          item.id === updatedOrder.id ? updatedOrder : item
        )
      );

      // Reload audit history from SQLite
      const auditResponse = await fetch(
        "http://localhost:5000/api/audit-history?limit=100"
      );

      if (auditResponse.ok) {
        const auditResult = await auditResponse.json();

        if (auditResult.success) {
          setAuditRecords(auditResult.data || []);
        }
      }

      alert("Corrective maintenance saved successfully. Awaiting verification.");

      setMaintenanceOrder(null);
    } catch (error) {
      console.error("Save maintenance error:", error);
      alert(error.message);
    }
  };

  return (
    <div className="workorders-page">

      {/* Page Header */}
      <div className="workorders-header">
        <div>
          <h1>Work Order Management</h1>
          <p>
            Track corrective maintenance and failed calibration instruments.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="workorder-stats">

        <div className="workorder-stat">
          <ClipboardList size={25} color="#2563eb" />
          <h2>{workOrders.length}</h2>
          <p>Total Work Orders</p>
        </div>

        <div className="workorder-stat">
          <Wrench size={25} color="#d97706" />
          <h2>{openOrders}</h2>
          <p>Open Work Orders</p>
        </div>

        <div className="workorder-stat">
          <AlertTriangle size={25} color="#dc2626" />
          <h2>{impactRequired}</h2>
          <p>Impact Assessments Required</p>
        </div>

      </div>

      {/* Impact Assessment Form */}
      {selectedOrder && (
        <div className="impact-assessment-panel">

          <h2>Impact Assessment</h2>

          <p>
            Assess the production impact of the failed instrument.
          </p>

          <div className="assessment-instrument-info">
            <strong>Work Order:</strong> {selectedOrder.id}
            <br />
            <strong>Instrument:</strong> {selectedOrder.assetId} -{" "}
            {selectedOrder.instrumentName}
          </div>

          <form onSubmit={handleAssessmentSubmit}>

            <div className="assessment-form-grid">

              <div className="assessment-field">
                <label>Assessment Date *</label>

                <input
                  type="date"
                  name="assessmentDate"
                  value={assessmentData.assessmentDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="assessment-field">
                <label>Assessed By *</label>

                <input
                  type="text"
                  name="assessedBy"
                  value={assessmentData.assessedBy}
                  onChange={handleChange}
                  placeholder="Enter engineer or quality officer name"
                  required
                />
              </div>

              <div className="assessment-field">
                <label>Was Production Affected? *</label>

                <select
                  name="productionAffected"
                  value={assessmentData.productionAffected}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select an option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Unknown">Unknown - Investigation Required</option>
                </select>
              </div>

              <div className="assessment-field">
                <label>Affected Batches / Products</label>

                <input
                  type="text"
                  name="affectedBatches"
                  value={assessmentData.affectedBatches}
                  onChange={handleChange}
                  placeholder="Enter batch or product references"
                />
              </div>

              <div className="assessment-field assessment-full-width">
                <label>Immediate Action Taken *</label>

                <select
                  name="immediateAction"
                  value={assessmentData.immediateAction}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select immediate action</option>
                  <option value="Instrument isolated">
                    Instrument isolated
                  </option>
                  <option value="Production placed on hold">
                    Production placed on hold
                  </option>
                  <option value="Affected batches identified">
                    Affected batches identified
                  </option>
                  <option value="Further investigation required">
                    Further investigation required
                  </option>
                </select>
              </div>

              <div className="assessment-field assessment-full-width">
                <label>Assessment Notes *</label>

                <textarea
                  name="notes"
                  value={assessmentData.notes}
                  onChange={handleChange}
                  placeholder="Describe the investigation, potential impact and findings..."
                  rows="4"
                  required
                />
              </div>

            </div>

            <div className="assessment-actions">

              <button type="submit" className="assessment-save-btn">
                <ClipboardCheck size={17} />
                Save Assessment
              </button>

              <button
                type="button"
                className="assessment-cancel-btn"
                onClick={() => setSelectedOrder(null)}
              >
                Cancel
              </button>

            </div>

          </form>
        </div>
      )}
      
{/* Corrective Maintenance Form */}
{maintenanceOrder && (
  <div className="impact-assessment-panel">

    <h2>Complete Corrective Maintenance</h2>

    <p>Record the corrective maintenance performed on the instrument.</p>

    <div className="assessment-instrument-info">
      <strong>Work Order:</strong> {maintenanceOrder.id}
      <br />
      <strong>Instrument:</strong> {maintenanceOrder.assetId} -{" "}
      {maintenanceOrder.instrumentName}
    </div>

    <form onSubmit={handleMaintenanceSubmit}>

      <div className="assessment-form-grid">

        <div className="assessment-field">
          <label>Maintenance Technician *</label>
          <input
            type="text"
            name="technician"
            value={maintenanceData.technician}
            onChange={handleMaintenanceChange}
            placeholder="Enter technician name"
            required
          />
        </div>

        <div className="assessment-field">
          <label>Completion Date *</label>
          <input
            type="date"
            name="completionDate"
            value={maintenanceData.completionDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={handleMaintenanceChange}
            required
          />
        </div>

        <div className="assessment-field assessment-full-width">
          <label>Corrective Action Performed *</label>
          <select
            name="correctiveAction"
            value={maintenanceData.correctiveAction}
            onChange={handleMaintenanceChange}
            required
          >
            <option value="">Select corrective action</option>
            <option value="Instrument repaired">Instrument repaired</option>
            <option value="Instrument adjusted">Instrument adjusted</option>
            <option value="Component replaced">Component replaced</option>
            <option value="Instrument replaced">Instrument replaced</option>
            <option value="Other maintenance">Other maintenance</option>
          </select>
        </div>

        <div className="assessment-field assessment-full-width">
          <label>Maintenance Remarks *</label>
          <textarea
            name="remarks"
            value={maintenanceData.remarks}
            onChange={handleMaintenanceChange}
            placeholder="Describe the maintenance work performed..."
            rows="4"
            required
          />
        </div>

      </div>

      <div className="assessment-actions">

        <button type="submit" className="assessment-save-btn">
          <Wrench size={17} />
          Complete Work Order
        </button>

        <button
          type="button"
          className="assessment-cancel-btn"
          onClick={() => setMaintenanceOrder(null)}
        >
          Cancel
        </button>

      </div>

    </form>
  </div>
)}

      {/* Work Orders Table */}
      <div className="workorders-table-panel">

        <h2>Corrective Work Orders</h2>

        <p>
          Review maintenance actions created from failed calibrations.
        </p>

        <div className="workorders-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search by work order ID or instrument..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="workorders-table-scroll">

          <table className="workorders-table">

            <thead>
              <tr>
                <th>Work Order ID</th>
                <th>Instrument ID</th>
                <th>Instrument Name</th>
                <th>Calibration ID</th>
                <th>Created Date</th>
                <th>Status</th>
                <th>Impact Assessment</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredOrders.map((item) => (

                <tr key={item.id}>

                  <td>{item.id}</td>
                  <td>{item.assetId}</td>
                  <td>{item.instrumentName}</td>
                  <td>{item.calibrationId}</td>
                  <td>{item.createdDate}</td>

                  <td>
                    <span
                       className={
                            item.status === "Completed"
                              ? "workorder-completed-status"
                              : item.status === "Pending Verification"
                              ? "workorder-pending-status"
                              : "workorder-open-status"
                          }
                        >
                        {item.status}
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        item.impactAssessment === "Completed"
                          ? "impact-completed-status"
                          : "impact-required-status"
                      }
                    >
                      {item.impactAssessment}
                    </span>
                  </td>

                  <td>     
                      {item.impactAssessment === "Required" ? (
                        <button
                          className="assessment-action-btn"
                          onClick={() => handleOpenAssessment(item)}
                        >
                          Assess
                        </button>
                      ) : item.verificationStatus === "Passed" ||
                        item.status === "Completed" ? (
                        <span className="assessment-done-text">
                          Completed
                        </span>
                      ) : item.status === "Pending Verification" &&
                        item.verificationStatus !== "Failed" ? (
                        <span className="assessment-done-text">
                          Awaiting Verification
                        </span>
                      ) : (
                        <button
                          className="assessment-action-btn"
                          onClick={() => handleOpenMaintenance(item)}
                        >
                          Complete Maintenance
                        </button>
                      )}

                    </td>

                </tr>

              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-workorders">
                    No work orders found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      <p className="workorders-note">
        Work orders are displayed from shared calibration data.
      </p>

    </div>
  );
}

export default WorkOrders;
