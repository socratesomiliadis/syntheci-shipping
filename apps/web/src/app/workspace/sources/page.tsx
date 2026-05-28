import Link from "next/link";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  db,
  documentChunks,
  documents,
  ensureDefaultWorkspace,
  maritimeDocuments,
  maritimeEmbeddingChunks,
  maritimeEmails,
} from "@syntheci/db";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import {
  CalendarDays,
  FileText,
  Hash,
  Inbox,
  Layers,
  Mail,
  Paperclip,
  Search,
} from "lucide-react";
import { SourcePreviewDrawer } from "../../../components/source-preview-drawer";
import { SourceUpload } from "../../../components/source-upload";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type EmailAttachment = {
  attachment_id?: string;
  filename?: string;
  description?: string;
  content_type?: string;
  document_id?: string;
  document_type?: string;
  original_filename?: string;
  path?: string;
};

type FileSource = {
  sourceType: "file";
  id: string;
  fileName: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  status: string;
  createdAt: Date;
  documentType: string | null;
  relatedVoyageId: string | null;
  relatedVesselName: string | null;
  sourceEmailId: string | null;
  sourceAttachmentId: string | null;
  originalAttachmentFilename: string | null;
  sourceCreatedAt: string | null;
  content: string | null;
};

type EmailSource = {
  sourceType: "email";
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  sentAt: string;
  body: string;
  relatedVoyageId: string;
  relatedVesselName: string;
  attachments: EmailAttachment[];
};

type GeneralSourceType =
  | "email_thread"
  | "vessel_profile"
  | "voyage_profile"
  | "contact_profile"
  | "structured_record"
  | "scenario_profile";

type GeneralSource = {
  sourceType: GeneralSourceType;
  id: string;
  sourceId: string;
  recordType: string | null;
  entityName: string | null;
  relatedVoyageId: string | null;
  relatedVesselName: string | null;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  chunkCount: number;
};

