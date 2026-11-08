import csv
import json
import hashlib
import sqlite3
from pathlib import Path
from datetime import date
from bisect import bisect_right

BASE_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = BASE_DIR / "output"

EXPECTED_COUNTS = {
    "instrument_types": 4,
    "calibration_plans": 5,
    "suppliers": 20,
    "assets": 2000,
    "calibration_events": 5000,
    "production_usage": 100000,
    "emergency_extensions": 100,
}


def load_csv(name):
    path = OUTPUT_DIR / f"{name}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    with path.open("r", newline="", encoding="utf-8-sig") as file:
        return list(csv.DictReader(file))


def load_json(name):
    path = OUTPUT_DIR / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def require(condition, message, errors):
    if not condition:
        errors.append(message)


def unique_ids(rows, key, label, errors):
    values = [row[key] for row in rows]
    require(len(values) == len(set(values)), f"{label}: duplicate {key}", errors)


def add_months(day, months):
    import calendar
    month_index = day.month - 1 + months
    year = day.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, min(day.day, calendar.monthrange(year, month)[1]))


def main():
    names = [
        "instrument_types", "calibration_plans", "suppliers", "assets",
        "calibration_events", "certificates", "work_orders",
        "production_usage", "emergency_extensions", "alerts", "audit_records",
    ]
    data = {name: load_csv(name) for name in names}
    truth = load_csv("ground_truth")
    errors = []

    # Record counts and primary keys.
    for name, expected in EXPECTED_COUNTS.items():
        require(len(data[name]) == expected,
                f"{name}: expected {expected}, found {len(data[name])}", errors)

    pk_fields = {
        "instrument_types": "id", "calibration_plans": "id",
        "suppliers": "supplierId", "assets": "id",
        "calibration_events": "id", "certificates": "id",
        "work_orders": "id", "production_usage": "id",
        "emergency_extensions": "extensionId", "alerts": "id",
        "audit_records": "id",
    }
    for name, key in pk_fields.items():
        unique_ids(data[name], key, name, errors)

    # Ground-truth anomaly index: only the explicitly labelled row is exempt.
    gt = {(r["entityType"], r["entityId"], r["issueType"]) for r in truth}
    require(len(truth) == 5, f"Expected exactly 5 ground-truth anomalies, found {len(truth)}", errors)
    expected_issues = {
        "INCORRECT_DUE_DATE", "CERTIFICATE_WRONG_ASSET",
        "MISSING_IMPACT_ASSESSMENT", "MISSING_CERTIFICATE",
        "EXPIRED_USE_WITHOUT_EXCEPTION",
    }
    require({r["issueType"] for r in truth} == expected_issues,
            "Ground-truth anomaly categories do not match the five expected categories", errors)

    types = {r["id"] for r in data["instrument_types"]}
    plans = {r["id"]: r for r in data["calibration_plans"]}
    suppliers = {r["supplierId"] for r in data["suppliers"]}
    assets = {r["id"]: r for r in data["assets"]}
    events = {r["id"]: r for r in data["calibration_events"]}
    extensions = {r["extensionId"]: r for r in data["emergency_extensions"]}

    # Master data foreign keys and asset due-date arithmetic.
    for asset in data["assets"]:
        require(asset["instrumentTypeId"] in types,
                f'{asset["id"]}: unknown instrument type', errors)
        require(asset["calibrationPlanId"] in plans,
                f'{asset["id"]}: unknown calibration plan', errors)
        require(asset["supplierId"] in suppliers,
                f'{asset["id"]}: unknown supplier', errors)
        if asset["calibrationPlanId"] in plans:
            plan = plans[asset["calibrationPlanId"]]
            require(plan["instrumentTypeId"] == asset["instrumentTypeId"],
                    f'{asset["id"]}: plan/type mismatch', errors)
            expected_due = add_months(
                date.fromisoformat(asset["lastCalibration"]), int(plan["interval"])
            ).isoformat()
            is_labelled = ("Asset", asset["id"], "INCORRECT_DUE_DATE") in gt
            require(asset["dueDate"] == expected_due or is_labelled,
                    f'{asset["id"]}: due date does not match plan interval', errors)

    # Calibration arithmetic, references, dates, and plan consistency.
    for event in data["calibration_events"]:
        require(event["assetId"] in assets, f'{event["id"]}: unknown asset', errors)
        require(event["calibrationPlanId"] in plans, f'{event["id"]}: unknown plan', errors)
        if event["assetId"] in assets and event["calibrationPlanId"] in plans:
            require(assets[event["assetId"]]["calibrationPlanId"] == event["calibrationPlanId"],
                    f'{event["id"]}: event plan differs from asset plan', errors)
        measured, reference = float(event["measured"]), float(event["reference"])
        tolerance, recorded_error = float(event["tolerance"]), float(event["error"])
        expected_error = round(abs(measured - reference), 3)
        require(recorded_error == expected_error, f'{event["id"]}: incorrect measurement error', errors)
        expected_result = "Pass" if expected_error <= tolerance else "Fail"
        require(event["result"] == expected_result, f'{event["id"]}: incorrect pass/fail result', errors)
        date.fromisoformat(event["date"])
        date.fromisoformat(event["nextDueDate"])

    # Certificates: one per passing event, except the one labelled missing certificate.
    cert_by_event = {}
    for cert in data["certificates"]:
        event = events.get(cert["calibrationId"])
        require(event is not None, f'{cert["id"]}: missing calibration event', errors)
        if event:
            require(event["result"] == "Pass", f'{cert["id"]}: issued for failed calibration', errors)
            mismatch_labelled = ("Certificate", cert["id"], "CERTIFICATE_WRONG_ASSET") in gt
            require(cert["assetId"] == event["assetId"] or mismatch_labelled,
                    f'{cert["id"]}: asset does not match calibration', errors)
            expected_expiry = add_months(
                date.fromisoformat(event["date"]),
                int(plans[event["calibrationPlanId"]]["interval"])
            ).isoformat()
            require(cert["expiryDate"] == expected_expiry,
                    f'{cert["id"]}: incorrect expiry date', errors)
        cert_by_event[cert["calibrationId"]] = cert

    missing_cert_gt = {
        entity_id for entity_type, entity_id, issue in gt
        if entity_type == "CalibrationEvent" and issue == "MISSING_CERTIFICATE"
    }
    passed_event_ids = {e["id"] for e in data["calibration_events"] if e["result"] == "Pass"}
    actual_missing = passed_event_ids - set(cert_by_event)
    require(actual_missing == missing_cert_gt,
            "Missing certificate records do not match ground-truth label", errors)
    require(set(cert_by_event).issubset(passed_event_ids),
            "A certificate exists for a non-passing calibration", errors)

    # Work orders: each failed calibration has exactly one corrective work order.
    failed_event_ids = {e["id"] for e in data["calibration_events"] if e["result"] == "Fail"}
    linked_failed = set()
    for order in data["work_orders"]:
        event = events.get(order["calibrationId"])
        require(event is not None, f'{order["id"]}: missing calibration event', errors)
        if event:
            require(event["result"] == "Fail", f'{order["id"]}: linked to non-failed calibration', errors)
            require(order["assetId"] == event["assetId"], f'{order["id"]}: asset mismatch', errors)
            linked_failed.add(order["calibrationId"])
        assessment_labelled = ("WorkOrder", order["id"], "MISSING_IMPACT_ASSESSMENT") in gt
        require(order["impactAssessment"] == "Completed" or assessment_labelled,
                f'{order["id"]}: incomplete impact assessment', errors)
        require(date.fromisoformat(order["downtimeEnd"]) >= date.fromisoformat(order["downtimeStart"]),
                f'{order["id"]}: downtime end precedes start', errors)
    require(linked_failed == failed_event_ids,
            "Failed calibration/work-order relationships are incomplete or duplicated", errors)

    # Extensions: references, approval, and date ranges.
    for ext in data["emergency_extensions"]:
        require(ext["assetId"] in assets, f'{ext["extensionId"]}: unknown asset', errors)
        approval = date.fromisoformat(ext["approvalDate"])
        start = date.fromisoformat(ext["effectiveFrom"])
        end = date.fromisoformat(ext["effectiveTo"])
        require(start >= approval, f'{ext["extensionId"]}: starts before approval', errors)
        require(end >= start, f'{ext["extensionId"]}: invalid effective date range', errors)
        require(ext["status"] in {"Approved", "Rejected", "Expired"},
                f'{ext["extensionId"]}: invalid status', errors)

    # Independently recompute every production-use decision except the one
    # intentionally corrupted and identified in ground_truth.csv.
    events_by_asset = {}
    for event in data["calibration_events"]:
        events_by_asset.setdefault(event["assetId"], []).append(event)
    for rows in events_by_asset.values():
        rows.sort(key=lambda row: (row["date"], row["id"]))
    extension_by_asset = {}
    for ext in data["emergency_extensions"]:
        extension_by_asset.setdefault(ext["assetId"], []).append(ext)

    anomaly_usage_ids = {
        entity_id for entity_type, entity_id, issue in gt
        if entity_type == "ProductionUse" and issue == "EXPIRED_USE_WITHOUT_EXCEPTION"
    }
    for usage in data["production_usage"]:
        require(usage["assetId"] in assets, f'{usage["id"]}: unknown asset', errors)
        if usage["exceptionId"]:
            require(usage["exceptionId"] in extensions,
                    f'{usage["id"]}: unknown emergency extension', errors)
        if usage["id"] in anomaly_usage_ids:
            require(usage["status"] == "Valid" and usage["issueType"] == "",
                    f'{usage["id"]}: labelled usage anomaly not present', errors)
            continue

        day = date.fromisoformat(usage["usageDate"])
        candidates = events_by_asset.get(usage["assetId"], [])
        prior = [e for e in candidates if e["date"] <= day.isoformat()]
        latest = prior[-1] if prior else None
        expected_status, expected_issue, expected_exception = "Invalid", "No Previous Calibration", ""

        if latest:
            if latest["result"] == "Fail":
                expected_issue = "Failed Calibration"
            elif day <= date.fromisoformat(latest["nextDueDate"]):
                expected_status, expected_issue = "Valid", ""
            else:
                approved = next((
                    x for x in extension_by_asset.get(usage["assetId"], [])
                    if x["status"] == "Approved"
                    and date.fromisoformat(x["effectiveFrom"]) <= day <= date.fromisoformat(x["effectiveTo"])
                ), None)
                if approved:
                    expected_status, expected_issue = "Valid", ""
                    expected_exception = approved["extensionId"]
                else:
                    expected_issue = "Calibration Overdue"

        require(usage["status"] == expected_status,
                f'{usage["id"]}: incorrect usage status', errors)
        require(usage["issueType"] == expected_issue,
                f'{usage["id"]}: incorrect usage issue type', errors)
        require(usage["exceptionId"] == expected_exception,
                f'{usage["id"]}: incorrect exception reference', errors)

    # Alerts and audit references.
    for alert in data["alerts"]:
        require(alert["assetId"] in assets, f'{alert["id"]}: unknown asset', errors)
    valid_refs = set(events) | {r["id"] for r in data["certificates"]} | {
        r["id"] for r in data["work_orders"]
    } | set(extensions) | set(assets)
    # Audit history is generated before anomaly injection. The intentionally
    # removed certificate therefore remains referenced by its historical audit.
    valid_refs |= {"CERT-" + event_id for event_id in missing_cert_gt}
    for audit in data["audit_records"]:
        require(audit["referenceId"] in valid_refs,
                f'{audit["id"]}: unresolved audit reference', errors)

    # Confirm expected output artifacts and verify every manifest checksum.
    required_files = [
        "calibratrack.sqlite", "calibratrack_seed.sql",
        "validation_summary.json", "manifest.json",
        "ground_truth.csv", "ground_truth.json",
    ]
    for filename in required_files:
        require((OUTPUT_DIR / filename).is_file(), f"Missing output artifact: {filename}", errors)

    manifest_path = OUTPUT_DIR / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for filename, metadata in manifest.get("files", {}).items():
            path = OUTPUT_DIR / filename
            require(path.is_file(), f"Manifest file missing: {filename}", errors)
            if path.is_file():
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                require(digest == metadata["sha256"], f"SHA-256 mismatch: {filename}", errors)

    db_path = OUTPUT_DIR / "calibratrack.sqlite"
    if db_path.exists():
        with sqlite3.connect(db_path) as connection:
            tables = {row[0] for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )}
            expected_tables = set(names)
            require(expected_tables.issubset(tables),
                    "SQLite database is missing one or more dataset tables", errors)
            for table, expected in EXPECTED_COUNTS.items():
                if table in tables:
                    actual = connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
                    require(actual == expected,
                            f"SQLite {table}: expected {expected}, found {actual}", errors)

    if errors:
        print("INDEPENDENT VALIDATION FAILED")
        for error in errors[:40]:
            print(" -", error)
        raise SystemExit(f"Found {len(errors)} validation issue(s).")

    print("INDEPENDENT VALIDATION PASSED")
    print("Verified record counts, primary keys, foreign keys, calibration arithmetic,")
    print("certificate/work-order links, extension dates, production-use decisions,")
    print("all five labelled anomalies, SQLite tables, and SHA-256 checksums.")
    print(f"Checked folder: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
