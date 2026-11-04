import*as THREE from'three';
/** All blocks are authored geometry. No game textures or downloaded model. */
export function createEnchantingTable():THREE.Group{
 const table=new THREE.Group();table.name='enchanting-table';
 const stoneColors=['#211c32','#292239','#30273e','#231f35','#3b2b48'];
 const stone=stoneColors.map(color=>new THREE.MeshStandardMaterial({color,roughness:.95,metalness:.16}));
 const dark=new THREE.MeshStandardMaterial({color:'#161723',roughness:.85});
 const red=new THREE.MeshStandardMaterial({color:'#a73746',roughness:.85});
 const edge=new THREE.MeshStandardMaterial({color:'#63314a',roughness:.8});
 const brass=new THREE.MeshStandardMaterial({color:'#bc9566',metalness:.5,roughness:.5});
 const gem=new THREE.MeshStandardMaterial({color:'#47d8d4',emissive:'#168eac',emissiveIntensity:.8,roughness:.25,metalness:.35});
 function block(w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);table.add(mesh);return mesh;}
 block(2.9,1.15,2.9,0,-1.23,0,dark);
 for(let side=0;side<4;side++)for(let row=0;row<3;row++)for(let col=0;col<7;col++){
  const center=-1.24+col*.413;const level=-1.59+row*.36;
  const material=stone[(col*3+row*5+side)%stone.length]??dark;
  if(side===0)block(.39,.32,.065,center,level,1.46,material);
  if(side===1)block(.39,.32,.065,center,level,-1.46,material);
  if(side===2)block(.065,.32,.39,1.46,level,center,material);
  if(side===3)block(.065,.32,.39,-1.46,level,center,material);
 }
 block(3.03,.16,3.03,0,-.58,0,edge);block(2.89,.045,2.89,0,-.475,0,red);
 block(3.12,.11,3.12,0,-1.86,0,stone[0]??dark);
 for(const x of[-1.25,1.25])for(const z of[-1.25,1.25]){block(.46,.075,.46,x,-.435,z,brass);block(.3,.1,.3,x,-.39,z,gem);}
 // Original geometric rune pattern on the red top, built from small blocks.
 for(let i=0;i<12;i++){const angle=i*Math.PI/6;const rune=block(.05,.018,.18,Math.cos(angle)*.9,-.443,Math.sin(angle)*.9,brass);rune.rotation.y=-angle;}
 return table;
}
