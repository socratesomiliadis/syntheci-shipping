import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { automationRules, db, ensureDefaultWorkspace } from "@syntheci/db";
import { desc, eq } from "drizzle-orm";
import { AutomationForm } from "./automation-form";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const workspaceId = await ensureDefaultWorkspace();
  const rules = await db
    .select()
    .from(automationRules)
    .where(eq(automationRules.workspaceId, workspaceId))
    .orderBy(desc(automationRules.createdAt));

  return (
    <div className="space-y-5">
      <AutomationForm />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium text-slate-950">{rule.name}</TableCell>
                <TableCell>{rule.cadence}</TableCell>
                <TableCell>
                  <Badge>{rule.enabled ? "enabled" : "paused"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
