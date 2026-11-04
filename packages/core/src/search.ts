import { searchSchema, type Corpus, type Paper, type SearchInput, type SearchResult } from './contracts';
const stop=new Set('the a an of and or to in on for with is are by from as at we this that our be using via can it its'.split(' '));
const dictionary:Record<string,string>={ 'ai':'artificial intelligence learning neural','tri tue nhan tao':'artificial intelligence learning neural','hoc may':'machine learning','hoc sau':'deep learning neural','anh':'image imaging vision','te bao':'cell cellular','sinh hoc':'biology biological protein gene','protein':'protein folding structure','y te':'medical clinical health','y sinh':'biomedical medical imaging','benh':'disease diagnosis medical','ung thu':'cancer tumor','vat ly':'physics physical','luong tu':'quantum','tim kiem':'search retrieval','ngon ngu':'language linguistic','mang no ron':'neural network','phat hien':'detection classification','phan doan':'segmentation','gen':'gene genome genetic','sinh anh':'image generative diffusion','nguoi may':'robot robotics','vaccine':'vaccine immune' };
export function normalizeText(text:string):string{return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();}
export function tokenize(text:string):string[]{return (normalizeText(text).match(/[a-z0-9]+/g)||[]).filter(t=>t.length>1&&!stop.has(t));}
export function expandQuery(query:string):string {const normalized=normalizeText(query);return normalized+' '+Object.entries(dictionary).filter(([key])=>new RegExp('(?:^|\\s)'+key+'(?:$|\\s)').test(normalized)).map(([,value])=>value).join(' ');}
function counts(tokens:string[]):Map<string,number>{const out=new Map<string,number>();for(const token of tokens)out.set(token,(out.get(token)||0)+1);return out;}
function magnitude(v:Map<string,number>):number{return Math.sqrt([...v.values()].reduce((sum,n)=>sum+n*n,0));}
export class SearchIndex {
 readonly corpus:Corpus; private readonly documents:Map<string,number>[]; private readonly idf:Map<string,number>;
 constructor(corpus:Corpus){
  this.corpus=corpus;const docs=corpus.papers.map(p=>counts(tokenize(`${p.title} ${p.title} ${p.abstract} ${p.tags.join(' ')} ${p.summary}`)));
  const frequencies=new Map<string,number>();for(const doc of docs)for(const term of doc.keys())frequencies.set(term,(frequencies.get(term)||0)+1);
  this.idf=new Map([...frequencies].map(([term,n])=>[term,Math.log((docs.length+1)/(n+1))+1]));
  this.documents=docs.map(doc=>{const vector=new Map([...doc].map(([t,n])=>[t,(1+Math.log(n))*(this.idf.get(t)||1)]));const norm=magnitude(vector);return new Map([...vector].map(([t,n])=>[t,n/norm]));});
 }
 search(raw:SearchInput):SearchResult {
  const input=searchSchema.parse(raw);const started=performance.now();const queryCounts=counts(tokenize(expandQuery(input.query)));
  const q=new Map([...queryCounts].map(([t,n])=>[t,(1+Math.log(n))*(this.idf.get(t)||0)]));const norm=magnitude(q);if(norm>0)for(const [t,n] of q)q.set(t,n/norm);
  const items=this.corpus.papers.flatMap((paper,i)=>{
   if(input.group!==undefined&&paper.group!==input.group||input.yearFrom!==undefined&&paper.year<input.yearFrom||input.yearTo!==undefined&&paper.year>input.yearTo)return [];
   const vector=this.documents[i];const score=input.query?Math.min(1,[...q].reduce((sum,[t,n])=>sum+n*(vector?.get(t)||0),0)):0;
   return input.query&&score<0.00001?[]:[{paper,score}];
  }).sort((a,b)=>input.query?b.score-a.score||a.paper.id.localeCompare(b.paper.id):b.paper.year-a.paper.year||a.paper.id.localeCompare(b.paper.id));
  return {items:items.slice(0,input.topK),total:items.length,durationMs:Math.round((performance.now()-started)*100)/100,method:'tfidf',datasetVersion:this.corpus.version};
 }
 neighbors(paper:Paper,limit=4){return this.search({query:paper.title,topK:50}).items.filter(hit=>hit.paper.id!==paper.id).slice(0,limit);}
}
