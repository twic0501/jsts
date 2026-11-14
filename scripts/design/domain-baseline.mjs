import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const destination=path.join(root,'docs/design');
const endpoints=[];
const add=(module,method,route,description,{success=200,access='user',idempotency='none',precondition='none',location=null,body='none',creation,policy,errorCodes}={})=>endpoints.push({id:module+'.'+method+'.'+route.replace(/\W+/g,'.'),module,method,path:'/api/v4'+route,description,access,success,idempotency,precondition,location,body,status:'design',...(creation&&{creation}),...(policy&&{policy}),...(errorCodes&&{errorCodes})});
const studyOwner = 'Chỉ chủ sở hữu tài liệu study; tài liệu cha phải còn hiệu lực.';
const versionReader = 'Kiểm quyền và trạng thái xóa của tài liệu cha, quan hệ document/version và phiên bản từng được kích hoạt.';
add('identity','POST','/users','Tạo tài khoản',{success:201,access:'public',idempotency:'required',location:'/api/v4/users/me',body:'email, password, displayName'});
add('identity','GET','/users/me','Hồ sơ tài khoản hiện tại');
add('identity','PATCH','/users/me','Sửa hồ sơ',{idempotency:'required',precondition:'If-Match',body:'displayName'});
add('identity','POST','/sessions','Đăng nhập và cấp cookie',{access:'public',body:'email, password'});
add('identity','GET','/sessions/current','Đọc phiên và token CSRF',{access:'optional'});
add('identity','DELETE','/sessions/current','Thu hồi phiên',{success:204});
add('documents','GET','/documents','Duyệt thư viện có quyền',{access:'optional'});
add('documents','POST','/documents','Tạo Document từ file, index job queued',{success:201,idempotency:'required',location:'/api/v4/documents/{id}',body:'multipart: clientDocumentId, metadata, file'});
add('documents','GET','/documents/{id}','Đọc hồ sơ tài liệu',{access:'optional'});
add('documents','PATCH','/documents/{id}','Sửa metadata tài liệu đã nhập',{idempotency:'required',precondition:'If-Match',body:'title?, subjects?, primarySubject?',policy:studyOwner});
add('documents','DELETE','/documents/{id}','Logical delete và cleanup job',{success:204,idempotency:'required',precondition:'If-Match',policy:studyOwner+' Replay đã commit chỉ trả 204 sau khi kiểm phiên và chủ cũ trên tombstone.'});
for(const sub of ['chunks','source','neighbors'])add('documents','GET','/documents/{id}/'+sub,'Đọc '+sub+' có quyền',{access:'optional'});
add('documents','POST','/documents/{id}/versions','Thay file tạo version mới',{
 success:201,idempotency:'required',precondition:'baseDocumentRevision (multipart)',location:'/api/v4/documents/{id}/versions/{versionId}',
 body:'multipart: file, clientVersionId, baseDocumentRevision',
 policy:studyOwner+' Sau kiểm quyền, tra receipt theo key và fingerprint trước khi so sánh revision hiện tại.',
 errorCodes:{
  409:['DOCUMENT_REVISION_MISMATCH','IDEMPOTENCY_KEY_REUSED','VERSION_ID_CONFLICT'],
  422:['INVALID_BASE_DOCUMENT_REVISION','INVALID_VERSION_IMPORT'],
  428:['BASE_DOCUMENT_REVISION_REQUIRED']
 }
});
add('documents','GET','/documents/{id}/versions/{versionId}','Đọc trạng thái phiên bản',{access:'optional',policy:versionReader+' Chủ sở hữu cũng xem được trạng thái bản đang xử lý hoặc thất bại.'});
add('documents','GET','/documents/{id}/versions/{versionId}/chunks','Đọc đoạn theo phiên bản',{access:'optional',policy:versionReader});
add('documents','GET','/documents/{id}/versions/{versionId}/source','Tải file nguồn theo phiên bản',{access:'optional',policy:versionReader+' Kiểm thêm quyền cấp file nguồn.'});
add('search','POST','/searches','Tạo search snapshot và trả hits',{success:201,access:'optional',idempotency:'required',location:'/api/v4/searches/{id}',body:'queryId, query, filters, topK'});
add('search','GET','/searches/{id}','Đọc search snapshot chưa hết hạn',{access:'optional'});
add('search','GET','/graph','Đọc graph giới hạn có quyền',{access:'optional'});
add('research','POST','/answers','Tạo tác vụ trả lời từ searchId',{success:202,idempotency:'required',location:'/api/v4/jobs/{jobId}',body:'searchId'});
add('research','GET','/answers/{id}','Đọc câu trả lời và evidence');
add('jobs','GET','/jobs/{id}','Đọc tiến độ hoặc lỗi job có quyền',{policy:'Job thay file chỉ hiển thị cho chủ tài liệu còn hiệu lực; resourceId là versionId.'});
add('personal','GET','/users/me/bookmarks','Danh sách bài đã lưu');
add('personal','PUT','/users/me/bookmarks/{documentId}','Đặt saved=true, không toggle',{success:200,idempotency:'required',precondition:'If-Match or If-None-Match:*',body:'saved:true'});
add('personal','DELETE','/users/me/bookmarks/{documentId}','Bỏ lưu bài',{success:204,idempotency:'required',precondition:'If-Match'});
add('personal','GET','/collections','Danh sách bộ sưu tập có quyền');
add('personal','POST','/collections','Tạo bộ sưu tập',{success:201,idempotency:'required',location:'/api/v4/collections/{id}',body:'id, name'});
add('personal','GET','/collections/{id}','Đọc bộ sưu tập có quyền');
add('personal','PATCH','/collections/{id}','Đổi tên bộ sưu tập',{idempotency:'required',precondition:'If-Match',body:'name'});
add('personal','DELETE','/collections/{id}','Xóa bộ sưu tập, không xóa tài liệu',{success:204,idempotency:'required',precondition:'If-Match'});
add('personal','PUT','/collections/{id}/items/{documentId}','Thêm membership xác định',{idempotency:'required',precondition:'If-Match or If-None-Match:*',body:'present:true'});
add('personal','DELETE','/collections/{id}/items/{documentId}','Gỡ membership',{success:204,idempotency:'required',precondition:'If-Match'});
add('personal','GET','/notes','Danh sách ghi chú có quyền');
add('personal','POST','/notes','Tạo ghi chú',{success:201,idempotency:'required',location:'/api/v4/notes/{id}',body:'id, documentId, chunkId?, text'});
add('personal','GET','/notes/{id}','Đọc ghi chú có quyền');
add('personal','PATCH','/notes/{id}','Sửa nội dung ghi chú',{idempotency:'required',precondition:'If-Match',body:'text'});
add('personal','DELETE','/notes/{id}','Xóa ghi chú',{success:204,idempotency:'required',precondition:'If-Match'});
add('personal','GET','/users/me/search-history','Đọc lịch sử của chính mình');
add('personal','POST','/users/me/search-history','Thêm lịch sử explicit submit',{success:201,idempotency:'required',location:'/api/v4/users/me/search-history/{id}',body:'id, queryId, query, filters'});
add('personal','GET','/users/me/search-history/{id}','Đọc một mục lịch sử');
add('personal','DELETE','/users/me/search-history/{id}','Xóa một mục lịch sử',{success:204,idempotency:'required',precondition:'If-Match'});
add('personal','GET','/users/me/reading-states','Đọc danh sách vị trí đọc',{policy:'Chỉ mốc của principal trên tài liệu còn được phép đọc.'});
add('personal','GET','/users/me/reading-states/{documentId}','Đọc một vị trí đọc và ETag',{policy:'Chỉ mốc của principal trên tài liệu còn được phép đọc.',errorCodes:{404:['DOCUMENT_NOT_FOUND','READING_STATE_NOT_FOUND']}});
add('personal','PUT','/users/me/reading-states/{documentId}','Tạo hoặc thay toàn bộ vị trí đọc',{
 idempotency:'required',precondition:'If-Match or If-None-Match:*',body:'versionId, chunkId?, page?, progress',
 creation:{status:201,location:'/api/v4/users/me/reading-states/{documentId}'},
 policy:'Chỉ ghi mốc của principal trên phiên bản được phép đọc. Cả 200 và 201 có revision trong body; lấy ETag qua GET mốc.',
 errorCodes:{
  400:['INVALID_JSON','INVALID_PRECONDITION'],
  404:['DOCUMENT_NOT_FOUND','DOCUMENT_VERSION_NOT_FOUND'],
  409:['IDEMPOTENCY_KEY_REUSED'],
  412:['REVISION_MISMATCH','READING_STATE_EXISTS'],
  422:['INVALID_READING_STATE','INVALID_READING_ANCHOR'],
  428:['PRECONDITION_REQUIRED']
 }
});
add('sync','GET','/sync/bootstrap','Snapshot public hoặc personal có cursor',{access:'optional'});
add('sync','GET','/sync/changes','Feed canonical/tombstone theo cursor',{access:'optional'});
for(const route of ['/capabilities','/health/live','/health/ready'])add('system','GET',route,'Thông tin vận hành an toàn',{access:'public'});
add('datasets','POST','/datasets','Import manifest curated đã kiểm',{success:201,access:'admin',idempotency:'required',location:'/api/v4/datasets/{id}',body:'manifestId'});
add('datasets','GET','/datasets/{id}','Đọc dataset/import status',{access:'admin'});
add('datasets','POST','/documents/{id}/index-jobs','Tạo reindex job',{success:202,access:'admin',idempotency:'required',location:'/api/v4/jobs/{jobId}',body:'targetModelRevision, pipelineRevision'});

