
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  BarChart3,
  FileText,
  Download
} from "lucide-react";

import "./Reports.css";

const API_URL = "http://localhost:5000/api";

async function loadAllPages(endpoint) {
  const allRecords = [];
  const limit = 500;
  let page = 1;

  while (true) {
    const response = await fetch(
      `${API_URL}/${endpoint}?page=${page}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Failed to load ${endpoint}`);
    }

    const result = await response.json();

    const records = Array.isArray(result)
      ? result
      : result.data || result.records || result.results || result.items || [];

    allRecords.push(...records);

    const totalPages =
      result.pagination?.totalPages ?? result.totalPages;

    if (totalPages !== undefined) {
      if (page >= totalPages) break;
    } else if (records.length < limit) {
      break;
    }

    page++;
  }

  return allRecords;
}

function Reports() {
  const [selectedReport, setSelectedReport] = useState("calibrations");

  const [calibrations, setCalibrations] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [usageRecords, setUsageRecords] = useState([]);

  // Load all report data from the backend.
  useEffect(() => {
    let isMounted = true;

    const fetchReportData = async () => {
      try {
        const [
          calibrationData,
          certificateData,
          workOrderData,
          usageData
        ] = await Promise.all([
          loadAllPages("calibrations"),
          loadAllPages("certificates"),
          loadAllPages("work-orders"),
          loadAllPages("production-usage")
        ]);

        if (!isMounted) return;

        setCalibrations(
          calibrationData.map((item) => ({
            ...item,
            id: item.id || item.calibrationId,
            name:
              item.instrumentName ||
              item.name ||
              item.assetId ||
              "",
            date:
              item.date ||
              item.calibrationDate ||
              item.createdAt ||
              "",
            measured:
              item.measured ??
              item.measuredValue ??
              "",
            reference:
              item.reference ??
              item.referenceValue ??
              "",
            engineer:
              item.engineer ||
              item.performedBy ||
              item.calibratedBy ||
              ""
          }))
        );

        setCertificates(
          certificateData.map((item) => ({
            ...item,
            id: item.id || item.certificateId,
            assetId: item.assetId || item.instrument || "",
            instrumentName: item.instrumentName || "",
            calibrationId: item.calibrationId || "",
            issueDate: item.issueDate || item.createdAt || "",
            status: item.status || ""
          }))
        );

        setWorkOrders(
          workOrderData.map((item) => ({
            ...item,
            id: item.id || item.workOrderId,
            createdDate:
              item.createdDate ||
              item.createdAt ||
              "",
            instrumentName:
              item.instrumentName ||
              item.name ||
              "",
            verificationStatus:
              item.verificationStatus ||
              "",
            verificationDate:
              item.verificationDate ||
              "",
            verifiedBy:
              item.verifiedBy ||
              ""
          }))
        );

        setUsageRecords(
          usageData.map((item) => ({
            ...item,
            id: item.id || item.usageId,
            instrument:
              item.assetId ||
              item.instrumentId ||
              item.id?.match(/(AST-\d+)/)?.[1] ||
              item.usageId?.match(/(AST-\d+)/)?.[1] ||
              "",
            batchId: item.batchId || "",
            usageDate: item.usageDate || "",
            operator: item.operator || "",
            productionLine: item.productionLine || "",
            status: item.status || ""
          }))
        );
      } catch (error) {
        console.error("Error loading report data:", error);
      }
    };

    fetchReportData();

    return () => {
      isMounted = false;
    };
  }, []);

  const calibrationChartData = [
    {
      name: "Passed",
      value: calibrations.filter((item) => item.result === "Pass").length
    },
    {
      name: "Failed",
      value: calibrations.filter((item) => item.result === "Fail").length
    }
  ];

  const workOrderChartData = [
    {
      name: "Open",
      value: workOrders.filter((item) => item.status === "Open").length
    },
    {
        name: "In Progress",
        value: workOrders.filter(
          (item) => item.status === "In Progress"
        ).length
    },
    {
      name: "Pending Verification",
      value: workOrders.filter(
        (item) => item.status === "Pending Verification"
      ).length
    },
    {
      name: "Completed",
      value: workOrders.filter((item) => item.status === "Completed").length
    }
  ].filter((item) => item.value > 0);

  const usageChartData = [
    {
      name: "Valid",
      value: usageRecords.filter((item) => item.status === "Valid").length
    },
    {
      name: "Invalid",
      value: usageRecords.filter((item) => item.status === "Invalid").length
    },
    {
      name: "Pending Review",
      value: usageRecords.filter(
        (item) => item.status === "Pending Review"
      ).length
    }
  ].filter((item) => item.value > 0);

  const handleExportCSV = () => {
    const reportConfig = {
      calibrations: {
        data: calibrations,
        filename: "CalibraTrack_Calibration_Report.csv",
        headers: [
          "Calibration ID",
          "Instrument ID",
          "Instrument Name",
          "Calibration Date",
          "Measured Value",
          "Reference Value",
          "Tolerance",
          "Result",
          "Engineer"
        ],
        fields: [
          "id",
          "assetId",
          "name",
          "date",
          "measured",
          "reference",
          "tolerance",
          "result",
          "engineer"
        ]
      },

      certificates: {
        data: certificates,
        filename: "CalibraTrack_Certificate_Report.csv",
        headers: [
          "Certificate ID",
          "Instrument ID",
          "Instrument Name",
          "Calibration ID",
          "Issue Date",
          "Status"
        ],
        fields: [
          "id",
          "assetId",
          "instrumentName",
          "calibrationId",
          "issueDate",
          "status"
        ]
      },

      workOrders: {
        data: workOrders,
        filename: "CalibraTrack_Work_Order_Report.csv",
        headers: [
          "Work Order ID",
          "Instrument ID",
          "Instrument Name",
          "Calibration ID",
          "Created Date",
          "Status",
          "Impact Assessment",
          "Verification Status",
          "Verification Date",
          "Verified By"
        ],
        fields: [
          "id",
          "assetId",
          "instrumentName",
          "calibrationId",
          "createdDate",
          "status",
          "impactAssessment",
          "verificationStatus",
          "verificationDate",
          "verifiedBy"
        ]
      },

      usageRecords: {
        data: usageRecords,
        filename: "CalibraTrack_Production_Usage_Report.csv",
        headers: [
          "Usage ID",
          "Instrument ID",
          "Batch ID",
          "Usage Date",
          "Operator",
          "Production Line",
          "Status"
        ],
        fields: [
          "id",
          "instrument",
          "batchId",
          "usageDate",
          "operator",
          "productionLine",
          "status"
        ]
      }
    };

    const report = reportConfig[selectedReport];

    if (!report || report.data.length === 0) {
      alert("No records available for this report.");
      return;
    }

    const rows = report.data.map((item) =>
      report.fields.map((field) => item[field] ?? "")
    );

    const csvContent = [report.headers, ...rows]
      .map((row) =>
        row.map((value) =>
          `"${String(value).replace(/"/g, '""')}"`
        ).join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csvContent],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = report.filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="reports-page">

      <div className="reports-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p>
            Monitor instrument performance and calibration compliance.
          </p>
        </div>

        <div className="report-actions">

          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="report-select"
          >
            <option value="calibrations">Calibration Report</option>
            <option value="certificates">Certificate Report</option>
            <option value="workOrders">Work Order Report</option>
            <option value="usageRecords">Production Usage Report</option>
          </select>

          <button
            className="export-button"
            onClick={handleExportCSV}
          >
            <Download size={18} />
            Export CSV
          </button>

        </div>
      </div>

      <div className="reports-summary-grid">

        <div className="report-card">
          <BarChart3 size={26} />
          <h2>{calibrations.length}</h2>
          <p>Total Calibrations</p>
        </div>

        <div className="report-card">
          <FileText size={26} />
          <h2>{certificates.length}</h2>
          <p>Certificates Generated</p>
        </div>

        <div className="report-card">
          <FileText size={26} />
          <h2>{workOrders.length}</h2>
          <p>Total Work Orders</p>
        </div>

        <div className="report-card">
          <BarChart3 size={26} />
          <h2>{usageRecords.length}</h2>
          <p>Production Usage Records</p>
        </div>

      </div>

      <div className="reports-charts-grid">

        <div className="report-chart-card">
          <h2>Calibration Performance</h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={calibrationChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="report-chart-card">
          <h2>Work Order Status</h2>

          {workOrderChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workOrderChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {workOrderChartData.map((item) => (
                    <Cell
                      key={item.name}
                      fill={
                        item.name === "Open"
                          ? "#f59e0b"
                          : item.name === "In Progress"
                          ? "#16a34a"
                          : item.name === "Pending Verification"
                          ? "#2563eb"
                          : "#16a34a"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">
              No work order records available yet.
            </p>
          )}

        </div>

        <div className="report-chart-card">
          <h2>Production Usage Compliance</h2>

          {usageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usageChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {usageChartData.map((item) => (
                    <Cell
                      key={item.name}
                      fill={
                        item.name === "Valid"
                          ? "#16a34a"
                          : item.name === "Invalid"
                          ? "#dc2626"
                          : "#f59e0b"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">
              No production usage records available yet.
            </p>
          )}

        </div>

      </div>

    </div>
  );
}

export default Reports;
