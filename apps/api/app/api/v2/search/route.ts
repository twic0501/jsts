import{onlineSearchSchema}from'@paper-galaxy/core';
import{onlineSearch}from'../../../../lib/online/search';
import{fail,success}from'../../../../lib/http';
export const runtime='nodejs';
let active=0;const requests:number[]=[];
export async function POST(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))return fail(415,'CONTENT_TYPE','Cần gửi JSON.');
 let raw:unknown;try{const reader=request.body?.getReader();let bytes=0,body='';const decoder=new TextDecoder();if(reader)while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>8192){await reader.cancel();return fail(413,'BODY_TOO_LARGE','Dữ liệu gửi quá lớn.')}body+=decoder.decode(part.value,{stream:true})}raw=JSON.parse(body+decoder.decode())}catch{return fail(400,'INVALID_JSON','JSON không hợp lệ.')}
 const parsed=onlineSearchSchema.safeParse(raw);if(!parsed.success)return fail(422,'VALIDATION_ERROR',parsed.error.issues[0]?.message??'Câu tìm không hợp lệ.');
 const now=Date.now();while(requests[0]!==undefined&&requests[0]<now-60_000)requests.shift();if(active>=3||requests.length>=20)return fail(429,'RATE_LIMIT','Đang có nhiều lượt tìm trực tuyến; thử lại sau.');requests.push(now);active++;
 try{return success(await onlineSearch(parsed.data))}catch{return fail(503,'ONLINE_SEARCH_UNAVAILABLE','Chưa chạy được model hoặc bộ dữ liệu. Bạn vẫn có thể chọn tìm trong thư viện.')}finally{active--}
}
