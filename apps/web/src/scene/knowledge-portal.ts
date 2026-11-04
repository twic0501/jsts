import*as THREE from'three';
import{Complex}from'@paper-galaxy/core';
/** Original geometry, no image or handwritten shader. A disk, rings and spiral lines. */
export function createKnowledgePortal(scene:THREE.Scene){
 const group=new THREE.Group();scene.add(group);group.position.set(0,.85,0);group.visible=false;
 const disk=new THREE.Mesh(new THREE.CircleGeometry(.68,96),new THREE.MeshBasicMaterial({color:'#03020c',side:THREE.DoubleSide,toneMapped:false}));disk.rotation.x=-Math.PI/2;group.add(disk);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;const wash=ctx.createRadialGradient(128,128,0,128,128,128);wash.addColorStop(0,'#03020cff');wash.addColorStop(.58,'#060311f5');wash.addColorStop(.72,'#46306799');wash.addColorStop(.82,'#9362ba55');wash.addColorStop(1,'#a47ad300');ctx.fillStyle=wash;ctx.fillRect(0,0,256,256);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 const edge=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));edge.rotation.x=-Math.PI/2;edge.position.y=.008;group.add(edge);
 const rings:THREE.Mesh[]=[];
 for(let i=0;i<1;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.79,.008,6,96),new THREE.MeshBasicMaterial({color:'#ad83d8',transparent:true,opacity:.48,toneMapped:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.015;group.add(ring);rings.push(ring)}
 const spirals:THREE.Line[]=[];
 for(let arm=0;arm<2;arm++){const points=Array.from({length:94},(_,i)=>{const t=i/93,p=new Complex(.07+t*.68,0).rotate(t*Math.PI*3+arm*Math.PI);return new THREE.Vector3(p.re,.025+Math.sin(t*Math.PI)*.025,p.im)});const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:arm%2?'#7bbdb6':'#a88bd2',transparent:true,opacity:.38,toneMapped:false}));group.add(line);spirals.push(line)}
 const light=new THREE.PointLight('#ae79ff',0,8);light.position.y=.4;group.add(light);
 return{group,update(amount:number,time:number,sealing:number){group.visible=amount>.005;group.scale.setScalar(Math.max(.001,amount)*1.05);group.rotation.y=time*.8+sealing*sealing*8;rings.forEach((ring,i)=>ring.scale.setScalar(1+.015*Math.sin(time*2+i)));spirals.forEach((line,i)=>line.rotation.y=(i%2?1:-1)*time*.35);light.intensity=amount*2;}};
}
