import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Search
} from "lucide-react";

import "./Calibration.css";

import { useCalibration } from "../context/CalibrationContext";


function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function Calibration() {
  const [instruments, setInstruments] = useState([]);

  const {
    calibrations,
    setCalibrations,
    certificates,
    setCertificates,
    workOrders,
    setWorkOrders,
    auditRecords,
    setAuditRecords
  } = useCalibration();

  useEffect(() => {
    const loadAllPages = async (endpoint) => {
      const firstResponse = await fetch(
        `http://localhost:5000/api/${endpoint}?page=1&limit=500`
      );

      const firstResult = await firstResponse.json();

      if (!firstResponse.ok || !firstResult.success) {
        throw new Error(`Unable to load ${endpoint}.`);
      }

      let records = firstResult.data || [];
      const totalPages = firstResult.pagination?.totalPages || 1;

      for (let page = 2; page <= totalPages; page++) {
        const response = await fetch(
          `http://localhost:5000/api/${endpoint}?page=${page}&limit=500`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(`Unable to load ${endpoint} page ${page}.`);
        }

        records = [...records, ...(result.data || [])];
      }

      return records;
    };
    const loadRecentAuditHistory = async () => {
  const response = await fetch(
    "http://localhost:5000/api/audit-history?limit=100"
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error("Unable to load recent audit history.");
  }

  return result.data || [];
};

    const loadCalibrationData = async () => {
      try {
        const [
          assets,
          plans,
          calibrationRecords,
          certificateRecords,
          workOrderRecords,
          auditHistory
        ] = await Promise.all([
          loadAllPages("assets"),
          loadAllPages("calibration-plans"),
          loadAllPages("calibrations"),
          loadAllPages("certificates"),
          loadAllPages("work-orders"),
          loadRecentAuditHistory()
        ]);

        const instrumentOptions = assets.map((asset) => {
          const plan = plans.find(
            (item) => item.id === asset.calibrationPlanId
          );

          const toleranceText = String(plan?.tolerance ?? "");

          const toleranceNumber = Number(
            toleranceText.replace(/[^\d.]/g, "")
          );

          const reference = Number(asset.referenceValue);

          const allowedError =
            plan?.toleranceUnit?.includes("%")
              ? (Math.abs(reference) * toleranceNumber) / 100
              : toleranceNumber;

          return {
            assetId: asset.id,
            name: asset.name,
            reference,
            tolerance: plan ? allowedError : null,
            toleranceLabel: toleranceText
          };
        });

        setInstruments(instrumentOptions);

        setCalibrations(calibrationRecords);
        setCertificates(certificateRecords);
        setWorkOrders(workOrderRecords);
        setAuditRecords(auditHistory);
      } catch (error) {
        console.error("Calibration API Error:", error);
        alert(error.message);
      }
    };

    loadCalibrationData();
  }, [
    setCalibrations,
    setCertificates,
    setWorkOrders,
    setAuditRecords
  ]);


  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const [formData, setFormData] = useState({
    assetId: "",
    date: getToday(),
    measured: "",
    engineer: ""
  });

  // Find the selected instrument.
  const selectedInstrument = instruments.find(
    (item) => item.assetId === formData.assetId
  );

  // Calculate error automatically.
  const measuredValue = Number(formData.measured);

  const error =
    formData.measured !== "" && selectedInstrument
      ? Math.abs(measuredValue - selectedInstrument.reference)
      : null;

  // Determine Pass or Fail automatically.
  const result =
    error === null
      ? ""
      : error <= selectedInstrument.tolerance
        ? "Pass"
        : "Fail";

  // Summary calculations.
  const total = calibrations.length;

  const passed = calibrations.filter(
    (item) => item.result === "Pass"
  ).length;

  const failed = calibrations.filter(
    (item) => item.result === "Fail"
  ).length;

  const filteredCalibrations = calibrations.filter(
    (item) =>
      item.assetId.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase())
  );

  // Update form fields.
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // Save a new calibration record.

