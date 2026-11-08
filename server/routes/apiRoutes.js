
const express = require("express");
const router = express.Router();
const db = require("../database");

const endpoints = {
  assets: "assets",
  "instrument-types": "instrument_types",
  "calibration-plans": "calibration_plans",
  calibrations: "calibration_events",
  certificates: "certificates",
  "work-orders": "work_orders",
  "production-usage": "production_usage",
  "emergency-extensions": "emergency_extensions",
  alerts: "alerts",
  "audit-history": "audit_records",
  suppliers: "suppliers"
};

// Helper: validate YYYY-MM-DD dates.

function isValidDate(value) {
  if (typeof value !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function calculateDueDate(calibrationDate, intervalMonths) {
  const months = Number(intervalMonths);

  if (!isValidDate(calibrationDate) ||
      !Number.isInteger(months) ||
      months <= 0) {
    throw new Error("Invalid calibration date or interval.");
  }

  const [year, month, day] = calibrationDate
    .split("-")
    .map(Number);

  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;

  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();

  const targetDay = Math.min(day, lastDayOfTargetMonth);

  return [
    targetYear,
    String(targetMonth + 1).padStart(2, "0"),
    String(targetDay).padStart(2, "0")
  ].join("-");
}


// 1. DASHBOARD SUMMARY
router.get("/dashboard/summary", (req, res) => {
  try {
    const getCount = (table) =>
      db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count;

    const today = db.prepare("SELECT date('now') AS today").get().today;

    const totalAssets = getCount("assets");
    const totalCalibrations = getCount("calibration_events");
    const totalCertificates = getCount("certificates");
    const totalWorkOrders = getCount("work_orders");
    const totalUsage = getCount("production_usage");

    const overdueInstruments = db.prepare(`
      SELECT COUNT(*) AS count
      FROM assets
      WHERE dueDate IS NOT NULL
        AND date(dueDate) < date(?)
    `).get(today).count;

    const dueSoonInstruments = db.prepare(`
      SELECT COUNT(*) AS count
      FROM assets
      WHERE dueDate IS NOT NULL
        AND date(dueDate) >= date(?)
        AND date(dueDate) <= date(?, '+30 days')
    `).get(today, today).count;

    const calibrationResults = db.prepare(`
      SELECT result, COUNT(*) AS count
      FROM calibration_events
      GROUP BY result
    `).all();

    const workOrderStatuses = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM work_orders
      GROUP BY status
    `).all();

    const usageStatuses = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM production_usage
      GROUP BY status
    `).all();

    const upcomingCalibrations = db.prepare(`
      SELECT id, name, dueDate
      FROM assets
      WHERE dueDate IS NOT NULL
        AND date(dueDate) >= date(?)
        AND date(dueDate) <= date(?, '+30 days')
      ORDER BY date(dueDate) ASC
      LIMIT 10
    `).all(today, today);

    const recentActivities = db.prepare(`
      SELECT id, activity, description, performedBy,
             date, referenceId, entityType
      FROM audit_records
      ORDER BY date DESC, id DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        totalAssets,
        totalCalibrations,
        totalCertificates,
        totalWorkOrders,
        totalUsage,
        overdueInstruments,
        dueSoonInstruments,
        calibrationResults,
        workOrderStatuses,
        usageStatuses,
        upcomingCalibrations,
        recentActivities,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 2. GET ASSETS WITH THEIR INSTRUMENT TYPE NAME
// This keeps the existing frontend's asset.type field working.
router.get("/assets", (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const total = db.prepare(
      "SELECT COUNT(*) AS count FROM assets"
    ).get().count;

    const records = db.prepare(`
      SELECT
        assets.*,
        instrument_types.name AS type
      FROM assets
      LEFT JOIN instrument_types
        ON assets.instrumentTypeId = instrument_types.id
      ORDER BY assets.id
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get assets error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 3. REGISTER A NEW ASSET IN SQLITE
router.post("/assets", (req, res) => {
  try {
    const {
      name,
      instrumentTypeId,
      serialNumber,
      manufacturer,
      location,
      lastCalibration,
      calibrationPlanId,
      referenceValue
    } = req.body;

    if (
      !name?.trim() ||
      !instrumentTypeId ||
      !serialNumber?.trim() ||
      !manufacturer?.trim() ||
      !location?.trim() ||
      !calibrationPlanId ||
      referenceValue === undefined ||
      referenceValue === "" ||
      !isValidDate(lastCalibration)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required instrument details and a valid calibration date."
      });
    }

    const numericReferenceValue = Number(referenceValue);

    if (!Number.isFinite(numericReferenceValue) || numericReferenceValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Reference value must be a valid non-negative number."
      });
    }

    const instrumentType = db.prepare(`
      SELECT id, name
      FROM instrument_types
      WHERE id = ?
    `).get(instrumentTypeId);

    if (!instrumentType) {
      return res.status(400).json({
        success: false,
        message: "Selected instrument type does not exist."
      });
    }

    const plan = db.prepare(`
      SELECT id, name, instrumentTypeId, interval, status
      FROM calibration_plans
      WHERE id = ?
    `).get(calibrationPlanId);

    if (!plan || plan.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Selected calibration plan is not active or does not exist."
      });
    }

    if (String(plan.instrumentTypeId) !== String(instrumentTypeId)) {
      return res.status(400).json({
        success: false,
        message: "The calibration plan does not belong to the selected instrument type."
      });
    }

    const interval = Number(plan.interval);

    if (!Number.isFinite(interval) || interval <= 0) {
      return res.status(400).json({
        success: false,
        message: "The selected calibration plan has an invalid interval."
      });
    }

    const dueDate = db.prepare(`
      SELECT date(?, '+' || ? || ' months') AS dueDate
    `).get(lastCalibration, interval).dueDate;

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        message: "Unable to calculate the next calibration date."
      });
    }

    const result = db.transaction(() => {
      const latestId = db.prepare(`
        SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) AS lastNumber
        FROM assets
        WHERE id LIKE 'AST-%'
      `).get().lastNumber || 0;

      const id = `AST-${String(latestId + 1).padStart(6, "0")}`;
      const createdAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO assets (
          id,
          name,
          instrumentTypeId,
          serialNumber,
          manufacturer,
          location,
          calibrationPlanId,
          calibrationPlanName,
          referenceValue,
          lastCalibration,
          interval,
          dueDate,
          supplierId,
          status,
          createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name.trim(),
        instrumentType.id,
        serialNumber.trim(),
        manufacturer.trim(),
        location.trim(),
        plan.id,
        plan.name,
        numericReferenceValue,
        lastCalibration,
        interval,
        dueDate,
        null,
        "Active",
        createdAt
      );

      db.prepare(`
        INSERT INTO audit_records (
          activity,
          description,
          performedBy,
          date,
          referenceId,
          entityType,
          previousState,
          newState
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "Instrument Registered",
        `New instrument ${name.trim()} registered.`,
        "System",
        createdAt,
        id,
        "Asset",
        null,
        JSON.stringify({
          id,
          name: name.trim(),
          serialNumber: serialNumber.trim(),
          dueDate
        })
      );

      return db.prepare(`
        SELECT
          assets.*,
          instrument_types.name AS type
        FROM assets
        LEFT JOIN instrument_types
          ON assets.instrumentTypeId = instrument_types.id
        WHERE assets.id = ?
      `).get(id);
    })();

    res.status(201).json({
      success: true,
      message: "Instrument registered successfully.",
      data: result
    });
  } catch (error) {
    console.error("Register asset error:", error);

    if (String(error.message).includes("UNIQUE constraint failed")) {
      return res.status(409).json({
        success: false,
        message: "An instrument with this unique information already exists."
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET ALL INSTRUMENT TYPES
router.get("/instrument-types", (req, res) => {
  try {
    const records = db.prepare(`
      SELECT
        id,
        name,
        measurementUnit AS unit,
        minRange,
        maxRange,
        accuracy,
        description,
        category,
        status,
        createdAt
      FROM instrument_types
      ORDER BY id
    `).all();

    res.json({
      success: true,
      data: records,
      pagination: {
        total: records.length
      }
    });
  } catch (error) {
    console.error("Get instrument types error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ADD A NEW INSTRUMENT TYPE
router.post("/instrument-types", (req, res) => {
  try {
    const {
      name,
      unit,
      minRange,
      maxRange,
      accuracy,
      description
    } = req.body;

    if (
      !name?.trim() ||
      !unit?.trim() ||
      minRange === undefined ||
      minRange === "" ||
      maxRange === undefined ||
      maxRange === "" ||
      !accuracy?.trim() ||
      !description?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required instrument type details."
      });
    }

    const minimum = Number(minRange);
    const maximum = Number(maxRange);

    if (
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      minimum >= maximum
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum range must be greater than minimum range."
      });
    }

    const duplicate = db.prepare(`
      SELECT id FROM instrument_types
      WHERE LOWER(name) = LOWER(?)
    `).get(name.trim());

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "This instrument type already exists."
      });
    }

    const newType = db.transaction(() => {
      const latestNumber = db.prepare(`
        SELECT MAX(CAST(SUBSTR(id, 6) AS INTEGER)) AS lastNumber
        FROM instrument_types
        WHERE id LIKE 'TYPE-%'
      `).get().lastNumber || 0;

      const id = `TYPE-${String(latestNumber + 1).padStart(3, "0")}`;
      const createdAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO instrument_types (
          id,
          name,
          description,
          measurementUnit,
          category,
          status,
          createdAt,
          minRange,
          maxRange,
          accuracy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name.trim(),
        description.trim(),
        unit.trim(),
        name.trim(),
        "Active",
        createdAt,
        minimum,
        maximum,
        accuracy.trim()
      );

      const auditId = `AUD-TYPE-${Date.now()}`;

      db.prepare(`
        INSERT INTO audit_records (
          id,
          activity,
          description,
          performedBy,
          date,
          referenceId,
          entityType,
          previousState,
          newState
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        "Instrument Type Created",
        `New instrument type ${name.trim()} created.`,
        "System",
        createdAt,
        id,
        "InstrumentType",
        null,
        JSON.stringify({
          id,
          name: name.trim(),
          unit: unit.trim(),
          minRange: minimum,
          maxRange: maximum,
          accuracy: accuracy.trim()
        })
      );

      return {
        id,
        name: name.trim(),
        unit: unit.trim(),
        minRange: minimum,
        maxRange: maximum,
        accuracy: accuracy.trim(),
        description: description.trim(),
        category: name.trim(),
        status: "Active",
        createdAt
      };
    })();

    res.status(201).json({
      success: true,
      message: "Instrument type created successfully.",
      data: newType
    });
  } catch (error) {
    console.error("Create instrument type error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET CALIBRATION PLANS WITH INSTRUMENT TYPE NAMES
router.get("/calibration-plans", (req, res) => {
  try {
    const records = db.prepare(`
      SELECT
        calibration_plans.id,
        calibration_plans.name,
        calibration_plans.instrumentTypeId,
        instrument_types.name AS type,
        calibration_plans.interval,
        calibration_plans.tolerance,
        calibration_plans.toleranceUnit,
        calibration_plans.effectiveFrom,
        calibration_plans.effectiveTo,
        calibration_plans.status
      FROM calibration_plans
      LEFT JOIN instrument_types
        ON calibration_plans.instrumentTypeId = instrument_types.id
      ORDER BY calibration_plans.id
    `).all();

    const formattedRecords = records.map((plan) => ({
      ...plan,
      tolerance: `±${plan.tolerance}${plan.toleranceUnit ? ` ${plan.toleranceUnit}` : ""}`
    }));

    res.json({
      success: true,
      data: formattedRecords,
      pagination: {
        total: formattedRecords.length
      }
    });
  } catch (error) {
    console.error("Get calibration plans error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// CREATE A NEW CALIBRATION PLAN
router.post("/calibration-plans", (req, res) => {
  try {
    const {
      name,
      type,
      interval,
      tolerance,
      effectiveFrom,
      effectiveTo,
      status
    } = req.body;

    if (
      !name?.trim() ||
      !type?.trim() ||
      !tolerance?.trim() ||
      !effectiveFrom ||
      !["Active", "Inactive"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required calibration plan details."
      });
    }

    const numericInterval = Number(interval);

    if (
      !Number.isInteger(numericInterval) ||
      numericInterval <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Calibration interval must be a positive whole number."
      });
    }

    if (!isValidDate(effectiveFrom)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid effective-from date."
      });
    }

    if (effectiveTo && !isValidDate(effectiveTo)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid effective-to date."
      });
    }

    if (effectiveTo && effectiveTo < effectiveFrom) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before the effective date."
      });
    }

    // Accept values such as ±0.5%, ±0.2°C or ±0.25 bar.
    const toleranceMatch = tolerance.trim().match(
      /^±?\s*(\d+(?:\.\d+)?)\s*(.*)$/
    );

    if (!toleranceMatch) {
      return res.status(400).json({
        success: false,
        message: "Enter tolerance in a format such as ±0.5%."
      });
    }

    const numericTolerance = Number(toleranceMatch[1]);
    const toleranceUnit = toleranceMatch[2].trim();

    if (!Number.isFinite(numericTolerance) || numericTolerance < 0) {
      return res.status(400).json({
        success: false,
        message: "Tolerance must be a valid non-negative number."
      });
    }

    const instrumentType = db.prepare(`
      SELECT id, name
      FROM instrument_types
      WHERE LOWER(name) = LOWER(?)
    `).get(type.trim());

    if (!instrumentType) {
      return res.status(400).json({
        success: false,
        message: "Selected instrument type does not exist."
      });
    }

    const duplicate = db.prepare(`
      SELECT id FROM calibration_plans
      WHERE LOWER(name) = LOWER(?)
        AND instrumentTypeId = ?
    `).get(name.trim(), instrumentType.id);

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "A plan with this name already exists for this instrument type."
      });
    }

    const newPlan = db.transaction(() => {
      const latestNumber = db.prepare(`
        SELECT MAX(CAST(SUBSTR(id, 6) AS INTEGER)) AS lastNumber
        FROM calibration_plans
        WHERE id LIKE 'PLAN-%'
      `).get().lastNumber || 0;

      const id = `PLAN-${String(latestNumber + 1).padStart(3, "0")}`;
      const createdAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO calibration_plans (
          id,
          name,
          instrumentTypeId,
          interval,
          tolerance,
          toleranceUnit,
          effectiveFrom,
          effectiveTo,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name.trim(),
        instrumentType.id,
        numericInterval,
        numericTolerance,
        toleranceUnit,
        effectiveFrom,
        effectiveTo || null,
        status
      );

      const auditId = `AUD-PLAN-${Date.now()}`;

      db.prepare(`
        INSERT INTO audit_records (
          id,
          activity,
          description,
          performedBy,
          date,
          referenceId,
          entityType,
          previousState,
          newState
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        "Calibration Plan Created",
        `Calibration plan ${name.trim()} created.`,
        "System",
        createdAt,
        id,
        "CalibrationPlan",
        null,
        JSON.stringify({
          id,
          name: name.trim(),
          instrumentType: instrumentType.name,
          interval: numericInterval,
          tolerance
        })
      );

      return {
        id,
        name: name.trim(),
        type: instrumentType.name,
        instrumentTypeId: instrumentType.id,
        interval: numericInterval,
        tolerance: `±${numericTolerance}${toleranceUnit ? ` ${toleranceUnit}` : ""}`,
        effectiveFrom,
        effectiveTo: effectiveTo || "",
        status
      };
    })();

    res.status(201).json({
      success: true,
      message: "Calibration plan created successfully.",
      data: newPlan
    });
  } catch (error) {
    console.error("Create calibration plan error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// RECORD A NEW CALIBRATION
router.post("/calibrations", (req, res) => {
  try {
    const { assetId, date, measured, engineer } = req.body;

    if (
      !assetId ||
      !isValidDate(date) ||
      measured === undefined ||
      measured === "" ||
      !Number.isFinite(Number(measured)) ||
      !engineer?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid instrument, date, measured value and engineer."
      });
    }

    if (date > new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({
        success: false,
        message: "Calibration date cannot be in the future."
      });
    }

    const outcome = db.transaction(() => {
      const asset = db.prepare(`
        SELECT * FROM assets WHERE id = ?
      `).get(assetId);

      if (!asset) {
        throw new Error("Instrument not found.");
      }

      const plan = db.prepare(`
        SELECT * FROM calibration_plans WHERE id = ?
      `).get(asset.calibrationPlanId);

      if (!plan) {
        throw new Error("Calibration plan not found for this instrument.");
      }

      const reference = Number(asset.referenceValue);
      const measuredValue = Number(measured);
      const planTolerance = Number(plan.tolerance);

      if (
        !Number.isFinite(reference) ||
        !Number.isFinite(planTolerance)
      ) {
        throw new Error("Instrument reference value or plan tolerance is invalid.");
      }

      const toleranceUnit = plan.toleranceUnit || "";

      const allowedTolerance = toleranceUnit.includes("%")
        ? Math.abs(reference) * planTolerance / 100
        : planTolerance;

      const error = Math.abs(measuredValue - reference);
      const result = error <= allowedTolerance ? "Pass" : "Fail";

      const year = date.slice(0, 4);

      const previousCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM calibration_events
        WHERE assetId = ? AND substr(date, 1, 4) = ?
      `).get(assetId, year).count;

      const nextNumber = String(previousCount + 1).padStart(6, "0");
      const calibrationId = `CAL-${assetId}-${year}-${nextNumber}`;
      const createdAt = new Date().toISOString();

      const pendingVerificationOrder = db.prepare(`
        SELECT *
        FROM work_orders
        WHERE assetId = ?
          AND status = 'Pending Verification'
          AND COALESCE(verificationStatus, '') != 'Passed'
        ORDER BY createdDate DESC
        LIMIT 1
      `).get(assetId);

      const calibrationType = pendingVerificationOrder
        ? "Post-Maintenance Verification"
        : "Routine Calibration";

      const nextDueDate = calculateDueDate(date, plan.interval);

      db.prepare(`
        INSERT INTO calibration_events (
          id, assetId, name, calibrationPlanId, date,
          measured, reference, tolerance, error, result,
          engineer, calibrationType, workOrderId,
          nextDueDate, createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        calibrationId,
        asset.id,
        asset.name,
        plan.id,
        date,
        measuredValue,
        reference,
        allowedTolerance,
        error,
        result,
        engineer.trim(),
        calibrationType,
        pendingVerificationOrder?.id || null,
        nextDueDate,
        createdAt
      );

      // Update the instrument's latest calibration information.
      db.prepare(`
        UPDATE assets
        SET lastCalibration = ?,
            dueDate = ?,
            status = ?
        WHERE id = ?
      `).run(
        date,
        nextDueDate,
        result === "Pass" ? "Active" : "On Hold",
        asset.id
      );

      let certificate = null;
      let workOrder = null;
      let updatedWorkOrder = null;

      if (result === "Pass") {
        const certificateId =
          `CERT-${assetId}-${year}-${nextNumber}`;

        db.prepare(`
          INSERT INTO certificates (
            id, calibrationId, assetId, instrumentName,
            issueDate, expiryDate, status, issuedBy, documentReference
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          certificateId,
          calibrationId,
          asset.id,
          asset.name,
          date,
          nextDueDate,
          "Valid",
          engineer.trim(),
          `${certificateId}.pdf`
        );

        certificate = {
          id: certificateId,
          calibrationId,
          assetId: asset.id,
          instrumentName: asset.name,
          issueDate: date,
          expiryDate: nextDueDate,
          status: "Valid",
          issuedBy: engineer.trim(),
          documentReference: `${certificateId}.pdf`
        };

        if (pendingVerificationOrder) {
            db.prepare(`
            UPDATE work_orders
            SET status = ?,
                verificationStatus = ?,
                verificationDate = ?,
                verificationCalibrationId = ?
            WHERE id = ?
          `).run(
            "Completed",
            "Passed",
            date,
            calibrationId,
            pendingVerificationOrder.id
          );
          updatedWorkOrder = {
            ...pendingVerificationOrder,
            status: "Completed",
            verificationStatus: "Passed",
            verificationDate: date,
            verificationCalibrationId: calibrationId,
            verifiedBy: engineer.trim()
          };
        }
      } else {
        if (pendingVerificationOrder) {
          db.prepare(`
            UPDATE work_orders
            SET verificationStatus = ?,
                verificationDate = ?,
                verificationCalibrationId = ?
            WHERE id = ?
          `).run(
            "Failed",
            date,
            calibrationId,
            pendingVerificationOrder.id
          );

          updatedWorkOrder = {
            ...pendingVerificationOrder,
            verificationStatus: "Failed",
            verificationDate: date,
            verificationCalibrationId: calibrationId,
            verifiedBy: engineer.trim()
          };
        }

        const workOrderId =
          `WO-${assetId}-${year}-${nextNumber}`;

        db.prepare(`
          INSERT INTO work_orders (
            id, assetId, calibrationId, instrumentName,
            createdDate, status, impactAssessment,
            sourceWorkOrderId, downtimeStart, downtimeEnd,
            downtimeHours, correctiveAction, technician,
            verificationStatus, verificationDate,
            verificationCalibrationId
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          workOrderId,
          asset.id,
          calibrationId,
          asset.name,
          date,
          "Open",
          "Required",
          pendingVerificationOrder?.id || null,
          null,
          null,
          0,
          null,
          null,
          null,
          null,
          null
        );

        workOrder = {
          id: workOrderId,
          assetId: asset.id,
          calibrationId,
          instrumentName: asset.name,
          createdDate: date,
          status: "Open",
          impactAssessment: "Required",
          sourceWorkOrderId: pendingVerificationOrder?.id || null,
          verificationStatus: null
        };
      }

      const auditId = `AUD-CAL-${Date.now()}`;

      const auditRecord = {
        id: auditId,
        activity: result === "Pass"
          ? "Calibration Passed"
          : "Calibration Failed",
        description: `${asset.name} (${asset.id}) calibration result: ${result}`,
        performedBy: engineer.trim(),
        date: createdAt,
        referenceId: calibrationId,
        entityType: "Calibration"
      };

      db.prepare(`
        INSERT INTO audit_records (
          id, activity, description, performedBy, date,
          referenceId, entityType, previousState, newState
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        auditRecord.activity,
        auditRecord.description,
        auditRecord.performedBy,
        auditRecord.date,
        auditRecord.referenceId,
        auditRecord.entityType,
        JSON.stringify({
          lastCalibration: asset.lastCalibration,
          dueDate: asset.dueDate,
          status: asset.status
        }),
        JSON.stringify({
          calibrationId,
          result,
          nextDueDate,
          certificateId: certificate?.id || null,
          workOrderId: workOrder?.id || null
        })
      );

      return {
        calibration: {
          id: calibrationId,
          assetId: asset.id,
          name: asset.name,
          date,
          measured: measuredValue,
          reference,
          tolerance: allowedTolerance,
          error,
          result,
          engineer: engineer.trim(),
          calibrationType,
          workOrderId: pendingVerificationOrder?.id || null,
          nextDueDate,
          createdAt
        },
        certificate,
        workOrder,
        updatedWorkOrder,
        auditRecord,
        updatedAsset: {
          ...asset,
          lastCalibration: date,
          dueDate: nextDueDate,
          status: result === "Pass" ? "Active" : "On Hold"
        }
      };
    })();

    res.status(201).json({
      success: true,
      message: "Calibration recorded successfully.",
      data: outcome
    });
  } catch (error) {
    console.error("Record calibration error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// WORK ORDER: SAVE IMPACT ASSESSMENT
router.put("/work-orders/:id/assessment", (req, res) => {
  try {
    const {
      assessmentDate,
      assessedBy,
      productionAffected,
      affectedBatches,
      immediateAction,
      notes
    } = req.body;

    if (
      !isValidDate(assessmentDate) ||
      !assessedBy?.trim() ||
      !["Yes", "No", "Unknown"].includes(productionAffected) ||
      !immediateAction?.trim() ||
      !notes?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required impact assessment details."
      });
    }

    if (assessmentDate > new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({
        success: false,
        message: "Assessment date cannot be in the future."
      });
    }

    const result = db.transaction(() => {
      const existing = db.prepare(
        "SELECT * FROM work_orders WHERE id = ?"
      ).get(req.params.id);

      if (!existing) {
        throw new Error("Work order not found.");
      }

      if (existing.impactAssessment === "Completed") {
        throw new Error("Impact assessment is already completed.");
      }

      db.prepare(`
        UPDATE work_orders
        SET impactAssessment = ?,
            assessmentDate = ?,
            assessedBy = ?,
            productionAffected = ?,
            affectedBatches = ?,
            immediateAction = ?,
            assessmentNotes = ?
        WHERE id = ?
      `).run(
        "Completed",
        assessmentDate,
        assessedBy.trim(),
        productionAffected,
        affectedBatches?.trim() || "",
        immediateAction.trim(),
        notes.trim(),
        req.params.id
      );

      const now = new Date().toISOString();
      const auditId = `AUD-WO-${Date.now()}`;

      db.prepare(`
        INSERT INTO audit_records (
          id, activity, description, performedBy, date,
          referenceId, entityType, previousState, newState
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        "Impact Assessment Completed",
        `Impact assessment completed for ${existing.instrumentName} (${existing.assetId}). Production affected: ${productionAffected}.`,
        assessedBy.trim(),
        now,
        existing.id,
        "WorkOrder",
        JSON.stringify({
          impactAssessment: existing.impactAssessment
        }),
        JSON.stringify({
          impactAssessment: "Completed",
          assessmentDate,
          assessedBy: assessedBy.trim(),
          productionAffected,
          affectedBatches: affectedBatches?.trim() || "",
          immediateAction: immediateAction.trim(),
          assessmentNotes: notes.trim()
        })
      );

      return db.prepare(
        "SELECT * FROM work_orders WHERE id = ?"
      ).get(req.params.id);
    })();

    res.json({
      success: true,
      message: "Impact assessment saved successfully.",
      data: result
    });
  } catch (error) {
    console.error("Save impact assessment error:", error);

    res.status(
      error.message === "Work order not found." ? 404 :
      error.message === "Impact assessment is already completed." ? 409 : 500
    ).json({
      success: false,
      message: error.message
    });
  }
});


// WORK ORDER: COMPLETE CORRECTIVE MAINTENANCE
router.put("/work-orders/:id/maintenance", (req, res) => {
  try {
    const {
      technician,
      completionDate,
      correctiveAction,
      remarks
    } = req.body;

    if (
      !technician?.trim() ||
      !isValidDate(completionDate) ||
      !correctiveAction?.trim() ||
      !remarks?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required maintenance details."
      });
    }

    if (completionDate > new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({
        success: false,
        message: "Completion date cannot be in the future."
      });
    }

    const result = db.transaction(() => {
      const existing = db.prepare(
        "SELECT * FROM work_orders WHERE id = ?"
      ).get(req.params.id);

      if (!existing) {
        throw new Error("Work order not found.");
      }

      if (
        existing.status === "Pending Verification" ||
        existing.status === "Completed"
      ) {
        throw new Error("This work order has already entered verification or is completed.");
      }

      db.prepare(`
        UPDATE work_orders
        SET status = ?,
            technician = ?,
            correctiveAction = ?,
            maintenanceCompletionDate = ?,
            maintenanceRemarks = ?
        WHERE id = ?
      `).run(
        "Pending Verification",
        technician.trim(),
        correctiveAction.trim(),
        completionDate,
        remarks.trim(),
        req.params.id
      );

      const now = new Date().toISOString();
      const auditId = `AUD-WO-${Date.now()}`;

      db.prepare(`
        INSERT INTO audit_records (
          id, activity, description, performedBy, date,
          referenceId, entityType, previousState, newState
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        "Corrective Maintenance Completed",
        `Maintenance completed for ${existing.instrumentName} (${existing.assetId}). Action: ${correctiveAction.trim()}.`,
        technician.trim(),
        now,
        existing.id,
        "WorkOrder",
        JSON.stringify({
          status: existing.status
        }),
        JSON.stringify({
          status: "Pending Verification",
          technician: technician.trim(),
          correctiveAction: correctiveAction.trim(),
          maintenanceCompletionDate: completionDate,
          maintenanceRemarks: remarks.trim()
        })
      );

      return db.prepare(
        "SELECT * FROM work_orders WHERE id = ?"
      ).get(req.params.id);
    })();

    res.json({
      success: true,
      message: "Corrective maintenance saved successfully. Awaiting verification.",
      data: result
    });
  } catch (error) {
    console.error("Complete maintenance error:", error);

    res.status(
      error.message === "Work order not found." ? 404 :
      error.message.includes("already entered verification") ? 409 : 500
    ).json({
      success: false,
      message: error.message
    });
  }
});

// RECORD NEW PRODUCTION USAGE
router.post("/production-usage", (req, res) => {
  try {
    const {
      instrument,
      batchId,
      usageDate,
      operator,
      productionLine
    } = req.body;

    if (
      !instrument ||
      !batchId?.trim() ||
      !isValidDate(usageDate) ||
      !operator?.trim() ||
      !productionLine?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required production usage details."
      });
    }

    if (usageDate > new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({
        success: false,
        message: "Usage date cannot be in the future."
      });
    }

    const result = db.transaction(() => {
      // Confirm that the selected instrument exists.
      const asset = db.prepare(`
        SELECT id, name, status
        FROM assets
        WHERE id = ?
      `).get(instrument);

      if (!asset) {
        throw new Error("Selected instrument does not exist.");
      }

      // Find the latest calibration on or before the usage date.
      const latestCalibration = db.prepare(`
        SELECT id, date, result, nextDueDate
        FROM calibration_events
        WHERE assetId = ?
          AND date <= ?
        ORDER BY date DESC, id DESC
        LIMIT 1
      `).get(instrument, usageDate);

      let status = "Invalid";
      let issueType = "No Previous Calibration";
      let exceptionId = null;

      if (latestCalibration) {
        if (latestCalibration.result === "Fail") {
          status = "Invalid";
          issueType = "Failed Calibration";
        } else if (
          latestCalibration.result === "Pass" &&
          latestCalibration.nextDueDate &&
          usageDate <= latestCalibration.nextDueDate
        ) {
          status = "Valid";
          issueType = "";
        } else if (
          latestCalibration.result === "Pass" &&
          usageDate > latestCalibration.nextDueDate
        ) {
          const extension = db.prepare(`
            SELECT extensionId
            FROM emergency_extensions
            WHERE assetId = ?
              AND status = 'Approved'
              AND effectiveFrom <= ?
              AND effectiveTo >= ?
            ORDER BY effectiveTo DESC
            LIMIT 1
          `).get(instrument, usageDate, usageDate);

          if (extension) {
            status = "Valid";
            issueType = "";
            exceptionId = extension.extensionId;
          } else {
            status = "Invalid";
            issueType = "Calibration Overdue";
          }
        } else {
          status = "Pending Review";
          issueType = "Calibration Information Incomplete";
        }
      }

      const id = `USE-MANUAL-${Date.now()}`;
      const createdAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO production_usage (
          id,
          assetId,
          instrument,
          batchId,
          usageDate,
          operator,
          productionLine,
          status,
          issueType,
          exceptionId,
          createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        asset.id,
        asset.name,
        batchId.trim(),
        usageDate,
        operator.trim(),
        productionLine.trim(),
        status,
        issueType,
        exceptionId,
        createdAt
      );

      const auditId = `AUD-USE-${Date.now()}`;

      db.prepare(`
        INSERT INTO audit_records (
          id,
          activity,
          description,
          performedBy,
          date,
          referenceId,
          entityType,
          previousState,
          newState
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        "Production Usage Recorded",
        `Production usage recorded for ${asset.name}. Decision: ${status}.`,
        operator.trim(),
        createdAt,
        id,
        "ProductionUsage",
        null,
        JSON.stringify({
          assetId: asset.id,
          batchId: batchId.trim(),
          usageDate,
          status,
          issueType,
          exceptionId
        })
      );

      return db.prepare(`
        SELECT *
        FROM production_usage
        WHERE id = ?
      `).get(id);
    })();

    res.status(201).json({
      success: true,
      message: "Production usage recorded successfully.",
      data: result
    });

  } catch (error) {
    console.error("Record production usage error:", error);

    res.status(
      error.message === "Selected instrument does not exist." ? 404 : 500
    ).json({
      success: false,
      message: error.message
    });
  }
});
// UPDATE ALERT STATUS IN SQLITE
router.put("/alerts/:id/status", (req, res) => {
  try {
    const { status } = req.body;
    const alertId = req.params.id;

    const allowedStatuses = [
            "Active",
            "Open",
            "Acknowledged",
            "Resolved"
          ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert status."
      });
    }

    const result = db.transaction(() => {
      const existing = db.prepare(
        "SELECT * FROM alerts WHERE id = ?"
      ).get(alertId);

      if (!existing) {
        throw new Error("Alert not found.");
      }

      db.prepare(
        "UPDATE alerts SET status = ? WHERE id = ?"
      ).run(status, alertId);

      const now = new Date().toISOString();
      const auditId = `AUD-ALERT-${Date.now()}`;

      db.prepare(`
        INSERT INTO audit_records (
          id, activity, description, performedBy, date,
          referenceId, entityType, previousState, newState
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        "Alert Status Updated",
        `Alert ${alertId} status changed from ${existing.status} to ${status}.`,
        "Admin User",
        now,
        alertId,
        "Alert",
        JSON.stringify({ status: existing.status }),
        JSON.stringify({ status })
      );

      return db.prepare(
        "SELECT * FROM alerts WHERE id = ?"
      ).get(alertId);
    })();

    res.json({
      success: true,
      message: "Alert status updated successfully.",
      data: result
    });

  } catch (error) {
    console.error("Update alert status error:", error);

    res.status(
      error.message === "Alert not found." ? 404 : 500
    ).json({
      success: false,
      message: error.message
    });
  }
});

// 4. GET ALL OTHER RESOURCES
router.get("/:resource", (req, res) => {
  try {
    const table = endpoints[req.params.resource];

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const total = db.prepare(
      `SELECT COUNT(*) AS count FROM "${table}"`
    ).get().count;

    const records = db.prepare(
      `SELECT * FROM "${table}" LIMIT ? OFFSET ?`
    ).all(limit, offset);

    res.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 5. GET ONE RECORD BY ID
router.get("/:resource/:id", (req, res) => {
  try {
    const table = endpoints[req.params.resource];

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    const idColumn = {
      "emergency-extensions": "extensionId",
      suppliers: "supplierId"
    }[req.params.resource] || "id";

    const record = db.prepare(
      `SELECT * FROM "${table}" WHERE "${idColumn}" = ?`
    ).get(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found"
      });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
