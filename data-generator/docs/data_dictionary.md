CalibraTrack Data Dictionary
All records are synthetic. Dates use ISO 8601 YYYY-MM-DD. CSV exports encode values as text; JSON exports preserve numeric values as numbers. Empty strings represent fields that are not applicable or not yet populated.
instrument_types.csv / .json
Field	Type	Description
id	string	Instrument type identifier (PK).
name	string	Instrument type name.
description	string	Purpose of the instrument type.
measurementUnit	string	Unit used for measurement.
category	string	Measurement category.
status	string	Master-record status.
createdAt	date	Record creation date.


calibration_plans.csv / .json
Field	Type	Description
id	string	Calibration plan identifier (PK).
name	string	Plan display name.
instrumentTypeId	string	Related instrument type (FK).
interval	integer	Calibration interval in months.
tolerance	number	Maximum permitted absolute measurement error.
toleranceUnit	string	Unit for tolerance.
effectiveFrom	date	Plan start date.
effectiveTo	date	Plan end date.
status	string	Plan status.


suppliers.csv / .json
Field	Type	Description
supplierId	string	Supplier identifier (PK).
supplierName	string	Synthetic supplier name.
supplierCode	string	Supplier code.
country	string	Supplier country.
contactEmail	string	Synthetic example.com email.
status	string	Supplier status.
createdAt	date	Record creation date.


assets.csv / .json
Field	Type	Description
id	string	Asset identifier (PK).
name	string	Instrument display name.
instrumentTypeId	string	Instrument type (FK).
serialNumber	string	Synthetic serial number.
manufacturer	string	Manufacturer label.
location	string	Plant area/location label.
calibrationPlanId	string	Assigned plan (FK).
calibrationPlanName	string	Denormalized plan name for display.
referenceValue	number	Reference measurement value.
lastCalibration	date	Latest recorded calibration date after state synchronization.
interval	integer	Calibration interval in months.
dueDate	date	Current due date; one labelled anomaly is intentionally incorrect.
supplierId	string	Supplier (FK).
status	string	Asset state (Active or On Hold).
createdAt	date	Record creation date.


calibration_events.csv / .json
Field	Type	Description
id	string	Calibration event identifier (PK).
assetId	string	Calibrated asset (FK).
name	string	Instrument display name.
calibrationPlanId	string	Applied calibration plan (FK).
date	date	Calibration date.
measured	number	Observed measurement.
reference	number	Reference measurement.
tolerance	number	Permitted absolute error.
error	number	Rounded absolute difference between measured and reference.
result	string	Pass or Fail, based on tolerance.
engineer	string	Synthetic engineer name.
calibrationType	string	Scheduled, Routine, or Corrective.
workOrderId	string	Reserved work-order link; empty in this generator.
nextDueDate	date	Calibration date plus plan interval.
createdAt	date	Event creation date.


certificates.csv / .json
Field	Type	Description
id	string	Certificate identifier (PK).
calibrationId	string	Related calibration event (FK).
assetId	string	Asset reference (FK); one labelled mismatch is intentional.
instrumentName	string	Instrument display name.
issueDate	date	Certificate issue date.
expiryDate	date	Certificate expiry date.
status	string	Valid or Expired relative to the generator's reporting horizon.
issuedBy	string	Issuing engineer.
documentReference	string	Synthetic document reference.


work_orders.csv / .json
Field	Type	Description
id	string	Work-order identifier (PK).
assetId	string	Affected asset (FK).
calibrationId	string	Failed calibration event (FK).
instrumentName	string	Instrument display name.
createdDate	date	Work-order creation date.
status	string	Open, In Progress, or Pending Verification.
impactAssessment	string	Assessment state; one labelled anomaly is Required.
sourceWorkOrderId	string	Optional source work order; empty in generated base records.
downtimeStart	date	Downtime start date.
downtimeEnd	date	Downtime end timestamp represented as ISO date-time.
downtimeHours	integer	Planned downtime duration in hours.
correctiveAction	string	Synthetic corrective action.
technician	string	Synthetic technician name.
verificationStatus	string	Initially Pending.
verificationDate	string	Verification date; empty until verified.
verificationCalibrationId	string	Verification calibration reference; empty until verified.


production_usage.csv / .json
Field	Type	Description
id	string	Production-use identifier (PK).
assetId	string	Used asset (FK).
instrument	string	Instrument display name.
batchId	string	Synthetic production batch identifier.
usageDate	date	Date of production use.
operator	string	Synthetic operator label.
productionLine	string	Production line.
status	string	Valid or Invalid according to calibration/exception rules; one labelled anomaly is intentionally Valid.
issueType	string	Reason for invalid use; empty when valid.
exceptionId	string	Approved emergency extension (FK); empty when none is applied.
createdAt	date	Record creation date.


emergency_extensions.csv / .json
Field	Type	Description
extensionId	string	Extension identifier (PK).
assetId	string	Asset receiving extension (FK).
approvedBy	string	Synthetic approving role.
approvalDate	date	Approval date.
effectiveFrom	date	First effective date.
effectiveTo	date	Last effective date.
justification	string	Reason for exception.
status	string	Extension status; generated records are Approved.


alerts.csv / .json
Field	Type	Description
id	string	Alert identifier (PK).
assetId	string	Related asset (FK).
alertType	string	Alert category.
severity	string	Critical, High, or Medium.
description	string	Human-readable alert explanation.
date	date	Reporting date used by generator.
status	string	Active or Acknowledged.
referenceId	string	Related event or asset identifier.


audit_records.csv / .json
Field	Type	Description
id	string	Audit record identifier (PK).
activity	string	Activity label.
description	string	Human-readable event description.
performedBy	string	Synthetic actor.
date	date	Audit date.
referenceId	string	Referenced entity identifier.
entityType	string	Referenced entity type.
previousState	string	Previous state; blank in generated initial history.
newState	string	New state; blank in generated initial history.


ground_truth.csv / .json
Field	Type	Description
anomalyId	string	Ground-truth identifier (PK).
entityType	string	Entity containing the anomaly.
entityId	string	Identifier of the affected record.
issueType	string	Stable anomaly category code.
expectedLabel	string	Expected label; Anomaly.
description	string	Explanation of the injected anomaly.


Derived rules
- Calibration error: round(abs(measured - reference), 3).
- Calibration passes when error <= tolerance; otherwise it fails.
- Next due date: calibration date plus the plan interval in calendar months.
- A usage is invalid when there is no prior calibration, the latest calibration failed, or a passed calibration is overdue without an approved extension covering the usage date.
- An approved extension applies only to its asset and inclusive effective date range.