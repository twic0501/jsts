import { docsEnabled, docsHeaders, docsHtml, notFound } from '../../src/api-docs/docs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export function GET(){
  if(!docsEnabled())return notFound()
  return new Response(docsHtml,{headers:{...docsHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}})
}
