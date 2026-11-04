import {describe,it,expect}from'vitest';
import {Complex,rotatePoint3D,orbitPosition,damp,zoomRadius,stepAngle}from'../packages/core/src';
describe('Phép quay bằng số phức',()=>{
 it('quay 90 độ quanh Z theo trục tay phải',()=>{const p=rotatePoint3D({x:1,y:0,z:0},{x:0,y:0,z:Math.PI/2});expect(p.x).toBeCloseTo(0,10);expect(p.y).toBeCloseTo(1,10);expect(p.z).toBe(0)});
 it('quay 90 độ quanh X',()=>{const p=rotatePoint3D({x:0,y:1,z:0},{x:Math.PI/2,y:0,z:0});expect(p.y).toBeCloseTo(0);expect(p.z).toBeCloseTo(1)});
 it('quay 90 độ quanh Y',()=>{const p=rotatePoint3D({x:0,y:0,z:1},{x:0,y:Math.PI/2,z:0});expect(p.x).toBeCloseTo(1);expect(p.z).toBeCloseTo(0)});
 it('bảo toàn norm trên 100 điểm xác định',()=>{for(let i=0;i<100;i++){const p={x:Math.sin(i)*20,y:Math.cos(i*3)*8,z:i/4};const r=rotatePoint3D(p,{x:i*.01,y:i*.03,z:i*.07});expect(Math.hypot(r.x,r.y,r.z)).toBeCloseTo(Math.hypot(p.x,p.y,p.z),8)}});
 it('phép ngược dùng thứ tự Z Y X',()=>{const p={x:2,y:3,z:-1};let r=rotatePoint3D(p,{x:.2,y:.5,z:.9});r=rotatePoint3D(r,{x:0,y:0,z:-.9});r=rotatePoint3D(r,{x:0,y:-.5,z:0});r=rotatePoint3D(r,{x:-.2,y:0,z:0});expect(r.x).toBeCloseTo(p.x,10);expect(r.y).toBeCloseTo(p.y,10);expect(r.z).toBeCloseTo(p.z,10)});
 it.each([NaN,Infinity,-Infinity])('từ chối giá trị không hữu hạn %s',value=>{expect(()=>new Complex(value,0)).toThrow(RangeError);expect(()=>new Complex(1,0).rotate(value)).toThrow(RangeError)});
});
describe('Camera và thời gian',()=>{
 it('orbit giữ bán kính quanh tâm',()=>{const p=orbitPosition(5,.7,.4,{x:1,y:2,z:3});expect(Math.hypot(p.x-1,p.y-2,p.z-3)).toBeCloseTo(5,10)});
 it('damping 60 lần 1/60s bằng một lần 1s',()=>{let a=0;for(let i=0;i<60;i++)a=damp(a,1,4,1/60);expect(a).toBeCloseTo(damp(0,1,4,1),12)});
 it('damping không vượt đích',()=>{expect(damp(0,1,100,10)).toBeLessThanOrEqual(1);expect(damp(2,1,100,10)).toBeGreaterThanOrEqual(1)});
 it.each([-1,NaN,Infinity])('từ chối dt sai %s',dt=>{expect(()=>damp(0,1,4,dt)).toThrow()});
 it('giới hạn zoom không thành số âm',()=>{expect(zoomRadius(4,-100)).toBe(4);expect(zoomRadius(14,100)).toBe(14)});
 it('góc phụ thuộc dt và gói đúng chu kỳ',()=>{expect(stepAngle(0,2,1)).toBeCloseTo(2);expect(stepAngle(6,2,1)).toBeCloseTo(8-2*Math.PI)});
});
