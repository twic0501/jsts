import { getDataset } from '../../../../lib/repository';
import { fail,success } from '../../../../lib/http';
export const runtime='nodejs';
export async function GET(){try{const {corpus,storage}=await getDataset();return success({...corpus,storage})}catch{return fail(503,'DATASET_UNAVAILABLE','Không đọc được thư viện bài báo.')}}
