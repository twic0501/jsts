import { z } from 'zod';
import { groupSchema } from './contracts';
import { pointSchema } from './semantic';

const uuid = z.string().uuid();
export const searchResourceIdSchema = uuid;
export const documentKindSchema = z.enum(['paper', 'study']);
export const documentSearchFiltersSchema = z.object({
  kinds: z.array(documentKindSchema).max(2).refine(v => new Set(v).size === v.length).optional(),
  subjects: z.array(groupSchema).max(4).refine(v => new Set(v).size === v.length).optional(),
  yearFrom: z.number().int().min(1900).max(2100).optional(),
  yearTo: z.number().int().min(1900).max(2100).optional(),
  documentIds: z.array(uuid).max(100).refine(v => new Set(v).size === v.length).optional(),
}).strict().refine(v => v.yearFrom === undefined || v.yearTo === undefined || v.yearFrom <= v.yearTo,
  'Năm bắt đầu phải nhỏ hơn hoặc bằng năm kết thúc.');
export const documentSearchInputSchema = z.object({
  queryId: uuid, query: z.string().trim().min(2).max(300),
  topK: z.number().int().min(1).max(20), filters: documentSearchFiltersSchema,
}).strict();
export const searchHistoryInputSchema = z.object({
  id: uuid, queryId: uuid, query: z.string().trim().min(2).max(300), filters: documentSearchFiltersSchema,
}).strict();
export const searchHistorySchema = searchHistoryInputSchema.extend({
  revision: z.number().int().positive(), updatedAt: z.string().datetime(),
});
export const documentSummarySchema = z.object({
  id: uuid, kind: documentKindSchema, title: z.string().min(1).max(1000),
  authors: z.array(z.string().min(1).max(200)).max(100),
  year: z.number().int().min(1900).max(2100).nullable(),
  subjects: z.array(groupSchema).max(4), primarySubject: groupSchema.nullable(),
  visibility: z.enum(['public', 'private']), activeVersionId: uuid,
  coverage: z.enum(['title', 'abstract', 'fulltext']), indexStatus: z.literal('ready'),
  revision: z.number().int().positive(), updatedAt: z.string().datetime(),
}).strict();
export const documentEvidenceSchema = z.object({
  id: z.string().regex(/^E[1-9][0-9]*$/), documentId: uuid, versionId: uuid, chunkId: uuid,
  quote: z.string().min(1).max(20000), page: z.number().int().positive().nullable(),
  section: z.string().min(1).max(300).nullable(), start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(), cosine: z.number().finite().min(-1).max(1),
}).strict();
export const documentSearchSchema = z.object({
  id: uuid, queryId: uuid, query: z.string().min(2).max(300), filters: documentSearchFiltersSchema,
  origin: z.literal('server'), coverage: z.literal('server'),
  hits: z.array(z.object({ document: documentSummarySchema,
    evidence: z.array(documentEvidenceSchema).min(1).max(3),
    cosine: z.number().finite().min(-1).max(1), rankScore: z.number().finite(), point: pointSchema.nullable(),
  }).strict()).max(20),
  rankingProfile: z.literal('dense'), modelRevision: z.string().min(1), pipelineRevision: z.string().min(1),
  projectionRevision: z.string().min(1), durationMs: z.number().finite().nonnegative(),
  expiresAt: z.string().datetime(), warnings: z.array(z.string()).max(30),
  queryPoint: pointSchema.optional(),
}).strict();
export type DocumentSearchFilters = z.infer<typeof documentSearchFiltersSchema>;
export type DocumentSearchInput = z.infer<typeof documentSearchInputSchema>;
export type DocumentSearch = z.infer<typeof documentSearchSchema>;
export type DocumentSummary = z.infer<typeof documentSummarySchema>;
export type SearchHistoryInput = z.infer<typeof searchHistoryInputSchema>;
export type SearchHistory = z.infer<typeof searchHistorySchema>;
// Adapter contract for documents whose content and embedding generation are ready.
export const indexedSearchDocumentSchema = z.object({
  summary: documentSummarySchema,
  ownerId: uuid.nullable(), deleted: z.boolean(), chunkId: uuid,
  text: z.string().min(1).max(20000), page: z.number().int().positive().nullable(),
  textHash: z.string().regex(/^[a-f0-9]{64}$/),
  section: z.string().min(1).max(300).nullable(),
  vector: z.array(z.number().finite()).length(384).refine(v => Math.abs(Math.hypot(...v) - 1) < .002),
  modelRevision: z.string().min(1), pipelineRevision: z.string().min(1),
  point: pointSchema.optional(), projectionRevision: z.string().min(1).optional(),
}).strict().refine(v => v.summary.visibility !== 'private' || v.ownerId !== null)
  .refine(v => (v.point === undefined) === (v.projectionRevision === undefined), 'Point cần có projectionRevision tương ứng.');
export type IndexedSearchDocument = z.infer<typeof indexedSearchDocumentSchema>;
