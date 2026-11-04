import{z}from'zod';
import{corpusSchema,searchSchema,searchResultSchema,type Corpus,type Paper}from'./contracts';
import{semanticSnapshotSchema,validateSnapshot,type SemanticSnapshot}from'./semantic';
import{researchReportSchema}from'./rag';
export const onlineSearchSchema=z.object({query:z.string().trim().min(2).max(300),scope:z.enum(['online','combined']),group:z.enum(['ai','biology','medicine','physics']).optional(),yearFrom:z.number().int().min(1900).max(2100).optional(),yearTo:z.number().int().min(1900).max(2100).optional(),topK:z.number().int().min(1).max(20).default(12)}).strict().refine(value=>searchSchema.safeParse({query:value.query,topK:value.topK,...(value.group?{group:value.group}:{}),...(value.yearFrom!==undefined?{yearFrom:value.yearFrom}:{}),...(value.yearTo!==undefined?{yearTo:value.yearTo}:{})}).success,'Bộ lọc không hợp lệ.');
export const datasetBundleSchema=z.object({corpus:corpusSchema,snapshot:semanticSnapshotSchema}).strict();
export type DatasetBundle=z.infer<typeof datasetBundleSchema>;
export const providerStatusSchema=z.object({provider:z.enum(['arxiv','openalex']),status:z.enum(['ok','cached','error','rate-limited']),count:z.number().int().nonnegative(),message:z.string(),durationMs:z.number().nonnegative()}).strict();
export type ProviderStatus=z.infer<typeof providerStatusSchema>;
export const onlineResponseSchema=z.object({dataset:datasetBundleSchema,result:searchResultSchema,providers:z.array(providerStatusSchema),scope:z.enum(['online','combined']),ranking:z.literal('e5-cosine-384d'),storage:z.enum(['mongodb','memory']),warnings:z.array(z.string())}).strict();
export type OnlineResponse=z.infer<typeof onlineResponseSchema>;
export const researchResponseSchema=onlineResponseSchema.omit({scope:true,ranking:true}).extend({scope:z.enum(['library','online','combined']),ranking:z.enum(['hybrid-e5-bm25-rrf','hybrid-e5-bm25-rrf-rerank']),research:researchReportSchema}).strict();
export type ResearchResponse=z.infer<typeof researchResponseSchema>;
export function embeddingText(paper:Paper){return'passage: '+paper.title+(paper.provenance?.abstractAvailable===false?'':'\n'+paper.abstract)}
export function validateBundle(raw:unknown):DatasetBundle{const bundle=datasetBundleSchema.parse(raw);validateSnapshot(bundle.corpus,bundle.snapshot);return bundle}
/** Keep original library IDs; each cached document stays paired with its own vector. */
export function mergeBundles(base:DatasetBundle,incoming:DatasetBundle,previous?:DatasetBundle):DatasetBundle{
 for(const bundle of[incoming,...previous?[previous]:[]]){if(bundle.snapshot.model.revision!==base.snapshot.model.revision||JSON.stringify(bundle.snapshot.projection)!==JSON.stringify(base.snapshot.projection))throw new Error('Model/phép chiếu của bộ nhớ không khớp.');validateSnapshot(bundle.corpus,bundle.snapshot)}
 const papers=new Map(base.corpus.papers.map(p=>[p.id,p])),vectors=new Map(base.snapshot.papers.map(p=>[p.paperId,p]));
 for(const bundle of[previous,incoming]){if(!bundle)continue;const byId=new Map(bundle.snapshot.papers.map(p=>[p.paperId,p]));for(const paper of bundle.corpus.papers){if(base.corpus.papers.some(p=>p.id===paper.id))continue;papers.set(paper.id,paper);vectors.set(paper.id,byId.get(paper.id)!);}}
 const version=`${base.corpus.version}-cached-${papers.size}-${incoming.corpus.version}`;
 const corpus:Corpus={...base.corpus,version,papers:[...papers.values()]},snapshot:SemanticSnapshot={...base.snapshot,corpusVersion:version,papers:[...papers.keys()].map(id=>vectors.get(id)!)};
 return{corpus,snapshot};
}
