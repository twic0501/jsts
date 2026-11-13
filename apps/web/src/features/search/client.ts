import { documentSearchInputSchema, searchHistorySchema,
  type DocumentSearchFilters, type SearchHistory, type SearchHistoryInput } from '@paper-galaxy/core';

// Supply the application's existing HTTP transport (session/CSRF handled by FR12).
export type SearchTransport = (path: string, init?: RequestInit) => Promise<Response>;
export type HistoryAccess = { accountId: string; send: SearchTransport };
export class SearchApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function read(response: Response) {
  if (response.status === 204) return null;
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body && body.error && typeof body.error === 'object' &&
      'message' in body.error && typeof body.error.message === 'string' ? body.error.message : 'Không gọi được API.';
    throw new SearchApiError(response.status, message);
  }
  return body;
}
// Call once in the existing form's submit handler, never in a render/search effect.
export function createSearchSubmission(query: string, filters: DocumentSearchFilters, topK = 20) {
  const input = documentSearchInputSchema.parse({ queryId: crypto.randomUUID(), query, filters, topK });
  const history: SearchHistoryInput = { id: crypto.randomUUID(), queryId: input.queryId, query: input.query, filters: input.filters };
  return { input, history };
}
export type SearchSubmission = ReturnType<typeof createSearchSubmission>;
export async function saveAccountHistory(submission: SearchSubmission, send: SearchTransport) {
  return searchHistorySchema.parse(await read(await send('/api/v4/users/me/search-history', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': submission.input.queryId },
    body: JSON.stringify(submission.history),
  })));
}
export function repeatHistory(row: SearchHistory) { return createSearchSubmission(row.query, row.filters); }
export async function loadAccountHistory(send: SearchTransport, cursor: string | null = null) {
  const query = new URLSearchParams({ limit: '20', ...(cursor ? { cursor } : {}) });
  const data = await read(await send(`/api/v4/users/me/search-history?${query}`, { cache: 'no-store' })) as { items: unknown[]; nextCursor: string | null };
  return { items: data.items.map(row => searchHistorySchema.parse(row)), nextCursor: data.nextCursor };
}
export async function removeAccountHistory(id: string, revision: number, key: string, send: SearchTransport) {
  await read(await send(`/api/v4/users/me/search-history/${id}`, {
    method: 'DELETE', headers: { 'Idempotency-Key': key, 'If-Match': `"${revision}"` },
  }));
}
