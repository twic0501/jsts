import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const clean=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/\s+/g,' ').trim();
const field=(entry,name)=>clean(entry.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+name+'>'))?.[1]||'');
const summaries={
 '1706.03762':'Kiến trúc Transformer dùng attention để xử lý chuỗi và dịch máy.',
 '1810.04805':'BERT học biểu diễn ngôn ngữ hai chiều để hiểu văn bản.',
 '1512.03385':'Mạng residual giúp huấn luyện mô hình nhận diện ảnh sâu hơn.',
 '1505.04597':'U-Net phân đoạn ảnh y sinh với kiến trúc encoder–decoder.',
 '1406.2661':'Hai mạng đối kháng học cách tạo dữ liệu mới.',
 '2005.14165':'Mô hình ngôn ngữ quy mô lớn học tác vụ từ một vài ví dụ.',
 '2010.11929':'Áp dụng Transformer cho bài toán nhận diện hình ảnh.',
 '2006.11239':'Mô hình diffusion học tái tạo hình ảnh qua quá trình khử nhiễu.',
 '2103.00020':'Kết nối hình ảnh và ngôn ngữ bằng biểu diễn học chung.',
 '1602.07360':'SqueezeNet giảm số tham số cho mô hình nhận diện ảnh gọn nhẹ.',
 '1803.09010':'Đề xuất tài liệu mô tả tập dữ liệu để tăng tính minh bạch và khả năng tái sử dụng.',
 '2106.09685':'LoRA điều chỉnh mô hình ngôn ngữ bằng các ma trận hạng thấp để giảm chi phí huấn luyện.'
};
function parse(xml,forced){
 return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([,entry])=>{
  const id=field(entry,'id').split('/abs/')[1]?.replace(/v\d+$/,'');if(!id)throw new Error('Missing arXiv ID');
  const categories=[...entry.matchAll(/<category[^>]*term="([^"]+)"/g)].map(m=>m[1]);
  const group=id==='1505.04597'?'medicine':forced|| (categories.some(c=>c.startsWith('q-bio'))?'biology':categories.some(c=>c.includes('med-ph'))?'medicine':categories.some(c=>c.startsWith('quant-')||c.startsWith('physics'))?'physics':'ai');
  const title=field(entry,'title');const abstract=field(entry,'summary');
  return {id,title,abstract,authors:[...entry.matchAll(/<author>([\s\S]*?)<\/author>/g)].map(([,author])=>field(author,'name')),year:Number(field(entry,'published').slice(0,4)),group,categories,sourceUrl:'https://arxiv.org/abs/'+id,tags:categories,summary:summaries[id]||({biology:'Nghiên cứu sinh học và mô hình tính toán cho dữ liệu sinh học.',medicine:'Phương pháp tính toán và hình ảnh trong nghiên cứu y sinh.',physics:'Nghiên cứu vật lý và mô hình hóa hệ thống.',ai:'Nghiên cứu phương pháp học máy và trí tuệ nhân tạo.'})[group]};
 });
}
const seed=await fs.readFile(path.join(root,'data/arxiv-seed.atom'),'utf8');let papers=parse(seed);
const queries=[['biology','cat:q-bio.BM AND all:learning'],['medicine','cat:physics.med-ph AND all:imaging'],['physics','cat:quant-ph AND all:learning']];
for(const [group,query]of queries){
 await new Promise(resolve=>setTimeout(resolve,3100));
 const response=await fetch('https://export.arxiv.org/api/query?'+new URLSearchParams({search_query:query,max_results:'6',sortBy:'relevance'}),{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('arXiv HTTP '+response.status);
 const xml=await response.text();await fs.writeFile(path.join(root,`data/arxiv-${group}.atom`),xml);papers.push(...parse(xml,group));
}
papers=[...new Map(papers.map(p=>[p.id,p])).values()];
const corpus={version:'arxiv-starter-2026-11-04-v1',title:'Thư viện khởi đầu · arXiv',fetchedAt:new Date().toISOString(),papers};
await fs.writeFile(path.join(root,'data/corpus.json'),JSON.stringify(corpus,null,2)+'\n');
console.log('Saved '+papers.length+' actual arXiv records. '+JSON.stringify(Object.fromEntries(['ai','biology','medicine','physics'].map(g=>[g,papers.filter(p=>p.group===g).length]))));
