import fs from 'node:fs/promises';
const catalog=JSON.parse(await fs.readFile('docs/code-catalog.json','utf8'));
const modules=[
 {name:'Scene3D',prefix:'apps/web/src/scene/',readme:'apps/web/src/scene/README.md',log:'apps/web/src/scene/ai-development-log.jsonl'},
 {name:'Model trong browser',prefix:'apps/web/src/semantic/',readme:'apps/web/src/semantic/README.md',log:'apps/web/ai-development-log.jsonl'},
 {name:'RAG backend',prefix:'apps/api/lib/rag/',readme:'apps/api/lib/rag/README.md',log:'apps/api/lib/rag/ai-development-log.jsonl'},
 {name:'Nguồn học thuật',prefix:'apps/api/lib/online/',readme:'apps/api/lib/online/README.md',log:'apps/api/lib/online/ai-development-log.jsonl'},
 {name:'Frontend và lưu web',prefix:'apps/web/',readme:'apps/web/README.md',log:'apps/web/ai-development-log.jsonl'},
 {name:'Backend/API',prefix:'apps/api/',readme:'apps/api/README.md',log:'apps/api/ai-development-log.jsonl'},
 {name:'Core dùng chung',prefix:'packages/core/',readme:'packages/core/README.md',log:'packages/core/ai-development-log.jsonl'},
 {name:'Công cụ và kiểm chứng',prefix:'scripts/',readme:'scripts/README.md',log:'scripts/ai-development-log.jsonl'}
];
const grouped=modules.map(module=>({...module,entries:[]}));for(const entry of catalog.entries){const module=grouped.find(m=>entry.file.startsWith(m.prefix));if(!module)throw new Error('Unclassified '+entry.file);module.entries.push(entry)}
let text='# Module, số hàm/biến và nhật ký AI\n\nSinh từ code-catalog.json. Hàm có tên và các biến khởi tạo được đếm theo quy tắc AST trong03-ham-bien-toan.md; không tính anonymouscallbacks hoặc node_modules. Phạm viapps/packages/scripts, không cộng mã test/presentation thành chức năng ứng dụng. Không dùng số cũ sau khi sửa mã.\n\n';
text+='| Module | Hàm có tên | Khởi tạo biến | README | Log phát triển |\n|---|---:|---:|---|---|\n';
for(const module of grouped){await fs.access(module.readme);text+=`| ${module.name} | ${module.entries.filter(e=>e.kind==='function').length} | ${module.entries.filter(e=>e.kind==='variable').length} | [README](../${module.readme}) | [AI log](../${module.log}) |\n`}
text+=`| Tổng | ${catalog.functionCount} | ${catalog.variableCount} | | |\n\n`;
text+='Dữ liệu, tests, deploy và docs có README riêng nhưng không thuộc tổng hàm ứng dụng/công cụ trên. Log có thể được lưu tại module cha để tránh nhân bản cùng thông tin; README chỉ rõ vị trí. Các file log ghi nhận phát triển, không phải rawtranscript lịch sử cho mọi function.\n';
for(const module of grouped){text+='\n## '+module.name+'\n\n';for(const file of [...new Set(module.entries.map(e=>e.file))]){const functions=module.entries.filter(e=>e.file===file&&e.kind==='function');text+=`- [${file}](../${file}): ${functions.length} hàm có tên`+(functions.length?' — '+functions.map(fn=>fn.name+'@'+fn.line).join(', '):'')+'.\n'}}
text+='\nMọi tham số/return ở function-catalog.md; mọi biểu thức gán khởi tạo ở variable-catalog.md. Giá trị môi trường/secret không được thu thập. Hàm kiểm thử nằm tests, log kiểm thử ở docs/evidence; cấu hình hosting ở deploy, không được gọi là đã public chỉ vì có file cấu hình.\n';
await fs.writeFile('docs/18-module-inventory.md',text);await fs.writeFile('docs/module-inventory.json',JSON.stringify({generatedAt:new Date().toISOString(),functionCount:catalog.functionCount,variableCount:catalog.variableCount,modules:grouped.map(({entries,...module})=>({...module,functions:entries.filter(e=>e.kind==='function').length,variables:entries.filter(e=>e.kind==='variable').length}))},null,2));console.log('Documented8 code modules.');
