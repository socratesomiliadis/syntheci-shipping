import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { chunkText, embedTexts } from "@syntheci/ai";
import {
  db,
  documentChunks,
  documents,
  ensureDefaultWorkspace,
  maritimeAisPositions,
  maritimeBunkerReports,
  maritimeComplianceFlags,
  maritimeDocuments,
  maritimeEmailChunks,
  maritimeEmails,
  maritimePeople,
  maritimePorts,
  maritimeScenarios,
  maritimeVessels,
  maritimeVoyageEvents,
  maritimeVoyages,
} from "@syntheci/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const demoDataRootCandidates = [
  path.resolve(process.cwd(), "../../demo-data"),
  path.resolve(process.cwd(), "demo-data"),
];

const vesselSchema = z.object({
  vessel_id: z.string(),
  vessel_name: z.string(),
  imo: z.string(),
  vessel_type: z.string(),
  dwt: z.number(),
  flag: z.string(),
  year_built: z.number(),
  capacity: z.string(),
  home_port: z.string(),
  operational_status: z.string(),
});

const portSchema = z.object({
  port_id: z.string(),
  port_name: z.string(),
  country: z.string(),
  region: z.string(),
  port_type: z.string(),
  berths: z.number(),
  max_draft_m: z.number(),
  timezone: z.string(),
});

const personSchema = z.object({
  person_id: z.string(),
  name: z.string(),
  role: z.string(),
  department: z.string(),
  location: z.string(),
  email: z.string(),
  phone: z.string(),
});

const voyageSchema = z.object({
  voyage_id: z.string(),
  vessel_id: z.string(),
  vessel_name: z.string(),
  imo: z.string(),
  origin_port_id: z.string(),
  origin_port: z.string(),
  destination_port_id: z.string(),
  destination_port: z.string(),
  cargo: z.string(),
  laycan_start: z.string(),
  laycan_end: z.string(),
  etd: z.string(),
  eta: z.string(),
  status: z.string(),
  operations_contact_id: z.string(),
});

const emailAttachmentSchema = z.object({
  attachment_id: z.string(),
  filename: z.string(),
  description: z.string(),
  content_type: z.string(),
  synthetic: z.boolean(),
  document_id: z.string(),
  document_type: z.string(),
  original_filename: z.string(),
  path: z.string(),
});

const emailSchema = z.object({
  email_id: z.string(),
  thread_id: z.string(),
  subject: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()),
  date: z.string(),
  body: z.string(),
  related_voyage_id: z.string(),
  related_vessel_name: z.string(),
  attachments: z.array(emailAttachmentSchema),
});

const bunkerReportSchema = z.object({
  vessel: z.string(),
  voyage_id: z.string(),
  fuel_type: z.string(),
  quantity_mt: z.coerce.number(),
  sulfur_pct: z.coerce.number(),
  co2_factor: z.coerce.number(),
  port: z.string(),
  supplier: z.string(),
  invoice_id: z.string(),
  date: z.string(),
});

const aisPositionSchema = z.object({
  position_id: z.string(),
  voyage_id: z.string(),
  vessel_name: z.string(),
  lat: z.number(),
  lng: z.number(),
  speed_knots: z.number(),
  heading: z.number(),
  timestamp: z.string(),
  destination: z.string(),
  eta: z.string(),
});

const voyageEventSchema = z.object({
  event_id: z.string(),
  voyage_id: z.string(),
  vessel_name: z.string(),
  event_type: z.string(),
  event_time: z.string(),
  location: z.string(),
  severity: z.string(),
  description: z.string(),
});

const complianceFlagSchema = z.object({
  flag_id: z.string(),
  voyage_id: z.string(),
  vessel_name: z.string(),
  eu_ets_exposure: z.boolean(),
  fueleu_risk: z.boolean(),
  mrv_missing_data: z.boolean(),
  cii_risk: z.boolean(),
  risk_score: z.number(),
  risk_level: z.string(),
  rationale: z.array(z.string()),
  last_evaluated_at: z.string(),
});

