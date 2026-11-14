export function fail(status:number,code:string,message:string,extra?:Record<string,unknown>){return Response.json({error:{code,message,...extra},requestId:crypto.randomUUID()},{status,headers:{'Cache-Control':'no-store'}})}
export function success(value:unknown,init?:ResponseInit){const headers=new Headers(init?.headers);headers.set('Cache-Control','no-store');return Response.json(value,{...init,headers})}
export async function readJsonBody(request:Request):Promise<{ok:true;value:unknown}|{ok:false;response:Response}>{
 if(!request.headers.get('content-type')?.startsWith('application/json'))return{ok:false,response:fail(415,'CONTENT_TYPE','Cần gửi JSON.')};
 try{const reader=request.body?.getReader();let size=0,body='',decoder=new TextDecoder();if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8192){await reader.cancel();return{ok:false,response:fail(413,'BODY_TOO_LARGE','Dữ liệu gửi quá lớn.')}}body+=decoder.decode(part.value,{stream:true})}return{ok:true,value:JSON.parse(body+decoder.decode())}}catch{return{ok:false,response:fail(400,'INVALID_JSON','JSON không hợp lệ.')}}
}
