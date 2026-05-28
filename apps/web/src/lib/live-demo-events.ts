import {
  db,
  documents,
  externalImportBatches,
  maritimeDocuments,
  maritimeEmails,
  maritimeReconciliationFindings,
  maritimeVoyageEvents,
  operationalJobs,
} from "@syntheci/db";
import { and, eq, inArray } from "drizzle-orm";

export const AMS_DORIAN_LIVE_DEMO_VOYAGE_ID = "VOY-2026-0523";

const liveEventId = "LIVE-AMS-DORIAN-CONGESTION-001";
const liveEmailId = "LIVE-EML-VOY-2026-0523-CONGESTION";
const liveDocumentId = "LIVE-DOC-VOY-2026-0523-TERMINAL-NOTICE";
const liveEventRecordId = "LIVE-EVT-VOY-2026-0523-CONGESTION";
const liveBatchId = "LIVE-BATCH-VOY-2026-0523-CONGESTION";
const voyageId = AMS_DORIAN_LIVE_DEMO_VOYAGE_ID;
const vesselName = "AMS Dorian";
const legacyLiveJobTitles = [
  "Escalate AMS Dorian live congestion response",
  "Preserve NOR, free-pratique, and SOF evidence",
  "Hold USD 10,050 disputed waiting-time items",
  "Send controlled update to chartering and receivers",
];
const legacyLiveFindingTitles = [
  "Live congestion raises AMS Dorian response risk",
  "Terminal line-up changed after arrival planning",
  "Waiting-time costs need source support",
];

export async function injectAmsDorianLiveDemoEvent(workspaceId: string) {
  const now = new Date();
  const sentAt = now.toISOString();
  const attachment = {
    attachment_id: "LIVE-ATT-VOY-2026-0523-1",
    filename: "live-terminal-congestion-ams-dorian.md",
    description: "Live terminal congestion notice",
    content_type: "text/markdown",
    synthetic: true,
    document_id: liveDocumentId,
    document_type: "terminal_notice",
    original_filename: "terminal-congestion-update-ams-dorian.pdf",
    path: `external-import/live-demo/${liveDocumentId}/live-terminal-congestion-ams-dorian.md`,
  };

  await db
    .insert(externalImportBatches)
    .values({
      id: liveBatchId,
      workspaceId,
      provider: "live-demo",
      sourceType: "port-agent-webhook",
      status: "completed",
      summary: {
        voyageId,
        vesselName,
        event: "Terminal congestion update",
        disputedCostUsd: 10050,
      },
      raw: {
        liveEventId,
        source: "Simulated port agent webhook",
      },
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: externalImportBatches.id,
      set: {
        status: "completed",
        summary: {
          voyageId,
          vesselName,
          event: "Terminal congestion update",
          disputedCostUsd: 10050,
        },
        raw: {
          liveEventId,
          source: "Simulated port agent webhook",
          reinjectedAt: sentAt,
        },
        updatedAt: now,
      },
    });

  await db
    .insert(maritimeEmails)
    .values({
      id: liveEmailId,
      workspaceId,
      threadId: "LIVE-THR-VOY-2026-0523-CONGESTION",
      subject: "LIVE: Sirocco berth delay and disputed waiting costs - AMS Dorian",
      from: "sirocco.agent@port.example",
      to: ["ops@aegeanmeridian.example"],
      cc: ["claims@aegeanmeridian.example", "finance@aegeanmeridian.example"],
      sentAt,
      body: [
        "Good day,",
        "",
        "Sirocco Bulk Terminal confirms AMS Dorian remains at anchorage because the clinker berth is still occupied.",
        "The revised line-up shows an 18 hour berth delay. Please keep anchorage attendance and launch service items separate from ordinary port dues.",
        "NOR was tendered at anchorage after free pratique by radio, but final SOF countersignature and rain stoppage confirmation are still pending.",
        "",
        "Finance should accrue uncontested port dues only and hold USD 10,050 of waiting-time items until supporting receipts and timesheets are received.",
        "",
        "Regards,",
        "Sirocco Port Agency",
      ].join("\n"),
      relatedVoyageId: voyageId,
      relatedVesselName: vesselName,
      attachments: [attachment],
      raw: {
        liveEventId,
        provider: "live-demo",
        sourceType: "port-agent-webhook",
      },
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: maritimeEmails.id,
      set: {
        sentAt,
        attachments: [attachment],
        raw: {
          liveEventId,
          provider: "live-demo",
          sourceType: "port-agent-webhook",
          reinjectedAt: sentAt,
        },
        updatedAt: now,
      },
    });

  const content = buildLiveTerminalNotice(sentAt);
  const objectKey = attachment.path;
  await db
    .insert(documents)
    .values({
      id: liveDocumentId,
      workspaceId,
      fileName: attachment.filename,
      objectKey,
      contentType: "text/markdown",
      sizeBytes: Buffer.byteLength(content),
      status: "ready",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: documents.id,
      set: {
        fileName: attachment.filename,
        objectKey,
        contentType: "text/markdown",
        sizeBytes: Buffer.byteLength(content),
        status: "ready",
        error: null,
        updatedAt: now,
      },
    });

  await db
    .insert(maritimeDocuments)
    .values({
      id: `live-${liveDocumentId}`,
      workspaceId,
      documentId: liveDocumentId,
      fileName: attachment.filename,
      path: objectKey,
      documentType: "terminal_notice",
      relatedVoyageId: voyageId,
      relatedVesselName: vesselName,
      sourceEmailId: liveEmailId,
      sourceAttachmentId: attachment.attachment_id,
      originalAttachmentFilename: attachment.original_filename,
      sourceCreatedAt: sentAt,
      frontMatter: {
        liveEventId,
        provider: "live-demo",
      },
      content,
      raw: {
        liveEventId,
        provider: "live-demo",
      },
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: maritimeDocuments.id,
      set: {
        sourceCreatedAt: sentAt,
        content,
        raw: {
          liveEventId,
          provider: "live-demo",
          reinjectedAt: sentAt,
        },
        updatedAt: now,
      },
    });

  await db
    .insert(maritimeVoyageEvents)
    .values({
      id: liveEventRecordId,
      workspaceId,
      voyageId,
      vesselName,
      eventType: "live_port_update",
      eventTime: sentAt,
      location: "Sirocco Bulk Terminal",
      severity: "high",
      description: "Live port-agent update: berth delay extended by 18 hours; USD 10,050 of waiting-time items require support before payment.",
      raw: {
        liveEventId,
        provider: "live-demo",
      },
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: maritimeVoyageEvents.id,
      set: {
        eventTime: sentAt,
        description: "Live port-agent update: berth delay extended by 18 hours; USD 10,050 of waiting-time items require support before payment.",
        raw: {
          liveEventId,
          provider: "live-demo",
          reinjectedAt: sentAt,
        },
        updatedAt: now,
      },
    });

  await cleanupLegacyAmsDorianLiveDemoOutputs(workspaceId);

  return {
    liveEventId,
    voyageId,
    inserted: {
      emails: 1,
      documents: 1,
      events: 1,
    },
    disputedCostUsd: 10050,
  };
}

