import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const registry=JSON.parse(await fs.readFile(path.join(root,'docs/design/resource-api.registry.json'),'utf8'));
const schemas={};
const ref=name=>({$ref:'#/components/schemas/'+name});
const text=(min=1,max=500)=>({type:'string',minLength:min,maxLength:max});
const uuid={type:'string',format:'uuid'},date={type:'string',format:'date-time'},revision={type:'integer',minimum:1},number={type:'number'},bool={type:'boolean'};
const nullable=value=>({anyOf:[value,{type:'null'}]});
const values=(...items)=>({type:'string',enum:items});
const array=(items,maxItems=200)=>({type:'array',items,maxItems});
const object=(properties,required=Object.keys(properties),extra={})=>({type:'object',additionalProperties:false,properties,required,...extra});
const page=name=>object({items:array(ref(name)),nextCursor:nullable(text(1,4096))});
const entity=properties=>object({id:uuid,...properties,revision,updatedAt:date});
const subject=values('ai','biology','medicine','physics');
const point=object({x:number,y:number,z:number});
const sha={type:'string',pattern:'^[a-f0-9]{64}$'};
const readingPath = '/api/v4/users/me/reading-states/{documentId}';
const replacementPath = '/api/v4/documents/{id}/versions';
const versionPath = replacementPath + '/{versionId}';
schemas.Error=object({error:object({code:text(1,100),message:text(1,1000),details:array(object({path:text(0,200),reason:text(1,500)}),30)},['code','message']),requestId:uuid});
schemas.User=entity({displayName:text(1,100),email:{type:'string',format:'email',maxLength:254},role:values('user','admin')});
schemas.RegisterInput=object({email:{type:'string',format:'email',maxLength:254},password:text(12,256),displayName:text(1,100)});
schemas.ProfilePatch=object({displayName:text(1,100)},[],{minProperties:1});
schemas.LoginInput=object({email:{type:'string',format:'email',maxLength:254},password:text(1,256)});
schemas.Session=object({user:nullable(ref('User')),csrfToken:text(20,512),expiresAt:nullable(date)});
schemas.Source=object({provider:values('arxiv','openalex','pubmed','pmc','upload','curated'),externalIds:array(object({provider:text(1,30),value:text(1,300)}),10),url:nullable({type:'string',format:'uri',pattern:'^https://'}),license:nullable(text(1,500)),fetchedAt:date,rawHash:sha});
schemas.DocumentSummary=entity({kind:values('paper','study'),title:text(1,1000),authors:array(text(1,200),100),year:nullable({type:'integer',minimum:1900,maximum:2100}),subjects:{...array(subject,4),uniqueItems:true},primarySubject:nullable(subject),visibility:values('public','private','shared'),activeVersionId:nullable(uuid),coverage:values('title','abstract','fulltext'),indexStatus:values('pending','processing','ready','failed','deleting')});
const versionContent = {
 coverage:values('title','abstract','fulltext'),
 textHash:sha,
 parserRevision:text(1,100),
 activeIndexGeneration:uuid
};
const versionIdentity = {id:uuid,documentId:uuid,source:ref('Source'),jobId:nullable(uuid),createdAt:date};
schemas.PendingDocumentVersion = object({
 ...versionIdentity,
 coverage:nullable(versionContent.coverage),
 textHash:nullable(versionContent.textHash),
 parserRevision:nullable(versionContent.parserRevision),
 activeIndexGeneration:{type:'null'},
 processingStatus:values('queued','extracting','chunking','embedding','indexing','failed')
});
schemas.ReadyDocumentVersion = object({...versionIdentity,...versionContent,processingStatus:{const:'ready'}});
schemas.DocumentVersion = {oneOf:[ref('PendingDocumentVersion'),ref('ReadyDocumentVersion')]};
schemas.Document=object({...schemas.DocumentSummary.properties,abstract:nullable(text(1,20000)),summary:nullable(object({text:text(1,5000),language:text(2,20),sourceCoverage:values('title','abstract','fulltext'),generated:{type:'boolean'},generatorRevision:nullable(text(1,200)),reviewStatus:values('unreviewed','reviewed','rejected')})),activeVersion:nullable(ref('DocumentVersion'))});
schemas.DocumentPatch=object({title:text(1,1000),subjects:{...array(subject,4),uniqueItems:true},primarySubject:nullable(subject)},[],{minProperties:1});
schemas.DocumentImport=object({clientDocumentId:uuid,title:text(1,1000),file:{type:'string',format:'binary'}},['clientDocumentId','file']);
schemas.VersionImport=object({
 clientVersionId:uuid,
 baseDocumentRevision:{...revision,maximum:Number.MAX_SAFE_INTEGER,description:'Document.revision từ GET /documents/{id}. Part là chữ số thập phân nguyên dương, không có dấu, phần lẻ, số mũ hoặc khoảng trắng.'},
 file:{type:'string',format:'binary'}
});
schemas.DocumentCreated=object({document:ref('Document'),jobId:uuid,processingStatus:{const:'queued'}});
schemas.QueuedDocumentVersion = object({...schemas.PendingDocumentVersion.properties,processingStatus:{const:'queued'},jobId:uuid});
schemas.VersionCreated=object({version:ref('QueuedDocumentVersion'),jobId:uuid,processingStatus:{const:'queued'}});
schemas.Chunk=object({id:uuid,documentId:uuid,versionId:uuid,ordinal:{type:'integer',minimum:0},text:text(1,20000),page:nullable({type:'integer',minimum:1}),section:nullable(text(1,300)),start:{type:'integer',minimum:0},end:{type:'integer',minimum:0},textHash:sha});
schemas.SearchFilters=object({kinds:{...array(values('paper','study'),2),uniqueItems:true},subjects:{...array(subject,4),uniqueItems:true},yearFrom:{type:'integer',minimum:1900,maximum:2100},yearTo:{type:'integer',minimum:1900,maximum:2100},collectionId:uuid,documentIds:{...array(uuid,100),uniqueItems:true}},[]);
schemas.SearchInput=object({queryId:uuid,query:text(2,300),topK:{type:'integer',minimum:1,maximum:20},filters:ref('SearchFilters')});
schemas.Evidence=object({id:{type:'string',pattern:'^E[1-9][0-9]*$'},documentId:uuid,versionId:uuid,chunkId:uuid,quote:text(1,20000),page:nullable({type:'integer',minimum:1}),section:nullable(text(1,300)),start:{type:'integer',minimum:0},end:{type:'integer',minimum:0},cosine:{type:'number',minimum:-1,maximum:1}});
schemas.SearchHit=object({document:ref('DocumentSummary'),evidence:{...array(ref('Evidence'),3),minItems:1},cosine:{type:'number',minimum:-1,maximum:1},rankScore:number,point:nullable(point)});
schemas.Search=object({id:uuid,queryId:uuid,query:text(2,300),filters:ref('SearchFilters'),origin:{const:'server'},coverage:{const:'server'},hits:array(ref('SearchHit'),20),rankingProfile:values('dense','hybrid','hybrid-rerank'),modelRevision:text(1,200),pipelineRevision:text(1,200),projectionRevision:text(1,200),durationMs:{type:'number',minimum:0},expiresAt:date,warnings:array(text(1,1000),30)});
schemas.Graph=object({projectionRevision:text(1,200),nodes:array(object({documentId:uuid,point}),200),edges:array(object({from:uuid,to:uuid,cosine:{type:'number',minimum:-1,maximum:1}}),400)});
schemas.AnswerInput=object({searchId:uuid});
schemas.AcceptedJob=object({jobId:uuid,resourceId:uuid,status:values('queued','running')});
schemas.Answer=object({id:uuid,searchId:uuid,status:values('queued','running','succeeded','failed'),mode:values('pending','grounded-generation','extractive','insufficient'),claims:array(object({text:text(1,5000),evidenceIds:array(text(1,20),6)}),6),evidence:array(ref('Evidence'),6),warnings:array(text(1,1000),30),updatedAt:date});
schemas.Job=object({id:uuid,kind:values('ingestion','answer','dataset-import','reindex','cleanup'),resourceId:uuid,status:values('queued','running','succeeded','failed'),stage:text(1,100),attempt:{type:'integer',minimum:0},error:nullable(object({code:text(1,100),message:text(1,1000)})),updatedAt:date});
schemas.Bookmark=entity({documentId:uuid,saved:{const:true}});
schemas.BookmarkPut=object({saved:{const:true}});
schemas.Collection=entity({name:text(1,100)});
schemas.CollectionInput=object({id:uuid,name:text(1,100)});
schemas.CollectionPatch=object({name:text(1,100)});
schemas.CollectionItem=entity({collectionId:uuid,documentId:uuid,present:{const:true}});
schemas.CollectionItemPut=object({present:{const:true}});
schemas.Note=entity({documentId:uuid,versionId:nullable(uuid),chunkId:nullable(uuid),text:text(1,20000),anchorStatus:values('current','outdated','unanchored')});
schemas.NoteInput=object({id:uuid,documentId:uuid,versionId:uuid,chunkId:uuid,text:text(1,20000)},['id','documentId','text']);
schemas.NotePatch=object({text:text(1,20000)});
schemas.History=entity({queryId:uuid,query:text(2,300),filters:ref('SearchFilters')});
schemas.HistoryInput=object({id:uuid,queryId:uuid,query:text(2,300),filters:ref('SearchFilters')});
schemas.ReadingState=entity({documentId:uuid,versionId:uuid,chunkId:nullable(uuid),page:nullable({type:'integer',minimum:1}),progress:{type:'number',minimum:0,maximum:1}});
schemas.ReadingStatePut=object({versionId:uuid,chunkId:nullable(uuid),page:nullable({type:'integer',minimum:1}),progress:{type:'number',minimum:0,maximum:1}},['versionId','progress']);
schemas.DatasetInput=object({manifestId:text(1,100)});
schemas.Dataset=entity({datasetVersion:text(1,200),status:values('queued','processing','ready','failed'),manifestHash:sha,accepted:{type:'integer',minimum:0},rejected:{type:'integer',minimum:0}});
schemas.DatasetCreated=object({dataset:ref('Dataset'),jobId:uuid,processingStatus:{const:'queued'}});
schemas.ReindexInput=object({targetModelRevision:text(1,200),pipelineRevision:text(1,200)});
schemas.Health=object({status:values('ok','degraded','unavailable')});
schemas.Capabilities=object({apiVersion:{const:'4'},features:array(text(1,100),100),modelRevision:text(1,200),pipelineRevision:text(1,200),projectionRevision:text(1,200),limits:object({searchBodyBytes:{const:8192},jsonBodyBytes:{const:65536},uploadFileBytes:{const:20971520},uploadBodyBytes:{const:22020096},pageSizeMax:{const:200},filterIdsMax:{const:100}})});
for(const name of ['DocumentSummary','Chunk','Bookmark','Collection','CollectionItem','Note','History','ReadingState'])schemas[name+'Page']=page(name);
const syncTypes=[['document','DocumentSummary'],['bookmark','Bookmark'],['collection','Collection'],['collectionItem','CollectionItem'],['note','Note'],['history','History'],['readingState','ReadingState']];
schemas.Change={oneOf:syncTypes.flatMap(([kind,value])=>[
 object({id:uuid,entityType:{const:kind},entityId:uuid,revision,action:{const:'PUT'},value:ref(value)}),
 object({id:uuid,entityType:{const:kind},entityId:uuid,revision,action:values('DELETE','REVOKE'),value:{type:'null'}})
])};
schemas.ChangePage=object({changes:array(ref('Change')),nextCursor:text(1,4096),hasMore:bool});
schemas.BootstrapPage=object({records:array(ref('Change')),baseCursor:text(1,4096),snapshotToken:text(1,4096),nextCursor:nullable(text(1,4096))});

