import { docsAsset, docsEnabled, notFound } from '../../../../src/api-docs/docs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(_request:Request,context:{params:Promise<{asset:string}>}){
  if(!docsEnabled())return notFound()
  return docsAsset((await context.params).asset)
}
