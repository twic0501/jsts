import type {Point3} from '@paper-galaxy/core';
/** Shared rotation + uniform scale + translation; relative PCA distances stay proportional. */
export const CLOUD_SCALE=2;
export const PAGE_WIDTH_SCALE=1.22;
export function toLibraryPoint(p:Point3):Point3{return{x:p.x*CLOUD_SCALE,y:4.1+p.z*CLOUD_SCALE,z:-4.2-p.y*CLOUD_SCALE}}
export type PageFocus='auto'|'both'|'left'|'right';
export function readingCamera(aspect:number,focus:PageFocus){
 const single=focus==='left'||focus==='right'||focus==='auto'&&aspect<.8;
 const side=focus==='right'?1:-1;
 const width=single?2.5*PAGE_WIDTH_SCALE:5.4*PAGE_WIDTH_SCALE;
 const distance=Math.max(single?5.8:7.25,width/(2*Math.tan(21*Math.PI/180)*Math.max(.2,aspect)*.76));
 return{distance,centerX:single?side*1.25*PAGE_WIDTH_SCALE:0,single};
}
