import { db } from "@syntheci/db";
import * as schema from "@syntheci/db/schema";
import { getServerEnv } from "@syntheci/shared";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

const env = getServerEnv();

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    camelCase: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});
