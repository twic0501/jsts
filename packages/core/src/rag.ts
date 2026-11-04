import {z} from 'zod';
import {searchSchema,safeHttpsUrl,type Paper,type SearchResult} from './contracts';
import {cosineSimilarity} from './vector';

export const researchRequestSchema=z.object({query:z.string().trim().min(2).max(300),scope:z.enum(['library','online','combined']).default('library'),topK:z.number().int().min(1).max(20).default(12),group:z.enum(['ai','biology','medicine','physics']).optional(),yearFrom:z.number().int().min(1900).max(2100).optional(),yearTo:z.number().int().min(1900).max(2100).optional()}).strict().refine(({scope,...input})=>searchSchema.safeParse(input).success,'Bộ lọc không hợp lệ.');
export type ResearchRequest=z.infer<typeof researchRequestSchema>;
export const queryPlanSchema=z.object({original:z.string(),intent:z.string().min(1).max(500),queries:z.array(z.string().min(2).max(160)).min(1).max(3),method:z.enum(['local-llm','original'])}).strict();
export type QueryPlan=z.infer<typeof queryPlanSchema>;
export const evidenceSchema=z.object({id:z.string().regex(/^E\d+$/),paperId:z.string(),title:z.string(),url:safeHttpsUrl,quote:z.string(),start:z.number().int().nonnegative(),end:z.number().int().nonnegative(),cosine:z.number().min(-1).max(1),fusionScore:z.number().nonnegative(),coverage:z.enum(['abstract','title']),rerankScore:z.number().optional()}).strict();
export type Evidence=z.infer<typeof evidenceSchema>;
export const researchReportSchema=z.object({query:z.string(),plan:queryPlanSchema,retrieval:z.enum(['hybrid-passages','document-fallback']),mode:z.enum(['grounded-generation','extractive','insufficient']),claims:z.array(z.object({text:z.string().min(1).max(900),evidenceIds:z.array(z.string()).min(1).max(4)}).strict()).max(4),evidence:z.array(evidenceSchema).max(6),gaps:z.array(z.string()).max(8),traceId:z.string().nullable(),model:z.string().nullable(),metrics:z.object({candidates:z.number().int().nonnegative(),passages:z.number().int().nonnegative(),elapsedMs:z.number().nonnegative()})}).strict();
export type ResearchReport=z.infer<typeof researchReportSchema>;
export type Passage={paper:Paper;text:string;start:number;end:number;coverage:'abstract'|'title'};

