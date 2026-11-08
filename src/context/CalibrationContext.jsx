
import { createContext, useContext, useState, useEffect } from "react";

const CalibrationContext = createContext();

function getStoredData(key, initialData) {
  try {
    const storedData = localStorage.getItem(key);
    return storedData ? JSON.parse(storedData) : initialData;
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return initialData;
  }
}

export function CalibrationProvider({ children }) {
  // Database records are maintained in memory.
  // SQLite is the permanent source of truth.

  const [calibrations, setCalibrations] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [usageRecords, setUsageRecords] = useState([]);
  const [auditRecords, setAuditRecords] = useState([]);

  // Small UI preference data can remain in localStorage.
  const [alertStatuses, setAlertStatuses] = useState(() =>
    getStoredData("alertStatuses", {})
  );

  // Remove old database caches that were previously stored in localStorage.
  useEffect(() => {
    const oldKeys = [
      "calibrations",
      "certificates",
      "workOrders",
      "usageRecords",
      "auditRecords"
    ];

    oldKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Unable to clear old ${key} cache:`, error);
      }
    });
  }, []);

  // Persist only small UI preferences.
  useEffect(() => {
    try {
      localStorage.setItem(
        "alertStatuses",
        JSON.stringify(alertStatuses)
      );
    } catch (error) {
      console.error("Unable to save alert statuses:", error);
    }
  }, [alertStatuses]);

  const value = {
    calibrations,
    setCalibrations,
    certificates,
    setCertificates,
    workOrders,
    setWorkOrders,
    usageRecords,
    setUsageRecords,
    auditRecords,
    setAuditRecords,
    alertStatuses,
    setAlertStatuses
  };

  return (
    <CalibrationContext.Provider value={value}>
      {children}
    </CalibrationContext.Provider>
  );
}

export function useCalibration() {
  return useContext(CalibrationContext);
}
