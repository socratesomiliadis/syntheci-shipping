import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db, documents, ensureDefaultWorkspace } from "@syntheci/db";
import { desc, eq } from "drizzle-orm";
import { SourceUpload } from "./source-upload";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const workspaceId = await ensureDefaultWorkspace();
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.workspaceId, workspaceId))
    .orderBy(desc(documents.createdAt))
    .limit(50);

  return (
    <div className="space-y-5">
      <SourceUpload />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((document) => (
              <TableRow key={document.id}>
                <TableCell className="font-medium text-slate-950">{document.fileName}</TableCell>
                <TableCell>
                  <Badge>{document.status}</Badge>
                </TableCell>
                <TableCell>{document.contentType}</TableCell>
                <TableCell>{document.createdAt.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
