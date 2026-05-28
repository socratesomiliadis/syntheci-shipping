import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chunkText, buildCitationBlock, draftAutomationBrief, embedTexts } from "@syntheci/ai";
import { db, documentChunks, documents, automationRuns, findRelevantChunks } from "@syntheci/db";
import {
  automationJobSchema,
  getServerEnv,
  ingestionJobSchema,
  QUEUES,
  type AutomationJob,
  type IngestionJob,
} from "@syntheci/shared";
import { Job, QueueEvents, Worker } from "bullmq";
import { eq } from "drizzle-orm";

const env = getServerEnv();
const redis = redisConnectionOptions(env.REDIS_URL);
const s3 = new S3Client({
  region: "us-east-1",
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

const ingestionWorker = new Worker(
  QUEUES.ingestion,
  async (job: Job<IngestionJob>) => {
    const payload = ingestionJobSchema.parse(job.data);
    await processIngestion(payload);
  },
  { connection: redis, concurrency: 2 },
);

const automationWorker = new Worker(
  QUEUES.automation,
  async (job: Job<AutomationJob>) => {
    const payload = automationJobSchema.parse(job.data);
    await processAutomation(payload);
  },
  { connection: redis, concurrency: 2 },
);

for (const queueName of [QUEUES.ingestion, QUEUES.automation]) {
  const events = new QueueEvents(queueName, { connection: redis });
  events.on("failed", ({ jobId, failedReason }) => {
    console.error(`[${queueName}] ${jobId} failed: ${failedReason}`);
  });
}

async function processIngestion(payload: IngestionJob) {
  await db
    .update(documents)
    .set({ status: "processing", error: null, updatedAt: new Date() })
    .where(eq(documents.id, payload.documentId));

  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: payload.objectKey,
      }),
    );

    const text = await objectBodyToText(object.Body);
    const chunks = chunkText(text);
    const embeddings = await embedTexts(
      chunks.map((chunk) => chunk.content),
      "document",
    );

    await db.delete(documentChunks).where(eq(documentChunks.documentId, payload.documentId));

    if (chunks.length > 0) {
      await db.insert(documentChunks).values(
        chunks.map((chunk, index) => ({
          id: crypto.randomUUID(),
          documentId: payload.documentId,
          workspaceId: payload.workspaceId,
          chunkIndex: chunk.index,
          content: chunk.content,
          tokenEstimate: chunk.tokenEstimate,
          embedding: embeddings[index],
          metadata: {
            fileName: payload.fileName,
            contentType: payload.contentType,
          },
        })),
      );
    }

    await db
      .update(documents)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(documents.id, payload.documentId));
  } catch (error) {
    await db
      .update(documents)
      .set({ status: "failed", error: errorToMessage(error), updatedAt: new Date() })
      .where(eq(documents.id, payload.documentId));
    throw error;
  }
}

async function processAutomation(payload: AutomationJob) {
  await db
    .update(automationRuns)
    .set({ status: "running" })
    .where(eq(automationRuns.id, payload.runId));

  try {
    const [embedding] = await embedTexts([payload.question], "query");
    const chunks = embedding ? await findRelevantChunks(payload.workspaceId, embedding, 6) : [];
    const summary = await draftAutomationBrief(payload.question, buildCitationBlock(chunks));

    await db
      .update(automationRuns)
      .set({ status: "completed", summary, completedAt: new Date() })
      .where(eq(automationRuns.id, payload.runId));
  } catch (error) {
    await db
      .update(automationRuns)
      .set({ status: "failed", error: errorToMessage(error), completedAt: new Date() })
      .where(eq(automationRuns.id, payload.runId));
    throw error;
  }
}

async function objectBodyToText(body: unknown) {
  if (!body) return "";
  if (typeof body === "object" && "transformToByteArray" in body) {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return new TextDecoder().decode(bytes);
  }
  throw new Error("Unsupported S3 response body");
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown worker error";
}

function redisConnectionOptions(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

console.log("Syntheci worker listening", {
  ingestion: ingestionWorker.name,
  automation: automationWorker.name,
});
