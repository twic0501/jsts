import type { Point3 } from './contracts';
function finite(...values: number[]) { if(values.some(x=>!Number.isFinite(x)))throw new RangeError('Tọa độ và góc phải là số hữu hạn.'); }
export class Complex {
  constructor(public readonly re:number,public readonly im:number){finite(re,im)}
  rotate(angle:number):Complex {finite(angle);const c=Math.cos(angle),s=Math.sin(angle);return new Complex(this.re*c-this.im*s,this.re*s+this.im*c);}
}
export function rotatePoint3D(point:Point3,angles:Point3):Point3 {
 finite(point.x,point.y,point.z,angles.x,angles.y,angles.z);
 const yz=new Complex(point.y,point.z).rotate(angles.x);
 const zx=new Complex(yz.im,point.x).rotate(angles.y);
 const xy=new Complex(zx.im,yz.re).rotate(angles.z);
 return {x:xy.re,y:xy.im,z:zx.re};
}
export function orbitPosition(radius:number,yaw:number,pitch:number,center:Point3):Point3 {
 finite(radius,yaw,pitch,center.x,center.y,center.z);
 if(radius<=0)throw new RangeError('Bán kính phải dương.');
 const p=Math.max(-1.25,Math.min(1.25,pitch));
 const horizontal=new Complex(radius*Math.cos(p),0).rotate(yaw);
 return {x:center.x+horizontal.re,y:center.y+radius*Math.sin(p),z:center.z+horizontal.im};
}
export function damp(current:number,target:number,lambda:number,dt:number):number {finite(current,target,lambda,dt);if(lambda<0||dt<0)throw new RangeError('Thời gian và hệ số không âm.');return current+(target-current)*(1-Math.exp(-lambda*dt));}
export function zoomRadius(radius:number,delta:number):number {finite(radius,delta);return Math.max(4,Math.min(14,radius*Math.exp(Math.max(-1,Math.min(1,delta))*0.18)));}
export function stepAngle(angle:number,speed:number,dt:number):number {finite(angle,speed,dt);if(dt<0)throw new RangeError('dt không âm.');return ((angle+speed*dt)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);}