const scenarioSchema = z.object({
  scenario_id: z.string(),
  title: z.string(),
  primary_voyage_id: z.string(),
  primary_vessel_name: z.string(),
  severity: z.string(),
  status: z.string(),
  business_problem: z.string(),
  narrative: z.string(),
  recommended_demo_questions: z.array(z.string()),
  expected_insights: z.array(z.string()),
  evidence: z.record(z.string(), z.unknown()),
  suggested_actions: z.array(z.string()),
});

const frontMatterSchema = z.object({
  document_id: z.string(),
  document_type: z.string(),
  related_voyage_id: z.string(),
  related_vessel_name: z.string(),
  source_email_id: z.string(),
  created_at: z.string(),
  source_attachment_id: z.string(),
  original_attachment_filename: z.string(),
});

export const ingestDemoDataInputSchema = z
  .object({
    indexDocuments: z.boolean().default(true),
  })
  .default({ indexDocuments: true });

type RecordCounts = Record<string, number>;

export async function ingestDemoData(input: z.infer<typeof ingestDemoDataInputSchema>) {
  const workspaceId = await ensureDefaultWorkspace();
  const root = await resolveDemoDataRoot();
  const counts: RecordCounts = {};

  counts.vessels = await ingestVessels(root, workspaceId);
  counts.ports = await ingestPorts(root, workspaceId);
  counts.people = await ingestPeople(root, workspaceId);
  counts.voyages = await ingestVoyages(root, workspaceId);
  counts.emails = await ingestEmails(root, workspaceId, input.indexDocuments);
  counts.bunkerReports = await ingestBunkerReports(root, workspaceId);
  counts.aisPositions = await ingestAisPositions(root, workspaceId);
  counts.voyageEvents = await ingestVoyageEvents(root, workspaceId);
  counts.complianceFlags = await ingestComplianceFlags(root, workspaceId);
  counts.scenarios = await ingestScenarios(root, workspaceId);
  counts.documents = await ingestMarkdownDocuments(root, workspaceId, input.indexDocuments);
  counts.referenceDocuments = await ingestReferenceDocuments(root, workspaceId, input.indexDocuments);

  return { workspaceId, demoDataRoot: root, counts };
}

