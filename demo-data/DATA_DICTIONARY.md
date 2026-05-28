# Syntheci Maritime Demo Data Dictionary

This data dictionary describes the synthetic dataset for **Aegean Meridian Shipping**. All names, companies, ports, vessels, emails, documents, identifiers, and operational details are fictional.

## Identifier Conventions

| Prefix | Meaning | Example |
| --- | --- | --- |
| `VES-` | Vessel record | `VES-001` |
| `VOY-` | Voyage record | `VOY-2026-0525` |
| `PORT-` | Port or terminal record | `PORT-020` |
| `PER-` | Employee or contact | `PER-003` |
| `EML-` | Email message | `EML-2026-0077` |
| `THR-` | Email thread | `THR-2026-025` |
| `ATT-` | Email attachment reference | `ATT-025-1` |
| `DOC-` | Markdown attachment document | `DOC-2026-0058` |
| `EVT-` | Voyage event | `EVT-2026-00103` |
| `AIS-` | AIS position | `AIS-2026-00037` |
| `BINV-` | Bunker invoice/report | `BINV-2026-0033` |
| `CFL-` | Compliance flag | `CFL-2026-0025` |
| `SCN-` | Curated demo storyline | `SCN-001` |

Vessel `imo` values are prefixed with `SYN` so they do not represent real registry identifiers.

## Core Entities

### `vessels.json`

Synthetic vessel master data.

| Field | Type | Description |
| --- | --- | --- |
| `vessel_id` | string | Stable vessel identifier. |
| `vessel_name` | string | Fictional vessel name used throughout the dataset. |
| `imo` | string | Synthetic IMO-like identifier prefixed with `SYN`. |
| `vessel_type` | string | Vessel class, such as product tanker, bulk carrier, or container feeder. |
| `dwt` | number | Deadweight tonnage used for realistic operational scaling. |
| `flag` | string | Fictional flag state. |
| `year_built` | number | Synthetic build year. |
| `capacity` | string | Capacity expression appropriate to vessel type. |
| `home_port` | string | Fictional home port or terminal. |
| `operational_status` | string | Current vessel status, such as `active` or `dry dock scheduled`. |

### `voyages.json`

Voyage-level operational records. This is the main join point for most demo workflows.

| Field | Type | Description |
| --- | --- | --- |
| `voyage_id` | string | Primary voyage identifier. |
| `vessel_id` | string | Foreign key to `vessels.vessel_id`. |
| `vessel_name` | string | Vessel name copied from the vessel record for easier retrieval. |
| `imo` | string | Synthetic vessel IMO copied from the vessel record. |
| `origin_port_id` | string | Foreign key to `ports.port_id`. |
| `origin_port` | string | Origin port name. |
| `destination_port_id` | string | Foreign key to `ports.port_id`. |
| `destination_port` | string | Destination port name. |
| `cargo` | string | Fictional cargo description. |
| `laycan_start` | date | Start of laycan window. |
| `laycan_end` | date | End of laycan window. |
| `eta` | datetime | Estimated time of arrival. |
| `etd` | datetime | Estimated time of departure. |
| `status` | enum | One of `completed`, `arrived`, `in_transit`, `loading`, or `scheduled`. |
| `operations_contact_id` | string | Foreign key to `people.person_id`. |

### `ports.json`

Synthetic port and terminal master data.

| Field | Type | Description |
| --- | --- | --- |
| `port_id` | string | Stable port identifier. |
| `port_name` | string | Fictional port or terminal name. |
| `country` | string | Country used for route and compliance realism. |
| `region` | string | Maritime region. |
| `port_type` | string | Cargo or terminal type. |
| `berths` | number | Number of berths. |
| `max_draft_m` | number | Maximum draft in meters. |
| `timezone` | string | IANA timezone. |

### `people.json`

Fictional employees and operational contacts.

