export type SemanticLink={a:string;b:string;score:number};
/** A sparse degree-limited graph made only from real cosine neighbors. */
export function sparseSemanticLinks(rows:{id:string;neighbors:{id:string;score:number}[]}[],visible:ReadonlySet<string>,limit=24):SemanticLink[]{
 const links:SemanticLink[]=[],seen=new Set<string>(),degree=new Map<string,number>();
 for(let pass=0;pass<2;pass++)for(const row of rows){
  if(!visible.has(row.id)||links.length>=limit)continue;
  for(const neighbor of row.neighbors){
   const key=[row.id,neighbor.id].sort().join('|');if(row.id===neighbor.id||!visible.has(neighbor.id)||!Number.isFinite(neighbor.score)||seen.has(key)||(degree.get(row.id)??0)>=2||(degree.get(neighbor.id)??0)>=2)continue;
   links.push({a:row.id,b:neighbor.id,score:neighbor.score});seen.add(key);degree.set(row.id,(degree.get(row.id)??0)+1);degree.set(neighbor.id,(degree.get(neighbor.id)??0)+1);break;
  }
 }
 return links;
}
