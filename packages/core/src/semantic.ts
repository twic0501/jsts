import{z}from'zod';
import{searchSchema,type Corpus,type Paper,type SearchInput,type SearchResult}from'./contracts';
import{cosineSimilarity,projectPca,type Vec3}from'./vector';
const finite=z.number().finite();
export const pointSchema=z.object({x:finite,y:finite,z:finite}).strict();
const vectorSchema=z.array(finite).length(384).refine(v=>Math.abs(Math.hypot(...v)-1)<.002,'Vector chưa L2 normalize.');
export const semanticSnapshotSchema=z.object({
 version:z.string(),corpusVersion:z.string(),createdAt:z.string(),corpusHash:z.string(),
 model:z.object({id:z.literal('Xenova/multilingual-e5-small'),revision:z.string(),dtype:z.literal('q8'),dimensions:z.literal(384),pipelineVersion:z.string()}).strict(),
 projection:z.object({mean:z.array(finite).length(384),components:z.array(z.array(finite).length(384)).length(3),explainedVariance:z.array(finite).length(3),center:pointSchema,scale:finite.positive(),seed:z.number().int()}).strict(),
 papers:z.array(z.object({paperId:z.string(),textHash:z.string(),vector:vectorSchema,point:pointSchema}).strict()).min(2)
}).strict();
export type SemanticSnapshot=z.infer<typeof semanticSnapshotSchema>;
export function validateSnapshot(corpus:Corpus,raw:unknown):SemanticSnapshot{
 const snapshot=semanticSnapshotSchema.parse(raw);
 if(snapshot.corpusVersion!==corpus.version||snapshot.papers.length!==corpus.papers.length)throw new Error('Phiên bản corpus và vector không khớp.');
 const ids=new Set(snapshot.papers.map(p=>p.paperId));if(ids.size!==snapshot.papers.length||corpus.papers.some(p=>!ids.has(p.id)))throw new Error('ID vector không khớp corpus.');
 for(const p of snapshot.papers){const expected=projectPca(p.vector,snapshot.projection);if(Math.hypot(expected.x-p.point.x,expected.y-p.point.y,expected.z-p.point.z)>1e-5)throw new Error('Tọa độ không khớp phép chiếu PCA.');}
 return snapshot;
}
export class SemanticIndex{
 private readonly byId:Map<string,SemanticSnapshot['papers'][number]>;
 constructor(public readonly corpus:Corpus,public readonly snapshot:SemanticSnapshot){validateSnapshot(corpus,snapshot);this.byId=new Map(snapshot.papers.map(p=>[p.paperId,p]));}
 search(raw:SearchInput,queryVector?:readonly number[]):SearchResult{
  const input=searchSchema.parse(raw),started=performance.now();if(input.query&&!queryVector)throw new Error('Cần vector truy vấn cho tìm kiếm ngữ nghĩa.');
  const hits=this.corpus.papers.flatMap(paper=>{
   if(input.group&&paper.group!==input.group||input.yearFrom!==undefined&&paper.year<input.yearFrom||input.yearTo!==undefined&&paper.year>input.yearTo)return[];
   const embedding=this.byId.get(paper.id);if(!embedding)throw new Error('Thiếu vector.');return[{paper,score:queryVector?cosineSimilarity(queryVector,embedding.vector):0}];
  }).sort((a,b)=>queryVector?b.score-a.score||a.paper.id.localeCompare(b.paper.id):b.paper.year-a.paper.year||a.paper.id.localeCompare(b.paper.id));
  return{items:hits.slice(0,input.topK),total:hits.length,durationMs:performance.now()-started,method:'semantic',datasetVersion:this.corpus.version};
 }
 neighbors(paper:Paper,limit=4){const own=this.byId.get(paper.id);if(!own)return[];return this.search({query:'neighbors',topK:50},own.vector).items.filter(h=>h.paper.id!==paper.id).slice(0,limit);}
 projectQuery(vector:readonly number[]):Vec3{return projectPca(vector,this.snapshot.projection)}
 bridgeEvidence(paper:Paper){const neighbors=this.neighbors(paper,10);const counts:Record<string,number>={};for(const n of neighbors)counts[n.paper.group]=(counts[n.paper.group]??0)+1;const entropy=neighbors.length?-Object.values(counts).reduce((sum,n)=>sum+(n/neighbors.length)*Math.log(n/neighbors.length),0)/Math.log(4):0;return{counts,entropy,neighborCount:neighbors.length};}
}
