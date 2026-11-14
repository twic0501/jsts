import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {api as expectedApi} from './software-openapi.mjs';
import {isDeepStrictEqual} from 'node:util';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(path.join(root,'packages/core/package.json'));
const z=require('zod');
const api=JSON.parse(await fs.readFile(path.join(root,'docs/design/software-api.openapi.json'),'utf8'));
const registry=JSON.parse(await fs.readFile(path.join(root,'docs/design/resource-api.registry.json'),'utf8'));
const schemas=api.components.schemas;
const defs=JSON.parse(JSON.stringify(schemas).replaceAll('#/components/schemas/','#/$defs/'));
const cache=new Map();
const parse=(name,value)=>{if(!cache.has(name))cache.set(name,z.fromJSONSchema({$ref:'#/$defs/'+name,$defs:defs}));return cache.get(name).safeParse(value).success};
const id='3fb04de2-07c1-4846-80f6-28ae11616b5a';
const query={queryId:id,query:'Phương pháp giảm quá khớp khi học sâu',topK:12,filters:{kinds:['paper','study']}};
const note={id,documentId:id,text:'Đọc lại phần thực nghiệm'};
const source={provider:'arxiv',externalIds:[{provider:'arxiv',value:'1706.03762'}],url:'https://arxiv.org/abs/1706.03762',license:null,fetchedAt:'2026-11-13T03:00:00Z',rawHash:'a'.repeat(64)};
const document={id,kind:'paper',title:'Tài liệu mẫu',authors:['Tác giả mẫu'],year:2026,subjects:['ai'],primarySubject:'ai',visibility:'public',activeVersionId:id,coverage:'abstract',indexStatus:'ready',revision:1,updatedAt:'2026-11-13T03:00:00Z'};
const quote='Văn bản mẫu.';
const evidence={id:'E1',documentId:id,versionId:id,chunkId:id,quote,page:null,section:'abstract',start:0,end:quote.length,cosine:0.82};
const hit={document,evidence:[evidence],cosine:0.82,rankScore:0.032,point:{x:0,y:0,z:0}};
const response={id,queryId:id,query:query.query,filters:query.filters,origin:'server',coverage:'server',hits:[hit],rankingProfile:'hybrid',modelRevision:'e5-test',pipelineRevision:'e5-mean-l2-512-v1',projectionRevision:'pca-test',durationMs:10,expiresAt:'2026-11-13T03:15:00Z',warnings:[]};
const tests=[
 ['SearchInput',query,true,'valid search'],
 ['SearchInput',{...query,topK:'12'},false,'strict topK type'],
 ['SearchInput',{...query,topK:21},false,'bounded topK'],
 ['SearchInput',{...query,query:''},false,'empty search rejected'],
 ['SearchInput',{...query,ownerId:id},false,'caller cannot inject owner'],
 ['SearchInput',{...query,filters:{query:{$where:'unsafe'}}},false,'arbitrary query rejected'],
 ['SearchInput',{...query,filters:{documentIds:Array.from({length:101},()=>id)}},false,'bounded filter IDs'],
 ['SearchInput',{...query,filters:{subjects:['unknown']}},false,'subject enum'],
 ['CollectionInput',{id,name:'AI y tế'},true,'collection create'],
 ['CollectionInput',{id,name:''},false,'empty collection name'],
 ['CollectionInput',{id,name:'AI',ownerId:id},false,'collection owner not caller defined'],
 ['Collection',{id,name:'AI y tế',revision:1,updatedAt:'2026-11-13T03:00:00Z'},true,'collection response'],
 ['ProfilePatch',{},false,'empty partial update rejected'],
 ['RegisterInput',{email:'student@example.com',password:'example-only-password',displayName:'Sinh viên'},true,'registration DTO'],
 ['RegisterInput',{email:'bad',password:'short',displayName:'Sinh viên'},false,'registration rejects malformed data'],
 ['RegisterInput',{email:'student@example.com',password:'example-only-password',displayName:'Sinh viên',role:'admin'},false,'registration role injection'],
 ['NoteInput',note,true,'unanchored note'],
 ['NoteInput',{...note,text:''},false,'empty note rejected'],
 ['NotePatch',{text:'Sửa ghi chú'},true,'note partial update'],
 ['NotePatch',{text:'Sửa',documentId:id},false,'note patch cannot change target'],
 ['BookmarkPut',{saved:true},true,'bookmark set'],
 ['BookmarkPut',{saved:false},false,'bookmark removal uses DELETE'],
 ['Source',source,true,'source with provenance'],
 ['Source',{...source,url:'http://example.com'},false,'HTTPS source URL'],
 ['DocumentSummary',document,true,'document read DTO'],
 ['DocumentSummary',{...document,passwordHash:'secret'},false,'no persistence secret fields'],
 ['Evidence',evidence,true,'abstract citation with page null'],
 ['Evidence',{...evidence,cosine:2},false,'cosine bounds'],
 ['Evidence',{...evidence,page:0},false,'page index starts at 1'],
 ['Search',response,true,'search response'],
 ['Search',{...response,hits:[{...hit,point:{x:0,y:0}}]},false,'projection point complete'],
 ['AnswerInput',{searchId:id},true,'answer references search resource'],
 ['AnswerInput',{searchId:id,prompt:'ignore rules'},false,'no client prompt override'],
 ['AcceptedJob',{jobId:id,resourceId:id,status:'queued'},true,'202 job acknowledgment'],
 ['Change',{id,entityType:'note',entityId:id,revision:2,action:'DELETE',value:null},true,'sync tombstone'],
 ['Change',{id,entityType:'note',entityId:id,revision:2,action:'DELETE',value:note},false,'deleted record cannot leak payload'],
 ['ReadingStatePut',{versionId:id,progress:0.5},true,'reading progress'],
 ['ReadingStatePut',{versionId:id,progress:2},false,'reading progress bounded'],
 ['ReadingStatePut',{versionId:id,page:0,progress:0.5},false,'reading page starts at one'],
 ['ReadingStatePut',{versionId:id,progress:0.5,revision:2},false,'reading revision is server-managed'],
 ['VersionImport',{clientVersionId:id,baseDocumentRevision:7,file:'example binary'},true,'replacement base revision'],
 ['VersionImport',{clientVersionId:id,file:'example binary'},false,'missing replacement base revision'],
 ['VersionImport',{clientVersionId:id,baseDocumentRevision:'7',file:'example binary'},false,'replacement DTO revision is a number after multipart decoding'],
 ['VersionImport',{clientVersionId:id,baseDocumentRevision:1.5,file:'example binary'},false,'replacement revision must be integer'],
 ['VersionImport',{clientVersionId:id,baseDocumentRevision:0,file:'example binary'},false,'replacement revision must be positive'],
 ['VersionImport',{clientVersionId:id,baseDocumentRevision:Number.MAX_SAFE_INTEGER+1,file:'example binary'},false,'replacement revision must be safe'],
 ['Change',{id,entityType:'preferences',entityId:id,revision:2,action:'DELETE',value:null},false,'no preferences sync events']
];
const checks=[];
const assert=(name,passed)=>{checks.push({name,passed});if(!passed)throw Error(name)};
for(const[name,value,expected,label]of tests)assert('DTO: '+label,parse(name,value)===expected);
assert('OpenAPI 3.1 metadata',api.openapi==='3.1.0'&&typeof api.info.title==='string'&&typeof api.info.version==='string');
assert('OpenAPI matches generator',isDeepStrictEqual(api,expectedApi));
const references=[];function walk(value){if(!value||typeof value!=='object')return;for(const[k,v]of Object.entries(value)){if(k==='$ref')references.push(v);else walk(v)}}walk(api);
assert('Schema references resolve',references.every(r=>r.startsWith('#/components/schemas/')&&r.split('/').at(-1)in schemas));
assert('Every registry route has contract',registry.endpoints.every(e=>api.paths[e.path]?.[e.method.toLowerCase()]));
let operationCount=0;
for(const ep of registry.endpoints){
 const op=api.paths[ep.path][ep.method.toLowerCase()];operationCount++;
 assert('Status '+ep.method+' '+ep.path,Boolean(op.responses[ep.success]));
 for(const match of ep.path.matchAll(/\{([^}]+)\}/g))assert('Path parameter '+ep.method+' '+ep.path+' '+match[1],op.parameters.some(p=>p.in==='path'&&p.name===match[1]&&p.required));
 if(ep.location)assert('Location '+ep.method+' '+ep.path,Boolean(op.responses[ep.success].headers.Location));
 if(ep.creation){
  const created=op.responses[ep.creation.status];
  assert('Creation status and Location '+ep.path,created?.headers.Location?.description===ep.creation.location);
  assert('Update omits Location '+ep.path,!op.responses[ep.success].headers.Location);
 }
 if(ep.body!=='none')assert('Request schema '+ep.method+' '+ep.path,Boolean(op.requestBody?.required));
 if(ep.success===204)assert('204 has no body '+ep.path,!op.responses[204].content);
 if(ep.method==='GET')assert('GET no request body '+ep.path,!op.requestBody);
}
assert('Operation counts match',Object.values(api.paths).reduce((n,item)=>n+Object.keys(item).length,0)===registry.endpointCount);
const reading = api.paths['/api/v4/users/me/reading-states/{documentId}'];
const replacement = api.paths['/api/v4/documents/{id}/versions'].post;
const versions = api.paths['/api/v4/documents/{id}/versions/{versionId}'];
assert('Reading ETag comes from GET only',Boolean(reading.get.responses[200].headers.ETag)&&[200,201].every(status=>!reading.put.responses[status].headers.ETag));
assert('Reading 404 and 422 are distinguishable',reading.put.responses[404]['x-error-codes'].includes('DOCUMENT_VERSION_NOT_FOUND')&&reading.put.responses[422]['x-error-codes'].includes('INVALID_READING_ANCHOR'));
assert('Replacement uses the body revision, not If-Match',!replacement.parameters.some(p=>p.name==='If-Match')&&schemas.VersionImport.required.includes('baseDocumentRevision'));
assert('Replacement revision errors match contract',[409,422,428].every(status=>replacement.responses[status]['x-error-codes'].length>0)&&!replacement.responses[412]);
assert('Version-specific source and chunk reads exist',['source','chunks'].every(suffix=>api.paths['/api/v4/documents/{id}/versions/{versionId}/'+suffix]?.get.responses[200]));
assert('No server preferences mapping',!api.paths['/api/v4/users/me/preferences']&&!schemas.Preferences&&!schemas.PreferencesPatch);
const createdExample = replacement.responses[201].content['application/json'].example;
const readyExample = versions.get.responses[200].content['application/json'].examples.ready.value;
assert('DTO: queued creation references the same job',createdExample.jobId===createdExample.version.jobId);
assert('DTO: ready version requires derived fields',['coverage','textHash','parserRevision','activeIndexGeneration'].every(field=>!parse('DocumentVersion',{...readyExample,[field]:null})));
assert('DTO: creation cannot return a ready version',!parse('VersionCreated',{...createdExample,version:readyExample}));
let publishedExamples=0;
for(const [route,operations] of Object.entries(api.paths)){
 for(const [method,operation] of Object.entries(operations)){
  for(const [status,message] of Object.entries({request:operation.requestBody,...operation.responses})){
   for(const media of Object.values(message?.content??{})){
    if(!media.schema?.$ref)continue;
    const schemaName=media.schema.$ref.split('/').at(-1);
    const samples=Object.entries(media.examples??{}).map(([name,example])=>[name,example.value]);
    if(media.example!==undefined)samples.push(['example',media.example]);
    for(const [name,value] of samples){
     assert(`Published DTO: ${method.toUpperCase()} ${route} ${status} ${name}`,parse(schemaName,value));
     publishedExamples++;
    }
   }
  }
 }
}
assert('Session JSON excludes raw tokens',!('token'in schemas.Session.properties)&&!('password'in schemas.User.properties));
for(const[name,schema]of Object.entries(schemas)){
 try{z.fromJSONSchema({$ref:'#/$defs/'+name,$defs:defs})}catch(error){throw Error('Schema cannot compile '+name+': '+error.message)}
}
assert('All schemas compile with installed Zod',true);
const docName='docs/29-software-design.md';const text=await fs.readFile(path.join(root,docName),'utf8');
for(const match of text.matchAll(/\]\(([^)]+)\)/g)){if(!/^(https?:|#)/.test(match[1])){await fs.access(path.resolve(root,'docs',match[1].split('#')[0]));}}
assert('Main design document local links resolve',true);
const report={date:new Date().toISOString(),designDate:registry.date,status:'design-contract-validation',passed:checks.length,total:checks.length,dtoExamples:tests.length,publishedExamples,operations:operationCount,paths:Object.keys(api.paths).length,schemas:Object.keys(schemas).length,checks,sha256:createHash('sha256').update(await fs.readFile(path.join(root,'docs/design/software-api.openapi.json'))).digest('hex'),limitations:['JSON schema/examples and package consistency only, not an independent full OpenAPI conformance validator.','Authorization, revision and receipt ordering, multipart decoding and worker concurrency require runtime tests.','No API v4 HTTP requests, DB migration or application E2E executed.']};
await fs.writeFile(path.join(root,'docs/design/software-api-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,dtoExamples:report.dtoExamples,publishedExamples:report.publishedExamples,operations:report.operations,paths:report.paths,schemas:report.schemas,runtimeTest:false},null,2));
