import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { automationRules, automationRuns, db, ensureDefaultWorkspace } from "@syntheci/db";
import { parseWorkflowIntent } from "@syntheci/shared";
import { desc, eq } from "drizzle-orm";
import { AutomationForm } from "./automation-form";
import { RecentAutomationRuns } from "./recent-automation-runs";
import { RunAutomationButton } from "./run-automation-button";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const workspaceId = await ensureDefaultWorkspace();
  const [rules, runs] = await Promise.all([
    db
      .select()
      .from(automationRules)
      .where(eq(automationRules.workspaceId, workspaceId))
      .orderBy(desc(automationRules.createdAt)),
    db
      .select({
        id: automationRuns.id,
        status: automationRuns.status,
        summary: automationRuns.summary,
        error: automationRuns.error,
        createdAt: automationRuns.createdAt,
        completedAt: automationRuns.completedAt,
        ruleName: automationRules.name,
      })
      .from(automationRuns)
      .innerJoin(automationRules, eq(automationRuns.automationRuleId, automationRules.id))
      .where(eq(automationRuns.workspaceId, workspaceId))
      .orderBy(desc(automationRuns.createdAt))
      .limit(8),
  ]);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <Badge className="border-blue-100 bg-blue-50 text-blue-700" variant="outline">
          AI workflow engine
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">Automations that turn natural language into voyage work.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Describe what to monitor. Syntheci parses the intent, queues the matching workflow, and writes run summaries or generated tasks back into the workspace.
        </p>
      </section>

      <AutomationForm />

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
            <CardDescription>Saved automation rules with parsed AI workflow intent.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Parsed workflow</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const parsed = parseWorkflowIntent(rule.question);
                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="font-medium text-slate-950">{rule.name}</div>
                        <div className="mt-1 line-clamp-2 max-w-sm text-xs text-slate-500">{rule.question}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{parsed.workflow}</Badge>
                        <div className="mt-1 text-xs text-slate-500">{parsed.scope}{parsed.voyageId ? ` · ${parsed.voyageId}` : ""}</div>
                      </TableCell>
                      <TableCell>{rule.cadence}</TableCell>
                      <TableCell>
                        <Badge>{rule.enabled ? "enabled" : "paused"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RunAutomationButton ruleId={rule.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-20 text-center text-sm text-slate-500" colSpan={5}>
                      No automation rules yet. Create and run one above.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent runs</CardTitle>
            <CardDescription>Queued, running, completed, and failed automation output.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentAutomationRuns
              key={runs.map((run) => `${run.id}:${run.status}:${run.completedAt?.getTime() ?? ""}`).join("|")}
              initialRuns={runs.map((run) => ({
                ...run,
                createdAt: run.createdAt.toISOString(),
                completedAt: run.completedAt?.toISOString() ?? null,
              }))}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
