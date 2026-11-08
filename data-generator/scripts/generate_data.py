import argparse
import csv
import hashlib
import json
import random
import sqlite3
import calendar
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from bisect import bisect_right

SEED = 20261022
START_DATE = date(2026, 1, 1)
END_DATE = date(2026, 12, 31)
TOTAL_ASSETS = 2000
TOTAL_CALIBRATIONS = 5000
TOTAL_PRODUCTION_USES = 100000
TOTAL_EXTENSIONS = 100
VERSION = "1.0.0"
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = BASE_DIR / "output"


def rng_for(label):
    digest = hashlib.sha256(f"{SEED}:{label}".encode()).digest()
    return random.Random(int.from_bytes(digest[:8], "big"))


def random_date(rng, start, end):
    return start + timedelta(days=rng.randint(0, (end - start).days))


def add_months(d, months):
    m = d.month - 1 + months
    year, month = d.year + m // 12, m % 12 + 1
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


def write_csv(path, rows):
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def write_json(path, rows):
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def export_sqlite(db_path, datasets):
    if db_path.exists():
        db_path.unlink()
    con = sqlite3.connect(db_path)
    try:
        for table, rows in datasets.items():
            if not rows:
                continue
            cols = list(rows[0])
            qcols = ", ".join('"' + c.replace('"', '""') + '"' for c in cols)
            placeholders = ", ".join("?" for _ in cols)
            con.execute(f'CREATE TABLE "{table}" ({qcols})')
            con.executemany(
                f'INSERT INTO "{table}" ({qcols}) VALUES ({placeholders})',
                [tuple(row[c] for c in cols) for row in rows]
            )
        con.commit()
    finally:
        con.close()


def generate_instrument_types():
    return [
        {"id": "TYPE-001", "name": "Pressure Gauge", "description": "Measures pressure in industrial systems.", "measurementUnit": "bar", "category": "Pressure", "status": "Active", "createdAt": "2026-01-01"},
        {"id": "TYPE-002", "name": "Temperature Sensor", "description": "Measures industrial temperature.", "measurementUnit": "Celsius", "category": "Temperature", "status": "Active", "createdAt": "2026-01-01"},
        {"id": "TYPE-003", "name": "Digital Multimeter", "description": "Measures electrical parameters.", "measurementUnit": "Volt", "category": "Electrical", "status": "Active", "createdAt": "2026-01-01"},
        {"id": "TYPE-004", "name": "Flow Meter", "description": "Measures liquid flow rate.", "measurementUnit": "L/min", "category": "Flow", "status": "Active", "createdAt": "2026-01-01"},
    ]


def generate_calibration_plans(types):
    intervals, tolerances, rows = [6, 12, 6, 12, 3], [0.25, 1.0, 0.5, 0.75, 0.2], []
    for i in range(5):
        t = types[i % 4]
        rows.append({"id": f"PLAN-{i+1:03d}", "name": f"{t['name']} Plan {i+1}",
                     "instrumentTypeId": t["id"], "interval": intervals[i],
                     "tolerance": tolerances[i], "toleranceUnit": t["measurementUnit"],
                     "effectiveFrom": "2026-01-01", "effectiveTo": "2026-12-31", "status": "Active"})
    return rows


def generate_suppliers():
    return [{"supplierId": f"SUP-{i:03d}", "supplierName": f"Industrial Supplier {i}",
             "supplierCode": f"ISC-{i:03d}", "country": "India",
             "contactEmail": f"supplier{i}@example.com", "status": "Active",
             "createdAt": "2026-01-01"} for i in range(1, 21)]


