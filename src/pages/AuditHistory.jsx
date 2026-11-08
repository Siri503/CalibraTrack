
import { useCalibration } from "../context/CalibrationContext";
import { ClipboardList, Search } from "lucide-react";
import { useEffect, useState } from "react";
import "./AuditHistory.css";

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

function AuditHistory() {
  const { auditRecords, setAuditRecords } = useCalibration();

  const [search, setSearch] = useState("");

  // Fetch audit history from SQLite through the backend.
  useEffect(() => {
    let isMounted = true;

    const fetchAuditHistory = async () => {
      try {
        const records = await loadAllPages("audit-history");

        if (!isMounted) return;

        const formattedRecords = records.map((record) => ({
          ...record,
          id: record.id || record.auditId,
          activity: record.activity || record.action || "",
          description: record.description || "",
          performedBy: record.performedBy || record.user || "",
          date:
            record.date ||
            record.createdAt ||
            record.performedAt ||
            record.timestamp ||
            "",
          referenceId: record.referenceId || record.entityId || "",
        }));

        setAuditRecords(formattedRecords);
      } catch (error) {
        console.error("Error loading audit history:", error);
      }
    };

    fetchAuditHistory();

    return () => {
      isMounted = false;
    };
  }, [setAuditRecords]);

  const filteredRecords = auditRecords.filter((record) =>
    [
      record.id,
      record.activity,
      record.description,
      record.performedBy,
      record.referenceId,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div>
          <h1>Audit History</h1>
          <p>
            Track important activities and maintain system traceability.
          </p>
        </div>
      </div>

      <div className="audit-summary">
        <ClipboardList size={26} color="#2563eb" />
        <div>
          <h2>{auditRecords.length}</h2>
          <p>Total Audit Records</p>
        </div>
      </div>

      <div className="audit-table-panel">
        <h2>Activity History</h2>
        <p>Review recorded system activities.</p>

        <div className="audit-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search activity, user or reference ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="audit-table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Activity</th>
                <th>Description</th>
                <th>Performed By</th>
                <th>Date & Time</th>
                <th>Reference ID</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.id}</td>
                    <td>{record.activity}</td>
                    <td>{record.description}</td>
                    <td>{record.performedBy}</td>
                    <td>{record.date}</td>
                    <td>{record.referenceId}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-audit">
                    No audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditHistory;
