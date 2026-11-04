import { getDataset } from '../../../../lib/repository';
import { fail,success } from '../../../../lib/http';
export const runtime='nodejs';
export async function GET(){try{const {corpus,storage,index}=await getDataset();return success({status:'ok',storage,paperCount:corpus.papers.length,datasetVersion:corpus.version,searchMethod:'semantic',model:index.snapshot.model,projection:{algorithm:'pca',explainedVariance:index.snapshot.projection.explainedVariance}})}catch{return fail(503,'DATASET_UNAVAILABLE','Không đọc được dữ liệu. Kiểm tra corpus hoặc MongoDB.')}}
