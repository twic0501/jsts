import * as THREE from 'three';
import {GROUPS,type Paper} from '@paper-galaxy/core';
export type BookPage={heading:string;lines:string[];kind?:'cover'|'summary'|'abstract'|'source';paper?:Paper};
export function wrapLines(text:string,width=34){const lines:string[]=[];let line='';for(const word of text.split(/\s+/)){if((line+' '+word).trim().length>width&&line){lines.push(line);line=word}else line=(line+' '+word).trim()}if(line)lines.push(line);return lines}
/** Pages are metadata + abstract, never a claim of downloaded full paper content. */
export function readingPages(paper:Paper):BookPage[]{
 const pages:BookPage[]=[{heading:'HỒ SƠ NGHIÊN CỨU',kind:'cover',paper,lines:[...wrapLines(paper.title,25),'',String(paper.year),...wrapLines(paper.authors.slice(0,3).join(', '),26)]}];
 for(const section of[{heading:paper.provenance?'TRÍCH NỘI DUNG':'GHI CHÚ KHỞI ĐẦU',kind:'summary' as const,lines:wrapLines(paper.summary,27)},...(paper.provenance?.abstractAvailable===false?[]:[{heading:'ABSTRACT / NGUYÊN VĂN',kind:'abstract' as const,lines:wrapLines(paper.abstract,27)}])])for(let i=0;i<section.lines.length;i+=13)pages.push({heading:section.heading,kind:section.kind,paper,lines:section.lines.slice(i,i+13)});
 const source:BookPage={heading:'ĐỌC TIẾP TOÀN VĂN',kind:'source',paper,lines:['Bạn đang xem hồ sơ và','tóm tắt của bài nghiên cứu.','','Toàn văn còn có hình ảnh,','công thức và kết quả chi tiết.','','Dùng nút nguồn hoặc PDF','để mở tài liệu gốc.','','Nguồn ngoài cần Internet.']};
 if(pages.length%2)pages.push(source);return pages;
}
function line(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,color:string){ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke()}
function block(ctx:CanvasRenderingContext2D,lines:string[],x:number,y:number,size=42,leading=62,color='#303038'){ctx.font=`${size}px Georgia, serif`;ctx.fillStyle=color;lines.forEach((text,i)=>ctx.fillText(text,x,y+i*leading,608));return y+lines.length*leading}
function orbitMark(ctx:CanvasRenderingContext2D,x:number,y:number,radius:number,color:string){ctx.strokeStyle=color;ctx.lineWidth=1.2;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y,radius,radius*.36,i*Math.PI/3,0,Math.PI*2);ctx.stroke()}ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill()}
export function createPageTexture(page:BookPage|null,pageNumber=0){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1280;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas không khả dụng.');
 const paper=page?.paper,field=paper?GROUPS[paper.group]:null,accent=field?.color??'#a69ac1';
 const wash=ctx.createLinearGradient(0,0,768,0);wash.addColorStop(0,'#dcd3c2');wash.addColorStop(.08,'#f7f2e8');wash.addColorStop(.65,'#fffaf1');wash.addColorStop(1,'#eee6d8');ctx.fillStyle=wash;ctx.fillRect(0,0,768,1280);
 ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#77707e';ctx.font='19px system-ui';ctx.fillText('P A P E R  M A G I C',74,69);ctx.textAlign='right';ctx.fillText(String(pageNumber+1).padStart(2,'0'),694,69);ctx.textAlign='left';line(ctx,74,110,620,'#d8d0c2');
 if(!page){orbitMark(ctx,384,420,145,'#b2a4c5');block(ctx,['Follow your','curiosity.'],125,680,65,85,'#665b77');ctx.font='24px system-ui';ctx.fillStyle='#9b8ea3';ctx.fillText('Một câu hỏi. Vô vàn kết nối.',125,880)}
 else if(page.kind==='cover'&&paper){
  ctx.fillStyle=accent;ctx.fillRect(74,158,5,102);ctx.font='21px system-ui';ctx.fillStyle='#807087';ctx.fillText('RESEARCH DOSSIER',103,161);ctx.font='24px system-ui';ctx.fillStyle='#54475e';ctx.fillText(field!.label,103,205);orbitMark(ctx,642,207,44,'#b8abc7');
  const titleLines=wrapLines(paper.title,26),shown=titleLines.slice(0,8);let y=block(ctx,shown,74,315,48,65,'#2c2a34');if(titleLines.length>8){ctx.font='20px system-ui';ctx.fillStyle='#9a869e';ctx.fillText('Tên đầy đủ trong Góc đọc.',74,y+4);y+=38}
  y=Math.max(715,Math.min(900,y+38));line(ctx,74,y,100,accent);ctx.font='18px system-ui';ctx.fillStyle='#9a8e9b';ctx.fillText('TÁC GIẢ',74,y+31);block(ctx,wrapLines(paper.authors.slice(0,3).join(' · '),35).slice(0,3),74,y+69,29,43,'#6b6370');
  ctx.fillStyle='#51485d';ctx.font='47px Georgia';ctx.fillText(String(paper.year),74,1092);ctx.font='21px system-ui';ctx.fillStyle='#93849a';ctx.fillText(paper.provenance?.provider==='openalex'?'OpenAlex':'arXiv',240,1115);
 }else if(page.kind==='source'){
  orbitMark(ctx,384,360,120,'#b9aecb');ctx.font='23px system-ui';ctx.fillStyle='#8b759f';ctx.fillText(page.heading,74,175);block(ctx,page.lines,74,565,37,53,'#62556f');
 }else{
  ctx.fillStyle=accent;ctx.fillRect(74,160,50,4);ctx.font='21px system-ui';ctx.fillStyle='#8c7799';ctx.fillText(page.heading,74,195);
  if(page.kind==='summary'){ctx.font='125px Georgia';ctx.fillStyle='#d8cbdf';ctx.fillText('“',65,237);block(ctx,page.lines,74,350,43,58,'#43374d');ctx.font='20px system-ui';ctx.fillStyle='#9d8da5';ctx.fillText(paper?.provenance?'Trích từ dữ liệu nguồn':'Ghi chú tiếng Việt · đối chiếu abstract gốc',74,1102)}
  else block(ctx,page.lines,74,280,42,61,'#3c3741');
 }
 line(ctx,74,1173,620,'#d8d0c2');ctx.fillStyle='#9c8da4';ctx.font='17px system-ui';ctx.fillText('HỒ SƠ & TÓM TẮT · KHÔNG PHẢI TOÀN VĂN',74,1202);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
