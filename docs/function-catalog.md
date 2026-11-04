# Danh mục mã đang có

Sinh từ AST TypeScript, không nhập tay số lượng. Tính named functions / methods / constructors, không tính callback JSX vô danh. Các giá trị gán biến được lưu trong code-catalog.json.

| File:dòng | Hàm | Tham số | Return |
|---|---|---|---|
| apps/api/app/api/v1/graph/route.ts:4 | GET |  | inferred |
| apps/api/app/api/v1/health/route.ts:4 | GET |  | inferred |
| apps/api/app/api/v1/papers/route.ts:4 | GET |  | inferred |
| apps/api/app/api/v1/papers/[paperId]/neighbors/route.ts:4 | GET | request:Request, {params}:{params:Promise<{paperId:string}>} | inferred |
| apps/api/app/api/v1/papers/[paperId]/route.ts:4 | GET | _request:Request, {params}:{params:Promise<{paperId:string}>} | inferred |
| apps/api/app/api/v1/search/route.ts:6 | POST | request:Request | inferred |
| apps/api/app/api/v2/search/route.ts:6 | POST | request:Request | inferred |
| apps/api/app/api/v3/research/route.ts:6 | POST | request:Request | inferred |
| apps/api/app/layout.tsx:2 | RootLayout | {children}:{children:ReactNode} | inferred |
| apps/api/app/page.tsx:1 | Page |  | inferred |
| apps/api/lib/embedding-runtime.mjs:7 | getExtractor | root | inferred |
| apps/api/lib/embedding-runtime.mjs:14 | embedTexts | root, texts | inferred |
| apps/api/lib/embedding.ts:6 | getWorker |  | inferred |
| apps/api/lib/embedding.ts:10 | fail |  | inferred |
| apps/api/lib/embedding.ts:12 | embedBatch | texts:string[] | Promise<number[][]> |
| apps/api/lib/embedding.ts:20 | embedQuery | query:string | Promise<number[]> |
| apps/api/lib/http.ts:1 | fail | status:number, code:string, message:string | inferred |
| apps/api/lib/http.ts:2 | success | value:unknown | inferred |
| apps/api/lib/online/providers.ts:3 | record | value:unknown | Json |
| apps/api/lib/online/providers.ts:4 | text | value:unknown | inferred |
| apps/api/lib/online/providers.ts:5 | cleanText | value:string | inferred |
| apps/api/lib/online/providers.ts:6 | reconstructAbstract | value:unknown | inferred |
| apps/api/lib/online/providers.ts:7 | guessGroup | value:string | Group |
| apps/api/lib/online/providers.ts:8 | https | value:unknown | inferred |
| apps/api/lib/online/providers.ts:9 | safeDoi | value:unknown | inferred |
| apps/api/lib/online/providers.ts:10 | normalizeOpenAlex | raw:unknown, now=new Date().toISOString() | Paper[] |
| apps/api/lib/online/providers.ts:19 | normalizeArxiv | xml:string, now=new Date().toISOString() | Paper[] |
| apps/api/lib/online/providers.ts:20 | field | entry:string, name:string | inferred |
| apps/api/lib/online/providers.ts:25 | deduplicatePapers | papers:Paper[], existing:Paper[]=[] | inferred |
| apps/api/lib/online/providers.ts:28 | limitedText | response:Response, maxBytes=2_000_000 | inferred |
| apps/api/lib/online/providers.ts:29 | searchProvider | provider:'arxiv'\|'openalex', query:string | Promise<SourceResult> |
| apps/api/lib/online/search.ts:9 | hash | text:string | inferred |
| apps/api/lib/online/search.ts:10 | runOnlineSearch | input:Input, deps:Dependencies | Promise<OnlineResponse> |
| apps/api/lib/online/search.ts:12 | matches | p:Paper | inferred |
| apps/api/lib/online/search.ts:23 | onlineSearch | input:Input | Promise<OnlineResponse> |
| apps/api/lib/rag/audit.ts:7 | auditPrompt | traceId:string, stage:'plan'\|'synthesis', messages:ChatMessage[], output:string, accepted:boolean | inferred |
| apps/api/lib/rag/generation-runtime.mjs:7 | generateLocal | root, messages, maxTokens=180 | inferred |
| apps/api/lib/rag/generation.ts:5 | getWorker |  | inferred |
| apps/api/lib/rag/generation.ts:6 | generate | messages:ChatMessage[], maxTokens=180 | Promise<string> |
| apps/api/lib/rag/generation.ts:10 | cleanup |  | inferred |
| apps/api/lib/rag/generation.ts:11 | fail |  | inferred |
| apps/api/lib/rag/generation.ts:12 | receive | message:{id:string;text?:string;error?:string} | inferred |
| apps/api/lib/rag/prompts.ts:4 | planningPrompt | query:string | ChatMessage[] |
| apps/api/lib/rag/prompts.ts:5 | parseJson | text:string | unknown |
| apps/api/lib/rag/prompts.ts:6 | parsePlan | query:string, text:string | QueryPlan |
| apps/api/lib/rag/prompts.ts:11 | synthesisPrompt | query:string, evidence:Evidence[] | ChatMessage[] |
| apps/api/lib/rag/prompts.ts:12 | parseSynthesis | text:string, evidence:Evidence[] | inferred |
| apps/api/lib/rag/repository.ts:4 | database |  | inferred |
| apps/api/lib/rag/repository.ts:5 | loadResearchDataset | base:DatasetBundle | Promise<DatasetBundle> |
| apps/api/lib/rag/repository.ts:14 | saveResearch | response:ResearchResponse | inferred |
| apps/api/lib/rag/rerank-runtime.mjs:7 | rerankLocal | root, query, texts | inferred |
| apps/api/lib/rag/search.ts:7 | digest | value:string | inferred |
| apps/api/lib/rag/search.ts:8 | batches | texts:string[], embed:Dependencies['embed'] | inferred |
| apps/api/lib/rag/search.ts:9 | runResearch | input:ResearchRequest, deps:Dependencies | Promise<ResearchResponse> |
| apps/api/lib/rag/search.ts:16 | matches | paper:Paper | inferred |
| apps/api/lib/rag/service.ts:12 | researchSearch | input:ResearchRequest | inferred |
| apps/api/lib/repository.ts:10 | getDataset |  | inferred |
| apps/api/next.config.ts:8 | headers |  | inferred |
| apps/web/src/App.tsx:16 | App |  | inferred |
| apps/web/src/App.tsx:25 | update | event:Event | inferred |
| apps/web/src/App.tsx:41 | listener | e:KeyboardEvent | inferred |
| apps/web/src/App.tsx:49 | local |  | inferred |
| apps/web/src/App.tsx:69 | search | value:string | inferred |
| apps/web/src/App.tsx:70 | changeScope | value:'library'\|'online'\|'combined' | inferred |
| apps/web/src/App.tsx:71 | bookmark | paper:Paper | inferred |
| apps/web/src/App.tsx:72 | chooseGroup | value:Group\|'all' | inferred |
| apps/web/src/offline-ready.ts:2 | checkOfflineReady |  | inferred |
| apps/web/src/PaperDossier.tsx:5 | paperSource | paper:Paper | inferred |
| apps/web/src/PaperDossier.tsx:6 | paperCitation | paper:Paper | inferred |
| apps/web/src/PaperDossier.tsx:7 | PaperDossier | {paper,saved,onSave,onSelect,neighbors,onNotice}:{paper:Paper;saved:boolean;onSave:()=>void;onSelect:(paper:Paper)=>void;neighbors:SearchHit[];onNotice:(message:string)=>void} | inferred |
| apps/web/src/PaperDossier.tsx:9 | copyCitation |  | inferred |
| apps/web/src/ResearchPanel.tsx:4 | ResearchPanel | {report,papers,onSelect,onClose}:{report:ResearchReport;papers:Paper[];onSelect:(paper:Paper)=>void;onClose:()=>void} | inferred |
| apps/web/src/scene/atmosphere.ts:4 | createAtmosphere | scene:THREE.Scene | inferred |
| apps/web/src/scene/atmosphere.ts:16 | update | time:number, energy:number | inferred |
| apps/web/src/scene/book-pages.ts:4 | wrapLines | text:string, width=34 | inferred |
| apps/web/src/scene/book-pages.ts:6 | readingPages | paper:Paper | BookPage[] |
| apps/web/src/scene/book-pages.ts:12 | line | ctx:CanvasRenderingContext2D, x:number, y:number, w:number, color:string | inferred |
| apps/web/src/scene/book-pages.ts:13 | block | ctx:CanvasRenderingContext2D, lines:string[], x:number, y:number, size=42, leading=62, color='#303038' | inferred |
| apps/web/src/scene/book-pages.ts:14 | orbitMark | ctx:CanvasRenderingContext2D, x:number, y:number, radius:number, color:string | inferred |
| apps/web/src/scene/book-pages.ts:15 | createPageTexture | page:BookPage\|null, pageNumber=0 | inferred |
| apps/web/src/scene/create-book-scene.ts:16 | textTexture | text:string | inferred |
| apps/web/src/scene/create-book-scene.ts:20 | setMathematicalRotation | object:THREE.Object3D, angles:Point3 | inferred |
| apps/web/src/scene/create-book-scene.ts:24 | createBookScene | canvas:HTMLCanvasElement, onStatus:(label:string)=>void, snapshot:SemanticSnapshot, papers:Paper[], onSelect:(paper:Paper)=>void, onReading:(state:ReadingState)=>void, onHover:(hover:SpatialHover)=>void | BookSceneHandle |
| apps/web/src/scene/create-book-scene.ts:65 | updateNetwork |  | inferred |
| apps/web/src/scene/create-book-scene.ts:66 | updateEdges | paper:Paper\|null | inferred |
| apps/web/src/scene/create-book-scene.ts:70 | publish |  | inferred |
| apps/web/src/scene/create-book-scene.ts:71 | paintPage | side:number, index:number | inferred |
| apps/web/src/scene/create-book-scene.ts:72 | paintPages |  | inferred |
| apps/web/src/scene/create-book-scene.ts:73 | clearLeaf |  | inferred |
| apps/web/src/scene/create-book-scene.ts:74 | planLetters |  | inferred |
| apps/web/src/scene/create-book-scene.ts:75 | colorScores | scores:{id:string;score:number}[] | inferred |
| apps/web/src/scene/create-book-scene.ts:78 | down | e:PointerEvent | inferred |
| apps/web/src/scene/create-book-scene.ts:79 | pickPaper | x:number, y:number | inferred |
| apps/web/src/scene/create-book-scene.ts:80 | move | e:PointerEvent | inferred |
| apps/web/src/scene/create-book-scene.ts:81 | up | e:PointerEvent | inferred |
| apps/web/src/scene/create-book-scene.ts:82 | cancel |  | inferred |
| apps/web/src/scene/create-book-scene.ts:83 | wheel | e:WheelEvent | inferred |
| apps/web/src/scene/create-book-scene.ts:85 | resetCamera |  | inferred |
| apps/web/src/scene/create-book-scene.ts:87 | animate | now:number | inferred |
| apps/web/src/scene/create-book-scene.ts:128 | startSearch |  | inferred |
| apps/web/src/scene/create-book-scene.ts:129 | empty |  | inferred |
| apps/web/src/scene/create-book-scene.ts:130 | select | paper | inferred |
| apps/web/src/scene/create-book-scene.ts:131 | turn | direction | inferred |
| apps/web/src/scene/create-book-scene.ts:132 | setPaused | value | inferred |
| apps/web/src/scene/create-book-scene.ts:132 | zoom | direction | inferred |
| apps/web/src/scene/create-book-scene.ts:133 | focusPage | value | inferred |
| apps/web/src/scene/create-book-scene.ts:134 | filter | ids | inferred |
| apps/web/src/scene/create-book-scene.ts:135 | setQuery | point | inferred |
| apps/web/src/scene/create-book-scene.ts:136 | dispose |  | inferred |
| apps/web/src/scene/enchanting-table.ts:3 | createEnchantingTable |  | THREE.Group |
| apps/web/src/scene/enchanting-table.ts:12 | block | w:number, h:number, d:number, x:number, y:number, z:number, material:THREE.Material | inferred |
| apps/web/src/scene/knowledge-portal.ts:4 | createKnowledgePortal | scene:THREE.Scene | inferred |
| apps/web/src/scene/knowledge-portal.ts:14 | update | amount:number, time:number, sealing:number | inferred |
| apps/web/src/scene/letter-flight.ts:4 | launchDelay | rank:number, total:number | inferred |
| apps/web/src/scene/letter-flight.ts:5 | flightProgress | age:number, rank:number, total:number | inferred |
| apps/web/src/scene/letter-flight.ts:6 | arcPoint | from:Point3, to:Point3, progress:number, lift=1.2 | Point3 |
| apps/web/src/scene/letter-flight.ts:10 | orderLetters | paperIds:readonly string[], scores:ReadonlyMap<string,number>, visible:ReadonlySet<string>, limit=12 | inferred |
| apps/web/src/scene/MagicBook.tsx:8 | MagicBook | {paper,snapshot,papers,onSelect,visibleIds,queryPoint,castId,searching,scores}:{paper:Paper\|null;snapshot:SemanticSnapshot;papers:Paper[];onSelect:(paper:Paper\|null)=>void;visibleIds:string[];queryPoint:Point3\|null;castId:number;searching:boolean;scores:{id:string;score:number}[]} | inferred |
| apps/web/src/scene/MagicBook.tsx:22 | close |  | inferred |
| apps/web/src/scene/MagicBook.tsx:23 | key | e:KeyboardEvent | inferred |
| apps/web/src/scene/ritual.ts:4 | smooth | value:number | inferred |
| apps/web/src/scene/ritual.ts:7 | similarityTone | score:number\|null | {color:string;label:string} |
| apps/web/src/scene/ritual.ts:16 | start |  | inferred |
| apps/web/src/scene/ritual.ts:17 | resolve |  | inferred |
| apps/web/src/scene/ritual.ts:18 | close |  | inferred |
| apps/web/src/scene/ritual.ts:19 | turn |  | inferred |
| apps/web/src/scene/ritual.ts:20 | tick | dt:number, reduced=false | inferred |
| apps/web/src/scene/ritual.ts:30 | sample |  | inferred |
| apps/web/src/scene/semantic-links.ts:3 | sparseSemanticLinks | rows:{id:string;neighbors:{id:string;score:number}[]}[], visible:ReadonlySet<string>, limit=24 | SemanticLink[] |
| apps/web/src/scene/spatial-layout.ts:5 | toLibraryPoint | p:Point3 | Point3 |
| apps/web/src/scene/spatial-layout.ts:7 | readingCamera | aspect:number, focus:PageFocus | inferred |
| apps/web/src/semantic/client.ts:4 | getWorker |  | inferred |
| apps/web/src/semantic/client.ts:5 | embedQueryLocal | query:string | Promise<number[]> |
| apps/web/src/storage.ts:3 | db |  | inferred |
| apps/web/src/storage.ts:3 | upgrade | database | inferred |
| apps/web/src/storage.ts:4 | saveCorpus | corpus:Corpus | inferred |
| apps/web/src/storage.ts:5 | loadCorpus |  | Promise<Corpus\|undefined> |
| apps/web/src/storage.ts:6 | loadBookmarks |  | Promise<string[]> |
| apps/web/src/storage.ts:7 | setBookmark | id:string, saved:boolean | inferred |
| apps/web/src/storage.ts:8 | saveOnlineDataset | bundle:DatasetBundle | inferred |
| apps/web/src/storage.ts:9 | loadOnlineDataset |  | Promise<DatasetBundle\|undefined> |
| apps/web/vite.config.ts:6 | configureServer | server | inferred |
| packages/core/src/math.ts:2 | finite | ...values: number[] | inferred |
| packages/core/src/math.ts:4 | constructor | public readonly re:number, public readonly im:number | inferred |
| packages/core/src/math.ts:5 | rotate | angle:number | Complex |
| packages/core/src/math.ts:7 | rotatePoint3D | point:Point3, angles:Point3 | Point3 |
| packages/core/src/math.ts:14 | orbitPosition | radius:number, yaw:number, pitch:number, center:Point3 | Point3 |
| packages/core/src/math.ts:21 | damp | current:number, target:number, lambda:number, dt:number | number |
| packages/core/src/math.ts:22 | zoomRadius | radius:number, delta:number | number |
| packages/core/src/math.ts:23 | stepAngle | angle:number, speed:number, dt:number | number |
| packages/core/src/online.ts:14 | embeddingText | paper:Paper | inferred |
| packages/core/src/online.ts:15 | validateBundle | raw:unknown | DatasetBundle |
| packages/core/src/online.ts:17 | mergeBundles | base:DatasetBundle, incoming:DatasetBundle, previous?:DatasetBundle | DatasetBundle |
| packages/core/src/rag.ts:16 | chunkPaper | paper:Paper, maxWords=100, overlap=20 | Passage[] |
| packages/core/src/rag.ts:22 | terms | value:string | string[] |
| packages/core/src/rag.ts:24 | rankPassages | passages:Passage[], vectors:number[][], queries:number[][], queryText:string, limit=6 | Evidence[] |
| packages/core/src/rag.ts:34 | extractiveReport | query:string, plan:QueryPlan, evidence:Evidence[], candidates:number, passages:number, elapsedMs=0 | ResearchReport |
| packages/core/src/rag.ts:37 | documentFallbackReport | query:string, result:SearchResult | ResearchReport |
| packages/core/src/rag.ts:42 | validateGroundedClaims | raw:unknown, evidence:Evidence[] | inferred |
| packages/core/src/search.ts:4 | normalizeText | text:string | string |
| packages/core/src/search.ts:5 | tokenize | text:string | string[] |
| packages/core/src/search.ts:6 | expandQuery | query:string | string |
| packages/core/src/search.ts:7 | counts | tokens:string[] | Map<string,number> |
| packages/core/src/search.ts:8 | magnitude | v:Map<string,number> | number |
| packages/core/src/search.ts:11 | constructor | corpus:Corpus | inferred |
| packages/core/src/search.ts:17 | search | raw:SearchInput | SearchResult |
| packages/core/src/search.ts:27 | neighbors | paper:Paper, limit=4 | inferred |
| packages/core/src/semantic.ts:14 | validateSnapshot | corpus:Corpus, raw:unknown | SemanticSnapshot |
| packages/core/src/semantic.ts:23 | constructor | public readonly corpus:Corpus, public readonly snapshot:SemanticSnapshot | inferred |
| packages/core/src/semantic.ts:24 | search | raw:SearchInput, queryVector?:readonly number[] | SearchResult |
| packages/core/src/semantic.ts:32 | neighbors | paper:Paper, limit=4 | inferred |
| packages/core/src/semantic.ts:33 | projectQuery | vector:readonly number[] | Vec3 |
| packages/core/src/semantic.ts:34 | bridgeEvidence | paper:Paper | inferred |
| packages/core/src/vector.ts:3 | normalizeVector | input:readonly number[], dimensions=input.length | number[] |
| packages/core/src/vector.ts:7 | cosineSimilarity | a:readonly number[], b:readonly number[] | number |
| packages/core/src/vector.ts:10 | dot | a:readonly number[], b:readonly number[] | inferred |
| packages/core/src/vector.ts:11 | projectPca | vector:readonly number[], projection:Projection | Vec3 |
| packages/core/src/vector.ts:17 | fitPca3 | vectors:readonly number[][], seed=42 | Projection |
| scripts/build-sw.mjs:5 | walk | dir | inferred |
| scripts/dev.mjs:12 | stop | code=0 | inferred |
| scripts/document-code.mjs:4 | files | folder | inferred |
| scripts/document-code.mjs:7 | visit | node | inferred |
| scripts/document-code.mjs:15 | escape | s | inferred |
| scripts/fetch-papers.mjs:5 | clean | s | inferred |
| scripts/fetch-papers.mjs:6 | field | entry, name | inferred |
| scripts/fetch-papers.mjs:21 | parse | xml, forced | inferred |
| scripts/measure-online.mjs:4 | percentile | p | inferred |
| scripts/measure-research.mjs:3 | request |  | inferred |
| scripts/measure-research.mjs:4 | percentile | p | inferred |
| scripts/measure.mjs:6 | percentile | p | inferred |
| scripts/mongo.mjs:7 | stop |  | inferred |
| scripts/prepare-semantic.mjs:7 | hash | s | inferred |
| scripts/preview.mjs:4 | stop |  | inferred |
| scripts/serve-production.mjs:12 | handle | request, response | inferred |
| scripts/serve-production.mjs:31 | stop |  | inferred |
| scripts/test-https.mjs:9 | get | route, ca | inferred |
| scripts/test-nginx.mjs:14 | get | route, authenticated=false | inferred |
| scripts/test-resilience.mjs:7 | pause | ms | inferred |
| scripts/test-resilience.mjs:8 | request | route, body | inferred |
| scripts/test-resilience.mjs:9 | summarize | rows | inferred |
| scripts/test-resilience.mjs:11 | save |  | inferred |