const mapping={};
const use=(method,route,input,output)=>mapping[method+' /api/v4'+route]={input,output};
use('POST','/users','RegisterInput','User');use('GET','/users/me',null,'User');use('PATCH','/users/me','ProfilePatch','User');
use('POST','/sessions','LoginInput','Session');use('GET','/sessions/current',null,'Session');use('DELETE','/sessions/current',null,null);
use('GET','/documents',null,'DocumentSummaryPage');use('POST','/documents','DocumentImport','DocumentCreated');use('GET','/documents/{id}',null,'Document');use('PATCH','/documents/{id}','DocumentPatch','Document');use('DELETE','/documents/{id}',null,null);
use('GET','/documents/{id}/chunks',null,'ChunkPage');use('GET','/documents/{id}/source',null,'binary');use('GET','/documents/{id}/neighbors',null,'DocumentSummaryPage');use('POST','/documents/{id}/versions','VersionImport','VersionCreated');use('GET','/documents/{id}/versions/{versionId}',null,'DocumentVersion');
use('GET','/documents/{id}/versions/{versionId}/chunks',null,'ChunkPage');
use('GET','/documents/{id}/versions/{versionId}/source',null,'binary');
use('POST','/searches','SearchInput','Search');use('GET','/searches/{id}',null,'Search');use('GET','/graph',null,'Graph');
use('POST','/answers','AnswerInput','AcceptedJob');use('GET','/answers/{id}',null,'Answer');use('GET','/jobs/{id}',null,'Job');
use('GET','/users/me/bookmarks',null,'BookmarkPage');use('PUT','/users/me/bookmarks/{documentId}','BookmarkPut','Bookmark');use('DELETE','/users/me/bookmarks/{documentId}',null,null);
use('GET','/collections',null,'CollectionPage');use('POST','/collections','CollectionInput','Collection');use('GET','/collections/{id}',null,'Collection');use('PATCH','/collections/{id}','CollectionPatch','Collection');use('DELETE','/collections/{id}',null,null);use('PUT','/collections/{id}/items/{documentId}','CollectionItemPut','CollectionItem');use('DELETE','/collections/{id}/items/{documentId}',null,null);
use('GET','/notes',null,'NotePage');use('POST','/notes','NoteInput','Note');use('GET','/notes/{id}',null,'Note');use('PATCH','/notes/{id}','NotePatch','Note');use('DELETE','/notes/{id}',null,null);
use('GET','/users/me/search-history',null,'HistoryPage');use('POST','/users/me/search-history','HistoryInput','History');use('GET','/users/me/search-history/{id}',null,'History');use('DELETE','/users/me/search-history/{id}',null,null);
use('GET','/users/me/reading-states',null,'ReadingStatePage');
use('GET','/users/me/reading-states/{documentId}',null,'ReadingState');
use('PUT','/users/me/reading-states/{documentId}','ReadingStatePut','ReadingState');
use('GET','/sync/bootstrap',null,'BootstrapPage');use('GET','/sync/changes',null,'ChangePage');use('GET','/capabilities',null,'Capabilities');use('GET','/health/live',null,'Health');use('GET','/health/ready',null,'Health');
use('POST','/datasets','DatasetInput','DatasetCreated');use('GET','/datasets/{id}',null,'Dataset');use('POST','/documents/{id}/index-jobs','ReindexInput','AcceptedJob');

