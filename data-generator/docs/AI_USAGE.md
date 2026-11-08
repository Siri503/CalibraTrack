AI Usage and Human Review
Tools used
ChatGPT was used as an AI assistant during planning, implementation support, code review, debugging, validation design, and documentation preparation.
Areas where AI assistance was used
- Breaking the calibration-management problem into entities, workflows, and data relationships.
- Planning a deterministic synthetic-data generator and its export formats.
- Reviewing generator logic and suggesting validation checks.
- Creating an independent validation script for record counts, keys, relationships, business rules, anomaly labels, SQLite output, and checksums.
- Drafting technical documentation.
Human review and verification performed
The project owner ran the generator locally from the project folder and confirmed that it completed with VALIDATION PASSED. The owner then ran the separate tests/validate_data.py script and confirmed INDEPENDENT VALIDATION PASSED. The owner also ran the generator twice into separate output folders to perform the reproducibility check.

Before submission, the project owner should personally review the generated code, run commands, outputs, assumptions, and limitations and be prepared to explain them.
Prompt history
The submission instructions request the prompts submitted to AI tools. Add the exact prompts from the conversation/tool history here before submission. Do not treat the topic summaries below as verbatim prompts.
Stage	Prompt / request summary	Exact prompt copied into submission?
Project understanding	Break down the calibration-management problem and expected workflow/data.	Replace with exact prompt
Data generation	Build a deterministic Python synthetic-data generator for the required entities and record volumes.	Replace with exact prompt
Generator improvement	Consolidate generator functionality, exports, anomaly injection, and validation.	Replace with exact prompt
Independent testing	Create a separate validation script to check generated outputs and intentional anomalies.	Replace with exact prompt
Documentation	Prepare schema, data dictionary, setup, and AI-use documentation.	Replace with exact prompt


Assumptions and limitations
- All generated people, suppliers, serial numbers, and records are synthetic.
- The generator's reporting window is calendar year 2026 and its fixed seed is 20261022.
- Calibration policy is illustrative. A real factory must configure intervals, tolerances, exception authorization, and release-to-production controls according to its approved quality procedures.
- The SQLite database is a generated demonstration artifact, not a production multi-user database.
- The generator's audit history is synthetic initial history; it is not a live audit log of the React application's localStorage changes.
- Five labelled anomalies are intentionally injected for testing. They must not be mistaken for unintentional data-quality defects.