const entities=[
 {name:'User',store:'mongo',key:'id',rules:['email canonical unique','password hash only','principal from session']},
 {name:'Dataset',store:'mongo',key:'id+datasetVersion',rules:['manifest/checksum/counts','no raw private user documents in public dataset']},
 {name:'Document',store:'mongo',key:'id',rules:['kind paper|study','study owner required','private default for upload','activeVersionId and revision','accepting a replacement bumps revision and sets latestReplacementVersionId atomically','tombstone blocks all version reads and worker publication']},
 {name:'DocumentVersion',store:'mongo',key:'documentId+versionId',rules:['content immutable once ready','queued coverage/textHash/parserRevision/index generation may be unknown; ready requires them','publish only for the latest replacement with a current worker lease and a matching content and metadata index generation','historical content readable only if previously activated, retained and currently authorized']},
 {name:'Chunk',store:'mongo',key:'id',rules:['versionId exists','ordinal/page/section/offset provenance','hash matches text']},
 {name:'Embedding',store:'cassandra',key:'scope+targetKind+targetId+modelRevision+pipelineRevision+generation',rules:['document and chunk targets distinct','384D normalized for current E5','Mongo authority rechecked']},
 {name:'Summary',store:'mongo',key:'versionId+language+generatorRevision',rules:['derived only','sourceCoverage and review status','never replace original evidence']},
 {name:'Bookmark',store:'mongo',key:'ownerId+documentId',rules:['set not toggle','revision and ownership']},
 {name:'Collection',store:'mongo',key:'id',rules:['owner scope','delete does not delete source Document']},
 {name:'CollectionItem',store:'mongo',key:'collectionId+documentId',rules:['membership only','document permission rechecked']},
 {name:'Note',store:'mongo',key:'id',rules:['owner scope','versioned anchor','conflict keeps local draft']},
 {name:'SearchRun',store:'mongo',key:'id',rules:['principal/scope fingerprint','TTL','not personal history','evidence revision']},
 {name:'SearchHistory',store:'mongo',key:'ownerId+queryId',rules:['one explicit submit','offline replay idempotent']},
 {name:'ReadingState',store:'mongo',key:'ownerId+documentId',rules:['owner is the session principal','one state per owner and document','version belongs to a readable document; page/chunk anchors and progress belong to that version','revision protects replacement; replays do not advance revision','IndexedDB stores per-account drafts and outbox']},
 {name:'BrowserSettings',store:'indexeddb',key:'browser profile (singleton per app origin)',rules:['theme/fontScale/reducedMotion/sceneQuality','guest and signed-in users share the profile settings','local only; no account dependency, API or sync events']},
 {name:'Answer',store:'mongo',key:'id',rules:['searchId','authorized original evidence','grounded|extractive|insufficient']},
 {name:'ClientOutbox',store:'indexeddb',key:'profileId+operationId',rules:['same REST resource write path','no tokens/passwords','preserve pending until acknowledged']}
];
const designDate = '2026-11-14';
const data={status:'design',date:designDate,entities,relationships:[['Document','DocumentVersion','one-to-many'],['DocumentVersion','Chunk','one-to-many'],['Chunk','Embedding','one-to-many by model/generation'],['DocumentVersion','Embedding','one-to-many document target'],['DocumentVersion','Summary','one-to-many'],['Collection','CollectionItem','one-to-many'],['Document','CollectionItem','one-to-many'],['SearchRun','Answer','one-to-many'],['User','ReadingState','one-to-many'],['Document','ReadingState','one-to-many across owners'],['DocumentVersion','ReadingState','one-to-many across owners']],sourceRules:{originalTextRequired:true,summaryIsDerived:true,rightsBeforeFulltextDownload:true,privateUploadDefault:true},evaluation:{pilotDocuments:100,proposedQuestions:60,labelsRequired:true,trainingRequired:false},runtimeChanged:false};
const api={status:'design',date:designDate,namespace:'/api/v4',supersedes:'API proposal dated 2026-11-12; sync/push write model',runtimeVersionUnchanged:true,endpointCount:endpoints.length,writeModel:'resource REST endpoints with offline replay of eligible requests',localOnly:{FR24:'BrowserSettings, indexeddb, no server endpoint or sync mapping'},endpoints};