export function isAmsDorianLiveDemoSource(sourceId: string) {
  return [liveEmailId, liveDocumentId, liveEventRecordId].includes(sourceId);
}

async function cleanupLegacyAmsDorianLiveDemoOutputs(workspaceId: string) {
  await db
    .delete(operationalJobs)
    .where(and(eq(operationalJobs.workspaceId, workspaceId), eq(operationalJobs.voyageId, voyageId), inArray(operationalJobs.title, legacyLiveJobTitles)));

  await db
    .delete(maritimeReconciliationFindings)
    .where(
      and(
        eq(maritimeReconciliationFindings.workspaceId, workspaceId),
        eq(maritimeReconciliationFindings.voyageId, voyageId),
        inArray(maritimeReconciliationFindings.title, legacyLiveFindingTitles),
      ),
    );
}

function buildLiveTerminalNotice(createdAt: string) {
  return [
    "---",
    `document_id: ${liveDocumentId}`,
    "document_type: terminal_notice",
    `related_voyage_id: ${voyageId}`,
    `related_vessel_name: ${vesselName}`,
    `source_email_id: ${liveEmailId}`,
    `created_at: ${createdAt}`,
    "source_attachment_id: LIVE-ATT-VOY-2026-0523-1",
    "original_attachment_filename: terminal-congestion-update-ams-dorian.pdf",
    "---",
    "",
    "# Live Terminal Congestion Notice - AMS Dorian - VOY-2026-0523",
    "",
    "Sirocco Bulk Terminal confirms the clinker berth remains occupied and AMS Dorian is expected to wait approximately 18 additional hours at anchorage.",
    "",
    "## Cost control",
    "",
    "| Item | Amount USD | Action |",
    "| --- | ---: | --- |",
    "| Anchorage attendance | 6,800 | Hold pending agent timesheet |",
    "| Launch service | 3,250 | Hold pending receipts |",
    "| Disputed waiting-time total | 10,050 | Do not approve until supported |",
    "",
    "## Evidence control",
    "",
    "- NOR was tendered at anchorage after free pratique by radio.",
    "- Final SOF countersignature is still pending.",
    "- Rain stoppage confirmation is still provisional.",
    "- Internal claims and finance alignment is required before any external laytime position.",
  ].join("\n");
}
