import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@syntheci/shared";
import * as schema from "./schema";

let client: postgres.Sql | undefined;

export function getSqlClient() {
  if (!client) {
    const env = getServerEnv();
    client = postgres(env.DATABASE_URL, { max: 10 });
  }
  return client;
}

export function getDb() {
  return drizzle(getSqlClient(), { schema });
}

export const db = getDb();