def generate_assets(types, plans, suppliers):
    r, by_type, rows = rng_for("assets"), defaultdict(list), []
    for p in plans:
        by_type[p["instrumentTypeId"]].append(p)
    for i in range(1, TOTAL_ASSETS + 1):
        t = r.choice(types)
        p, s = r.choice(by_type[t["id"]]), r.choice(suppliers)
        last = random_date(r, date(2025, 1, 1), date(2026, 6, 30))
        rows.append({"id": f"AST-{i:06d}", "name": f"{t['name']} {i:04d}",
                     "instrumentTypeId": t["id"], "serialNumber": f"SN-{i:06d}",
                     "manufacturer": r.choice(["Bosch", "Siemens", "Fluke", "Honeywell", "ABB"]),
                     "location": r.choice(["Production Line A", "Production Line B", "Quality Lab", "Maintenance Unit", "Assembly Section"]),
                     "calibrationPlanId": p["id"], "calibrationPlanName": p["name"],
                     "referenceValue": round(r.uniform(10, 100), 2), "lastCalibration": last.isoformat(),
                     "interval": p["interval"], "dueDate": add_months(last, p["interval"]).isoformat(),
                     "supplierId": s["supplierId"], "status": "Active", "createdAt": "2026-01-01"})
    return rows


def generate_calibration_events(assets, plans):
    r, plan_by_id, counts, rows = rng_for("calibrations"), {p["id"]: p for p in plans}, defaultdict(int), []
    for _ in range(TOTAL_CALIBRATIONS):
        a = r.choice(assets)
        p = plan_by_id[a["calibrationPlanId"]]
        counts[a["id"]] += 1
        d = random_date(r, START_DATE, END_DATE)
        ref, tol = a["referenceValue"], p["tolerance"]
        measured = round(ref + r.uniform(-tol * 1.8, tol * 1.8), 3)
        error = round(abs(measured - ref), 3)
        rows.append({"id": f"CAL-{a['id']}-2026-{counts[a['id']]:06d}", "assetId": a["id"],
                     "name": a["name"], "calibrationPlanId": p["id"], "date": d.isoformat(),
                     "measured": measured, "reference": ref, "tolerance": tol, "error": error,
                     "result": "Pass" if error <= tol else "Fail",
                     "engineer": r.choice(["John Smith", "Priya Sharma", "Rahul Kumar", "Anita Reddy", "David Wilson"]),
                     "calibrationType": r.choice(["Scheduled", "Routine", "Corrective"]),
                     "workOrderId": "", "nextDueDate": add_months(d, p["interval"]).isoformat(),
                     "createdAt": d.isoformat()})
    return sorted(rows, key=lambda x: (x["assetId"], x["date"], x["id"]))


def synchronize_asset_state(assets, events):
    latest = {}
    for e in events:
        if e["assetId"] not in latest or (e["date"], e["id"]) > (latest[e["assetId"]]["date"], latest[e["assetId"]]["id"]):
            latest[e["assetId"]] = e
    for a in assets:
        e = latest.get(a["id"])
        if e:
            a["lastCalibration"], a["dueDate"] = e["date"], e["nextDueDate"]
            a["status"] = "Active" if e["result"] == "Pass" else "On Hold"


def generate_certificates(events, plans):
    r, pmap, rows = rng_for("certificates"), {p["id"]: p for p in plans}, []
    for e in events:
        if e["result"] == "Pass":
            d = date.fromisoformat(e["date"])
            expiry = add_months(d, pmap[e["calibrationPlanId"]]["interval"])
            rows.append({"id": f"CERT-{e['id']}", "calibrationId": e["id"], "assetId": e["assetId"],
                         "instrumentName": e["name"], "issueDate": d.isoformat(),
                         "expiryDate": expiry.isoformat(), "status": "Valid" if expiry >= END_DATE else "Expired",
                         "issuedBy": e["engineer"], "documentReference": f"DOC-{e['id']}"})
    return rows


def generate_work_orders(events):
    r, rows = rng_for("work_orders"), []
    for n, e in enumerate((x for x in events if x["result"] == "Fail"), 1):
        d = date.fromisoformat(e["date"])
        hours = r.randint(2, 48)
        start = d + timedelta(days=r.randint(0, 2))
        rows.append({"id": f"WO-2026-{n:06d}", "assetId": e["assetId"], "calibrationId": e["id"],
                     "instrumentName": e["name"], "createdDate": d.isoformat(),
                     "status": r.choice(["Open", "In Progress", "Pending Verification"]),
                     "impactAssessment": "Completed", "sourceWorkOrderId": "",
                     "downtimeStart": start.isoformat(), "downtimeEnd": (start + timedelta(hours=hours)).isoformat(),
                     "downtimeHours": hours, "correctiveAction": r.choice(["Sensor adjustment", "Component replacement", "Equipment repair", "Recalibration required", "Connection inspection"]),
                     "technician": r.choice(["Arun Kumar", "Suresh Reddy", "Michael John", "Priya Sharma", "Ravi Teja"]),
                     "verificationStatus": "Pending", "verificationDate": "", "verificationCalibrationId": ""})
    return rows


