import { z } from "zod";

const booleanString = z
  .string()
  .optional()
  .transform((value) => value === "true");

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().default("postgres://syntheci:syntheci@localhost:5432/syntheci"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  BETTER_AUTH_SECRET: z.string().min(32).default("dev-only-replace-this-secret-32chars"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).default("minioadmin"),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default("minioadmin"),
  S3_BUCKET: z.string().min(1).default("sources"),
  S3_FORCE_PATH_STYLE: booleanString,
  AI_PROVIDER: z.string().default("google"),
  AI_CHAT_MODEL: z.string().default("gemini-2.5-flash"),
  AI_EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(env = process.env): ServerEnv {
  return serverEnvSchema.parse(env);
}