| Field | Type | Description |
| --- | --- | --- |
| `person_id` | string | Stable person/contact identifier. |
| `name` | string | Fictional person name. |
| `role` | string | Operational or business role. |
| `department` | string | Department or function. |
| `location` | string | Work location. |
| `email` | string | Synthetic `.example` email address. |
| `phone` | string | Fictional phone number. |

## Email and Document Layer

### `emails/emails.json`

Synthetic operational email corpus.

| Field | Type | Description |
| --- | --- | --- |
| `email_id` | string | Primary email identifier. |
| `thread_id` | string | Groups related messages into a 2-5 email chain. |
| `subject` | string | Operational email subject. |
| `from` | string | Sender address. |
| `to` | array | Primary recipients. |
| `cc` | array | Carbon-copy recipients. |
| `date` | datetime | Email timestamp. |
| `body` | string | Realistic synthetic email body. |
| `related_voyage_id` | string | Foreign key to `voyages.voyage_id`. |
| `related_vessel_name` | string | Vessel name matching the related voyage. |
| `attachments` | array | Attachment references pointing to markdown documents. |

Attachment objects include:

| Field | Type | Description |
| --- | --- | --- |
| `attachment_id` | string | Attachment reference identifier. |
| `document_id` | string | Foreign key to a markdown document front-matter `document_id`. |
| `document_type` | enum | Document category, such as `voyage_order`, `bunker_fuel_document`, `notice_of_readiness`, `statement_of_facts`, `pda`, `fda`, `invoice`, `inspection_report`, `supplier_declaration`, or `claim_document`. |
| `filename` | string | Markdown filename under `documents/`. |
| `path` | string | Relative path to the markdown document. |
| `content_type` | string | Always `text/markdown` after document generation. |
| `original_filename` | string | Original synthetic attachment filename before markdown conversion. |
| `description` | string | Short attachment description. |
| `synthetic` | boolean | Always true for generated demo data. |

### `documents/*.md`

Markdown documents generated from email attachments for RAG ingestion and citations.

Required front matter:

| Field | Type | Description |
| --- | --- | --- |
| `document_id` | string | Primary document identifier. |
| `document_type` | enum | One of the synthetic attachment categories, including voyage orders, bunker/fuel evidence, charterparty excerpts, compliance SOPs, port/weather notices, claims notes, PDA/FDA records, NOR/SOF records, invoices, inspection reports, supplier declarations, MRV corrections, claim documents, and terminal notices. |
| `related_voyage_id` | string | Foreign key to `voyages.voyage_id`. |
| `related_vessel_name` | string | Vessel name matching the related voyage. |
| `source_email_id` | string | Foreign key to `emails.email_id`. |
| `created_at` | datetime | Timestamp inherited from the source email. |
| `source_attachment_id` | string | Attachment reference that produced the document. |
| `original_attachment_filename` | string | Original synthetic attachment filename. |

## Structured Operational Data

### `structured/bunker_reports.csv`

Structured bunker/fuel reports.

| Field | Type | Description |
| --- | --- | --- |
| `vessel` | string | Vessel name matching the voyage. |
| `voyage_id` | string | Foreign key to `voyages.voyage_id`. |
| `fuel_type` | enum | `VLSFO`, `MGO`, or `LNG`. |
| `quantity_mt` | number | Delivered or reconciled fuel quantity in metric tons. |
| `sulfur_pct` | number | Synthetic sulfur percentage. |
| `co2_factor` | number | Synthetic CO2 factor for demo calculations. |
| `port` | string | Delivery or reporting port. |
| `supplier` | string | Fictional bunker supplier. |
| `invoice_id` | string | Primary bunker invoice/report identifier. |
| `date` | date | Report or invoice date. |

### `structured/ais_positions.json`

Synthetic AIS-style positions for active voyages.

