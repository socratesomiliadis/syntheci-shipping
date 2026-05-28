import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ensureDefaultWorkspace } from "@syntheci/db";
import { loadVoyageSummaries } from "@/lib/voyage-workflows";
import { ArrowRight, Search } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VoyagesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = getParam(params.q)?.trim() ?? "";
  const workspaceId = await ensureDefaultWorkspace();
  const voyages = await loadVoyageSummaries(workspaceId, query);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Voyages</h1>
          <p className="mt-1 text-sm text-slate-500">
            {voyages.length} voyage cockpits with risk, source gaps, and operational jobs.
          </p>
        </div>
        <form action="/workspace/voyages" className="flex w-full gap-2 lg:w-[420px]">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input aria-label="Search voyages" className="pl-8" defaultValue={query} name="q" placeholder="Search voyage, vessel, port, cargo" />
          </div>
          <Button size="icon" type="submit" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voyage</TableHead>
              <TableHead>Route</TableHead>
              <TableHead className="hidden lg:table-cell">Cargo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="text-right">Open jobs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {voyages.map((voyage) => (
              <TableRow key={voyage.id}>
                <TableCell>
                  <Link className="font-medium text-slate-950 hover:text-blue-700" href={`/workspace/voyages/${voyage.id}`}>
                    {voyage.id}
                  </Link>
                  <div className="mt-1 text-xs text-slate-500">{voyage.vesselName}</div>
                </TableCell>
                <TableCell className="text-sm text-slate-700">
                  {voyage.originPort} <ArrowRight className="mx-1 inline h-3.5 w-3.5" /> {voyage.destinationPort}
                  <div className="mt-1 text-xs text-slate-500">ETA {formatDate(voyage.eta)}</div>
                </TableCell>
                <TableCell className="hidden max-w-[260px] truncate lg:table-cell">{voyage.cargo}</TableCell>
                <TableCell>
                  <Badge variant="outline">{formatLabel(voyage.status)}</Badge>
                </TableCell>
                <TableCell>
                  <RiskBadge level={voyage.riskLevel} score={voyage.riskScore} />
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant={voyage.openJobs > 0 ? "default" : "outline"}>
                    <Link href={`/workspace/voyages/${voyage.id}`}>
                      {voyage.openJobs} jobs
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function RiskBadge({ level, score }: { level: string | null; score: number | null }) {
  const label = level ? `${formatLabel(level)} ${score ?? ""}`.trim() : "Unscored";
  const className =
    level === "high"
      ? "border-red-200 bg-red-50 text-red-700"
      : level === "medium"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <Badge className={className} variant="outline">
      {label}
    </Badge>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
