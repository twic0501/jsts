import { searchHistoryInputSchema } from '@paper-galaxy/core';
import { SearchError } from '../../../shared/search-context';
import { searchHttp, type IdentityDependencies } from '../../../shared/search-http';
import { principalFromRequest, authorizeSearchMutation, historyRuntime } from '../../../bootstrap/personal-library';
type Runtime = Awaited<ReturnType<typeof historyRuntime>>;
export function createHistoryController(deps: IdentityDependencies & {runtime: () => Promise<Runtime>} = {principal: principalFromRequest, authorizeMutation: authorizeSearchMutation, runtime: historyRuntime}) {
  const {json,id,key,body,identity,handle}=searchHttp(deps);
  return {
    createHistory: (request: Request) => handle(async () => {
      const p = await identity(request, true, true), operationKey = key(request);
      const parsed = searchHistoryInputSchema.safeParse(await body(request));
      if (!parsed.success) throw new SearchError(422, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'DTO không hợp lệ.');
      const input = parsed.data;
      const result = await (await deps.runtime()).history.save(input, operationKey, p);
      return json(result, 201, { Location: `/api/v4/users/me/search-history/${result.id}`, ETag: `"${result.revision}"` });
    }),
    listHistory: (request: Request) => handle(async () => {
      const p = (await identity(request, true))!;
      const url = new URL(request.url), limit = Number(url.searchParams.get('limit') ?? '20');
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 || [...url.searchParams.keys()].some(k => k !== 'limit' && k !== 'cursor'))
        throw new SearchError(422, 'VALIDATION_ERROR', 'Limit phải từ 1 đến 100; chỉ nhận limit/cursor.');
      const cursor = url.searchParams.get('cursor'); if (cursor) id(cursor);
      const rows = await (await deps.runtime()).repository.listHistory(p.id, cursor, limit + 1);
      return json({ items: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1]!.id : null });
    }),
    getHistory: (request: Request, historyId: string) => handle(async () => {
      const p = (await identity(request, true))!;
      const resourceId = id(historyId);
      const row = await (await deps.runtime()).repository.getHistory(p.id, resourceId);
      if (!row) throw new SearchError(404, 'HISTORY_NOT_FOUND', 'Không tìm thấy lịch sử.');
      return json(row, 200, { ETag: `"${row.revision}"` });
    }),
    deleteHistory: (request: Request, historyId: string) => handle(async () => {
      const p = (await identity(request, true, true))!, operationKey = key(request);
      const match = request.headers.get('if-match');
      if (!match) throw new SearchError(428, 'PRECONDITION_REQUIRED', 'Cần If-Match.');
      if (!/^"[1-9][0-9]*"$/.test(match)) throw new SearchError(422, 'VALIDATION_ERROR', 'If-Match không hợp lệ.');
      const resourceId = id(historyId);
      await (await deps.runtime()).repository.deleteHistory(p.id, resourceId, Number(match.slice(1, -1)), operationKey);
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }),
  };
}
export const historyController = createHistoryController();
