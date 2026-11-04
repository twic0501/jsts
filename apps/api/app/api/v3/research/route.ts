import {researchRequestSchema} from '@paper-galaxy/core';
import {researchSearch} from '../../../../lib/rag/service';
import {fail,success} from '../../../../lib/http';
export const runtime='nodejs';
let active=0;const requests:number[]=[];
export async function POST(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))return fail(415,'CONTENT_TYPE','Cần gửi JSON.');
 let raw:unknown;try{const reader=request.body?.getReader();let size=0,body='';const decoder=new TextDecoder();if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8192){await reader.cancel();return fail(413,'BODY_TOO_LARGE','Dữ liệu gửi quá lớn.')}body+=decoder.decode(part.value,{stream:true})}raw=JSON.parse(body+decoder.decode())}catch{return fail(400,'INVALID_JSON','JSON không hợp lệ.')}
 const parsed=researchRequestSchema.safeParse(raw);if(!parsed.success)return fail(422,'VALIDATION_ERROR','Kiểm tra câu hỏi và bộ lọc.');
 const now=Date.now();while(requests[0]!==undefined&&requests[0]<now-60000)requests.shift();if(active>=2||requests.length>=20)return fail(429,'RATE_LIMIT','AI cục bộ đang bận; thử lại sau.');active++;requests.push(now);
 try{return success(await researchSearch(parsed.data))}catch{return fail(503,'RESEARCH_UNAVAILABLE','Chưa chạy được truy xuất AI. Dữ liệu đã lưu vẫn dùng được trên trình duyệt.')}finally{active--}
}
