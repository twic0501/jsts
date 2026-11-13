import { searchResourceIdSchema } from '@paper-galaxy/core';
import { SearchError, type Principal } from './search-context';
export type IdentityDependencies = { principal: (request: Request) => Promise<Principal>; authorizeMutation: (request: Request, principal: Principal) => Promise<void> };
export function searchHttp(deps: IdentityDependencies) {
  const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
    Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
  const id = (value: string) => {
    if (!searchResourceIdSchema.safeParse(value).success) throw new SearchError(422, 'VALIDATION_ERROR', 'ID không hợp lệ.');
    return value;
  };
  const key = (request: Request) => {
    const value = request.headers.get('idempotency-key');
    if (!value || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new SearchError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Cần Idempotency-Key (1–128 ký tự).');
    return value;
  };
  async function body(request: Request) {
    if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json')
      throw new SearchError(415, 'CONTENT_TYPE', 'Cần application/json.');
    const reader = request.body?.getReader();
    let size = 0, text = ''; const decoder = new TextDecoder();
    if (reader) while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new SearchError(413, 'BODY_TOO_LARGE', 'JSON vượt 8 KiB.'); }
      text += decoder.decode(value, { stream: true });
    }
    try { return JSON.parse(text + decoder.decode()) as unknown; }
    catch { throw new SearchError(400, 'INVALID_JSON', 'JSON không hợp lệ.'); }
  }
  async function identity(request: Request, required: boolean, mutation = false) {
    const principal = await deps.principal(request);
    if (required && !principal) throw new SearchError(401, 'AUTH_REQUIRED', 'Cần đăng nhập.');
    if (mutation) await deps.authorizeMutation(request, principal);
    return principal;
  }
  async function handle(operation: () => Promise<Response>) {
    try { return await operation(); }
    catch (e) {
      const requestId = crypto.randomUUID();
      if (e instanceof SearchError) return json({ error: { code: e.code, message: e.message }, requestId }, e.status);
      return json({ error: { code: 'SEARCH_UNAVAILABLE', message: 'Dịch vụ tìm kiếm chưa sẵn sàng.' }, requestId }, 503);
    }
  }
  return { json, id, key, body, identity, handle };
}
