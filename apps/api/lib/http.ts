export function fail(status:number,code:string,message:string){return Response.json({error:{code,message},requestId:crypto.randomUUID()},{status,headers:{'Cache-Control':'no-store'}})}
export function success(value:unknown){return Response.json(value,{headers:{'Cache-Control':'no-store'}})}
