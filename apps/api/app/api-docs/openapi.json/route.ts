import { docsEnabled, docsHeaders, notFound } from '../../../src/api-docs/docs'
import { openapi } from '../../../src/api-docs/openapi'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export function GET(){return docsEnabled()?Response.json(openapi,{headers:docsHeaders}):notFound()}
