import { getDataset } from '../../../../../lib/repository';
import { fail,success } from '../../../../../lib/http';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{paperId:string}>}){try{const {paperId}=await params;const {corpus}=await getDataset();const paper=corpus.papers.find(p=>p.id===paperId);return paper?success(paper):fail(404,'PAPER_NOT_FOUND','Không tìm thấy bài báo.')}catch{return fail(503,'DATASET_UNAVAILABLE','Thư viện chưa sẵn sàng.')}}