type Source = FileSource | EmailSource | GeneralSource;

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const workspaceId = await ensureDefaultWorkspace();
  const selectedType = getParam(params.type);
  const selectedId = getParam(params.id);
  const selectedChunkId = getParam(params.chunk);
  const query = getParam(params.q)?.trim() ?? "";

  const fileWhere = query
    ? and(
        eq(documents.workspaceId, workspaceId),
        eq(documents.status, "ready"),
        or(
          ilike(documents.fileName, `%${query}%`),
          ilike(maritimeDocuments.relatedVoyageId, `%${query}%`),
          ilike(maritimeDocuments.relatedVesselName, `%${query}%`),
          ilike(maritimeDocuments.documentType, `%${query}%`)
        )
      )
    : and(
        eq(documents.workspaceId, workspaceId),
        eq(documents.status, "ready")
      );

  const emailWhere = query
    ? and(
        eq(maritimeEmails.workspaceId, workspaceId),
        or(
          ilike(maritimeEmails.subject, `%${query}%`),
          ilike(maritimeEmails.from, `%${query}%`),
          ilike(maritimeEmails.relatedVoyageId, `%${query}%`),
          ilike(maritimeEmails.relatedVesselName, `%${query}%`)
        )
      )
    : eq(maritimeEmails.workspaceId, workspaceId);

  const generalWhere = query
    ? and(
        eq(maritimeEmbeddingChunks.workspaceId, workspaceId),
        or(
          ilike(maritimeEmbeddingChunks.content, `%${query}%`),
          ilike(maritimeEmbeddingChunks.sourceType, `%${query}%`),
          ilike(maritimeEmbeddingChunks.sourceId, `%${query}%`),
          ilike(maritimeEmbeddingChunks.recordType, `%${query}%`),
          ilike(maritimeEmbeddingChunks.entityName, `%${query}%`),
          ilike(maritimeEmbeddingChunks.relatedVoyageId, `%${query}%`),
          ilike(maritimeEmbeddingChunks.relatedVesselName, `%${query}%`)
        )
      )
    : eq(maritimeEmbeddingChunks.workspaceId, workspaceId);

  const [fileRows, emailRows, generalRows] = await Promise.all([
    db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        objectKey: documents.objectKey,
        contentType: documents.contentType,
        sizeBytes: documents.sizeBytes,
        status: documents.status,
        createdAt: documents.createdAt,
        documentType: maritimeDocuments.documentType,
        relatedVoyageId: maritimeDocuments.relatedVoyageId,
        relatedVesselName: maritimeDocuments.relatedVesselName,
        sourceEmailId: maritimeDocuments.sourceEmailId,
        sourceAttachmentId: maritimeDocuments.sourceAttachmentId,
        originalAttachmentFilename:
          maritimeDocuments.originalAttachmentFilename,
        sourceCreatedAt: maritimeDocuments.sourceCreatedAt,
        content: maritimeDocuments.content,
      })
      .from(documents)
      .leftJoin(
        maritimeDocuments,
        eq(maritimeDocuments.documentId, documents.id)
      )
      .where(fileWhere)
      .orderBy(desc(documents.createdAt), asc(documents.fileName)),
    db
      .select({
        id: maritimeEmails.id,
        threadId: maritimeEmails.threadId,
        subject: maritimeEmails.subject,
        from: maritimeEmails.from,
        to: maritimeEmails.to,
        cc: maritimeEmails.cc,
        sentAt: maritimeEmails.sentAt,
        body: maritimeEmails.body,
        relatedVoyageId: maritimeEmails.relatedVoyageId,
        relatedVesselName: maritimeEmails.relatedVesselName,
        attachments: maritimeEmails.attachments,
      })
      .from(maritimeEmails)
      .where(emailWhere)
      .orderBy(desc(maritimeEmails.sentAt), asc(maritimeEmails.subject)),
    db
      .select({
        id: maritimeEmbeddingChunks.id,
        sourceType: maritimeEmbeddingChunks.sourceType,
        sourceId: maritimeEmbeddingChunks.sourceId,
        recordType: maritimeEmbeddingChunks.recordType,
        entityName: maritimeEmbeddingChunks.entityName,
        relatedVoyageId: maritimeEmbeddingChunks.relatedVoyageId,
        relatedVesselName: maritimeEmbeddingChunks.relatedVesselName,
        content: maritimeEmbeddingChunks.content,
        metadata: maritimeEmbeddingChunks.metadata,
        createdAt: maritimeEmbeddingChunks.createdAt,
        chunkIndex: maritimeEmbeddingChunks.chunkIndex,
      })
      .from(maritimeEmbeddingChunks)
      .where(generalWhere)
      .orderBy(desc(maritimeEmbeddingChunks.createdAt), asc(maritimeEmbeddingChunks.chunkIndex)),
  ]);

  const files: FileSource[] = fileRows.map((row) => ({
    ...row,
    sourceType: "file",
  }));
  const emails: EmailSource[] = emailRows.map((row) => ({
    ...row,
    sourceType: "email",
    attachments: normalizeAttachments(row.attachments),
  }));
  const generalSources = toGeneralSources(generalRows);
  const sources = [...files, ...emails, ...generalSources].sort(
    (left, right) => sourceTimestamp(right) - sourceTimestamp(left)
  );
  const selectedSource = selectSource(files, emails, generalSources, selectedType, selectedId);
  const selectedChunks =
    selectedSource?.sourceType === "file"
      ? await db
          .select({
            id: documentChunks.id,
            chunkIndex: documentChunks.chunkIndex,
            content: documentChunks.content,
            tokenEstimate: documentChunks.tokenEstimate,
          })
          .from(documentChunks)
          .where(eq(documentChunks.documentId, selectedSource.id))
          .orderBy(asc(documentChunks.chunkIndex))
      : selectedSource && isGeneralSource(selectedSource)
      ? await db
          .select({
            id: maritimeEmbeddingChunks.id,
            chunkIndex: maritimeEmbeddingChunks.chunkIndex,
            content: maritimeEmbeddingChunks.content,
            tokenEstimate: maritimeEmbeddingChunks.tokenEstimate,
          })
          .from(maritimeEmbeddingChunks)
          .where(
            and(
              eq(maritimeEmbeddingChunks.workspaceId, workspaceId),
              eq(maritimeEmbeddingChunks.sourceType, selectedSource.sourceType),
              eq(maritimeEmbeddingChunks.sourceId, selectedSource.id)
            )
          )
          .orderBy(asc(maritimeEmbeddingChunks.chunkIndex))
      : [];

  return (
    <div className="space-y-5">
      <SourceUpload />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-950">
              Indexed sources
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {files.length} indexed files, {emails.length} emails, and{" "}
              {generalSources.length} maritime profiles/records
              {query ? ` matching "${query}"` : ""}
            </p>
          </div>

          <form
            className="flex w-full gap-2 lg:w-[420px]"
            action="/workspace/sources"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Search indexed sources"
                className="pl-8"
                defaultValue={query}
                name="q"
                placeholder="Search voyage, vessel, sender, file"
              />
            </div>
            <Button size="icon" type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="max-h-[calc(100vh-245px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-[1] bg-slate-50">
              <TableRow>
                <TableHead className="w-[110px]">Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="hidden lg:table-cell">Voyage</TableHead>
                <TableHead className="hidden xl:table-cell">Vessel</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="w-[92px] text-right">Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="h-28 text-center text-sm text-slate-500"
                    colSpan={6}
                  >
                    No indexed files or emails found.
                  </TableCell>
                </TableRow>
              ) : (
                sources.map((source) => (
                  <SourceRow
                    isSelected={
                      selectedSource?.sourceType === source.sourceType &&
                      selectedSource.id === source.id
                    }
                    key={`${source.sourceType}-${source.id}`}
                    query={query}
                    source={source}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <SourcePreviewDrawer
        closeHref={closeHref(query)}
        description={
          selectedSource ? drawerDescription(selectedSource) : "Source preview"
        }
        open={Boolean(selectedSource)}
        title={selectedSource ? sourceTitle(selectedSource) : "Source preview"}
      >
        {selectedSource ? (
          selectedSource.sourceType === "file" ? (
            <FilePreview
              file={selectedSource}
              selectedChunkId={selectedChunkId}
              chunks={selectedChunks}
            />
          ) : selectedSource.sourceType === "email" ? (
            <EmailPreview email={selectedSource} />
          ) : (
            <GeneralPreview
              source={selectedSource}
              selectedChunkId={selectedChunkId}
              chunks={selectedChunks}
            />
          )
        ) : null}
      </SourcePreviewDrawer>
    </div>
  );
}

function SourceRow({
  isSelected,
  query,
  source,
}: {
  isSelected: boolean;
  query: string;
  source: Source;
}) {
  const href = sourceHref(source.sourceType, source.id, query);
  const Icon = source.sourceType === "file" ? FileText : source.sourceType === "email" ? Mail : Layers;
  const title = sourceTitle(source);
  const typeLabel =
    source.sourceType === "file"
      ? formatSourceType(source.documentType ?? source.contentType)
      : source.sourceType === "email"
      ? "Email"
      : formatSourceType(source.recordType ?? source.sourceType);
  const voyage = source.relatedVoyageId;
  const vessel = source.relatedVesselName;

  return (
    <TableRow
      className={cn(
        "hover:bg-slate-50",
        isSelected && "bg-sky-50 hover:bg-sky-50"
      )}
    >
      <TableCell>
        <Badge
          className={cn(
            source.sourceType === "file"
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : source.sourceType === "email"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-violet-200 bg-violet-50 text-violet-700"
          )}
          variant="outline"
        >
          <Icon className="h-3 w-3" />
          {formatSourceType(source.sourceType)}
        </Badge>
      </TableCell>
      <TableCell>
        <Link
          className="font-medium text-slate-950 hover:text-blue-700"
          href={href}
        >
          {title}
        </Link>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
          <span>{typeLabel}</span>
          {source.sourceType === "email" ? <span>{source.from}</span> : null}
          {source.sourceType === "file" && source.originalAttachmentFilename ? (
            <span>{source.originalAttachmentFilename}</span>
          ) : null}
          {isGeneralSource(source) ? <span>{source.chunkCount} chunks</span> : null}
        </div>
      </TableCell>
      <TableCell className="hidden text-slate-700 lg:table-cell">
        {voyage ?? "Unassigned"}
      </TableCell>
      <TableCell className="hidden text-slate-700 xl:table-cell">
        {vessel ?? "Unknown"}
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-slate-500 md:table-cell">
        {formatDate(sourceDate(source))}
      </TableCell>
      <TableCell className="text-right">
        <Button asChild size="sm" variant={isSelected ? "default" : "outline"}>
          <Link href={href}>Open</Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function FilePreview({
  chunks,
  file,
  selectedChunkId,
}: {
  chunks: {
    id: string;
    chunkIndex: number;
    content: string;
    tokenEstimate: number;
  }[];
  file: FileSource;
  selectedChunkId?: string;
}) {
  const body = stripFrontMatter(
    file.content ?? chunks.map((chunk) => chunk.content).join("\n\n")
  );
  const selectedChunk = selectedChunkId
    ? chunks.find((chunk) => chunk.id === selectedChunkId)
    : undefined;

  return (
    <article>
      <section className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="border-blue-200 bg-blue-50 text-blue-700"
            variant="outline"
          >
            File
          </Badge>
          <Badge
            className="border-emerald-200 bg-emerald-50 text-emerald-700"
            variant="outline"
          >
            {file.status}
          </Badge>
          {file.documentType ? (
            <Badge variant="outline">
              {formatSourceType(file.documentType)}
            </Badge>
          ) : null}
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <MetaItem
            icon={Hash}
            label="Voyage"
            value={file.relatedVoyageId ?? "Unassigned"}
          />
          <MetaItem
            icon={Inbox}
            label="Vessel"
            value={file.relatedVesselName ?? "Unknown"}
          />
          <MetaItem icon={FileText} label="Content" value={file.contentType} />
          <MetaItem
            icon={CalendarDays}
            label="Indexed"
            value={formatDate(file.createdAt)}
          />
        </dl>

        {file.sourceEmailId ? (
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href={sourceHref("email", file.sourceEmailId)}>
              <Mail className="h-4 w-4" />
              Source email
            </Link>
          </Button>
        ) : null}
      </section>

      {selectedChunk ? (
        <section className="border-b border-amber-200 bg-amber-50 px-5 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              className="border-amber-300 bg-amber-100 text-amber-800"
              variant="outline"
            >
              Linked citation chunk {selectedChunk.chunkIndex + 1}
            </Badge>
            <span className="text-xs text-amber-800">
              {selectedChunk.tokenEstimate} estimated tokens
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-amber-950">
            {selectedChunk.content}
          </p>
        </section>
      ) : null}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 px-5 py-5">
          {body ? (
            <MarkdownPreview source={body} />
          ) : (
            <p className="text-sm text-slate-500">
              No previewable body is available for this file.
            </p>
          )}
        </div>
        <aside className="border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0">
          <div className="text-sm font-semibold text-slate-950">
            Indexed chunks
          </div>
          <div className="mt-3 space-y-2">
            {chunks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No chunks stored for this source.
              </p>
            ) : (
              chunks.map((chunk) => (
                <Link
                  className={cn(
                    "block rounded-lg border border-slate-200 bg-white p-3 text-sm transition hover:border-slate-300 hover:bg-slate-50",
                    selectedChunkId === chunk.id &&
                      "border-amber-300 bg-amber-50"
                  )}
                  href={sourceHref("file", file.id, undefined, chunk.id)}
                  key={chunk.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">
                      Chunk {chunk.chunkIndex + 1}
                    </span>
                    <span className="text-xs text-slate-400">
                      {chunk.tokenEstimate} tokens
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                    {chunk.content}
                  </p>
                </Link>
              ))
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

function EmailPreview({ email }: { email: EmailSource }) {
  return (
    <article>
      <section className="border-b border-slate-200 bg-amber-50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="border-amber-200 bg-white text-amber-700"
            variant="outline"
          >
            Email
          </Badge>
          <Badge variant="outline">{email.threadId}</Badge>
          <Badge variant="outline">{email.relatedVoyageId}</Badge>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <MetaItem icon={Mail} label="From" value={email.from} />
          <MetaItem
            icon={Inbox}
            label="Vessel"
            value={email.relatedVesselName}
          />
          <MetaItem icon={Hash} label="Voyage" value={email.relatedVoyageId} />
          <MetaItem
            icon={CalendarDays}
            label="Sent"
            value={formatDate(email.sentAt)}
          />
        </dl>
      </section>

      <div className="grid lg:grid-cols-1">
        <div className="min-w-0 px-5 py-5">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="space-y-3 border-b border-slate-200 px-4 py-4 text-sm">
              <AddressLine label="From" value={email.from} />
              <AddressLine label="To" value={email.to.join(", ")} />
              {email.cc.length > 0 ? (
                <AddressLine label="Cc" value={email.cc.join(", ")} />
              ) : null}
              <AddressLine label="Date" value={formatDate(email.sentAt)} />
            </div>
            <div className="px-4 py-5">
              <EmailBody body={email.body} />
            </div>
          </div>
        </div>

        <aside className="border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Paperclip className="h-4 w-4 text-slate-500" />
            Attachments
          </div>
          <div className="mt-3 space-y-2">
            {email.attachments.length === 0 ? (
              <p className="text-sm text-slate-500">
                No attachments on this email.
              </p>
            ) : (
              email.attachments.map((attachment, index) => (
                <Link
                  className="block rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50"
                  href={
                    attachment.document_id
                      ? sourceHref("file", attachment.document_id)
                      : sourceHref("email", email.id)
                  }
                  key={attachment.attachment_id ?? `${email.id}-${index}`}
                >
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-950">
                        {attachment.original_filename ??
                          attachment.filename ??
                          "Attachment"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {attachment.description ??
                          formatSourceType(
                            attachment.document_type ?? "document"
                          )}
                      </div>
                      {attachment.document_id ? (
                        <Badge className="mt-2" variant="outline">
                          {attachment.document_id}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

function GeneralPreview({
  chunks,
  selectedChunkId,
  source,
}: {
  chunks: {
    id: string;
    chunkIndex: number;
    content: string;
    tokenEstimate: number;
  }[];
  selectedChunkId?: string;
  source: GeneralSource;
}) {
  const selectedChunk = selectedChunkId
    ? chunks.find((chunk) => chunk.id === selectedChunkId)
    : undefined;

  return (
    <article>
      <section className="border-b border-slate-200 bg-violet-50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="border-violet-200 bg-white text-violet-700"
            variant="outline"
          >
            {formatSourceType(source.sourceType)}
          </Badge>
          {source.recordType ? (
            <Badge variant="outline">{formatSourceType(source.recordType)}</Badge>
          ) : null}
          {source.relatedVoyageId ? (
            <Badge variant="outline">{source.relatedVoyageId}</Badge>
          ) : null}
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <MetaItem
            icon={Layers}
            label="Entity"
            value={source.entityName ?? source.id}
          />
          <MetaItem
            icon={Inbox}
            label="Vessel"
            value={source.relatedVesselName ?? "Unassigned"}
          />
          <MetaItem
            icon={Hash}
            label="Voyage"
            value={source.relatedVoyageId ?? "Unassigned"}
          />
          <MetaItem
            icon={CalendarDays}
            label="Indexed"
            value={formatDate(source.createdAt)}
          />
        </dl>
      </section>

      {selectedChunk ? (
        <section className="border-b border-amber-200 bg-amber-50 px-5 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              className="border-amber-300 bg-amber-100 text-amber-800"
              variant="outline"
            >
              Linked citation chunk {selectedChunk.chunkIndex + 1}
            </Badge>
            <span className="text-xs text-amber-800">
              {selectedChunk.tokenEstimate} estimated tokens
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-amber-950">
            {selectedChunk.content}
          </p>
        </section>
      ) : null}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 px-5 py-5">
          <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
            {source.content}
          </pre>
        </div>
        <aside className="border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0">
          <div className="text-sm font-semibold text-slate-950">
            Indexed chunks
          </div>
          <div className="mt-3 space-y-2">
            {chunks.map((chunk) => (
              <Link
                className={cn(
                  "block rounded-lg border border-slate-200 bg-white p-3 text-sm transition hover:border-slate-300 hover:bg-slate-50",
                  selectedChunkId === chunk.id && "border-amber-300 bg-amber-50"
                )}
                href={sourceHref(source.sourceType, source.id, undefined, chunk.id)}
                key={chunk.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-950">
                    Chunk {chunk.chunkIndex + 1}
                  </span>
                  <span className="text-xs text-slate-400">
                    {chunk.tokenEstimate} tokens
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                  {chunk.content}
                </p>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </article>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm text-slate-950">{value}</dd>
    </div>
  );
}

function AddressLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[52px_minmax(0,1fr)]">
      <div className="text-xs font-medium uppercase tracking-normal text-slate-400">
        {label}
      </div>
      <div className="min-w-0 break-words text-slate-700">{value}</div>
    </div>
  );
}

function EmailBody({ body }: { body: string }) {
  return (
    <div className="space-y-4">
      {body.split(/\n{2,}/).map((paragraph, index) => (
        <p
          className="whitespace-pre-wrap text-sm leading-7 text-slate-700"
          key={index}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function MarkdownPreview({ source }: { source: string }) {
  const blocks = parseMarkdownBlocks(source);

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Heading =
            block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
          return (
            <Heading
              className={cn(
                "font-semibold tracking-normal text-slate-950",
                block.level === 1 && "text-2xl",
                block.level === 2 && "border-b border-slate-200 pb-2 text-lg",
                block.level >= 3 && "text-base"
              )}
              key={index}
            >
              {block.text}
            </Heading>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              className="space-y-2 pl-4 text-sm leading-6 text-slate-700"
              key={index}
            >
              {block.items.map((item) => (
                <li className="list-disc" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "table") {
          return (
            <div
              className="overflow-hidden rounded-lg border border-slate-200"
              key={index}
            >
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-100">
                  {block.rows.map((row, rowIndex) => (
                    <tr
                      className={rowIndex === 0 ? "bg-slate-50" : "bg-white"}
                      key={`${index}-${rowIndex}`}
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          className={cn(
                            "px-3 py-2 align-top",
                            rowIndex === 0
                              ? "font-semibold text-slate-950"
                              : "text-slate-700",
                            cellIndex === 0 &&
                              rowIndex > 0 &&
                              "font-medium text-slate-950"
                          )}
                          key={`${index}-${rowIndex}-${cellIndex}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p className="text-sm leading-7 text-slate-700" key={index}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; rows: string[][] };

function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = source.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2],
      });
      index += 1;
      continue;
    }

    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        const row = lines[index].trim();
        if (!/^\|\s*-+/.test(row)) {
          rows.push(
            row
              .split("|")
              .slice(1, -1)
              .map((cell) => cell.trim())
          );
        }
        index += 1;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isMarkdownBoundary(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function isMarkdownBoundary(line: string) {
  return (
    /^(#{1,4})\s+/.test(line) || line.startsWith("- ") || line.startsWith("|")
  );
}

function selectSource(
  files: FileSource[],
  emails: EmailSource[],
  generalSources: GeneralSource[],
  type?: string,
  id?: string
) {
  if (!id) return undefined;
  if (type === "email") return emails.find((email) => email.id === id);
  if (type === "file") return files.find((file) => file.id === id);
  if (isGeneralSourceType(type)) {
    return generalSources.find((source) => source.sourceType === type && source.id === id);
  }
  return (
    files.find((file) => file.id === id) ??
    emails.find((email) => email.id === id) ??
    generalSources.find((source) => source.id === id)
  );
}

function sourceHref(
  type: Source["sourceType"],
  id: string,
  query?: string,
  chunkId?: string
) {
  const params = new URLSearchParams({ type, id });
  if (query) params.set("q", query);
  if (chunkId) params.set("chunk", chunkId);
  return `/workspace/sources?${params.toString()}`;
}

function closeHref(query: string) {
  if (!query) return "/workspace/sources";
  const params = new URLSearchParams({ q: query });
  return `/workspace/sources?${params.toString()}`;
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeAttachments(value: Record<string, unknown>[]) {
  return value.map((attachment) => attachment as EmailAttachment);
}

function toGeneralSources(
  rows: {
    id: string;
    sourceType: string;
    sourceId: string;
    recordType: string | null;
    entityName: string | null;
    relatedVoyageId: string | null;
    relatedVesselName: string | null;
    content: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }[]
) {
  const sources = new Map<string, GeneralSource>();
  for (const row of rows) {
    if (!isGeneralSourceType(row.sourceType)) continue;
    const key = `${row.sourceType}:${row.sourceId}`;
    const existing = sources.get(key);
    if (existing) {
      existing.chunkCount += 1;
      if (row.content.length > existing.content.length) existing.content = row.content;
      continue;
    }
    sources.set(key, {
      sourceType: row.sourceType,
      id: row.sourceId,
      sourceId: row.sourceId,
      recordType: row.recordType,
      entityName: row.entityName,
      relatedVoyageId: row.relatedVoyageId,
      relatedVesselName: row.relatedVesselName,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.createdAt,
      chunkCount: 1,
    });
  }
  return [...sources.values()];
}

function isGeneralSource(source: Source): source is GeneralSource {
  return source.sourceType !== "file" && source.sourceType !== "email";
}

function isGeneralSourceType(value: unknown): value is GeneralSourceType {
  return (
    value === "email_thread" ||
    value === "vessel_profile" ||
    value === "voyage_profile" ||
    value === "contact_profile" ||
    value === "structured_record" ||
    value === "scenario_profile"
  );
}

function stripFrontMatter(source: string) {
  return source.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}

function sourceTitle(source: Source) {
  if (source.sourceType === "file") return source.fileName;
  if (source.sourceType === "email") return source.subject;
  return source.entityName ?? source.id;
}

function drawerDescription(source: Source) {
  if (source.sourceType === "file") {
    return [
      source.relatedVesselName,
      source.relatedVoyageId,
      formatSourceType(source.documentType ?? source.contentType),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (source.sourceType !== "email") {
    return [formatSourceType(source.recordType ?? source.sourceType), source.relatedVesselName, source.relatedVoyageId]
      .filter(Boolean)
      .join(" / ");
  }

  return [source.from, source.relatedVesselName, source.relatedVoyageId]
    .filter(Boolean)
    .join(" / ");
}

function sourceDate(source: Source) {
  if (source.sourceType === "file") return source.createdAt;
  if (source.sourceType === "email") return source.sentAt;
  return source.createdAt;
}

function sourceTimestamp(source: Source) {
  return new Date(sourceDate(source)).getTime();
}

function formatSourceType(value: string) {
  return value
    .replace(/[._/-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);
}
