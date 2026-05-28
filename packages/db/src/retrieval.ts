import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm/sql/functions/vector";
import { rankRetrievalCandidates, type RetrievalCandidate, type RetrievalSourceType } from "@syntheci/shared";
import { db } from "./client";
import {
  documentChunks,
  documents,
  maritimeDocuments,
  maritimeEmbeddingChunks,
  maritimeEmailChunks,
  maritimeEmails,
  maritimeScenarios,
  maritimeVessels,
  maritimeVoyages,
} from "./schema";

export async function findRelevantChunks(workspaceId: string, embedding: number[], limit = 6, query = "") {
  return findHybridRelevantChunks(workspaceId, embedding, query, limit);
}

export async function findHybridRelevantChunks(workspaceId: string, embedding: number[], query: string, limit = 8) {
  const candidateLimit = Math.max(limit * 4, 16);
  const distance = cosineDistance(documentChunks.embedding, embedding).mapWith(Number);
  const emailDistance = cosineDistance(maritimeEmailChunks.embedding, embedding).mapWith(Number);
  const maritimeDistance = cosineDistance(maritimeEmbeddingChunks.embedding, embedding).mapWith(Number);
  const normalizedQuery = normalizeQuery(query);
  const entityContext = await resolveEntityContext(workspaceId, query);
  const keywordScore = buildKeywordScore(normalizedQuery);
  const emailKeywordScore = buildEmailKeywordScore(normalizedQuery);
  const maritimeKeywordScore = buildMaritimeKeywordScore(normalizedQuery);
  const baseWhere = and(eq(documentChunks.workspaceId, workspaceId), eq(documents.status, "ready"));
  const emailBaseWhere = eq(maritimeEmailChunks.workspaceId, workspaceId);
  const maritimeBaseWhere = eq(maritimeEmbeddingChunks.workspaceId, workspaceId);

  const vectorRows = await selectChunkCandidates(keywordScore, distance)
    .where(baseWhere)
    .orderBy(distance)
    .limit(candidateLimit);

  const emailVectorRows = await selectEmailChunkCandidates(emailKeywordScore, emailDistance)
    .where(emailBaseWhere)
    .orderBy(emailDistance)
    .limit(candidateLimit);

  const maritimeVectorRows = await selectMaritimeEmbeddingCandidates(maritimeKeywordScore, maritimeDistance)
    .where(maritimeBaseWhere)
    .orderBy(maritimeDistance)
    .limit(candidateLimit);

  const keywordRows =
    normalizedQuery.length > 0
      ? await selectChunkCandidates(keywordScore, distance)
          .where(and(baseWhere, keywordPredicate(normalizedQuery)))
          .orderBy(desc(keywordScore))
          .limit(candidateLimit)
      : [];

  const entityRows =
    entityContext.vesselNames.length > 0 || entityContext.voyageIds.length > 0
      ? await selectChunkCandidates(keywordScore, distance)
          .where(and(baseWhere, entityPredicate(entityContext)))
          .orderBy(
            desc(maritimeDocuments.relatedVoyageId),
            desc(maritimeDocuments.relatedVesselName),
          )
          .limit(candidateLimit)
      : [];

  const emailEntityRows =
    entityContext.vesselNames.length > 0 || entityContext.voyageIds.length > 0
      ? await selectEmailChunkCandidates(emailKeywordScore, emailDistance)
          .where(and(emailBaseWhere, emailEntityPredicate(entityContext)))
          .orderBy(emailDistance)
          .limit(candidateLimit)
      : [];

  const maritimeEntityRows =
    entityContext.vesselNames.length > 0 || entityContext.voyageIds.length > 0
      ? await selectMaritimeEmbeddingCandidates(maritimeKeywordScore, maritimeDistance)
          .where(and(maritimeBaseWhere, maritimeEntityPredicate(entityContext)))
          .orderBy(maritimeDistance)
          .limit(candidateLimit)
      : [];

  const emailKeywordRows =
    normalizedQuery.length > 0
      ? await selectEmailChunkCandidates(emailKeywordScore, emailDistance)
          .where(and(emailBaseWhere, emailKeywordPredicate(normalizedQuery)))
          .orderBy(desc(emailKeywordScore))
          .limit(candidateLimit)
      : [];

  const maritimeKeywordRows =
    normalizedQuery.length > 0
      ? await selectMaritimeEmbeddingCandidates(maritimeKeywordScore, maritimeDistance)
          .where(and(maritimeBaseWhere, maritimeKeywordPredicate(normalizedQuery)))
          .orderBy(desc(maritimeKeywordScore))
          .limit(candidateLimit)
      : [];

  const candidates = new Map<string, RetrievalCandidate>();
  for (const row of [
    ...maritimeEntityRows,
    ...emailEntityRows,
    ...entityRows,
    ...vectorRows,
    ...emailVectorRows,
    ...maritimeVectorRows,
    ...keywordRows,
    ...emailKeywordRows,
    ...maritimeKeywordRows,
  ]) {
    const candidateKey = `${row.sourceType ?? "document"}:${row.id}`;
    const existing = candidates.get(candidateKey);
    const candidate = {
      ...row,
      keywordScore: entityBoostedKeywordScore(row.keywordScore, row, entityContext),
      metadataScore: metadataScore(normalizedQuery, row, entityContext),
    };
    candidates.set(candidateKey, existing ? mergeCandidate(existing, candidate) : candidate);
  }

  return rankRetrievalCandidates([...candidates.values()], { limit, perDocumentLimit: 2 });
}