def generate_extensions(assets):
    r, rows = rng_for("extensions"), []
    for n, a in enumerate(r.sample(assets, TOTAL_EXTENSIONS), 1):
        d = random_date(r, START_DATE, END_DATE)
        rows.append({"extensionId": f"EXT-2026-{n:06d}", "assetId": a["id"],
                     "approvedBy": r.choice(["Quality Manager", "Plant Manager", "Maintenance Head"]),
                     "approvalDate": d.isoformat(), "effectiveFrom": d.isoformat(),
                     "effectiveTo": (d + timedelta(days=r.randint(1, 7))).isoformat(),
                     "justification": r.choice(["Urgent production requirement", "Replacement instrument unavailable", "Temporary operational exception"]),
                     "status": "Approved"})
    return rows


def build_event_index(events):
    by_asset = defaultdict(list)
    for e in events:
        by_asset[e["assetId"]].append(e)
    for rows in by_asset.values():
        rows.sort(key=lambda x: (x["date"], x["id"]))
    return by_asset, {k: [x["date"] for x in v] for k, v in by_asset.items()}


def classify_usage(asset_id, usage_date, event_index, extension_index):
    by_asset, date_index = event_index
    rows, dates = by_asset.get(asset_id, []), date_index.get(asset_id, [])
    pos = bisect_right(dates, usage_date.isoformat()) - 1
    latest = rows[pos] if pos >= 0 else None
    if latest is None:
        return "Invalid", "No Previous Calibration", ""
    if latest["result"] == "Fail":
        return "Invalid", "Failed Calibration", ""
    if usage_date <= date.fromisoformat(latest["nextDueDate"]):
        return "Valid", "", ""
    for ext in extension_index.get(asset_id, []):
        if ext["status"] == "Approved" and date.fromisoformat(ext["effectiveFrom"]) <= usage_date <= date.fromisoformat(ext["effectiveTo"]):
            return "Valid", "", ext["extensionId"]
    return "Invalid", "Calibration Overdue", ""


def generate_production_usage(assets, events, extensions):
    r, event_index, ext_index = rng_for("production_usage"), build_event_index(events), defaultdict(list)
    for ext in extensions:
        ext_index[ext["assetId"]].append(ext)
    counts, rows = defaultdict(int), []
    for n in range(1, TOTAL_PRODUCTION_USES + 1):
        a, d = r.choice(assets), random_date(r, START_DATE, END_DATE)
        status, issue, exception = classify_usage(a["id"], d, event_index, ext_index)
        counts[a["id"]] += 1
        rows.append({"id": f"USE-{a['id']}-{d:%Y%m%d}-{counts[a['id']]:06d}", "assetId": a["id"],
                     "instrument": a["name"], "batchId": f"BATCH-{n:06d}", "usageDate": d.isoformat(),
                     "operator": r.choice(["Operator A", "Operator B", "Operator C", "Operator D", "Operator E"]),
                     "productionLine": r.choice(["Production Line A", "Production Line B", "Production Line C", "Assembly Line", "Packaging Line"]),
                     "status": status, "issueType": issue, "exceptionId": exception, "createdAt": d.isoformat()})
    return rows


