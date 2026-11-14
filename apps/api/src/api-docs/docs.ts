import { readFile } from 'node:fs/promises'
import path from 'node:path'

export function docsEnabled() {
  return process.env.PM_API_DOCS==='1'||process.env.NODE_ENV==='development'&&process.env.PM_API_DOCS!=='0'
}
export const docsHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}
export function notFound(){return new Response(null,{status:404,headers:docsHeaders})}
export const docsHtml=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Paper Magic — API</title><link rel="stylesheet" href="/api-docs/assets/swagger-ui.css"></head><body><main><div id="swagger-ui"></div></main><script src="/api-docs/assets/swagger-ui-bundle.js"></script><script src="/api-docs/assets/init.js"></script></body></html>`

export const initializer=`'use strict';
window.ui = SwaggerUIBundle({
  url: '/api-docs/openapi.json', dom_id: '#swagger-ui', deepLinking: true,
  validatorUrl: null, persistAuthorization: false, withCredentials: true,
  queryConfigEnabled: false, docExpansion: 'list', displayRequestDuration: true,
  showMutatedRequest: false, supportedSubmitMethods: ['get','post','put','patch','delete'],
  parameterMacro: function(operation, parameter) {
    if (parameter.name === 'Idempotency-Key') return crypto.randomUUID();
    return parameter.default;
  },
  requestInterceptor: async function(request) {
    const target = new URL(request.url, location.origin);
    if (target.origin !== location.origin) throw new Error('Chỉ thử API cùng origin.');
    request.credentials = 'same-origin';
    if (['POST','PUT','PATCH','DELETE'].includes((request.method || 'GET').toUpperCase())) {
      if (!target.pathname.startsWith('/api/v4/')) throw new Error('Chỉ thử ghi API FR12/FR14.');
      const response = await fetch('/api/v4/sessions/current', {credentials:'same-origin',cache:'no-store',redirect:'error'});
      if (!response.ok) throw new Error('Không lấy được session/CSRF. Hãy kiểm tra Backend.');
      const session = await response.json();
      if (typeof session.csrfToken !== 'string') throw new Error('CSRF response không hợp lệ.');
      request.headers = request.headers || {};
      request.headers['X-CSRF-Token'] = session.csrfToken;
    }
    return request;
  }
});`

/** Explicit allowlist: no user-supplied filesystem paths and no third-party CDN. */
export async function docsAsset(asset: string) {
  if(asset==='init.js')return new Response(initializer,{headers:{...docsHeaders,'Content-Type':'text/javascript; charset=utf-8'}})
  if(asset!=='swagger-ui.css'&&asset!=='swagger-ui-bundle.js')return notFound()
  // Next start runs from apps/api. Resolve the installed package at runtime,
  // rather than resolving relative to Turbopack's generated server chunks.
  const base=path.join(process.cwd(),'node_modules/swagger-ui-dist')
  const bytes=await readFile(path.join(base,asset))
  return new Response(new Uint8Array(bytes),{headers:{...docsHeaders,'Content-Type':asset.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'}})
}
