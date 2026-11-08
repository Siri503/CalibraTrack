
import React, { useState, useEffect } from "react";
import { useCalibration } from "../context/CalibrationContext";
import {
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Clock
} from "lucide-react";

import "./ProductionUsage.css";

function ProductionUsage() {
  const { usageRecords, setUsageRecords } = useCalibration();

  const [instruments, setInstruments] = useState([]);

  const [formData, setFormData] = useState({
    instrument: "",
    batchId: "",
    usageDate: "",
    operator: "",
    productionLine: ""
  });

  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const recordsPerPage = 5;

  // Load all pages from an API endpoint.
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

    // Fetch remaining pages in small batches.
    for (let start = 2; start <= totalPages; start += 10) {
      const pages = [];

      for (
        let page = start;
        page < Math.min(start + 10, totalPages + 1);
        page++
      ) {
        pages.push(page);
      }

      const results = await Promise.all(
        pages.map(async (page) => {
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

          return result.data || [];
        })
      );

      records = records.concat(...results);
    }

    return records;
  };

  // Load instruments and existing production usage from SQLite.
  useEffect(() => {
    const loadProductionData = async () => {
      try {
        const [assetRecords, usageData] = await Promise.all([
          loadAllPages("assets"),
          loadAllPages("production-usage")
        ]);

        setInstruments(assetRecords);

        // The existing UI displays the instrument ID in this column.
        const formattedUsage = usageData.map((record) => ({
          ...record,
          instrument: record.assetId || record.instrument
        }));

        setUsageRecords(formattedUsage);
      } catch (error) {
        console.error("Load production usage error:", error);
        alert(error.message);
      }
    };

    loadProductionData();
  }, [setUsageRecords]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // Save production usage directly to SQLite.
  const handleSubmit = async (e) => {
    e.preventDefault();

    const today = new Date().toISOString().slice(0, 10);

    if (formData.usageDate > today) {
      alert("Usage date cannot be in the future.");
      return;
    }

    const selectedInstrument = instruments.find(
      (item) => item.id === formData.instrument
    );

    if (!selectedInstrument) {
      alert("Please select a valid instrument.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/production-usage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formData)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to save production usage."
        );
      }

      const savedRecord = {
        ...result.data,
        instrument: result.data.assetId || result.data.instrument
      };

      setUsageRecords((previous) => [
        savedRecord,
        ...previous
      ]);

      setFormData({
        instrument: "",
        batchId: "",
        usageDate: "",
        operator: "",
        productionLine: ""
      });

      setCurrentPage(1);
      setShowForm(false);

      alert(
        `Production usage recorded successfully! Status: ${result.data.status}`
      );
    } catch (error) {
      console.error("Save production usage error:", error);
      alert(error.message);
    }
  };

  const filteredUsageRecords = usageRecords.filter((record) => {
    const search = searchTerm.toLowerCase();

    return (
      String(record.instrument || "").toLowerCase().includes(search) ||
      String(record.batchId || "").toLowerCase().includes(search) ||
      String(record.operator || "").toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(
    filteredUsageRecords.length / recordsPerPage
  );

  const startIndex = (currentPage - 1) * recordsPerPage;

  const currentRecords = filteredUsageRecords.slice(
    startIndex,
    startIndex + recordsPerPage
  );

  const totalUsage = usageRecords.length;

  const validUsage = usageRecords.filter(
    (record) => record.status === "Valid"
  ).length;

  const invalidUsage = usageRecords.filter(
    (record) => record.status === "Invalid"
  ).length;

  const pendingUsage = usageRecords.filter(
    (record) => record.status === "Pending Review"
  ).length;

  const summaryCards = [
    {
      title: "Total Usage Records",
      value: totalUsage,
      icon: ClipboardList,
      color: "blue"
    },
    {
      title: "Valid Usage",
      value: validUsage,
      icon: CheckCircle,
      color: "green"
    },
    {
      title: "Invalid Usage",
      value: invalidUsage,
      icon: AlertTriangle,
      color: "red"
    },
    {
      title: "Pending Review",
      value: pendingUsage,
      icon: Clock,
      color: "orange"
    }
  ];

  return (
    <div className="production-usage-page">

      <div className="page-header">
        <div>
          <h1>Production Usage Management</h1>
          <p>
            Track instrument usage and monitor calibration compliance
            during production.
          </p>
        </div>

        <button
            className="primary-btn"
            onClick={() => setShowForm(true)}
            >
            + Record Usage
            </button>
      </div>

      <div className="usage-summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div className="usage-summary-card" key={card.title}>
              <div className={`usage-icon ${card.color}`}>
                <Icon size={25} />
              </div>

              <h2>{card.value}</h2>
              <p>{card.title}</p>
            </div>
          );
        })}
      </div>
      
      <div className="usage-history-container">
        <h2>Production Usage History</h2>
        <p>View and monitor recorded instrument usage.</p>
        <div className="usage-search">
          <input
            type="text"
            placeholder="Search by Instrument ID, Batch ID or Operator..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="usage-table-wrapper">
          <table className="usage-table">
            <thead>
              <tr>
                <th>Usage ID</th>
                <th>Instrument ID</th>
                <th>Batch ID</th>
                <th>Usage Date</th>
                <th>Operator</th>
                <th>Production Line</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsageRecords.length === 0 ? (
                <tr>
                  <td colSpan="7">No usage records found.</td>
                </tr>
              ) : (
                currentRecords.map((record) => (
                 <tr key={record.id}>
                    <td>{record.id}</td>
                    <td>{record.instrument}</td>
                    <td>{record.batchId}</td>
                    <td>{record.usageDate}</td>
                    <td>{record.operator}</td>
                    <td>{record.productionLine}</td>
                    <td>
                      <span className={`usage-status-badge ${record.status.toLowerCase().replace(" ", "-")}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
            <button
              onClick={() => setCurrentPage((previous) => previous - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage((previous) => previous + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </button>
          </div>
      </div>

      
      {showForm && (
        <div className="usage-form-container">
          <div className="usage-form-header">
            <h2>Record Production Usage</h2>

            <button
              className="close-btn"
              onClick={() => setShowForm(false)}
            >
              ×
            </button>
          </div>
           <form className="usage-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Instrument</label>
               <select
                  name="instrument"
                  value={formData.instrument}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Instrument</option>

                  {instruments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {item.id}
                    </option>
                  ))}
                </select>
            </div>

            <div className="form-group">
              <label>Production Batch ID</label>
              <input
                type="text"
                name="batchId"
                value={formData.batchId}
                onChange={handleInputChange}
                placeholder="Example: BATCH-001"
                required
                />
            </div>

            <div className="form-group">
              <label>Usage Date</label>
                <input
                type="date"
                name="usageDate"
                value={formData.usageDate}
                onChange={handleInputChange}
                required
                />
            </div>

            <div className="form-group">
              <label>Operator Name</label>
              <input
                type="text"
                name="operator"
                value={formData.operator}
                onChange={handleInputChange}
                placeholder="Enter operator name"
                required
                />
            </div>

            <div className="form-group">
              <label>Production Line</label>
                <input
                    type="text"
                    name="productionLine"
                    value={formData.productionLine}
                    onChange={handleInputChange}
                    placeholder="Example: Production Line 1"
                    required
                    />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button type="submit" className="primary-btn">
                Save Usage
              </button>
            </div>
          </form>
        </div>
      )}


    </div>
  );
}

export default ProductionUsage;