def generate_alerts(assets, events, usage, work_orders):
    latest, invalid, open_wo, rows = {}, defaultdict(int), defaultdict(int), []
    for e in events:
        if e["assetId"] not in latest or (e["date"], e["id"]) > (latest[e["assetId"]]["date"], latest[e["assetId"]]["id"]):
            latest[e["assetId"]] = e
    for u in usage:
        if u["status"] == "Invalid":
            invalid[u["assetId"]] += 1
    for w in work_orders:
        if w["status"] != "Completed":
            open_wo[w["assetId"]] += 1
    for a in assets:
        e = latest.get(a["id"])
        if e and e["result"] == "Fail":
            typ, sev, desc, ref = "Calibration Failed", "Critical", "Latest calibration failed; instrument must remain out of service.", e["id"]
        elif invalid[a["id"]]:
            typ, sev, desc, ref = "Invalid Production Usage", "High", f"{invalid[a['id']]} invalid usage records require review.", a["id"]
        elif e and date.fromisoformat(e["nextDueDate"]) < END_DATE:
            typ, sev, desc, ref = "Calibration Due", "Medium", "Calibration due date occurs within the reporting period.", e["id"]
        else:
            continue
        rows.append({"id": f"ALT-2026-{len(rows)+1:06d}", "assetId": a["id"], "alertType": typ,
                     "severity": sev, "description": desc, "date": END_DATE.isoformat(),
                     "status": "Active" if open_wo[a["id"]] else "Acknowledged", "referenceId": ref})
    return rows


def generate_audit_records(events, certificates, work_orders, extensions):
    rows, n = [], 1
    def add(activity, description, actor, ref, entity):
        nonlocal n
        rows.append({"id": f"AUD-2026-{n:07d}", "activity": activity, "description": description,
                     "performedBy": actor, "date": END_DATE.isoformat(), "referenceId": ref,
                     "entityType": entity, "previousState": "", "newState": ""})
        n += 1
    for e in events:
        add("Calibration Recorded", f"{e['result']} calibration recorded for {e['assetId']}.", e["engineer"], e["id"], "CalibrationEvent")
    for c in certificates:
        add("Certificate Issued", f"Certificate issued for {c['assetId']}.", c["issuedBy"], c["id"], "Certificate")
    for w in work_orders:
        add("Work Order Created", f"Corrective work order created for {w['assetId']}.", w["technician"], w["id"], "WorkOrder")
    for x in extensions:
        add("Emergency Extension Approved", f"Temporary extension approved for {x['assetId']}.", x["approvedBy"], x["extensionId"], "EmergencyExtension")
    return rows


def inject_anomalies(assets, certificates, work_orders, usage):
    truth = []
    def add(entity, entity_id, issue, description):
        truth.append({"anomalyId": f"GT-{len(truth)+1:03d}", "entityType": entity,
                      "entityId": entity_id, "issueType": issue, "expectedLabel": "Anomaly",
                      "description": description})
    a = assets[0]
    a["dueDate"] = (date.fromisoformat(a["dueDate"]) + timedelta(days=3)).isoformat()
    add("Asset", a["id"], "INCORRECT_DUE_DATE", "Due date intentionally shifted by three days.")
    if certificates and len(assets) > 1:
        c = certificates[0]
        c["assetId"] = next(x["id"] for x in assets if x["id"] != c["assetId"])
        add("Certificate", c["id"], "CERTIFICATE_WRONG_ASSET", "Certificate asset reference does not match its calibration event.")
    if work_orders:
        w = work_orders[0]
        w["impactAssessment"] = "Required"
        add("WorkOrder", w["id"], "MISSING_IMPACT_ASSESSMENT", "Impact assessment intentionally left incomplete.")
    if len(certificates) > 1:
        c = certificates.pop()
        add("CalibrationEvent", c["calibrationId"], "MISSING_CERTIFICATE", "Passed calibration intentionally has no certificate.")
    candidate = next((u for u in usage if u["status"] == "Invalid" and u["issueType"] in ("Calibration Overdue", "Failed Calibration")), usage[0])
    candidate["status"], candidate["issueType"], candidate["exceptionId"] = "Valid", "", ""
    add("ProductionUse", candidate["id"], "EXPIRED_USE_WITHOUT_EXCEPTION", "Usage intentionally marked valid without a valid calibration or approved exception.")
    return truth