export async function publish(){
 await fs.mkdir(destination,{recursive:true});
 await fs.writeFile(path.join(destination,'resource-api.registry.json'),JSON.stringify(api,null,2)+'\n');
 await fs.writeFile(path.join(destination,'data-domain.contract.json'),JSON.stringify(data,null,2)+'\n');
 const matrix=['# Danh mục API tài nguyên','',`Thiết kế ngày ${designDate}. ${endpoints.length} thao tác HTTP. Xem [OpenAPI](software-api.openapi.json) để biết DTO và quyền trên từng tài nguyên.`,'',
 '| Method | Path | Quyền | Thành công | Retry key | Precondition | Location |','|---|---|---|---|---|---|---|',
 ...endpoints.map(e=>{
  const success = e.creation ? `${e.creation.status} tạo / ${e.success} cập nhật` : e.success;
  const location = e.creation ? `${e.creation.location} (chỉ khi tạo)` : (e.location ?? '—');
  return `| ${e.method} | \`${e.path}\` | ${e.access} | ${success} | ${e.idempotency} | ${e.precondition} | ${location} |`;
 }),
 '', 'FR17 lấy ETag qua GET mốc trước lần cập nhật kế tiếp. FR20 dùng revision của Document trong multipart khi thay file. FR24 lưu theo hồ sơ trình duyệt và không có endpoint server.',
 '', 'Đăng nhập/session không được offline replay hoặc lưu password/session token trong receipt. POST search dùng snapshot TTL, không là GET ghi dữ liệu ngầm.',''];
 await fs.writeFile(path.join(destination,'resource-api-matrix.md'),matrix.join('\n'));
 return {endpoints:endpoints.length,entities:entities.length};
}