const parameter=(name,schema,description,required=false,location='query')=>({name,in:location,required,schema,description});
const errorDescriptions={400:'JSON không hợp lệ',401:'Cần xác thực',403:'Không có quyền',404:'Không tồn tại hoặc không được tiết lộ',409:'Conflict nghiệp vụ hoặc key/payload không khớp',410:'Search/cursor hết hạn',412:'Revision không còn khớp',413:'Vượt giới hạn byte',415:'Media type không hỗ trợ',422:'DTO/range/quan hệ field sai',428:'Thiếu precondition',429:'Vượt giới hạn request/quota',503:'Dependency chưa sẵn sàng'};
const paths={};
for(const ep of registry.endpoints){
 const contract=mapping[ep.method+' '+ep.path];if(!contract)throw Error('Missing DTO: '+ep.method+' '+ep.path);
 const parameters=[...ep.path.matchAll(/\{([^}]+)\}/g)].map(m=>parameter(m[1],uuid,'ID tài nguyên trong path',true,'path'));
 const mutation=ep.method!=='GET';
 const readingWrite = ep.path === readingPath && ep.method === 'PUT';
 if(ep.idempotency==='required')parameters.push(parameter('Idempotency-Key',uuid,'Giữ cùng key/body/precondition khi retry; principal/path/method ràng buộc receipt.',true,'header'));
 if(ep.precondition==='If-Match')parameters.push(parameter('If-Match',text(3,100),'ETag revision hiện tại, ví dụ "1".',true,'header'));
 if(ep.precondition.includes('If-None-Match'))parameters.push(parameter('If-Match',text(3,100),'Bắt buộc khi cập nhật; chỉ gửi một trong If-Match và If-None-Match.',false,'header'),parameter('If-None-Match',{const:'*'},'Dùng khi tạo qua PUT; không gửi cùng If-Match.',false,'header'));
 if(mutation)parameters.push(parameter('X-CSRF-Token',text(20,512),'Bắt buộc khi sử dụng cookie; pre-auth/login/register kiểm Origin và token theo policy. Không lưu token vào outbox.',false,'header'));
 const pageable=contract.output?.endsWith('Page');
 if(ep.method==='GET'&&pageable)parameters.push(parameter('limit',{type:'integer',minimum:1,maximum:200,default:20},'Giới hạn bản ghi'),parameter('cursor',text(1,4096),'Opaque, ràng buộc scope/filter/sort'));
 if(ep.path===versionPath+'/chunks')parameters.push(parameter('fromChunkId',uuid,'Bao gồm chunk này ở đầu trang; chỉ gửi khi không có cursor. Cursor ràng buộc documentId và versionId.'));
 if(ep.method==='GET'&&['/api/v4/documents','/api/v4/documents/{id}/neighbors'].includes(ep.path))parameters.push(parameter('kind',values('paper','study'),'Loại tài liệu'),parameter('subject',subject,'Chủ đề'),parameter('yearFrom',{type:'integer',minimum:1900,maximum:2100},'Năm bắt đầu'),parameter('yearTo',{type:'integer',minimum:1900,maximum:2100},'Năm kết thúc, không nhỏ hơn yearFrom'),parameter('sort',values('updatedAt:desc','year:desc','title:asc'),'Whitelist thứ tự; id là tie-breaker'),{...parameter('ids',{type:'array',items:uuid,minItems:1,maxItems:100,uniqueItems:true},'Đọc nhiều ID đã biết, vẫn kiểm quyền từng bản ghi'),style:'form',explode:false});
 if(ep.method==='GET'&&ep.path==='/api/v4/notes')parameters.push(parameter('documentId',uuid,'Lọc ghi chú theo tài liệu'));
 if(ep.path.startsWith('/api/v4/sync/'))parameters.push(parameter('scope',values('public','personal'),'personal cần session hợp lệ',true));
 if(ep.path==='/api/v4/sync/changes'){const c=parameters.find(p=>p.name==='cursor');c.required=true;}
 if(ep.path==='/api/v4/sync/bootstrap')parameters.push(parameter('snapshotToken',text(1,4096),'Giữ nguyên token khi tải trang tiếp'));
 if(ep.path==='/api/v4/graph')parameters.push({...parameter('documentIds',{type:'array',items:uuid,minItems:1,maxItems:100,uniqueItems:true},'Node trong phạm vi được phép',true),style:'form',explode:false},parameter('projectionRevision',text(1,200),'Phép chiếu phải cùng phiên bản với node/query',true));
 const headers={'X-Request-Id':{schema:uuid,description:'ID kiểm trace, không chứa secret'},'Cache-Control':{schema:text(1,100),description:'private, no-store cho dữ liệu tài khoản'}};
 if(ep.location)headers.Location={schema:{type:'string'},description:ep.location};
 const versionResource = ep.path === replacementPath || ep.path.startsWith(versionPath);
 if((ep.success===200||ep.success===201)&&!readingWrite&&!versionResource)headers.ETag={schema:text(3,100),description:'Nếu response có revision, trả strong entity ETag. Không dùng ETag entity giả cho list/search/job.'};
 if(ep.method==='POST'&&ep.path==='/api/v4/sessions')headers['Set-Cookie']={schema:{type:'string'},description:'Opaque session HttpOnly/Secure/SameSite, không trả raw token trong JSON.'};
 const success={description:ep.success===201?'Resource đã tạo; processingStatus có thể queued.':ep.success===202?'Job được nhận, chưa hoàn tất tác vụ.':ep.success===204?'Đã logical delete/thu hồi, không body.':'Representation đúng contract.',headers};
 if(contract.output)success.content=contract.output==='binary'?{'application/octet-stream':{schema:{type:'string',format:'binary'}}}:{'application/json':{schema:ref(contract.output)}};
 const responses={[ep.success]:success};for(const[code,description]of Object.entries(errorDescriptions))responses[code]={description,headers:{'X-Request-Id':headers['X-Request-Id'],...(code==='429'?{'Retry-After':{schema:{type:'string'},description:'Thời gian chờ theo HTTP'}}:{})},content:{'application/json':{schema:ref('Error')}}};
 if(ep.creation)responses[ep.creation.status]={
  ...success,
  description:'Mốc đọc mới được tạo; body chứa revision.',
  headers:{...headers,Location:{required:true,schema:{type:'string'},description:ep.creation.location}}
 };
 if(readingWrite){
  success.description='Mốc đọc đã cập nhật; body chứa revision. Lấy ETag bằng GET mốc.';
  responses[404].description='Tài liệu hoặc phiên bản không tồn tại, phiên bản thuộc tài liệu khác, hoặc principal không được phép đọc.';
  responses[422].description='DTO, tiến độ hoặc mốc trang/chunk không hợp lệ trên phiên bản đã được xác thực.';
 }
 if(ep.path===replacementPath){
  delete responses[412];
  responses[409].description='Revision Document đã cũ, key được dùng với fingerprint khác, hoặc clientVersionId xung đột.';
  responses[422].description='baseDocumentRevision sai kiểu, sai định dạng, ngoài miền giá trị hoặc dữ liệu nhập không hợp lệ.';
  responses[428].description='Thiếu part baseDocumentRevision.';
 }
 for(const [code,codes] of Object.entries(ep.errorCodes??{}))responses[code]['x-error-codes']=codes;
 if(ep.path==='/api/v4/health/ready')responses[503]={description:'Tiến trình sống nhưng chưa phục vụ đầy đủ dependency',content:{'application/json':{schema:ref('Health')}}};
 const op={operationId:ep.id.replaceAll(/[^a-zA-Z0-9_]/g,'_'),tags:[ep.module],summary:ep.description,description:'Thiết kế đích; chưa triển khai route runtime. Quyền và lỗi kiểm ở resource policy, không chỉ middleware.',parameters,responses,security:ep.access==='public'?[]:ep.access==='optional'?[{}, {sessionCookie:[]}]:[{sessionCookie:[]}],'x-required-access':ep.access,'x-design-only':true,'x-body-limit-bytes':contract.input==='DocumentImport'||contract.input==='VersionImport'?22020096:contract.input==='SearchInput'?8192:65536};
 if(ep.policy)op.description=ep.policy;
 if(contract.input)op.requestBody={required:true,content:{[contract.input.endsWith('Import')?'multipart/form-data':'application/json']:{schema:ref(contract.input)}}};
 if(contract.input==='SearchInput')op['x-cross-field-rules']=['trim query before length validation','yearFrom <= yearTo','collection/document filters must be authorized','same model/pipeline/projection manifest'];
 if(contract.input==='NoteInput')op['x-cross-field-rules']=['chunkId requires versionId','chunk belongs to version and document','document readable by principal'];
 if(ep.precondition.includes('If-None-Match'))op['x-cross-field-rules']=['exactly one of If-Match and If-None-Match:*','receipt lookup before replay precondition'];
 if(readingWrite)op['x-cross-field-rules'].push(
  'If-None-Match: * creates with 201 and Location; If-Match updates with 200',
  'validate document/version linkage and access as 404 before checking anchors and progress as 422',
  'omitted chunkId/page clear the anchor fields; if both are present they must agree'
 );
 if(ep.path===replacementPath)op['x-cross-field-rules']=[
  'authorize current owner, then check receipt before comparing Document.revision',
  'fingerprint includes normalized baseDocumentRevision, clientVersionId and file content hash',
  'missing baseDocumentRevision: 428; invalid revision: 422; stale revision: 409',
  'commit new version, job, receipt and latestReplacementVersionId with a Document revision bump',
  'response jobId and version.jobId must match'
 ];
 if(ep.path===versionPath+'/chunks')op['x-cross-field-rules']=['fromChunkId and cursor are mutually exclusive','chunk and cursor must belong to the selected version'];
 (paths[ep.path]??={})[ep.method.toLowerCase()]=op;
}

