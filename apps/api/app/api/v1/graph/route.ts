import{getDataset}from'../../../../lib/repository';
import{success,fail}from'../../../../lib/http';
export const runtime='nodejs';
export async function GET(){try{const{index}=await getDataset();return success({datasetVersion:index.corpus.version,model:index.snapshot.model,explainedVariance:index.snapshot.projection.explainedVariance,points:index.snapshot.papers.map(p=>({paperId:p.paperId,point:p.point}))})}catch{return fail(503,'GRAPH_UNAVAILABLE','Chưa có bản đồ vector hợp lệ.')}}
