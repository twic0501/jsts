/** Choreography in seconds/radians; semantic results gate the first data flight. */
export type Phase='idle'|'waiting'|'vortex'|'charging'|'channeling'|'sealing'|'closing'|'settling'|'zooming'|'opening'|'reading'|'turn-framing'|'turning'|'exit-closing'|'exit-zoom'|'exit-reopen'|'exit-release'|'exit-opening';
export const DURATIONS={idle:0,waiting:0,vortex:5,charging:2.1,channeling:3.8,sealing:1,closing:.75,settling:1,zooming:.9,opening:1.2,reading:0,'turn-framing':.55,turning:1.05,'exit-closing':.8,'exit-zoom':1,'exit-reopen':1.1,'exit-release':2.6,'exit-opening':.8} as const;
export function smooth(value:number){const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t)}
/** Display bands for this prototype, not calibrated probabilities or scientific quality. */
export const SIMILARITY_BANDS={high:.82,medium:.79} as const;
export function similarityTone(score:number|null):{color:string;label:string}{
 if(score===null||!Number.isFinite(score))return{color:'#c4b7ff',label:'Chưa có điểm'};
 if(score>=SIMILARITY_BANDS.high)return{color:'#7cf5cd',label:'Tương đồng cao'};
 if(score>=SIMILARITY_BANDS.medium)return{color:'#8bc9ff',label:'Tương đồng vừa'};
 return{color:'#d1a4ff',label:'Tương đồng thấp hơn'};
}
export class BookRitual{
 phase:Phase='idle';age=0;ready=false;
 private exitAngle=.72;private exitZoom=0;private exitLay=0;
 start(){this.phase='waiting';this.age=0;this.ready=false}
 resolve(){if(this.phase==='idle')this.start();this.ready=true}
 close(){if(this.phase==='idle'||this.phase.startsWith('exit-'))return;if(this.phase==='waiting'){this.phase='idle';this.age=0;this.ready=false;return}const s=this.sample();this.exitAngle=s.angle;this.exitZoom=s.zoom;this.exitLay=s.lay;this.phase='exit-closing';this.age=0;this.ready=false}
 turn(){if(this.phase!=='reading')return false;this.phase='turn-framing';this.age=0;return true}
 tick(dt:number,reduced=false){
  if(!Number.isFinite(dt)||dt<0)throw new RangeError('dt phải hữu hạn, không âm.');
  if(reduced){this.phase=this.phase.startsWith('exit-')?'idle':this.ready?'reading':this.phase==='idle'?'idle':'waiting';this.age=0;return}
  this.age+=dt;
  const next:Partial<Record<Phase,Phase>>={vortex:'charging',charging:'channeling',channeling:'sealing',sealing:'closing',closing:'settling',settling:'zooming',zooming:'opening',opening:'reading','turn-framing':'turning',turning:'reading','exit-closing':'exit-zoom','exit-zoom':'exit-reopen','exit-reopen':'exit-release','exit-release':'exit-opening','exit-opening':'idle'};
  for(let guard=0;guard<20;guard++){
   if(this.phase==='waiting'){if(!this.ready){this.age=0;break}this.phase='vortex';this.age=0;continue}
   const duration=DURATIONS[this.phase],target=next[this.phase];if(!target||this.age<duration)break;this.age-=duration;this.phase=target;
  }
 }
 sample(){
  const phase=this.phase,linear=DURATIONS[phase]?Math.min(1,this.age/DURATIONS[phase]):0,p=smooth(linear),closed=1.54,rest=.72,read=.10;
  let angle=rest,zoom=0,portal=0,charge=0,lay=0,land=0,release=0,flip=0,cast=0;
  if(phase==='vortex'){cast=smooth(this.age/1.4)}
  if(phase==='charging'){cast=1;angle=rest-(rest-.32)*p;charge=Math.sin(Math.PI*this.age/.7)**2}
  if(phase==='channeling'){cast=1;angle=.32;portal=smooth(linear/.15);charge=.4+.3*Math.sin(this.age*8)**2}
  if(phase==='sealing'){cast=1;angle=.32;portal=1-p}
  if(phase==='closing'){cast=1;angle=.32+(closed-.32)*p}
  if(phase==='settling'){cast=1;angle=closed;lay=p;land=p}
  if(phase==='zooming'){cast=1;angle=closed;lay=1;land=1;zoom=p}
  if(phase==='opening'){cast=1;angle=closed+(read-closed)*p;lay=1-p;land=1;zoom=1}
  if(phase==='reading'||phase==='turn-framing'||phase==='turning'){angle=read;land=1;zoom=1;flip=phase==='turning'?p:0}
  if(phase==='exit-closing'){angle=this.exitAngle+(closed-this.exitAngle)*p;zoom=this.exitZoom;lay=this.exitLay+(1-this.exitLay)*p;land=1}
  if(phase==='exit-zoom'){angle=closed;zoom=this.exitZoom*(1-p);lay=1;land=1;cast=p}
  if(phase==='exit-reopen'){angle=closed+(rest-closed)*p;lay=1-p;land=1-p;cast=1}
  if(phase==='exit-release'){angle=rest;cast=1;release=p}
  if(phase==='exit-opening'){angle=rest;release=1;cast=1-p}
  return{phase,p,linear,angle,zoom,portal,charge,lay,land,release,flip,cast};
 }
}
