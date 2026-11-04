import{getDataset}from'../../../../../../lib/repository';
import{success,fail}from'../../../../../../lib/http';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{paperId:string}>}){
 const topK=new URL(request.url).searchParams.get('topK')??'5';if(!/^\d+$/.test(topK)||Number(topK)<1||Number(topK)>20)return fail(422,'INVALID_TOP_K','topK phải là số nguyên 1..20.');
 try{const{paperId}=await params;const{index,corpus}=await getDataset();const paper=corpus.papers.find(p=>p.id===paperId);if(!paper)return fail(404,'PAPER_NOT_FOUND','Không tìm thấy bài báo.');return success({paperId,datasetVersion:corpus.version,method:'semantic',items:index.neighbors(paper,Number(topK)),bridgeEvidence:index.bridgeEvidence(paper)})}catch{return fail(503,'SEMANTIC_UNAVAILABLE','Chưa có vector bài báo.');}
}
