import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_WORKFLOWS } from "@syntheci/shared";
import { ArrowRight, CheckCircle2, Clock, ShieldCheck, Workflow } from "lucide-react";

const metrics = [
  { label: "Brief prep", value: "minutes saved", icon: Clock },
  { label: "Evidence quality", value: "source trail", icon: ShieldCheck },
  { label: "Exception detection", value: "risk flags", icon: CheckCircle2 },
  { label: "Analyst leverage", value: "repeat asks", icon: Workflow },
];

export default function WorkspacePage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <Badge className="border-sky-200 bg-sky-50 text-sky-700">Source-backed maritime decisions</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-normal text-slate-950">
            Private RAG and automations for voyage, compliance, chartering, and fleet teams.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Connect approved sources, retrieve the right evidence, and turn repeated maritime questions into cited
            briefs and alerts.
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <div className="text-sm font-medium text-emerald-800">Hackathon pilot path</div>
          <div className="mt-4 space-y-3 text-sm text-emerald-950">
            <div>1. Load 2-3 approved source files</div>
            <div>2. Run cited Q&A against the workspace</div>
            <div>3. Trigger a compliance or voyage-risk automation</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <metric.icon className="h-5 w-5 text-slate-600" />
              <CardTitle>{metric.label}</CardTitle>
              <CardDescription>{metric.value}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {DEMO_WORKFLOWS.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <CardTitle>{workflow.title}</CardTitle>
              <CardDescription>{workflow.prompt}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                Ready for sources <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
