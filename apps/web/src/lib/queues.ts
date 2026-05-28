import { Queue } from "bullmq";
import { getServerEnv, QUEUES, type AutomationQueueJob, type IngestionJob } from "@syntheci/shared";

function redisConnection() {
  const url = new URL(getServerEnv().REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export function ingestionQueue() {
  return new Queue<IngestionJob>(QUEUES.ingestion, { connection: redisConnection() });
}

export function automationQueue() {
  return new Queue<AutomationQueueJob>(QUEUES.automation, { connection: redisConnection() });
}