def validate_all(d, truth):
    errors = []
    gt = {(x["entityType"], x["entityId"], x["issueType"]) for x in truth}
    def unique(rows, key, label):
        vals = [x[key] for x in rows]
        if len(vals) != len(set(vals)):
            errors.append(f"{label}: duplicate {key}")
    for key, label in [("assets","Assets"),("calibration_events","Calibration events"),("certificates","Certificates"),("work_orders","Work orders"),("production_usage","Production usage"),("emergency_extensions","Extensions"),("alerts","Alerts"),("audit_records","Audit records")]:
        pk = "extensionId" if key == "emergency_extensions" else "id"
        unique(d[key], pk, label)
    asset_ids = {x["id"] for x in d["assets"]}
    type_ids = {x["id"] for x in d["instrument_types"]}
    plans = {x["id"]: x for x in d["calibration_plans"]}
    suppliers = {x["supplierId"] for x in d["suppliers"]}
    events = {x["id"]: x for x in d["calibration_events"]}
    extensions = {x["extensionId"] for x in d["emergency_extensions"]}
    for a in d["assets"]:
        if a["instrumentTypeId"] not in type_ids: errors.append(f"{a['id']}: invalid type")
        if a["calibrationPlanId"] not in plans: errors.append(f"{a['id']}: invalid plan")
        elif plans[a["calibrationPlanId"]]["instrumentTypeId"] != a["instrumentTypeId"]: errors.append(f"{a['id']}: plan/type mismatch")
        if a["supplierId"] not in suppliers: errors.append(f"{a['id']}: invalid supplier")
    for e in d["calibration_events"]:
        if e["assetId"] not in asset_ids: errors.append(f"{e['id']}: invalid asset")
        if e["calibrationPlanId"] not in plans: errors.append(f"{e['id']}: invalid plan")
        err = round(abs(e["measured"] - e["reference"]), 3)
        if err != e["error"]: errors.append(f"{e['id']}: incorrect error")
        if e["result"] != ("Pass" if err <= e["tolerance"] else "Fail"): errors.append(f"{e['id']}: incorrect result")
    for c in d["certificates"]:
        e = events.get(c["calibrationId"])
        if not e or e["result"] != "Pass": errors.append(f"{c['id']}: invalid calibration link")
        elif c["assetId"] != e["assetId"] and ("Certificate", c["id"], "CERTIFICATE_WRONG_ASSET") not in gt: errors.append(f"{c['id']}: asset mismatch")
    for w in d["work_orders"]:
        e = events.get(w["calibrationId"])
        if not e or e["result"] != "Fail": errors.append(f"{w['id']}: invalid failed-calibration link")
        if w["assetId"] not in asset_ids: errors.append(f"{w['id']}: invalid asset")
        if w["impactAssessment"] != "Completed" and ("WorkOrder", w["id"], "MISSING_IMPACT_ASSESSMENT") not in gt: errors.append(f"{w['id']}: incomplete assessment")
    for u in d["production_usage"]:
        if u["assetId"] not in asset_ids: errors.append(f"{u['id']}: invalid asset")
        if u["exceptionId"] and u["exceptionId"] not in extensions: errors.append(f"{u['id']}: invalid extension")
    for x in d["emergency_extensions"]:
        if x["assetId"] not in asset_ids: errors.append(f"{x['extensionId']}: invalid asset")
        if date.fromisoformat(x["effectiveTo"]) < date.fromisoformat(x["effectiveFrom"]): errors.append(f"{x['extensionId']}: invalid dates")
    expected = {"assets":2000,"calibration_events":5000,"production_usage":100000,"instrument_types":4,"calibration_plans":5,"suppliers":20,"emergency_extensions":100}
    for k, n in expected.items():
        if len(d[k]) != n: errors.append(f"{k}: expected {n}, got {len(d[k])}")
    if len(truth) != 5: errors.append(f"Expected 5 labelled anomalies, got {len(truth)}")
    if errors:
        raise ValueError("VALIDATION FAILED:\n" + "\n".join(errors[:50]))
    return {"status":"PASSED","checks":"primary-key uniqueness, foreign keys, calibration arithmetic, certificate links, work orders, extension references, required counts","labelledAnomalies":len(truth)}