export async function validate(){
 const catalog=JSON.parse(await fs.readFile(path.join(destination,'resource-api.registry.json'),'utf8'));
 const model=JSON.parse(await fs.readFile(path.join(destination,'data-domain.contract.json'),'utf8'));
 const checks=[];
 const test=(name,passed)=>{checks.push({name,passed});if(!passed)throw new Error(name)};
 test('Unique method/path',new Set(catalog.endpoints.map(e=>e.method+' '+e.path)).size===catalog.endpointCount);
 test('One target namespace',catalog.endpoints.every(e=>e.path.startsWith('/api/v4/')));
 test('No generic sync write path',catalog.endpoints.filter(e=>e.module==='sync').every(e=>e.method==='GET'));
 test('GET read only',catalog.endpoints.filter(e=>e.method==='GET').every(e=>e.success===200&&e.body==='none'&&e.location===null));
 test('Creation has Location',catalog.endpoints.filter(e=>e.success===201).every(e=>e.location&&e.idempotency==='required'));
 const readingWrite = catalog.endpoints.find(e=>e.method==='PUT'&&e.path.endsWith('/reading-states/{documentId}'));
 test('Reading creation and replacement are distinct',readingWrite?.success===200&&readingWrite.creation?.status===201&&readingWrite.creation.location===readingWrite.path&&readingWrite.idempotency==='required'&&catalog.endpoints.some(e=>e.method==='GET'&&e.path===readingWrite.path));
 const replacement = catalog.endpoints.find(e=>e.method==='POST'&&e.path.endsWith('/documents/{id}/versions'));
 test('File replacement uses multipart document revision',replacement?.precondition==='baseDocumentRevision (multipart)'&&replacement.body.includes('baseDocumentRevision')&&replacement.idempotency==='required');
 test('Browser settings are local only',!catalog.endpoints.some(e=>e.path.endsWith('/preferences'))&&model.entities.find(e=>e.name==='BrowserSettings')?.store==='indexeddb');
 test('Async 202 points to job',catalog.endpoints.filter(e=>e.success===202).every(e=>e.location==='/api/v4/jobs/{jobId}'));
 test('DELETE no response body',catalog.endpoints.filter(e=>e.method==='DELETE').every(e=>e.success===204&&e.body==='none'));
 test('Sensitive sessions not replayed',catalog.endpoints.filter(e=>e.path.startsWith('/api/v4/sessions')).every(e=>e.idempotency==='none'));
 test('Updates protected by revision',catalog.endpoints.filter(e=>['PUT','PATCH'].includes(e.method)).every(e=>e.precondition.includes('If-Match')));
 test('Roles are explicit',catalog.endpoints.every(e=>['public','optional','user','admin'].includes(e.access)));
 test('Public mutations limited to identity',catalog.endpoints.filter(e=>e.access==='public'&&e.method!=='GET').every(e=>e.module==='identity'));
 test('Document and chunk embeddings distinct',model.entities.find(e=>e.name==='Embedding').rules.includes('document and chunk targets distinct'));
 test('Summary not original evidence',model.sourceRules.summaryIsDerived===true);
 test('No runtime change claimed',model.runtimeChanged===false&&catalog.runtimeVersionUnchanged===true);
 const names=new Set(model.entities.map(e=>e.name));
 test('Entity relationship targets exist',model.relationships.every(([a,b])=>names.has(a)&&names.has(b)));
 test('Raw audit data excluded from git',(await fs.readFile(path.join(root,'.gitignore'),'utf8')).includes('.local/'));
 const docs=['26-data-domain-baseline.md','27-backend-domain-baseline.md','28-design-decisions-and-verification.md'];
 const unresolved=[];
 for(const name of docs){const file=path.join(root,'docs',name),text=await fs.readFile(file,'utf8');for(const m of text.matchAll(/\]\(([^)]+)\)/g)){if(!/^(https?:|#)/.test(m[1])){try{await fs.access(path.resolve(path.dirname(file),m[1].split('#')[0]))}catch{unresolved.push(name+': '+m[1])}}}}
 test('Local document links resolve'+(unresolved.length ? ': '+unresolved.join(', ') : ''),unresolved.length===0);
 const hashes=[];for(const name of docs){hashes.push({path:'docs/'+name,sha256:createHash('sha256').update(await fs.readFile(path.join(root,'docs',name))).digest('hex')})}
 const report={date:new Date().toISOString(),designDate,kind:'design consistency only',passed:checks.length,total:checks.length,endpointCount:catalog.endpointCount,entityCount:model.entities.length,checks,hashes,runtimeTest:false,limitations:['No API routes created or executed.','No Cassandra/Mongo migration.','Catalog is not complete DTO/OpenAPI conformance validation.','No corpus replaced or new data collected.']};
 await fs.writeFile(path.join(destination,'domain-baseline-validation.json'),JSON.stringify(report,null,2)+'\n');
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--check')){
  const result=await validate();
  console.log(JSON.stringify({passed:result.passed,total:result.total,endpoints:result.endpointCount,entities:result.entityCount,runtimeTest:false},null,2));
 }else{
  console.log(JSON.stringify(await publish(),null,2));
 }
}