| Field | Type | Description |
| --- | --- | --- |
| `position_id` | string | Primary AIS position identifier. |
| `voyage_id` | string | Foreign key to `voyages.voyage_id`. |
| `vessel_name` | string | Vessel name matching the voyage. |
| `lat` | number | Latitude. |
| `lng` | number | Longitude. |
| `speed_knots` | number | Synthetic vessel speed. |
| `heading` | number | Heading in degrees. |
| `timestamp` | datetime | Position timestamp. |
| `destination` | string | Destination port name. |
| `eta` | datetime | Voyage ETA. |

### `structured/voyage_events.json`

Timeline events for voyage operations.

| Field | Type | Description |
| --- | --- | --- |
| `event_id` | string | Primary event identifier. |
| `voyage_id` | string | Foreign key to `voyages.voyage_id`. |
| `vessel_name` | string | Vessel name matching the voyage. |
| `event_type` | enum | `port_call`, `delay_event`, `canal_transit`, `weather_event`, or `bunker_stop`. |
| `event_time` | datetime | Event timestamp. |
| `location` | string | Port, sea area, or synthetic transit location. |
| `severity` | enum | `info`, `watch`, `medium`, or `high`. |
| `description` | string | Operational event description. |

### `structured/compliance_flags.json`

Precomputed compliance and performance risk flags.

| Field | Type | Description |
| --- | --- | --- |
| `flag_id` | string | Primary compliance flag identifier. |
| `voyage_id` | string | Foreign key to `voyages.voyage_id`. |
| `vessel_name` | string | Vessel name matching the voyage. |
| `eu_ets_exposure` | boolean | Whether EU ETS exposure is likely in this synthetic scenario. |
| `fueleu_risk` | boolean | Whether FuelEU risk is triggered by route or fuel assumptions. |
| `mrv_missing_data` | boolean | Whether MRV fuel data needs follow-up. |
| `cii_risk` | boolean | Whether CII performance risk is flagged. |
| `risk_score` | number | Synthetic risk score from 0 to 100. |
| `risk_level` | enum | `low`, `medium`, or `high`. |
| `rationale` | array | Human-readable explanations for the flags. |
| `last_evaluated_at` | datetime | Timestamp of the synthetic risk evaluation. |

## Scenario Layer

### `scenarios/storylines.json`

Curated demo storylines that connect multiple datasets into intentional workflows.

| Field | Type | Description |
| --- | --- | --- |
| `scenario_id` | string | Primary scenario identifier. |
| `title` | string | Scenario title for demos. |
| `primary_voyage_id` | string | Main voyage for the scenario. |
| `primary_vessel_name` | string | Main vessel for the scenario. |
| `severity` | enum | Demo severity level. |
| `status` | string | Scenario state such as `open`, `watch`, or `in_review`. |
| `business_problem` | string | One-paragraph problem statement. |
| `narrative` | string | Coherent storyline tying the evidence together. |
| `recommended_demo_questions` | array | Prompts that should retrieve this scenario well. |
| `expected_insights` | array | Expected answer points for demos or manual QA. |
| `evidence` | object | IDs for related threads, emails, documents, and structured records. |
| `suggested_actions` | array | Practical next actions the app can recommend. |

## Relationship Map

Most workflows should join data in this order:

1. Start with `voyage_id`.
2. Resolve vessel and route from `voyages.json`.
3. Retrieve matching emails via `emails.related_voyage_id`.
4. Retrieve markdown documents via `emails.attachments[].path`.
5. Retrieve structured records from `structured/*` by `voyage_id`.
6. Use `scenarios/storylines.json` for demo-ready narratives and expected insights.

## Recommended Demo Query Patterns

- Ask for a risk explanation: "Why is VOY-2026-0525 high risk?"
- Ask for evidence: "Which documents support the FuelEU issue for AMS Eirini?"
- Ask for timeline: "Show the delay and port-call events for AMS Dorian."
- Ask for reconciliation: "Does the bunker invoice close the MRV gap for AMS Thalassa?"
- Ask for commercial impact: "What charterparty clauses matter for AMS Helios?"
