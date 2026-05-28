# Syntheci Maritime Demo Dataset

This folder contains a fully fictional maritime dataset for one demo shipping company: **Aegean Meridian Shipping**.

The data is synthetic and should not be treated as operational, commercial, registry, personal, or confidential company data. Vessel names, port names, contacts, voyages, cargoes, phone numbers, email addresses, and identifiers were invented for demonstration use.

## Files

- `vessels.json`: 12 synthetic vessels operated by Aegean Meridian Shipping.
- `voyages.json`: 30 synthetic voyages dated around May 2026.
- `ports.json`: 20 fictional Mediterranean port and terminal records.
- `people.json`: 25 fictional employees and operational contacts.
- `emails/emails.json`: 200 synthetic operational emails grouped into 50 threads.
- `documents/`: 135 markdown attachment documents referenced from `emails/emails.json`.
- `structured/bunker_reports.csv`: Structured bunker and fuel invoice records.
- `structured/ais_positions.json`: Synthetic AIS positions for active voyages.
- `structured/voyage_events.json`: Operational timeline events across voyages.
- `structured/compliance_flags.json`: Precomputed EU ETS, FuelEU, MRV, and CII risk flags.
- `scenarios/storylines.json`: Five curated demo storylines that connect emails, documents, and structured records.
- `DATA_DICTIONARY.md`: Field definitions, identifier conventions, relationships, and demo query patterns.
- `source_manifest.json`: Dataset metadata, record counts, classification, and relationship notes.

## Relationships

`voyages.json` references the other files:

- `vessel_id`, `vessel_name`, and `imo` correspond to records in `vessels.json`.
- `origin_port_id` and `destination_port_id` correspond to records in `ports.json`.
- `operations_contact_id` corresponds to records in `people.json`.

`emails/emails.json` references voyage and document records:

- `related_voyage_id` corresponds to `voyages.voyage_id`.
- `related_vessel_name` corresponds to the vessel on the referenced voyage.
- Each attachment entry points to a markdown file under `documents/`.

`structured/` files reference base voyage and vessel records:

- `bunker_reports.csv`, `ais_positions.json`, `voyage_events.json`, and `compliance_flags.json` all use valid `voyage_id` values from `voyages.json`.
- Vessel fields match the vessel names on the referenced voyages.

`scenarios/storylines.json` references existing evidence:

- Each scenario has a `primary_voyage_id` and `primary_vessel_name`.
- Evidence arrays point to real email IDs, thread IDs, document IDs, voyage events, bunker invoice IDs, AIS position IDs, and compliance flag IDs.

Each markdown document starts with metadata fields:

- `document_id`
- `document_type`
- `related_voyage_id`
- `related_vessel_name`
- `source_email_id`
- `created_at`

Each voyage includes:

- `voyage_id`
- `vessel_name`
- `imo`
- `origin_port`
- `destination_port`
- `cargo`
- `laycan_start`
- `laycan_end`
- `eta`
- `etd`
- `status`

## Notes

- Dates are centered on May 2026, with a few arrivals extending into early June 2026.
- `imo` values are synthetic IMO-like strings prefixed with `SYN` so they do not represent real vessel registry identifiers.
- Email addresses use the reserved `.example` domain.
- Attachment documents are markdown files for easier ingestion into RAG pipelines.
- Structured files are intended for analytics, retrieval grounding, and operational dashboard demos.
- The dataset is intended for demos, UI prototyping, workflow testing, and examples where coherent fake maritime data is needed.
