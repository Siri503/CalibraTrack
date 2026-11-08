# CalibraTrack Synthetic Data Generator

Deterministic synthetic industrial calibration-management data. No real factory or customer data is used.

## Run

From the `data-generator` directory:

```powershell
python scripts/generate_data.py
```

Optional custom output directory:

```powershell
python scripts/generate_data.py --output-dir output_run1
```

## Reproducibility

- Seed: `20261022`
- Generator version: `1.0.0`
- Date range: `2026-01-01` to `2026-12-31`
- Independent deterministic random streams are used per dataset.

## Outputs

Each dataset is exported as CSV and JSON. A SQLite database and SQL seed script are also generated.

- `ground_truth.csv` and `ground_truth.json`: intentional anomaly labels.
- `validation_summary.json`: built-in validation results.
- `manifest.json`: SHA-256 checksums.
- `calibratrack.sqlite`: SQLite database.
- `calibratrack_seed.sql`: SQL seed script.

## Record Counts

| Dataset | Records |
|---|---:|
| Instrument Types | 4 |
| Calibration Plans | 5 |
| Suppliers | 20 |
| Assets | 2,000 |
| Calibration Events | 5,000 |
| Certificates | 2,844 |
| Work Orders | 2,155 |
| Production Usage | 100,000 |
| Emergency Extensions | 100 |
| Alerts | 1,988 |
| Audit Records | 10,100 |
| Ground Truth | 5 |

## Intentional Anomalies

Five labelled scenarios:

1. Incorrect asset due date.
2. Certificate linked to the wrong asset.
3. Missing impact assessment.
4. Missing certificate after a passed calibration.
5. Expired instrument used without an exception.

## Validation

- Generator validation: PASSED
- Independent validation: PASSED
- Primary-key uniqueness and foreign-key integrity.
- Calibration arithmetic and business-rule checks.
- Certificate and work-order relationships.
- Emergency extension and production-use validation.
- Ground-truth anomaly verification.
- SQLite and SHA-256 checksum verification.

Run independent validation from the `data-generator` directory:

```powershell
python tests/validate_data.py
```

## Limitations

This is synthetic demonstration data, not a representation of a particular factory's approved policy. Production deployment must enforce site-specific authorization, calibration policies, and audit requirements.