/** Bounded windows preserve exact source offsets; no generated text enters the index. */
export function chunkPaper(paper:Paper,maxWords=100,overlap=20):Passage[]{
 if(!Number.isInteger(maxWords)||maxWords<20||maxWords>180||!Number.isInteger(overlap)||overlap<0||overlap>=maxWords)throw new RangeError('Chunk window không hợp lệ.');
 const coverage=paper.provenance?.abstractAvailable===false?'title':'abstract',text=coverage==='title'?paper.title:paper.abstract,words=[...text.matchAll(/\S+/g)],chunks:Passage[]=[];
 for(let i=0;i<words.length&&chunks.length<4;i+=maxWords-overlap){const start=words[i]!.index!,last=words[Math.min(words.length,i+maxWords)-1]!,end=last.index!+last[0].length;chunks.push({paper,text:text.slice(start,end),start,end,coverage});if(i+maxWords>=words.length)break}
 return chunks;
}
function terms(value:string):string[]{return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)??[]}
/** Dense ranks for original and planned intent plus BM25 ranks; cosine remains a separate honest display score. */
export function rankPassages(passages:Passage[],vectors:number[][],queries:number[][],queryText:string,limit=6):Evidence[]{
 if(vectors.length!==passages.length||!queries.length)throw new Error('Passage/vector không khớp.');
 const tokens=passages.map(p=>terms(p.paper.title+' '+p.text)),needles=[...new Set(terms(queryText))],average=tokens.reduce((n,t)=>n+t.length,0)/Math.max(1,tokens.length),df=new Map(needles.map(word=>[word,tokens.filter(row=>row.includes(word)).length]));
 const lexical=tokens.map(row=>needles.reduce((sum,word)=>{const tf=row.filter(w=>w===word).length;if(!tf)return sum;const idf=Math.log(1+(tokens.length-(df.get(word)??0)+.5)/((df.get(word)??0)+.5));return sum+idf*tf*2.2/(tf+1.2*(.25+.75*row.length/Math.max(1,average)))},0));
 const dense=queries.map(query=>vectors.map(vector=>cosineSimilarity(query,vector))),ranks=dense.map(scores=>scores.map((score,i)=>({score,i})).sort((a,b)=>b.score-a.score||a.i-b.i));
 const fusion=passages.map(()=>0);for(const ranking of ranks)ranking.forEach(({i},rank)=>{fusion[i]!+=1/(60+rank+1)});
 lexical.map((score,i)=>({score,i})).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.i-b.i).forEach(({i},rank)=>{fusion[i]!+=.5/(60+rank+1)});
 const selected:number[]=[],perPaper=new Map<string,number>();for(const row of fusion.map((score,i)=>({score,i})).sort((a,b)=>b.score-a.score||a.i-b.i)){const passage=passages[row.i]!,count=perPaper.get(passage.paper.id)??0;if(count>=2)continue;selected.push(row.i);perPaper.set(passage.paper.id,count+1);if(selected.length>=limit)break}
 return selected.map((i,rank)=>{const p=passages[i]!;return{id:'E'+(rank+1),paperId:p.paper.id,title:p.paper.title,url:p.paper.sourceUrl,quote:p.text,start:p.start,end:p.end,cosine:Math.max(-1,Math.min(1,dense[0]![i]!)),fusionScore:fusion[i]!,coverage:p.coverage}});
}
export function extractiveReport(query:string,plan:QueryPlan,evidence:Evidence[],candidates:number,passages:number,elapsedMs=0):ResearchReport{
 return{query,plan,retrieval:'hybrid-passages',mode:evidence.length?'extractive':'insufficient',claims:[],evidence,gaps:[evidence.length?'Các đoạn gần nghĩa là gợi ý đọc, chưa chứng minh đáp ứng mọi điều kiện của câu hỏi.':'Chưa có tài liệu làm bằng chứng cho câu hỏi này.','Hiện chỉ đọc tiêu đề và abstract, chưa đọc toàn văn PDF.',...(evidence.some(e=>e.coverage==='title')?['Một số nguồn chỉ có tiêu đề, không có abstract.']:[])],traceId:null,model:null,metrics:{candidates,passages,elapsedMs}};
}
export function documentFallbackReport(query:string,result:SearchResult):ResearchReport{
 const evidence=result.items.slice(0,6).flatMap((hit,i)=>{const chunk=chunkPaper(hit.paper)[0];return chunk?[{id:'E'+(i+1),paperId:hit.paper.id,title:hit.paper.title,url:hit.paper.sourceUrl,quote:chunk.text,start:chunk.start,end:chunk.end,cosine:hit.score,fusionScore:0,coverage:chunk.coverage}]:[]});
 const report=extractiveReport(query,{original:query,intent:query,queries:[query.slice(0,160)],method:'original'},evidence,result.total,result.total,result.durationMs);report.retrieval='document-fallback';report.gaps.unshift('Backend chưa sẵn sàng: trình duyệt xếp hạng vector toàn abstract, chỉ trích phần đầu; chưa có RAG sinh câu trả lời hoặc xếp hạng từng đoạn.');return report;
}
/** Citations must refer to retrieved evidence, never a model-invented source. */
export function validateGroundedClaims(raw:unknown,evidence:Evidence[]){
 const parsed=z.object({claims:z.array(z.object({text:z.string().trim().min(1).max(900),evidenceIds:z.array(z.string()).min(1).max(4)}).strict()).min(1).max(4)}).strict().parse(raw),ids=new Set(evidence.map(e=>e.id));
 if(parsed.claims.some(claim=>claim.evidenceIds.some(id=>!ids.has(id))))throw new Error('Citation không nằm trong tài liệu truy xuất.');
 return parsed.claims;
}
