import fs from'node:fs/promises';
import{createHash}from'node:crypto';
const evidence=JSON.parse(await fs.readFile('docs/verification-online.json','utf8'));
for(const module of[
 {folder:'packages/core',files:['src/contracts.ts','src/online.ts','src/index.ts'],work:'Generalized paper IDs and trusted source links, online response/input contract, paired vector/corpus merge.'},
 {folder:'apps/api',files:['lib/embedding.ts','lib/embedding-worker.mjs','app/api/v2/search/route.ts'],work:'Batch passage/query E5 in Node worker;bounded v2 route, no Python.'},
 {folder:'apps/api/lib/online',files:['providers.ts','search.ts'],work:'Live OpenAlex/arXiv adapters;dedup/cache/timeouts/partial errors, actual embeddings and Mongo upserts.'},
 {folder:'apps/web',files:['src/App.tsx','src/storage.ts','src/styles.css'],work:'Library/online/combined controls, truthful provider status, dynamic scene dataset and IDB v2 offline restore.'},
 {folder:'apps/web/src/scene',files:['MagicBook.tsx','book-pages.ts'],work:'Generic source/PDF links and correct provider text on paper pages.'},
 {folder:'scripts',files:['serve-production.mjs','build-sw.mjs','check-online.mjs','measure-online.mjs','capture-online.mjs'],work:'Node production static/proxy server with optional TLS files, version-specific offline cache, live/performance evidence.'}
]){
 const outputFiles=await Promise.all(module.files.map(async file=>{const path=module.folder+'/'+file;return{path,sha256:createHash('sha256').update(await fs.readFile(path)).digest('hex')}}));
 await fs.appendFile(module.folder+'/ai-development-log.jsonl',JSON.stringify({timestamp:new Date().toISOString(),phase:'online-search-0.6.0',module:module.folder,assistantModel:null,humanRequest:'rồi thì có fe giờ làm tiếp nhanh nhanh mấy phần cho nó chạy thật báo cáo test nữa',contract:module.work,outputFiles,corrections:['Explicitly distinguished E5 inference from training;no invented self-trained model.','Missing abstracts marked title-only, no fabricated abstract or translation.','Kept dynamic corpus paired with384D vectors and original PCA transform.','Separate live provider/model/Mongo check from deterministic mocked E2E.','Fixed JSON import attributes in browser test loader.','Observed intermittent offline navigation failure;version-scoped SW lookup added and final full suite passed.','Production smoke found dotfile treated as SPA route;explicitly denied dotfiles and rechecked403/404.'],verification:evidence,review:{selfChecked:true,independentReview:false},runtimePrompting:{type:'embedding-prefix',query:'query: ',document:'passage: ',generativeLLM:false,trainedModel:false}})+'\n');
}
console.log('Appended6 module logs with verified source hashes.');