const examples={
 collectionInput:{id:'3fb04de2-07c1-4846-80f6-28ae11616b5a',name:'AI y tế'},
 collection:{id:'3fb04de2-07c1-4846-80f6-28ae11616b5a',name:'AI y tế',revision:1,updatedAt:'2026-11-13T03:00:00Z'},
 searchInput:{queryId:'1a4e4c4a-990c-4c89-9682-87bd97840c56',query:'Phương pháp giảm quá khớp khi học sâu',topK:12,filters:{kinds:['paper','study']}},
 error:{error:{code:'REVISION_MISMATCH',message:'Ghi chú đã có phiên bản mới. Bản nháp cục bộ được giữ để đối chiếu.'},requestId:'4e4ea11e-c826-48cc-9c37-6937559b1068'}
};
const documentId = '10000000-0000-4000-8000-000000000001';
const versionId = '20000000-0000-4000-8000-000000000002';
const jobId = '50000000-0000-4000-8000-000000000001';
const readingInput = {versionId:'20000000-0000-4000-8000-000000000001',page:12,progress:0.42};
const readingState = {
 id:'30000000-0000-4000-8000-000000000001',documentId,chunkId:null,...readingInput,
 revision:1,updatedAt:'2026-11-14T08:30:00Z'
};
const queuedVersion = {
 id:versionId,documentId,jobId,createdAt:'2026-11-14T08:35:00Z',
 source:{provider:'upload',externalIds:[],url:null,license:null,fetchedAt:'2026-11-14T08:35:00Z',rawHash:'a'.repeat(64)},
 coverage:null,textHash:null,parserRevision:null,activeIndexGeneration:null,processingStatus:'queued'
};
const readyVersion = {
 ...queuedVersion,coverage:'fulltext',textHash:'b'.repeat(64),parserRevision:'pdf-text-1',
 activeIndexGeneration:'60000000-0000-4000-8000-000000000001',processingStatus:'ready'
};
paths[readingPath].put.requestBody.content['application/json'].example=readingInput;
paths[readingPath].put.responses[201].content['application/json'].example=readingState;
paths[readingPath].put.responses[200].content['application/json'].example={...readingState,revision:2};
paths[readingPath].get.responses[200].content['application/json'].example=readingState;
paths[readingPath].get.responses[200].headers.ETag={
 required:true,schema:text(3,100),
 description:'Strong ETag của mốc (ví dụ "1"). Dùng giá trị này trong If-Match của PUT tiếp theo.'
};
paths[replacementPath].post.requestBody.content['multipart/form-data'].example={
 clientVersionId:versionId,baseDocumentRevision:7,file:'<bytes PDF>'
};
paths[replacementPath].post.responses[201].content['application/json'].example={
 version:queuedVersion,jobId,processingStatus:'queued'
};
paths[versionPath].get.responses[200].content['application/json'].examples={
 queued:{value:queuedVersion},ready:{value:readyVersion}
};
paths[replacementPath].post.responses[409].content['application/json'].example={
 error:{code:'DOCUMENT_REVISION_MISMATCH',message:'Đọc lại tài liệu để lấy revision hiện tại.'},
 requestId:examples.error.requestId
};
paths[readingPath].put.responses[404].content['application/json'].example={
 error:{code:'DOCUMENT_VERSION_NOT_FOUND',message:'Không tìm thấy phiên bản trong tài liệu này.'},
 requestId:examples.error.requestId
};
paths[readingPath].put.responses[422].content['application/json'].example={
 error:{code:'INVALID_READING_ANCHOR',message:'Vị trí không hợp lệ trong phiên bản đã chọn.'},
 requestId:examples.error.requestId
};
paths['/api/v4/collections'].post.requestBody.content['application/json'].example=examples.collectionInput;
paths['/api/v4/collections'].post.responses[201].content['application/json'].example=examples.collection;
paths['/api/v4/searches'].post.requestBody.content['application/json'].example=examples.searchInput;
schemas.Error.examples=[examples.error];

export const api={openapi:'3.1.0',info:{title:'Paper Magic — software API contract',version:`4.0.0-design-${registry.date}`,description:'Thiết kế đích theo baseline 26–29. FR24 dùng thiết lập theo hồ sơ trình duyệt.'},servers:[{url:'https://paper-magic.example',description:'Placeholder HTTPS443, không phải host đã triển khai'}],tags:[...new Set(registry.endpoints.map(e=>e.module))].map(name=>({name})),paths,components:{securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'__Host-pm_session',description:'Cookie opaque, HttpOnly/Secure/SameSite. Role và resource ownership vẫn kiểm trong service.'}},schemas}};

export async function write(){
 if(Object.keys(mapping).length!==registry.endpointCount)throw Error('DTO mapping and registry counts differ');
 const ids=Object.values(paths).flatMap(p=>Object.values(p)).map(o=>o.operationId);if(new Set(ids).size!==ids.length)throw Error('Duplicate operationId');
 await fs.writeFile(path.join(root,'docs/design/software-api.openapi.json'),JSON.stringify(api,null,2)+'\n');
 return {operations:ids.length,paths:Object.keys(paths).length,schemas:Object.keys(schemas).length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await write(),null,2));
