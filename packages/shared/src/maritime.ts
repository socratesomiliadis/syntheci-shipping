export const workspaceRoles = ["owner", "admin", "analyst", "viewer"] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];

export const documentStatuses = [
  "uploaded",
  "queued",
  "processing",
  "ready",
  "failed",
] as const;
export type DocumentStatus = (typeof documentStatuses)[number];

export const automationCadences = ["manual", "hourly", "daily", "weekly"] as const;
export type AutomationCadence = (typeof automationCadences)[number];

export const automationRunStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;
export type AutomationRunStatus = (typeof automationRunStatuses)[number];
