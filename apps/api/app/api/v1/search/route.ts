import { searchSchema } from '@paper-galaxy/core';
import { getDataset } from '../../../../lib/repository';
import { fail,success } from '../../../../lib/http';
import {embedQuery}from'../../../../lib/embedding';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))return fail(415,'CONTENT_TYPE','Cần gửi application/json.');
 let body:unknown;
 try{const reader=request.body?.getReader();let bytes=0;let text='';const decoder=new TextDecoder();if(reader){while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8192){await reader.cancel();return fail(413,'BODY_TOO_LARGE','Dữ liệu gửi quá lớn.')}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}body=JSON.parse(text)}catch{return fail(400,'INVALID_JSON','Dữ liệu JSON không hợp lệ.');}
 const parsed=searchSchema.safeParse(body);if(!parsed.success)return fail(422,'VALIDATION_ERROR',parsed.error.issues[0]?.message||'Dữ liệu tìm kiếm không hợp lệ.');
 try{const started=performance.now();const {index}=await getDataset();const vector=parsed.data.query?await embedQuery(parsed.data.query):undefined;const result=index.search(parsed.data,vector);if(vector)result.queryPoint=index.projectQuery(vector);result.durationMs=performance.now()-started;return success(result)}catch{return fail(503,'SEMANTIC_UNAVAILABLE','Chưa chạy được tìm kiếm ngữ nghĩa. Kiểm tra model và vector cục bộ.');}
}
