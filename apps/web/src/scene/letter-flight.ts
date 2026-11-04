import type {Point3} from '@paper-galaxy/core';
import{smooth}from'./ritual';
/** Concave schedule: a first letter, a second, then progressively denser launches. */
export function launchDelay(rank:number,total:number){if(!Number.isInteger(rank)||!Number.isInteger(total)||total<1||rank<0||rank>=total)throw new RangeError('Thứ tự chữ không hợp lệ.');return total===1?0:3.7*Math.pow(rank/(total-1),.3)}
export function flightProgress(age:number,rank:number,total:number){return smooth((age-launchDelay(rank,total))/1.05)}
export function arcPoint(from:Point3,to:Point3,progress:number,lift=1.2):Point3{
 const t=Math.max(0,Math.min(1,progress)),u=1-t;return{x:from.x*u+to.x*t,y:from.y*u+to.y*t+4*lift*u*t,z:from.z*u+to.z*t};
}
/** Real document provenance: glyphs belong to a paper; query cosine orders those papers. */
export function orderLetters(paperIds:readonly string[],scores:ReadonlyMap<string,number>,visible:ReadonlySet<string>,limit=12){
 const targets=[...scores].filter(([id,score])=>visible.has(id)&&Number.isFinite(score)).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([id])=>id);
 const priority=new Map(targets.map((id,i)=>[id,i]));
 const indices=paperIds.map((paperId,index)=>({paperId,index,priority:priority.get(paperId)})).filter((x):x is{paperId:string;index:number;priority:number}=>x.priority!==undefined).sort((a,b)=>a.priority-b.priority||a.index-b.index);
 return{targets,indices:indices.map(x=>x.index)};
}
