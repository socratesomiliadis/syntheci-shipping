import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { automationRuns, automationRules, db, ensureDefaultWorkspace } from "@syntheci/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const workspaceId = await ensureDefaultWorkspace();
  const runs = await db
    .select({
      id: automationRuns.id,
      status: automationRuns.status,
      summary: automationRuns.summary,
      createdAt: automationRuns.createdAt,
      ruleName: automationRules.name,
    })
    .from(automationRuns)
    .innerJoin(automationRules, eq(automationRuns.automationRuleId, automationRules.id))
    .where(eq(automationRuns.workspaceId, workspaceId))
    .orderBy(desc(automationRuns.createdAt))
    .limit(50);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Summary</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="font-medium text-slate-950">{run.ruleName}</TableCell>
              <TableCell>
                <Badge>{run.status}</Badge>
              </TableCell>
              <TableCell>{run.createdAt.toLocaleString()}</TableCell>
              <TableCell className="max-w-xl truncate">{run.summary ?? ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
