export type Vec3={x:number;y:number;z:number};
export type Projection={mean:number[];components:number[][];explainedVariance:number[];center:Vec3;scale:number;seed:number};
export function normalizeVector(input:readonly number[],dimensions=input.length):number[]{
 if(input.length!==dimensions||dimensions<1||input.some(x=>!Number.isFinite(x)))throw new RangeError('Vector sai chiều hoặc có số không hữu hạn.');
 const norm=Math.hypot(...input);if(norm<1e-12)throw new RangeError('Vector không được có norm bằng 0.');return input.map(x=>x/norm);
}
export function cosineSimilarity(a:readonly number[],b:readonly number[]):number{
 const av=normalizeVector(a),bv=normalizeVector(b,a.length);return Math.max(-1,Math.min(1,av.reduce((sum,x,i)=>sum+x*(bv[i]??0),0)));
}
function dot(a:readonly number[],b:readonly number[]){return a.reduce((sum,x,i)=>sum+x*(b[i]??0),0)}
export function projectPca(vector:readonly number[],projection:Projection):Vec3{
 if(vector.length!==projection.mean.length||vector.some(x=>!Number.isFinite(x)))throw new RangeError('Vector không khớp PCA.');
 const centered=vector.map((x,i)=>x-(projection.mean[i]??0));const raw=projection.components.map(v=>dot(centered,v));
 return {x:((raw[0]??0)-projection.center.x)*projection.scale,y:((raw[1]??0)-projection.center.y)*projection.scale,z:((raw[2]??0)-projection.center.z)*projection.scale};
}
/** Covariance power iteration; no N×N matrix, deterministic seed and orthogonal deflation. */
export function fitPca3(vectors:readonly number[][],seed=42):Projection{
 const first=vectors[0];if(!first||vectors.length<2)throw new RangeError('PCA cần ít nhất hai vector.');const dimensions=first.length;
 for(const v of vectors){if(v.length!==dimensions||v.some(x=>!Number.isFinite(x)))throw new RangeError('Dữ liệu PCA không hợp lệ.')}
 const mean=Array.from({length:dimensions},(_,i)=>vectors.reduce((sum,v)=>sum+(v[i]??0),0)/vectors.length);
 const centered=vectors.map(v=>v.map((x,i)=>x-(mean[i]??0)));const totalVariance=centered.reduce((sum,v)=>sum+dot(v,v),0);
 const components:number[][]=[],explainedVariance:number[]=[];
 for(let axis=0;axis<3;axis++){
  let direction=Array.from({length:dimensions},(_,i)=>Math.sin((i+1)*(seed+axis*13.37)));
  for(let iteration=0;iteration<100;iteration++){
   const next=new Array<number>(dimensions).fill(0);
   for(const row of centered){const weight=dot(row,direction);for(let d=0;d<dimensions;d++)next[d]=(next[d]??0)+weight*(row[d]??0);}
   for(const previous of components){const amount=dot(next,previous);for(let d=0;d<dimensions;d++)next[d]=(next[d]??0)-amount*(previous[d]??0);}
   const norm=Math.hypot(...next);if(norm<1e-10){direction=new Array<number>(dimensions).fill(0);break}
   const normalized=next.map(x=>x/norm);const change=Math.hypot(...normalized.map((x,i)=>x-(direction[i]??0)));direction=normalized;if(change<1e-8)break;
  }
  let signIndex=0;for(let d=1;d<dimensions;d++)if(Math.abs(direction[d]??0)>Math.abs(direction[signIndex]??0))signIndex=d;
  if((direction[signIndex]??0)<0)direction=direction.map(x=>-x);
  components.push(direction);const variance=centered.reduce((sum,row)=>sum+dot(row,direction)**2,0);explainedVariance.push(totalVariance>1e-12?variance/totalVariance:0);
 }
 const raw=centered.map(v=>components.map(c=>dot(v,c)));const mins=[0,1,2].map(i=>Math.min(...raw.map(v=>v[i]??0))),maxs=[0,1,2].map(i=>Math.max(...raw.map(v=>v[i]??0)));
 const center={x:((mins[0]??0)+(maxs[0]??0))/2,y:((mins[1]??0)+(maxs[1]??0))/2,z:((mins[2]??0)+(maxs[2]??0))/2};
 const maxRadius=Math.max(...raw.map(p=>Math.hypot((p[0]??0)-center.x,(p[1]??0)-center.y,(p[2]??0)-center.z)),1e-8);
 return {mean,components,explainedVariance,center,scale:2.5/maxRadius,seed};
}
