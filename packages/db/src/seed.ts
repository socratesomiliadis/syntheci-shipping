import { DEFAULT_WORKSPACE_ID } from "@syntheci/shared";
import { db } from "./client";
import { workspaces } from "./schema";

export async function ensureDefaultWorkspace() {
  await db
    .insert(workspaces)
    .values({
      id: DEFAULT_WORKSPACE_ID,
      name: "Syntheci Maritime Demo",
      slug: "syntheci-demo",
    })
    .onConflictDoNothing();

  return DEFAULT_WORKSPACE_ID;
}