async function ingestVessels(root: string, workspaceId: string) {
  const records = vesselSchema.array().parse(await readJson(path.join(root, "vessels.json")));
  const now = new Date();
  await db
    .insert(maritimeVessels)
    .values(
      records.map((record) => ({
        id: record.vessel_id,
        workspaceId,
        vesselName: record.vessel_name,
        imo: record.imo,
        vesselType: record.vessel_type,
        dwt: record.dwt,
        flag: record.flag,
        yearBuilt: record.year_built,
        capacity: record.capacity,
        homePort: record.home_port,
        operationalStatus: record.operational_status,
        raw: record,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: maritimeVessels.id,
      set: {
        vesselName: sqlExcluded("vessel_name"),
        imo: sqlExcluded("imo"),
        vesselType: sqlExcluded("vessel_type"),
        dwt: sqlExcluded("dwt"),
        flag: sqlExcluded("flag"),
        yearBuilt: sqlExcluded("year_built"),
        capacity: sqlExcluded("capacity"),
        homePort: sqlExcluded("home_port"),
        operationalStatus: sqlExcluded("operational_status"),
        raw: sqlExcluded("raw"),
        updatedAt: now,
      },
    });
  return records.length;
}

async function ingestPorts(root: string, workspaceId: string) {
  const records = portSchema.array().parse(await readJson(path.join(root, "ports.json")));
  const now = new Date();
  await db
    .insert(maritimePorts)
    .values(
      records.map((record) => ({
        id: record.port_id,
        workspaceId,
        portName: record.port_name,
        country: record.country,
        region: record.region,
        portType: record.port_type,
        berths: record.berths,
        maxDraftM: record.max_draft_m,
        timezone: record.timezone,
        raw: record,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: maritimePorts.id,
      set: {
        portName: sqlExcluded("port_name"),
        country: sqlExcluded("country"),
        region: sqlExcluded("region"),
        portType: sqlExcluded("port_type"),
        berths: sqlExcluded("berths"),
        maxDraftM: sqlExcluded("max_draft_m"),
        timezone: sqlExcluded("timezone"),
        raw: sqlExcluded("raw"),
        updatedAt: now,
      },
    });
  return records.length;
}

async function ingestPeople(root: string, workspaceId: string) {
  const records = personSchema.array().parse(await readJson(path.join(root, "people.json")));
  const now = new Date();
  await db
    .insert(maritimePeople)
    .values(
      records.map((record) => ({
        id: record.person_id,
        workspaceId,
        name: record.name,
        role: record.role,
        department: record.department,
        location: record.location,
        email: record.email,
        phone: record.phone,
        raw: record,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: maritimePeople.id,
      set: {
        name: sqlExcluded("name"),
        role: sqlExcluded("role"),
        department: sqlExcluded("department"),
        location: sqlExcluded("location"),
        email: sqlExcluded("email"),
        phone: sqlExcluded("phone"),
        raw: sqlExcluded("raw"),
        updatedAt: now,
      },
    });
  return records.length;
}

async function ingestVoyages(root: string, workspaceId: string) {
  const records = voyageSchema.array().parse(await readJson(path.join(root, "voyages.json")));
  const now = new Date();
  await db
    .insert(maritimeVoyages)
    .values(
      records.map((record) => ({
        id: record.voyage_id,
        workspaceId,
        vesselId: record.vessel_id,
        vesselName: record.vessel_name,
        imo: record.imo,
        originPortId: record.origin_port_id,
        originPort: record.origin_port,
        destinationPortId: record.destination_port_id,
        destinationPort: record.destination_port,
        cargo: record.cargo,
        laycanStart: record.laycan_start,
        laycanEnd: record.laycan_end,
        etd: record.etd,
        eta: record.eta,
        status: record.status,
        operationsContactId: record.operations_contact_id,
        raw: record,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: maritimeVoyages.id,
      set: {
        vesselId: sqlExcluded("vessel_id"),
        vesselName: sqlExcluded("vessel_name"),
        imo: sqlExcluded("imo"),
        originPortId: sqlExcluded("origin_port_id"),
        originPort: sqlExcluded("origin_port"),
        destinationPortId: sqlExcluded("destination_port_id"),
        destinationPort: sqlExcluded("destination_port"),
        cargo: sqlExcluded("cargo"),
        laycanStart: sqlExcluded("laycan_start"),
        laycanEnd: sqlExcluded("laycan_end"),
        etd: sqlExcluded("etd"),
        eta: sqlExcluded("eta"),
        status: sqlExcluded("status"),
        operationsContactId: sqlExcluded("operations_contact_id"),
        raw: sqlExcluded("raw"),
        updatedAt: now,
      },
    });
  return records.length;
}

async function ingestEmails(root: string, workspaceId: string, indexEmails: boolean) {
  const records = emailSchema.array().parse(await readJson(path.join(root, "emails/emails.json")));
  const now = new Date();
  await db
    .insert(maritimeEmails)
    .values(
      records.map((record) => ({
        id: record.email_id,
        workspaceId,
        threadId: record.thread_id,
        subject: record.subject,
        from: record.from,
        to: record.to,
        cc: record.cc,
        sentAt: record.date,
        body: record.body,
        relatedVoyageId: record.related_voyage_id,
        relatedVesselName: record.related_vessel_name,
        attachments: record.attachments,
        raw: record,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: maritimeEmails.id,
      set: {
        threadId: sqlExcluded("thread_id"),
        subject: sqlExcluded("subject"),
        from: sqlExcluded("from_address"),
        to: sqlExcluded("to_addresses"),
        cc: sqlExcluded("cc_addresses"),
        sentAt: sqlExcluded("sent_at"),
        body: sqlExcluded("body"),
        relatedVoyageId: sqlExcluded("related_voyage_id"),
        relatedVesselName: sqlExcluded("related_vessel_name"),
        attachments: sqlExcluded("attachments"),
        raw: sqlExcluded("raw"),
        updatedAt: now,
      },
    });

  if (indexEmails) {
    for (const record of records) {
      await indexEmailContent(record.email_id, workspaceId, formatEmailForIndex(record), {
        subject: record.subject,
        from: record.from,
        sentAt: record.date,
        relatedVoyageId: record.related_voyage_id,
        relatedVesselName: record.related_vessel_name,
        source: "demo-data",
      });
    }
  }

  return records.length;
}

async function ingestBunkerReports(root: string, workspaceId: string) {
  const records = bunkerReportSchema.array().parse(parseCsv(await readFileText(path.join(root, "structured/bunker_reports.csv"))));
  const now = new Date();
  await db
    .insert(maritimeBunkerReports)
    .values(
      records.map((record) => ({
        id: record.invoice_id,
        workspaceId,
        vessel: record.vessel,
        voyageId: record.voyage_id,
        fuelType: record.fuel_type,
        quantityMt: record.quantity_mt,
        sulfurPct: record.sulfur_pct,
        co2Factor: record.co2_factor,
        port: record.port,
        supplier: record.supplier,
        invoiceDate: record.date,
        raw: record,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: maritimeBunkerReports.id,
      set: {
        vessel: sqlExcluded("vessel"),
        voyageId: sqlExcluded("voyage_id"),
        fuelType: sqlExcluded("fuel_type"),
        quantityMt: sqlExcluded("quantity_mt"),
        sulfurPct: sqlExcluded("sulfur_pct"),
        co2Factor: sqlExcluded("co2_factor"),
        port: sqlExcluded("port"),
        supplier: sqlExcluded("supplier"),
        invoiceDate: sqlExcluded("invoice_date"),
        raw: sqlExcluded("raw"),
        updatedAt: now,
      },
    });
  return records.length;
}

async function ingestAisPositions(root: string, workspaceId: string) {
  const records = aisPositionSchema.array().parse(await readJson(path.join(root, "structured/ais_positions.json")));
  const now = new Date();
  await db
    .insert(maritimeAisPositions)
    .values(
      records.map((record) => ({
        id: record.position_id,
        workspaceId,
        voyageId: record.voyage_id,
        vesselName: record.vessel_name,
        lat: record.lat,
        lng: record.lng,
        speedKnots: record.speed_knots,
        heading: record.heading,
        positionTimestamp: record.timestamp,
        destination: record.destination,
        eta: record.eta,
        raw: record,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: maritimeAisPositions.id,
      set: {
        voyageId: sqlExcluded("voyage_id"),
        vesselName: sqlExcluded("vessel_name"),
        lat: sqlExcluded("lat"),
        lng: sqlExcluded("lng"),
        speedKnots: sqlExcluded("speed_knots"),
        heading: sqlExcluded("heading"),
        positionTimestamp: sqlExcluded("position_timestamp"),
        destination: sqlExcluded("destination"),
        eta: sqlExcluded("eta"),
        raw: sqlExcluded("raw"),
        updatedAt: now,
      },
    });
  return records.length;
}

async function ingestVoyageEvents(root: string, workspaceId: string) {
  const records = voyageEventSchema.array().parse(await readJson(path.join(root, "structured/voyage_events.json")));
  const now = new Date();
  await db
    .insert(maritimeVoyageEvents)
    .values(
      records.map((record) => ({
        id: record.event_id,
        workspaceId,
        voyageId: record.voyage_id,
        vesselName: record.vessel_name,
        eventType: record.event_type,
        eventTime: record.event_time,
        location: record.location,
        severity: record.severity,
        description: record.description,
        raw: record,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: maritimeVoyageEvents.id,
      set: {
        voyageId: sqlExcluded("voyage_id"),
        vesselName: sqlExcluded("vessel_name"),
        eventType: sqlExcluded("event_type"),
        eventTime: sqlExcluded("event_time"),
        location: sqlExcluded("location"),
        severity: sqlExcluded("severity"),
        description: sqlExcluded("description"),
        raw: sqlExcluded("raw"),
        updatedAt: now,
      },
    });
  return records.length;
}

async function ingestComplianceFlags(root: string, workspaceId: string) {
  const records = complianceFlagSchema.array().parse(await readJson(path.join(root, "structured/compliance_flags.json")));
  const now = new Date();
  await db
    .insert(maritimeComplianceFlags)
    .values(
      records.map((record) => ({
        id: record.flag_id,
        workspaceId,
        voyageId: record.voyage_id,
        vesselName: record.vessel_name,
        euEtsExposure: record.eu_ets_exposure,
        fueleuRisk: record.fueleu_risk,
        mrvMissingData: record.mrv_missing_data,
        ciiRisk: record.cii_risk,
        riskScore: record.risk_score,
        riskLevel: record.risk_level,
        rationale: record.rationale,
        lastEvaluatedAt: record.last_evaluated_at,
        raw: record,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: maritimeComplianceFlags.id,
      set: {
        voyageId: sqlExcluded("voyage_id"),
        vesselName: sqlExcluded("vessel_name"),
        euEtsExposure: sqlExcluded("eu_ets_exposure"),
        fueleuRisk: sqlExcluded("fueleu_risk"),
        mrvMissingData: sqlExcluded("mrv_missing_data"),
        ciiRisk: sqlExcluded("cii_risk"),
        riskScore: sqlExcluded("risk_score"),
        riskLevel: sqlExcluded("risk_level"),
        rationale: sqlExcluded("rationale"),
        lastEvaluatedAt: sqlExcluded("last_evaluated_at"),
        raw: sqlExcluded("raw"),
        updatedAt: now,
      },
    });
  return records.length;
}

async function ingestScenarios(root: string, workspaceId: string) {
  const records = scenarioSchema.array().parse(await readJson(path.join(root, "scenarios/storylines.json")));
  const now = new Date();
  await db
    .insert(maritimeScenarios)
    .values(
      records.map((record) => ({
        id: record.scenario_id,
        workspaceId,
        title: record.title,
        primaryVoyageId: record.primary_voyage_id,
        primaryVesselName: record.primary_vessel_name,
        severity: record.severity,
        status: record.status,
        businessProblem: record.business_problem,
        narrative: record.narrative,
        recommendedDemoQuestions: record.recommended_demo_questions,
        expectedInsights: record.expected_insights,
        evidence: record.evidence,
        suggestedActions: record.suggested_actions,
        raw: record,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: maritimeScenarios.id,
      set: {
        title: sqlExcluded("title"),
        primaryVoyageId: sqlExcluded("primary_voyage_id"),
        primaryVesselName: sqlExcluded("primary_vessel_name"),
        severity: sqlExcluded("severity"),
        status: sqlExcluded("status"),
        businessProblem: sqlExcluded("business_problem"),
        narrative: sqlExcluded("narrative"),
        recommendedDemoQuestions: sqlExcluded("recommended_demo_questions"),
        expectedInsights: sqlExcluded("expected_insights"),
        evidence: sqlExcluded("evidence"),
        suggestedActions: sqlExcluded("suggested_actions"),
        raw: sqlExcluded("raw"),
        updatedAt: now,
      },
    });
  return records.length;
}

async function ingestMarkdownDocuments(root: string, workspaceId: string, indexDocuments: boolean) {
  const documentsRoot = path.join(root, "documents");
  const fileNames = (await readdir(documentsRoot)).filter((fileName) => fileName.endsWith(".md")).sort();
  let count = 0;

  for (const fileName of fileNames) {
    const absolutePath = path.join(documentsRoot, fileName);
    const source = await readFileText(absolutePath);
    const parsed = parseMarkdownDocument(source);
    const frontMatter = frontMatterSchema.parse(parsed.frontMatter);
    const fileInfo = await stat(absolutePath);
    const objectKey = `demo-data/documents/${fileName}`;
    const now = new Date();

    await db
      .insert(documents)
      .values({
        id: frontMatter.document_id,
        workspaceId,
        fileName,
        objectKey,
        contentType: "text/markdown",
        sizeBytes: fileInfo.size,
        status: indexDocuments ? "processing" : "uploaded",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: documents.id,
        set: {
          workspaceId,
          fileName,
          objectKey,
          contentType: "text/markdown",
          sizeBytes: fileInfo.size,
          status: indexDocuments ? "processing" : "uploaded",
          error: null,
          updatedAt: now,
        },
      });

    await db
      .insert(maritimeDocuments)
      .values({
        id: `maritime-${frontMatter.document_id}`,
        workspaceId,
        documentId: frontMatter.document_id,
        fileName,
        path: objectKey,
        documentType: frontMatter.document_type,
        relatedVoyageId: frontMatter.related_voyage_id,
        relatedVesselName: frontMatter.related_vessel_name,
        sourceEmailId: frontMatter.source_email_id,
        sourceAttachmentId: frontMatter.source_attachment_id,
        originalAttachmentFilename: frontMatter.original_attachment_filename,
        sourceCreatedAt: frontMatter.created_at,
        frontMatter,
        content: source,
        raw: {
          ...frontMatter,
          fileName,
          path: objectKey,
        },
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: maritimeDocuments.id,
        set: {
          workspaceId,
          documentId: frontMatter.document_id,
          fileName,
          path: objectKey,
          documentType: frontMatter.document_type,
          relatedVoyageId: frontMatter.related_voyage_id,
          relatedVesselName: frontMatter.related_vessel_name,
          sourceEmailId: frontMatter.source_email_id,
          sourceAttachmentId: frontMatter.source_attachment_id,
          originalAttachmentFilename: frontMatter.original_attachment_filename,
          sourceCreatedAt: frontMatter.created_at,
          frontMatter,
          content: source,
          raw: {
            ...frontMatter,
            fileName,
            path: objectKey,
          },
          updatedAt: now,
        },
      });

    if (indexDocuments) {
      try {
        await indexDocumentContent(frontMatter.document_id, workspaceId, source, {
          fileName,
          contentType: "text/markdown",
          documentType: frontMatter.document_type,
          relatedVoyageId: frontMatter.related_voyage_id,
          relatedVesselName: frontMatter.related_vessel_name,
          sourceEmailId: frontMatter.source_email_id,
        });
        await db
          .update(documents)
          .set({ status: "ready", error: null, updatedAt: new Date() })
          .where(eq(documents.id, frontMatter.document_id));
      } catch (error) {
        await db
          .update(documents)
          .set({ status: "failed", error: errorToMessage(error), updatedAt: new Date() })
          .where(eq(documents.id, frontMatter.document_id));
        throw error;
      }
    }

    count += 1;
  }

  return count;
}

async function ingestReferenceDocuments(root: string, workspaceId: string, indexDocuments: boolean) {
  const references = [
    { id: "DEMO-DATA-README", fileName: "README.md", contentType: "text/markdown" },
    { id: "DEMO-DATA-DICTIONARY", fileName: "DATA_DICTIONARY.md", contentType: "text/markdown" },
    { id: "DEMO-SOURCE-MANIFEST", fileName: "source_manifest.json", contentType: "application/json" },
  ];

  for (const reference of references) {
    const filePath = path.join(root, reference.fileName);
    const content = await readFileText(filePath);
    const fileInfo = await stat(filePath);
    const objectKey = `demo-data/${reference.fileName}`;
    const now = new Date();

    await db
      .insert(documents)
      .values({
        id: reference.id,
        workspaceId,
        fileName: reference.fileName,
        objectKey,
        contentType: reference.contentType,
        sizeBytes: fileInfo.size,
        status: indexDocuments ? "processing" : "uploaded",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: documents.id,
        set: {
          workspaceId,
          fileName: reference.fileName,
          objectKey,
          contentType: reference.contentType,
          sizeBytes: fileInfo.size,
          status: indexDocuments ? "processing" : "uploaded",
          error: null,
          updatedAt: now,
        },
      });

    if (indexDocuments) {
      try {
        await indexDocumentContent(reference.id, workspaceId, content, {
          fileName: reference.fileName,
          contentType: reference.contentType,
          source: "demo-data",
        });
        await db
          .update(documents)
          .set({ status: "ready", error: null, updatedAt: new Date() })
          .where(eq(documents.id, reference.id));
      } catch (error) {
        await db
          .update(documents)
          .set({ status: "failed", error: errorToMessage(error), updatedAt: new Date() })
          .where(eq(documents.id, reference.id));
        throw error;
      }
    }
  }

  return references.length;
}

async function indexDocumentContent(
  documentId: string,
  workspaceId: string,
  content: string,
  metadata: Record<string, unknown>,
) {
  const chunks = chunkText(content);
  const embeddings = await embedTexts(
    chunks.map((chunk) => chunk.content),
    "document",
  );

  await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));

  if (chunks.length === 0) return;

  await db.insert(documentChunks).values(
    chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      documentId,
      workspaceId,
      chunkIndex: chunk.index,
      content: chunk.content,
      tokenEstimate: chunk.tokenEstimate,
      embedding: embeddings[index],
      metadata,
    })),
  );
}

async function indexEmailContent(
  emailId: string,
  workspaceId: string,
  content: string,
  metadata: Record<string, unknown>,
) {
  const chunks = chunkText(content);
  const embeddings = await embedTexts(
    chunks.map((chunk) => chunk.content),
    "document",
  );

  await db.delete(maritimeEmailChunks).where(eq(maritimeEmailChunks.emailId, emailId));

  if (chunks.length === 0) return;

  await db.insert(maritimeEmailChunks).values(
    chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      emailId,
      workspaceId,
      chunkIndex: chunk.index,
      content: chunk.content,
      tokenEstimate: chunk.tokenEstimate,
      embedding: embeddings[index],
      metadata,
    })),
  );
}

function formatEmailForIndex(record: z.infer<typeof emailSchema>) {
  return [
    `Email: ${record.subject}`,
    `From: ${record.from}`,
    `To: ${record.to.join(", ")}`,
    record.cc.length > 0 ? `Cc: ${record.cc.join(", ")}` : undefined,
    `Sent: ${record.date}`,
    `Voyage: ${record.related_voyage_id}`,
    `Vessel: ${record.related_vessel_name}`,
    "",
    record.body,
  ]
    .filter(Boolean)
    .join("\n");
}

async function resolveDemoDataRoot() {
  const roots = process.env.DEMO_DATA_DIR ? [path.resolve(process.env.DEMO_DATA_DIR)] : demoDataRootCandidates;

  for (const root of roots) {
    try {
      await stat(path.join(root, "source_manifest.json"));
      return root;
    } catch {
      // Try the next likely workspace layout.
    }
  }

  throw new Error(`Could not find demo-data/source_manifest.json from ${process.cwd()}`);
}

async function readJson(filePath: string) {
  return JSON.parse(await readFileText(filePath)) as unknown;
}

async function readFileText(filePath: string) {
  return readFile(filePath, "utf8");
}

function parseMarkdownDocument(source: string) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    throw new Error("Markdown document is missing YAML front matter");
  }

  return {
    frontMatter: parseSimpleYaml(match[1]),
    body: source.slice(match[0].length),
  };
}

function parseSimpleYaml(source: string) {
  return Object.fromEntries(
    source
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const separator = line.indexOf(":");
        if (separator === -1) throw new Error(`Invalid front matter line: ${line}`);
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

function parseCsv(source: string) {
  const [headerLine, ...lines] = source.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function sqlExcluded(columnName: string) {
  return sql.raw(`excluded.${columnName}`);
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown demo ingestion error";
}
