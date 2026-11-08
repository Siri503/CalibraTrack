
import { useEffect, useState } from "react";
import { FileCheck, Search, ShieldCheck } from "lucide-react";
import { useCalibration } from "../context/CalibrationContext";
import "./Certificates.css";

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

function Certificates() {
  const { certificates, setCertificates } = useCalibration();

  const [search, setSearch] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  // Load certificates and instrument details from SQLite through the API.
  useEffect(() => {
    let isMounted = true;

    const fetchCertificates = async () => {
      try {
        const [certificateData, assetData] = await Promise.all([
          loadAllPages("certificates"),
          loadAllPages("assets"),
        ]);

        if (!isMounted) return;

        const assetMap = new Map(
          assetData.map((asset) => [
            asset.id || asset.assetId,
            asset,
          ])
        );

        const formattedCertificates = certificateData.map((item) => {
          const assetId = item.assetId || item.instrument;
          const asset = assetMap.get(assetId);

          return {
            ...item,
            id: item.id || item.certificateId,
            assetId,
            instrumentName:
              item.instrumentName ||
              asset?.instrumentName ||
              asset?.name ||
              asset?.assetName ||
              "Unknown Instrument",
            calibrationId: item.calibrationId || "",
            issueDate:
              item.issueDate ||
              item.issuedAt ||
              item.createdAt ||
              "",
            status: item.status || "Valid",
          };
        });

        setCertificates(formattedCertificates);
      } catch (error) {
        console.error("Error loading certificates:", error);
      }
    };

    fetchCertificates();

    return () => {
      isMounted = false;
    };
  }, [setCertificates]);

  const filteredCertificates = certificates.filter((item) =>
    String(item.id || "").toLowerCase().includes(search.toLowerCase()) ||
    String(item.assetId || "").toLowerCase().includes(search.toLowerCase()) ||
    String(item.instrumentName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="certificates-page">

      <div className="certificates-header">
        <div>
          <h1>Certificates Management</h1>
          <p>Manage certificates issued after successful calibration.</p>
        </div>
      </div>

      <div className="certificate-stats">
        <div className="certificate-stat">
          <FileCheck size={25} color="#2563eb" />
          <h2>{certificates.length}</h2>
          <p>Total Certificates</p>
        </div>

        <div className="certificate-stat">
          <ShieldCheck size={25} color="#16a34a" />
          <h2>
            {certificates.filter((item) => item.status === "Valid").length}
          </h2>
          <p>Valid Certificates</p>
        </div>
      </div>

      <div className="certificates-table-panel">
        <h2>Issued Certificates</h2>
        <p>View certificates generated from passed calibration events.</p>

        <div className="certificates-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by certificate ID or instrument..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="certificates-table-scroll">
          <table className="certificates-table">
            <thead>
              <tr>
                <th>Certificate ID</th>
                <th>Instrument ID</th>
                <th>Instrument Name</th>
                <th>Calibration ID</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredCertificates.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.assetId}</td>
                  <td>{item.instrumentName}</td>
                  <td>{item.calibrationId}</td>
                  <td>{item.issueDate}</td>
                  <td>
                    <span className="certificate-status">
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="view-certificate-btn"
                      onClick={() => setSelectedCertificate(item)}
                    >
                      View Certificate
                    </button>
                  </td>
                </tr>
              ))}

              {filteredCertificates.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-certificates">
                    No certificates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="certificates-note">
        Certificates are displayed from shared calibration data.
      </p>

      {selectedCertificate && (
        <div className="certificate-modal-overlay">
          <div className="certificate-modal">

            <div className="certificate-modal-header">
              <h2>Calibration Certificate</h2>

              <button
                onClick={() => setSelectedCertificate(null)}
                className="certificate-close-btn"
              >
                ×
              </button>
            </div>

            <div className="certificate-preview">

              <div className="certificate-title">
                <h1>CALIBRATION CERTIFICATE</h1>
                <p>CalibraTrack – Calibration Management System</p>
              </div>

              <hr />

              <h3>Certificate Information</h3>

              <p><strong>Certificate ID:</strong> {selectedCertificate.id}</p>
              <p><strong>Instrument ID:</strong> {selectedCertificate.assetId}</p>
              <p><strong>Instrument Name:</strong> {selectedCertificate.instrumentName}</p>
              <p><strong>Calibration ID:</strong> {selectedCertificate.calibrationId}</p>
              <p><strong>Issue Date:</strong> {selectedCertificate.issueDate}</p>
              <p><strong>Status:</strong> {selectedCertificate.status}</p>

              <div className="certificate-stamp">
                <ShieldCheck size={35} />
                <strong>CALIBRATION PASSED</strong>
              </div>

              <p className="certificate-footer">
                This certificate was generated from a successful calibration record.
              </p>

            </div>

            <div className="certificate-modal-actions">
              <button
                className="download-certificate-btn"
                onClick={() => window.print()}
              >
                Download PDF
              </button>

              <button onClick={() => setSelectedCertificate(null)}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Certificates;