def write_readme(datasets, truth, validation):
    lines = [
        "# CalibraTrack Synthetic Data Generator", "",
        "Deterministic synthetic industrial calibration-management data. No real factory or customer data is used.", "",
        "## Run", "From the `data-generator` directory:", "",
        "```powershell", "python scripts/generate_data.py", "```", "",
        "Optional output directory:", "```powershell", "python scripts/generate_data.py --output-dir output", "```", "",
        "## Reproducibility", f"- Seed: `{SEED}`", f"- Generator version: `{VERSION}`",
        f"- Date range: `{START_DATE}` to `{END_DATE}`", "- Independent deterministic random streams are used per dataset.", "",
        "## Outputs", "Each dataset is exported as CSV and JSON. SQLite database and SQL seed script are also generated.",
        "`ground_truth.csv` documents intentional anomalies. `manifest.json` contains SHA-256 checksums.", "",
        "## Record counts",
    ]
    lines += [f"- {k}: {len(v):,}" for k, v in datasets.items()]
    lines += [f"- ground_truth: {len(truth):,}", "", "## Intentional anomalies",
              "Five labelled scenarios: incorrect asset due date; certificate linked to wrong asset; missing impact assessment; missing certificate after a passed calibration; expired use without an exception.",
              "", "## Validation", f"- Status: {validation['status']}", f"- Checks: {validation['checks']}",
              "", "## Limitations", "This is synthetic demonstration data, not a representation of a particular factory's approved policy. Production deployment must enforce site-specific authorization, calibration policy, and audit requirements."]
    (BASE_DIR / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def create_manifest(out):
    files = {}
    for p in sorted(out.iterdir()):
        if p.is_file() and p.name != "manifest.json":
            files[p.name] = {"sha256": hashlib.sha256(p.read_bytes()).hexdigest(), "bytes": p.stat().st_size}
    manifest = {"generatorVersion": VERSION, "seed": SEED, "files": files}
    write_json(out / "manifest.json", manifest)


def main():
    parser = argparse.ArgumentParser(description="Generate CalibraTrack synthetic data.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()
    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    print(f"CalibraTrack Synthetic Data Generator v{VERSION} | seed={SEED}")

    types = generate_instrument_types()
    plans = generate_calibration_plans(types)
    suppliers = generate_suppliers()
    assets = generate_assets(types, plans, suppliers)
    events = generate_calibration_events(assets, plans)
    synchronize_asset_state(assets, events)
    certificates = generate_certificates(events, plans)
    work_orders = generate_work_orders(events)
    extensions = generate_extensions(assets)
    usage = generate_production_usage(assets, events, extensions)
    alerts = generate_alerts(assets, events, usage, work_orders)
    audit = generate_audit_records(events, certificates, work_orders, extensions)
    truth = inject_anomalies(assets, certificates, work_orders, usage)

    datasets = {
        "instrument_types":types, "calibration_plans":plans, "suppliers":suppliers,
        "assets":assets, "calibration_events":events, "certificates":certificates,
        "work_orders":work_orders, "production_usage":usage, "emergency_extensions":extensions,
        "alerts":alerts, "audit_records":audit,
    }
    validation = validate_all(datasets, truth)

    for name, rows in datasets.items():
        write_csv(out / f"{name}.csv", rows)
        write_json(out / f"{name}.json", rows)
    write_csv(out / "ground_truth.csv", truth)
    write_json(out / "ground_truth.json", truth)
    write_json(out / "validation_summary.json", {
        "version":VERSION, "seed":SEED, "dateRange":{"start":str(START_DATE),"end":str(END_DATE)},
        "validation":validation, "counts":{k:len(v) for k,v in datasets.items()},
        "groundTruthCount":len(truth)
    })
    db = out / "calibratrack.sqlite"
    export_sqlite(db, datasets)
    con = sqlite3.connect(db)
    try:
        dump = "\n".join(con.iterdump()) + "\n"
    finally:
        con.close()
    (out / "calibratrack_seed.sql").write_text(dump, encoding="utf-8")
    write_readme(datasets, truth, validation)
    create_manifest(out)

    print("\nVALIDATION PASSED")
    for name, rows in datasets.items():
        print(f"{name}: {len(rows):,}")
    print(f"ground_truth: {len(truth)}")
    print("CSV, JSON, SQLite, SQL, README, validation summary and SHA-256 manifest created.")
    print(f"Output: {out}")


if __name__ == "__main__":
    main()