// Save a new calibration record in SQLite
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!selectedInstrument) {
    alert("Please select an instrument.");
    return;
  }

  if (
    formData.measured === "" ||
    !Number.isFinite(measuredValue)
  ) {
    alert("Please enter a valid measured value.");
    return;
  }

  if (!formData.engineer.trim()) {
    alert("Please enter the engineer name.");
    return;
  }

  if (formData.date > getToday()) {
    alert("Calibration date cannot be in the future.");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/calibrations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          assetId: selectedInstrument.assetId,
          date: formData.date,
          measured: measuredValue,
          engineer: formData.engineer.trim()
        })
      }
    );

    const resultData = await response.json();

    if (!response.ok || !resultData.success) {
      throw new Error(
        resultData.message || "Unable to save calibration."
      );
    }

    const {
      calibration,
      certificate,
      workOrder,
      updatedWorkOrder,
      auditRecord
    } = resultData.data;

    // Update calibration history.
    setCalibrations((previous) => [
      calibration,
      ...previous
    ]);

    // Update certificates when calibration passes.
    if (certificate) {
      setCertificates((previous) => [
        certificate,
        ...previous
      ]);
    }

    // Update an existing work order after verification.
    setWorkOrders((previous) => {
      let updated = previous;

      if (updatedWorkOrder) {
        updated = previous.map((item) =>
          item.id === updatedWorkOrder.id
            ? {
                ...item,
                ...updatedWorkOrder
              }
            : item
        );
      }

      // Add a corrective work order when calibration fails.
      if (workOrder) {
        updated = [workOrder, ...updated];
      }

      return updated;
    });

    // Update Audit History.
    setAuditRecords((previous) => [
      auditRecord,
      ...previous
    ]);

    // Refresh the instrument's latest calibration information.
    if (resultData.data.updatedAsset) {
      setInstruments((previous) =>
        previous.map((item) =>
          item.assetId === resultData.data.updatedAsset.id
            ? {
                ...item
              }
            : item
        )
      );
    }

    // Display the workflow result.
    if (calibration.result === "Pass") {
      setLastAction({
        type: "certificate",
        id: certificate.id,
        message: updatedWorkOrder
          ? "Post-maintenance calibration passed. Certificate generated and original work order verified."
          : "Calibration passed. Certificate generated successfully."
      });
    } else {
      setLastAction({
        type: "work-order",
        id: workOrder.id,
        message: updatedWorkOrder
          ? "Post-maintenance verification failed. Another corrective work order has been created."
          : "Calibration failed. Corrective work order created. Impact assessment required."
      });
    }

    setFormData({
      assetId: "",
      date: getToday(),
      measured: "",
      engineer: ""
    });

    setShowForm(false);

    alert("Calibration recorded successfully!");
  } catch (error) {
    console.error("Calibration registration error:", error);
    alert(error.message);
  }
};


  return (
    <div className="calibration-page">

      {/* Page Header */}
      <div className="calibration-header">
        <div>
          <h1>Calibration Management</h1>
          <p>
            Record calibration results and monitor instrument accuracy.
          </p>
        </div>

        <button
          className="add-calibration-btn"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={18} />
          Record Calibration
        </button>
      </div>

      {/* Summary Cards */}
      <div className="calibration-stats">

        <div className="calibration-stat">
          <ClipboardCheck color="#2563eb" size={24} />
          <h2>{total}</h2>
          <p>Total Calibrations</p>
        </div>

        <div className="calibration-stat">
          <CheckCircle color="#16a34a" size={24} />
          <h2>{passed}</h2>
          <p>Passed</p>
        </div>

        <div className="calibration-stat">
          <XCircle color="#dc2626" size={24} />
          <h2>{failed}</h2>
          <p>Failed</p>
        </div>

        <div className="calibration-stat">
          <Clock color="#d97706" size={24} />
          <h2>0</h2>
          <p>Pending</p>
        </div>

      </div>

        
{/* Automatic Workflow Result */}
{lastAction && (
  <div className={`workflow-result ${lastAction.type}`}>
    <h3>
      {lastAction.type === "certificate"
        ? "Certificate Generated"
        : "Corrective Work Order Created"}
    </h3>

    <p>{lastAction.message}</p>

    <strong>Reference ID: {lastAction.id}</strong>
  </div>
)}

{/* Workflow Summary */}
<div className="workflow-summary">
  <div>
    <h3>{certificates.length}</h3>
    <p>Certificates Generated</p>
  </div>

  <div>
    <h3>{workOrders.length}</h3>
    <p>Corrective Work Orders</p>
  </div>
</div>



      {/* New Calibration Form */}
      {showForm && (
        <div className="calibration-form-panel">

          <h2>Record New Calibration</h2>
          <p>Enter the instrument's calibration measurement details.</p>

          <form onSubmit={handleSubmit}>

            <div className="calibration-form-grid">

              <div className="calibration-field">
                <label>Instrument *</label>

                <select
                  name="assetId"
                  value={formData.assetId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Instrument</option>

                  {instruments.map((item) => (
                    <option key={item.assetId} value={item.assetId}>
                      {item.assetId} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="calibration-field">
                <label>Calibration Date *</label>

                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  max={getToday()}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="calibration-field">
                <label>Reference Value</label>

                <input
                  type="number"
                  value={selectedInstrument?.reference ?? ""}
                  readOnly
                  placeholder="Select an instrument"
                />
              </div>

              <div className="calibration-field">
                <label>Measured Value *</label>

                <input
                  type="number"
                  name="measured"
                  value={formData.measured}
                  onChange={handleChange}
                  step="any"
                  placeholder="Enter measured value"
                  required
                />
              </div>

              <div className="calibration-field">
                <label>Allowed Tolerance</label>

                <input
                  type="text"
                  value={
                    selectedInstrument
                      ? `± ${selectedInstrument.tolerance}`
                      : ""
                  }
                  readOnly
                  placeholder="Select an instrument"
                />
              </div>

              <div className="calibration-field">
                <label>Engineer Name *</label>

                <input
                  type="text"
                  name="engineer"
                  value={formData.engineer}
                  onChange={handleChange}
                  placeholder="Enter engineer name"
                  required
                />
              </div>

            </div>

            {/* Automatic Result Preview */}
            {selectedInstrument && formData.measured !== "" && (
              <div className="calibration-result-preview">

                <div>
                  <strong>Calculated Error:</strong>{" "}
                  {error.toFixed(2)}
                </div>

                <div>
                  <strong>Calibration Result:</strong>{" "}
                  <span
                    className={`calibration-result ${result.toLowerCase()}`}
                  >
                    {result}
                  </span>
                </div>

              </div>
            )}

            <div className="calibration-form-actions">

              <button type="submit" className="save-calibration-btn">
                Save Calibration
              </button>

              <button
                type="button"
                className="cancel-calibration-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

            </div>

          </form>
        </div>
      )}

      {/* Calibration History */}
      <div className="calibration-table-panel">

        <h2>Calibration History</h2>
        <p>View previous calibration events and their results.</p>

        <div className="calibration-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search by instrument ID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="calibration-table-scroll">

          <table className="calibration-table">

            <thead>
              <tr>
                <th>Calibration ID</th>
                <th>Instrument ID</th>
                <th>Instrument Name</th>
                <th>Calibration Date</th>
                <th>Measured Value</th>
                <th>Reference Value</th>
                <th>Error</th>
                <th>Result</th>
                <th>Engineer</th>
              </tr>
            </thead>

            <tbody>

              {filteredCalibrations.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.assetId}</td>
                  <td>{item.name}</td>
                  <td>{item.date}</td>
                  <td>{item.measured}</td>
                  <td>{item.reference}</td>

                  <td>
                    {Math.abs(
                      item.measured - item.reference
                    ).toFixed(2)}
                  </td>

                  <td>
                    <span
                      className={`calibration-result ${item.result.toLowerCase()}`}
                    >
                      {item.result}
                    </span>
                  </td>

                  <td>{item.engineer}</td>
                </tr>
              ))}

              {filteredCalibrations.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-calibrations">
                    No calibration records found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>
      </div>

      <p className="calibration-note">
         Calibration records and results are stored in the SQLite database.
      </p>

    </div>
  );
}

export default Calibration;