function selectChunkCandidates(keywordScore: SQL<number>, distance: SQL<number>) {
  return db
    .select({
      id: documentChunks.id,
      sourceType: sql<"document">`'document'`,
      sourceId: documents.id,
      documentId: documentChunks.documentId,
      fileName: documents.fileName,
      content: documentChunks.content,
      vectorDistance: distance,
      keywordScore,
      documentType: maritimeDocuments.documentType,
      voyageId: maritimeDocuments.relatedVoyageId,
      vesselName: maritimeDocuments.relatedVesselName,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .leftJoin(maritimeDocuments, eq(maritimeDocuments.documentId, documents.id));
}

function selectEmailChunkCandidates(keywordScore: SQL<number>, distance: SQL<number>) {
  return db
    .select({
      id: maritimeEmailChunks.id,
      sourceType: sql<"email">`'email'`,
      sourceId: maritimeEmails.id,
      fileName: maritimeEmails.subject,
      content: maritimeEmailChunks.content,
      vectorDistance: distance,
      keywordScore,
      documentType: sql<string>`'email'`,
      voyageId: maritimeEmails.relatedVoyageId,
      vesselName: maritimeEmails.relatedVesselName,
    })
    .from(maritimeEmailChunks)
    .innerJoin(maritimeEmails, eq(maritimeEmailChunks.emailId, maritimeEmails.id));
}

function selectMaritimeEmbeddingCandidates(keywordScore: SQL<number>, distance: SQL<number>) {
  return db
    .select({
      id: maritimeEmbeddingChunks.id,
      sourceType: sql<RetrievalSourceType>`${maritimeEmbeddingChunks.sourceType}`,
      sourceId: maritimeEmbeddingChunks.sourceId,
      fileName: sql<string>`coalesce(${maritimeEmbeddingChunks.entityName}, ${maritimeEmbeddingChunks.sourceId})`,
      content: maritimeEmbeddingChunks.content,
      vectorDistance: distance,
      keywordScore,
      documentType: maritimeEmbeddingChunks.recordType,
      voyageId: maritimeEmbeddingChunks.relatedVoyageId,
      vesselName: maritimeEmbeddingChunks.relatedVesselName,
    })
    .from(maritimeEmbeddingChunks);
}

function buildKeywordScore(query: string) {
  if (!query) return sql<number>`0`.mapWith(Number);

  const vector = sql`to_tsvector('english', concat_ws(' ', ${documentChunks.content}, ${documents.fileName}, ${maritimeDocuments.documentType}, ${maritimeDocuments.relatedVoyageId}, ${maritimeDocuments.relatedVesselName}))`;
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  return sql<number>`ts_rank_cd(${vector}, ${tsQuery})`.mapWith(Number);
}

function buildEmailKeywordScore(query: string) {
  if (!query) return sql<number>`0`.mapWith(Number);

  const vector = sql`to_tsvector('english', concat_ws(' ', ${maritimeEmailChunks.content}, ${maritimeEmails.subject}, ${maritimeEmails.from}, ${maritimeEmails.relatedVoyageId}, ${maritimeEmails.relatedVesselName}))`;
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  return sql<number>`ts_rank_cd(${vector}, ${tsQuery})`.mapWith(Number);
}

function buildMaritimeKeywordScore(query: string) {
  if (!query) return sql<number>`0`.mapWith(Number);

  const vector = sql`to_tsvector('english', concat_ws(' ', ${maritimeEmbeddingChunks.content}, ${maritimeEmbeddingChunks.sourceType}, ${maritimeEmbeddingChunks.recordType}, ${maritimeEmbeddingChunks.relatedVoyageId}, ${maritimeEmbeddingChunks.relatedVesselName}, ${maritimeEmbeddingChunks.entityName}))`;
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  return sql<number>`ts_rank_cd(${vector}, ${tsQuery})`.mapWith(Number);
}

function keywordPredicate(query: string) {
  const vector = sql`to_tsvector('english', concat_ws(' ', ${documentChunks.content}, ${documents.fileName}, ${maritimeDocuments.documentType}, ${maritimeDocuments.relatedVoyageId}, ${maritimeDocuments.relatedVesselName}))`;
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  const fallbackTerms = tokenize(query).slice(0, 6);
  const fallback =
    fallbackTerms.length > 0
      ? or(
          ...fallbackTerms.flatMap((term) => [
            ilike(documentChunks.content, `%${term}%`),
            ilike(documents.fileName, `%${term}%`),
            ilike(maritimeDocuments.documentType, `%${term}%`),
            ilike(maritimeDocuments.relatedVoyageId, `%${term}%`),
            ilike(maritimeDocuments.relatedVesselName, `%${term}%`),
          ]),
        )
      : undefined;

  return fallback ? or(sql`${vector} @@ ${tsQuery}`, fallback) : sql`${vector} @@ ${tsQuery}`;
}

function emailKeywordPredicate(query: string) {
  const vector = sql`to_tsvector('english', concat_ws(' ', ${maritimeEmailChunks.content}, ${maritimeEmails.subject}, ${maritimeEmails.from}, ${maritimeEmails.relatedVoyageId}, ${maritimeEmails.relatedVesselName}))`;
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  const fallbackTerms = tokenize(query).slice(0, 6);
  const fallback =
    fallbackTerms.length > 0
      ? or(
          ...fallbackTerms.flatMap((term) => [
            ilike(maritimeEmailChunks.content, `%${term}%`),
            ilike(maritimeEmails.subject, `%${term}%`),
            ilike(maritimeEmails.from, `%${term}%`),
            ilike(maritimeEmails.relatedVoyageId, `%${term}%`),
            ilike(maritimeEmails.relatedVesselName, `%${term}%`),
          ]),
        )
      : undefined;

  return fallback ? or(sql`${vector} @@ ${tsQuery}`, fallback) : sql`${vector} @@ ${tsQuery}`;
}

function maritimeKeywordPredicate(query: string) {
  const vector = sql`to_tsvector('english', concat_ws(' ', ${maritimeEmbeddingChunks.content}, ${maritimeEmbeddingChunks.sourceType}, ${maritimeEmbeddingChunks.recordType}, ${maritimeEmbeddingChunks.relatedVoyageId}, ${maritimeEmbeddingChunks.relatedVesselName}, ${maritimeEmbeddingChunks.entityName}))`;
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  const fallbackTerms = tokenize(query).slice(0, 6);
  const fallback =
    fallbackTerms.length > 0
      ? or(
          ...fallbackTerms.flatMap((term) => [
            ilike(maritimeEmbeddingChunks.content, `%${term}%`),
            ilike(maritimeEmbeddingChunks.sourceType, `%${term}%`),
            ilike(maritimeEmbeddingChunks.recordType, `%${term}%`),
            ilike(maritimeEmbeddingChunks.relatedVoyageId, `%${term}%`),
            ilike(maritimeEmbeddingChunks.relatedVesselName, `%${term}%`),
            ilike(maritimeEmbeddingChunks.entityName, `%${term}%`),
          ]),
        )
      : undefined;

  return fallback ? or(sql`${vector} @@ ${tsQuery}`, fallback) : sql`${vector} @@ ${tsQuery}`;
}

type EntityContext = {
  vesselNames: string[];
  voyageIds: string[];
};

async function resolveEntityContext(workspaceId: string, query: string): Promise<EntityContext> {
  const normalizedQuery = query.toLowerCase();
  const explicitVoyageIds = new Set(
    [...query.matchAll(/\bVOY-\d{4}-\d{4}\b/gi)].map((match) => match[0].toUpperCase()),
  );

  const vessels = await db
    .select({ vesselName: maritimeVessels.vesselName })
    .from(maritimeVessels)
    .where(eq(maritimeVessels.workspaceId, workspaceId));
  const vesselNames = vessels
    .map((vessel) => vessel.vesselName)
    .filter((vesselName) => normalizedQuery.includes(vesselName.toLowerCase()));

  const scenarios =
    vesselNames.length > 0 || explicitVoyageIds.size > 0
      ? await db
          .select({
            primaryVoyageId: maritimeScenarios.primaryVoyageId,
            primaryVesselName: maritimeScenarios.primaryVesselName,
          })
          .from(maritimeScenarios)
          .where(eq(maritimeScenarios.workspaceId, workspaceId))
      : [];

  for (const scenario of scenarios) {
    if (
      explicitVoyageIds.has(scenario.primaryVoyageId) ||
      vesselNames.some((vesselName) => vesselName === scenario.primaryVesselName)
    ) {
      explicitVoyageIds.add(scenario.primaryVoyageId);
      if (!vesselNames.includes(scenario.primaryVesselName)) {
        vesselNames.push(scenario.primaryVesselName);
      }
    }
  }

  if (vesselNames.length > 0 && explicitVoyageIds.size === 0) {
    const voyages = await db
      .select({ id: maritimeVoyages.id })
      .from(maritimeVoyages)
      .where(and(eq(maritimeVoyages.workspaceId, workspaceId), inArray(maritimeVoyages.vesselName, vesselNames)));
    for (const voyage of voyages) explicitVoyageIds.add(voyage.id);
  }

  return {
    vesselNames,
    voyageIds: [...explicitVoyageIds],
  };
}

function entityPredicate(context: EntityContext) {
  const predicates =
    context.voyageIds.length > 0
      ? context.voyageIds.map((voyageId) => eq(maritimeDocuments.relatedVoyageId, voyageId))
      : context.vesselNames.map((vesselName) => eq(maritimeDocuments.relatedVesselName, vesselName));

  return predicates.length > 0 ? or(...predicates) : sql`false`;
}

function emailEntityPredicate(context: EntityContext) {
  const predicates =
    context.voyageIds.length > 0
      ? context.voyageIds.map((voyageId) => eq(maritimeEmails.relatedVoyageId, voyageId))
      : context.vesselNames.map((vesselName) => eq(maritimeEmails.relatedVesselName, vesselName));

  return predicates.length > 0 ? or(...predicates) : sql`false`;
}

function maritimeEntityPredicate(context: EntityContext) {
  const predicates =
    context.voyageIds.length > 0
      ? context.voyageIds.map((voyageId) => eq(maritimeEmbeddingChunks.relatedVoyageId, voyageId))
      : context.vesselNames.map((vesselName) => eq(maritimeEmbeddingChunks.relatedVesselName, vesselName));

  return predicates.length > 0 ? or(...predicates) : sql`false`;
}

function entityBoostedKeywordScore(
  currentScore: number | null | undefined,
  row: Pick<RetrievalCandidate, "voyageId" | "vesselName">,
  context: EntityContext,
) {
  let boost = 0;
  if (row.voyageId && context.voyageIds.includes(row.voyageId)) boost += 8;
  if (row.vesselName && context.vesselNames.includes(row.vesselName)) boost += 4;
  return (currentScore ?? 0) + boost;
}

function metadataScore(
  query: string,
  row: Pick<RetrievalCandidate, "fileName" | "documentType" | "voyageId" | "vesselName">,
  context: EntityContext,
) {
  const haystack = [row.fileName, row.documentType, row.voyageId, row.vesselName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  if (row.voyageId && context.voyageIds.includes(row.voyageId)) score += 0.2;
  if (row.vesselName && context.vesselNames.includes(row.vesselName)) score += 0.2;
  if (query && haystack && tokenize(query).some((term) => haystack.includes(term))) score += 0.12;
  return score;
}

function mergeCandidate(left: RetrievalCandidate, right: RetrievalCandidate): RetrievalCandidate {
  return {
    ...left,
    keywordScore: Math.max(left.keywordScore ?? 0, right.keywordScore ?? 0),
    metadataScore: Math.max(left.metadataScore ?? 0, right.metadataScore ?? 0),
    vectorDistance: Math.min(left.vectorDistance ?? Number.POSITIVE_INFINITY, right.vectorDistance ?? Number.POSITIVE_INFINITY),
  };
}

function normalizeQuery(query: string) {
  return tokenize(query).join(" ");
}

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9_-]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}
