# Danh mục khai báo biến và giá trị khởi tạo

Sinh tự động từ AST, không giới hạn độ dài biểu thức hoặc số dòng. Giá trị là biểu thức trong mã, không phải giá trị môi trường/secret khi chạy. Function-valued variables nằm ở function-catalog.md. Tái gán sau khai báo không được tính thành biến mới.

## apps/api/app/api/v1/graph/route.ts

### runtime — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
'nodejs'
```
### {index} — dòng 4

Scope: GET. Kiểu khai báo: inferred.

```ts
await getDataset()
```

## apps/api/app/api/v1/health/route.ts

### runtime — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
'nodejs'
```
### {corpus,storage,index} — dòng 4

Scope: GET. Kiểu khai báo: inferred.

```ts
await getDataset()
```

## apps/api/app/api/v1/papers/route.ts

### runtime — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
'nodejs'
```
### {corpus,storage} — dòng 4

Scope: GET. Kiểu khai báo: inferred.

```ts
await getDataset()
```

## apps/api/app/api/v1/papers/[paperId]/neighbors/route.ts

### runtime — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
'nodejs'
```
### topK — dòng 5

Scope: GET. Kiểu khai báo: inferred.

```ts
new URL(request.url).searchParams.get('topK')??'5'
```
### {paperId} — dòng 6

Scope: GET. Kiểu khai báo: inferred.

```ts
await params
```
### {index,corpus} — dòng 6

Scope: GET. Kiểu khai báo: inferred.

```ts
await getDataset()
```
### paper — dòng 6

Scope: GET. Kiểu khai báo: inferred.

```ts
corpus.papers.find(p=>p.id===paperId)
```

## apps/api/app/api/v1/papers/[paperId]/route.ts

### runtime — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
'nodejs'
```
### {paperId} — dòng 4

Scope: GET. Kiểu khai báo: inferred.

```ts
await params
```
### {corpus} — dòng 4

Scope: GET. Kiểu khai báo: inferred.

```ts
await getDataset()
```
### paper — dòng 4

Scope: GET. Kiểu khai báo: inferred.

```ts
corpus.papers.find(p=>p.id===paperId)
```

## apps/api/app/api/v1/search/route.ts

### runtime — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
'nodejs'
```
### reader — dòng 9

Scope: POST. Kiểu khai báo: inferred.

```ts
request.body?.getReader()
```
### bytes — dòng 9

Scope: POST. Kiểu khai báo: inferred.

```ts
0
```
### text — dòng 9

Scope: POST. Kiểu khai báo: inferred.

```ts
''
```
### decoder — dòng 9

Scope: POST. Kiểu khai báo: inferred.

```ts
new TextDecoder()
```
### {done,value} — dòng 9

Scope: POST. Kiểu khai báo: inferred.

```ts
await reader.read()
```
### parsed — dòng 10

Scope: POST. Kiểu khai báo: inferred.

```ts
searchSchema.safeParse(body)
```
### started — dòng 11

Scope: POST. Kiểu khai báo: inferred.

```ts
performance.now()
```
### {index} — dòng 11

Scope: POST. Kiểu khai báo: inferred.

```ts
await getDataset()
```
### vector — dòng 11

Scope: POST. Kiểu khai báo: inferred.

```ts
parsed.data.query?await embedQuery(parsed.data.query):undefined
```
### result — dòng 11

Scope: POST. Kiểu khai báo: inferred.

```ts
index.search(parsed.data,vector)
```

## apps/api/app/api/v2/search/route.ts

### runtime — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
'nodejs'
```
### active — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### requests — dòng 5

Scope: module. Kiểu khai báo: number[].

```ts
[]
```
### reader — dòng 8

Scope: POST. Kiểu khai báo: inferred.

```ts
request.body?.getReader()
```
### bytes — dòng 8

Scope: POST. Kiểu khai báo: inferred.

```ts
0
```
### body — dòng 8

Scope: POST. Kiểu khai báo: inferred.

```ts
''
```
### decoder — dòng 8

Scope: POST. Kiểu khai báo: inferred.

```ts
new TextDecoder()
```
### part — dòng 8

Scope: POST. Kiểu khai báo: inferred.

```ts
await reader.read()
```
### parsed — dòng 9

Scope: POST. Kiểu khai báo: inferred.

```ts
onlineSearchSchema.safeParse(raw)
```
### now — dòng 10

Scope: POST. Kiểu khai báo: inferred.

```ts
Date.now()
```

## apps/api/app/api/v3/research/route.ts

### runtime — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
'nodejs'
```
### active — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### requests — dòng 5

Scope: module. Kiểu khai báo: number[].

```ts
[]
```
### reader — dòng 8

Scope: POST. Kiểu khai báo: inferred.

```ts
request.body?.getReader()
```
### size — dòng 8

Scope: POST. Kiểu khai báo: inferred.

```ts
0
```
### body — dòng 8

Scope: POST. Kiểu khai báo: inferred.

```ts
''
```
### decoder — dòng 8

Scope: POST. Kiểu khai báo: inferred.

```ts
new TextDecoder()
```
### part — dòng 8

Scope: POST. Kiểu khai báo: inferred.

```ts
await reader.read()
```
### parsed — dòng 9

Scope: POST. Kiểu khai báo: inferred.

```ts
researchRequestSchema.safeParse(raw)
```
### now — dòng 10

Scope: POST. Kiểu khai báo: inferred.

```ts
Date.now()
```

## apps/api/lib/embedding-runtime.mjs

### MODEL_ID — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
'Xenova/multilingual-e5-small'
```
### manifest — dòng 10

Scope: getExtractor. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile(path.join(root,'data/model-manifest.json'),'utf8'))
```
### bytes — dòng 10

Scope: getExtractor. Kiểu khai báo: inferred.

```ts
await fs.readFile(path.join(root,'.local/models',MODEL_ID,file.file))
```
### extractor — dòng 14

Scope: embedTexts. Kiểu khai báo: inferred.

```ts
await getExtractor(root)
```
### output — dòng 14

Scope: embedTexts. Kiểu khai báo: inferred.

```ts
await extractor(texts,{pooling:'mean',normalize:true})
```

## apps/api/lib/embedding-worker.mjs

### queue — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
Promise.resolve()
```
### vectors — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
await embedTexts(workerData.root,message.texts??['query: '+message.query])
```

## apps/api/lib/embedding.ts

### pending — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
new Map<string,{resolve:(vectors:number[][])=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>()
```
### cache — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
new Map<string,number[]>()
```
### current — dòng 8

Scope: getWorker. Kiểu khai báo: inferred.

```ts
new Worker(path.resolve(process.cwd(),'lib/embedding-worker.mjs'),{workerData:{root:path.resolve(process.cwd(),'../..')}})
```
### request — dòng 9

Scope: getWorker. Kiểu khai báo: inferred.

```ts
pending.get(message.id)
```
### cached — dòng 14

Scope: embedBatch. Kiểu khai báo: inferred.

```ts
texts.map(text=>cache.get(text))
```
### current — dòng 15

Scope: embedBatch. Kiểu khai báo: inferred.

```ts
getWorker()
```
### id — dòng 15

Scope: embedBatch. Kiểu khai báo: inferred.

```ts
crypto.randomUUID()
```
### vectors — dòng 16

Scope: embedBatch. Kiểu khai báo: inferred.

```ts
await new Promise<number[][]>((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Model timeout.'))},45000);pending.set(id,{resolve,reject,timer});current.postMessage({id,texts})})
```
### timer — dòng 16

Scope: embedBatch. Kiểu khai báo: inferred.

```ts
setTimeout(()=>{pending.delete(id);reject(new Error('Model timeout.'))},45000)
```

## apps/api/lib/online/providers.ts

### n — dòng 5

Scope: cleanText. Kiểu khai báo: inferred.

```ts
code[0]?.toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code)
```
### source — dòng 6

Scope: reconstructAbstract. Kiểu khai báo: inferred.

```ts
record(value)
```
### words — dòng 6

Scope: reconstructAbstract. Kiểu khai báo: inferred.

```ts
new Map<number,string>()
```
### count — dòng 6

Scope: reconstructAbstract. Kiểu khai báo: inferred.

```ts
0
```
### s — dòng 7

Scope: guessGroup. Kiểu khai báo: inferred.

```ts
value.toLowerCase()
```
### url — dòng 8

Scope: https. Kiểu khai báo: inferred.

```ts
new URL(text(value))
```
### raw — dòng 9

Scope: safeDoi. Kiểu khai báo: inferred.

```ts
text(value).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').trim().toLowerCase()
```
### results — dòng 11

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
record(raw).results
```
### papers — dòng 11

Scope: normalizeOpenAlex. Kiểu khai báo: Paper[].

```ts
[]
```
### row — dòng 12

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
record(item)
```
### id — dòng 12

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
text(row.id).match(/^https:\/\/openalex\.org\/(W\d+)$/)?.[1]
```
### title — dòng 12

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
cleanText(text(row.title))
```
### abstract — dòng 12

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
reconstructAbstract(row.abstract_inverted_index)
```
### topic — dòng 12

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
record(row.primary_topic)
```
### field — dòng 12

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
text(record(topic.field).display_name)
```
### location — dòng 12

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
record(row.primary_location)
```
### doi — dòng 13

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
safeDoi(row.doi)
```
### authors — dòng 13

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
Array.isArray(row.authorships)?row.authorships.map(a=>cleanText(text(record(record(a).author).display_name))).filter(Boolean).slice(0,30):[]
```
### landing — dòng 14

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
text(location.landing_page_url)
```
### arxivId — dòng 14

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
landing.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})(?:v\d+)?/)?.[1]
```
### candidate — dòng 15

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
{id:arxivId??'oa:'+id,title:title.slice(0,1000),abstract:abstract||'Nguồn chưa cung cấp tóm tắt. Điểm được tính từ tiêu đề.',authors:authors.length?authors:['Chưa có thông tin tác giả'],year:row.publication_year,group:guessGroup(field+' '+title),categories:[field||'Unclassified'],sourceUrl:arxivId?'https://arxiv.org/abs/'+arxivId:doi?'https://doi.org/'+doi:'https://openalex.org/'+id,tags:['OpenAlex'],summary:abstract?abstract.slice(0,240)+(abstract.length>240?'…':''):'Chỉ có tiêu đề; mở nguồn để xem thêm.',provenance:{provider:'openalex',fetchedAt:now,doi,abstractAvailable:Boolean(abstract),pdfUrl:https(location.pdf_url)}}
```
### parsed — dòng 16

Scope: normalizeOpenAlex. Kiểu khai báo: inferred.

```ts
paperSchema.safeParse(candidate)
```
### papers — dòng 21

Scope: normalizeArxiv. Kiểu khai báo: Paper[].

```ts
[]
```
### id — dòng 21

Scope: normalizeArxiv. Kiểu khai báo: inferred.

```ts
field(entry,'id').split('/abs/')[1]?.replace(/v\d+$/,'')
```
### title — dòng 21

Scope: normalizeArxiv. Kiểu khai báo: inferred.

```ts
field(entry,'title')
```
### abstract — dòng 21

Scope: normalizeArxiv. Kiểu khai báo: inferred.

```ts
field(entry,'summary')
```
### categories — dòng 21

Scope: normalizeArxiv. Kiểu khai báo: inferred.

```ts
[...entry.matchAll(/<category[^>]*term="([^"]+)"/g)].map(m=>m[1]!)
```
### parsed — dòng 22

Scope: normalizeArxiv. Kiểu khai báo: inferred.

```ts
paperSchema.safeParse({id,title,abstract:abstract||'Nguồn chưa cung cấp tóm tắt. Điểm được tính từ tiêu đề.',authors:[...entry.matchAll(/<author>([\s\S]*?)<\/author>/g)].map(([,author])=>field(author??'','name')),year:Number(field(entry,'published').slice(0,4)),group:guessGroup(categories.join(' ')+' '+title),categories,sourceUrl:'https://arxiv.org/abs/'+id,tags:categories,summary:abstract?abstract.slice(0,240)+(abstract.length>240?'…':''):'Chỉ có tiêu đề.',provenance:{provider:'arxiv',fetchedAt:now,doi:safeDoi(field(entry,'arxiv:doi')),abstractAvailable:Boolean(abstract),pdfUrl:'https://arxiv.org/pdf/'+id}})
```
### ids — dòng 25

Scope: deduplicatePapers. Kiểu khai báo: inferred.

```ts
new Set(existing.map(p=>p.id))
```
### dois — dòng 25

Scope: deduplicatePapers. Kiểu khai báo: inferred.

```ts
new Set(existing.map(p=>p.provenance?.doi).filter(Boolean))
```
### result — dòng 25

Scope: deduplicatePapers. Kiểu khai báo: Paper[].

```ts
[]
```
### doi — dòng 25

Scope: deduplicatePapers. Kiểu khai báo: inferred.

```ts
paper.provenance?.doi
```
### cache — dòng 27

Scope: module. Kiểu khai báo: inferred.

```ts
new Map<string,{until:number;result:SourceResult}>()
```
### pending — dòng 27

Scope: module. Kiểu khai báo: inferred.

```ts
new Map<string,Promise<SourceResult>>()
```
### nextArxiv — dòng 27

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### reader — dòng 28

Scope: limitedText. Kiểu khai báo: inferred.

```ts
response.body.getReader()
```
### decoder — dòng 28

Scope: limitedText. Kiểu khai báo: inferred.

```ts
new TextDecoder()
```
### size — dòng 28

Scope: limitedText. Kiểu khai báo: inferred.

```ts
0
```
### output — dòng 28

Scope: limitedText. Kiểu khai báo: inferred.

```ts
''
```
### part — dòng 28

Scope: limitedText. Kiểu khai báo: inferred.

```ts
await reader.read()
```
### key — dòng 30

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
provider+':'+query.toLowerCase()
```
### found — dòng 30

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
cache.get(key)
```
### running — dòng 30

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
pending.get(key)
```
### job — dòng 31

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
(async()=>{const started=performance.now();try{
  const url=new URL(provider==='openalex'?'https://api.openalex.org/works':'https://export.arxiv.org/api/query');
  if(provider==='openalex'){url.searchParams.set('search',query);url.searchParams.set('per_page','8');url.searchParams.set('select','id,doi,title,publication_year,authorships,abstract_inverted_index,primary_location,primary_topic');if(process.env.OPENALEX_API_KEY)url.searchParams.set('api_key',process.env.OPENALEX_API_KEY)}else{const scheduled=Math.max(Date.now(),nextArxiv);nextArxiv=scheduled+3100;if(scheduled>Date.now())await new Promise(resolve=>setTimeout(resolve,scheduled-Date.now()));const words=query.match(/[\p{L}\p{N}]+/gu)?.slice(0,12)??[];url.searchParams.set('search_query',words.map(word=>'all:'+word).join(' AND '));url.searchParams.set('max_results','8');url.searchParams.set('sortBy','relevance')}
  const response=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{Accept:provider==='arxiv'?'application/atom+xml':'application/json','User-Agent':'PaperMagic/0.6 academic search'},cache:'no-store'});
  if(!response.ok){const status:ProviderStatus={provider,status:response.status===429?'rate-limited':'error',count:0,message:response.status===429?'Nguồn đang giới hạn lượt gọi; thử lại sau.':'Nguồn tạm thời không phản hồi.',durationMs:performance.now()-started};return{papers:[],status}}
  const body=await limitedText(response),papers=provider==='openalex'?normalizeOpenAlex(JSON.parse(body)):normalizeArxiv(body),result:SourceResult={papers,status:{provider,status:'ok',count:papers.length,message:papers.length?'Đã tìm từ nguồn thật.':'Nguồn không có kết quả phù hợp.',durationMs:performance.now()-started}};
  if(cache.size>=80)cache.delete(cache.keys().next().value??'');cache.set(key,{until:Date.now()+15*60_000,result});return result;
 }catch{return{papers:[],status:{provider,status:'error',count:0,message:'Không kết nối được nguồn trong thời gian cho phép.',durationMs:performance.now()-started}}as SourceResult}})()
```
### started — dòng 31

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
performance.now()
```
### url — dòng 32

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
new URL(provider==='openalex'?'https://api.openalex.org/works':'https://export.arxiv.org/api/query')
```
### scheduled — dòng 33

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
Math.max(Date.now(),nextArxiv)
```
### words — dòng 33

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
query.match(/[\p{L}\p{N}]+/gu)?.slice(0,12)??[]
```
### response — dòng 34

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
await fetch(url,{signal:AbortSignal.timeout(10000),headers:{Accept:provider==='arxiv'?'application/atom+xml':'application/json','User-Agent':'PaperMagic/0.6 academic search'},cache:'no-store'})
```
### status — dòng 35

Scope: searchProvider. Kiểu khai báo: ProviderStatus.

```ts
{provider,status:response.status===429?'rate-limited':'error',count:0,message:response.status===429?'Nguồn đang giới hạn lượt gọi; thử lại sau.':'Nguồn tạm thời không phản hồi.',durationMs:performance.now()-started}
```
### body — dòng 36

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
await limitedText(response)
```
### papers — dòng 36

Scope: searchProvider. Kiểu khai báo: inferred.

```ts
provider==='openalex'?normalizeOpenAlex(JSON.parse(body)):normalizeArxiv(body)
```
### result — dòng 36

Scope: searchProvider. Kiểu khai báo: SourceResult.

```ts
{papers,status:{provider,status:'ok',count:papers.length,message:papers.length?'Đã tìm từ nguồn thật.':'Nguồn không có kết quả phù hợp.',durationMs:performance.now()-started}}
```

## apps/api/lib/online/search.ts

### started — dòng 11

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
performance.now()
```
### base — dòng 11

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
await deps.dataset()
```
### [queryVector,sources] — dòng 11

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
await Promise.all([deps.query(input.query),Promise.all([deps.provider('arxiv',input.query),deps.provider('openalex',input.query)])])
```
### candidates — dòng 13

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
Array.from({length:8},(_,i)=>sources.flatMap(source=>source.papers[i]?[source.papers[i]!]:[])).flat()
```
### fresh — dòng 14

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
deduplicatePapers(candidates,base.corpus.papers).filter(p=>matches(p)&&(input.yearFrom===undefined||p.year>=input.yearFrom)&&(input.yearTo===undefined||p.year<=input.yearTo)).slice(0,12)
```
### embeddings — dòng 15

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
[]
```
### i — dòng 15

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
0
```
### papers — dòng 15

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
fresh.slice(i,i+2)
```
### vectors — dòng 15

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
await deps.passages(papers.map(embeddingText))
```
### j — dòng 15

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
0
```
### paper — dòng 15

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
papers[j]!
```
### vector — dòng 15

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
vectors[j]!
```
### papers — dòng 16

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
[...base.corpus.papers,...fresh]
```
### version — dòng 16

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
'online-'+hash(papers.map(p=>p.id).join('|')).slice(0,16)
```
### corpus — dòng 16

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
{...base.corpus,version,title:'Thư viện và kết quả trực tuyến',fetchedAt:new Date().toISOString(),papers}
```
### snapshot — dòng 16

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
{...base.snapshot,corpusVersion:version,createdAt:new Date().toISOString(),corpusHash:hash(papers.map(embeddingText).join('\n')),papers:[...base.snapshot.papers,...embeddings]}
```
### index — dòng 17

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
new SemanticIndex(corpus,snapshot)
```
### searchInput — dòng 17

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
{query:input.query,topK:50,...(input.group?{group:input.group}:{}),...(input.yearFrom!==undefined?{yearFrom:input.yearFrom}:{}),...(input.yearTo!==undefined?{yearTo:input.yearTo}:{})}
```
### result — dòng 17

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
index.search(searchInput,queryVector)
```
### externalIds — dòng 18

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
new Set(sources.flatMap(source=>source.papers.map(p=>p.id)))
```
### eligible — dòng 18

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
result.items.filter(hit=>input.scope==='combined'||externalIds.has(hit.paper.id))
```
### warnings — dòng 19

Scope: runOnlineSearch. Kiểu khai báo: inferred.

```ts
sources.filter(source=>source.status.status==='error'||source.status.status==='rate-limited').map(source=>source.status.provider+': '+source.status.message)
```
### result — dòng 24

Scope: onlineSearch. Kiểu khai báo: inferred.

```ts
await runOnlineSearch(input,{dataset:async()=>{const data=await getDataset();return{corpus:data.corpus,snapshot:data.index.snapshot}},query:embedQuery,passages:embedBatch,provider:searchProvider})
```
### data — dòng 24

Scope: onlineSearch. Kiểu khai báo: inferred.

```ts
await getDataset()
```
### db — dòng 25

Scope: onlineSearch. Kiểu khai báo: inferred.

```ts
mongo.db()
```
### papers — dòng 25

Scope: onlineSearch. Kiểu khai báo: inferred.

```ts
result.dataset.corpus.papers.filter(p=>p.provenance)
```
### ids — dòng 25

Scope: onlineSearch. Kiểu khai báo: inferred.

```ts
new Set(papers.map(p=>p.id))
```

## apps/api/lib/rag/audit.ts

### queue — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
Promise.resolve()
```
### root — dòng 8

Scope: auditPrompt. Kiểu khai báo: inferred.

```ts
path.resolve(process.cwd(),'../..')
```
### file — dòng 8

Scope: auditPrompt. Kiểu khai báo: inferred.

```ts
path.join(root,'.local/rag-prompts.json')
```
### operation — dòng 9

Scope: auditPrompt. Kiểu khai báo: inferred.

```ts
queue.then(async()=>{await fs.mkdir(path.dirname(file),{recursive:true});let previous:unknown=[];try{previous=JSON.parse(await fs.readFile(file,'utf8'))}catch{}
 const rows=Array.isArray(previous)?previous.slice(-49):[];rows.push({traceId,timestamp:new Date().toISOString(),stage,promptVersion:PROMPT_VERSION,model:'onnx-community/Qwen3-0.6B-ONNX',messages,output:output.slice(0,16000),accepted,inputHash:createHash('sha256').update(JSON.stringify(messages)).digest('hex')});
 const temporary=file+'.tmp';await fs.writeFile(temporary,JSON.stringify(rows,null,2));await fs.rename(temporary,file);
 })
```
### previous — dòng 9

Scope: auditPrompt. Kiểu khai báo: unknown.

```ts
[]
```
### rows — dòng 10

Scope: auditPrompt. Kiểu khai báo: inferred.

```ts
Array.isArray(previous)?previous.slice(-49):[]
```
### temporary — dòng 11

Scope: auditPrompt. Kiểu khai báo: inferred.

```ts
file+'.tmp'
```

## apps/api/lib/rag/generation-runtime.mjs

### manifest — dòng 10

Scope: generateLocal. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile(path.join(root,'data/rag-model-manifest.json'),'utf8'))
```
### hash — dòng 11

Scope: generateLocal. Kiểu khai báo: inferred.

```ts
createHash('sha256')
```
### prompt — dòng 14

Scope: generateLocal. Kiểu khai báo: inferred.

```ts
generator.tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true,enable_thinking:false})
```
### result — dòng 15

Scope: generateLocal. Kiểu khai báo: inferred.

```ts
await generator(prompt,{max_new_tokens:maxTokens,do_sample:false,return_full_text:false})
```
### generated — dòng 16

Scope: generateLocal. Kiểu khai báo: inferred.

```ts
result[0]?.generated_text
```

## apps/api/lib/rag/generation-worker.mjs

### queue — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
Promise.resolve()
```

## apps/api/lib/rag/generation.ts

### busy — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
false
```
### current — dòng 5

Scope: getWorker. Kiểu khai báo: inferred.

```ts
new Worker(path.resolve(process.cwd(),'lib/rag/generation-worker.mjs'),{workerData:{root:path.resolve(process.cwd(),'../..')}})
```
### current — dòng 7

Scope: generate. Kiểu khai báo: inferred.

```ts
getWorker()
```
### id — dòng 9

Scope: generate. Kiểu khai báo: inferred.

```ts
crypto.randomUUID()
```
### timer — dòng 13

Scope: generate. Kiểu khai báo: inferred.

```ts
setTimeout(()=>{cleanup();void current.terminate();worker=undefined;reject(new Error('Local generation timeout'))},45000)
```

## apps/api/lib/rag/prompts.ts

### PROMPT_VERSION — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
'research-v2'
```
### start — dòng 5

Scope: parseJson. Kiểu khai báo: inferred.

```ts
text.indexOf('{')
```
### end — dòng 5

Scope: parseJson. Kiểu khai báo: inferred.

```ts
text.lastIndexOf('}')
```
### raw — dòng 7

Scope: parsePlan. Kiểu khai báo: inferred.

```ts
parseJson(text)
```
### queries — dòng 8

Scope: parsePlan. Kiểu khai báo: inferred.

```ts
[...new Set(raw.queries.filter((q):q is string=>typeof q==='string').map(q=>q.replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim()).filter(q=>q.length>=2&&q.length<=160))].slice(0,2)
```
### claims — dòng 14

Scope: parseSynthesis. Kiểu khai báo: inferred.

```ts
validateGroundedClaims(raw,evidence)
```

## apps/api/lib/rag/repository.ts

### db — dòng 6

Scope: loadResearchDataset. Kiểu khai báo: inferred.

```ts
await database()
```
### raw — dòng 7

Scope: loadResearchDataset. Kiểu khai báo: inferred.

```ts
await db.collection('onlinePapers').find({}).sort({'provenance.fetchedAt':-1}).limit(60).toArray()
```
### originalIds — dòng 7

Scope: loadResearchDataset. Kiểu khai báo: inferred.

```ts
new Set(base.corpus.papers.map(p=>p.id))
```
### papers — dòng 7

Scope: loadResearchDataset. Kiểu khai báo: Paper[].

```ts
[]
```
### {_id,...rest} — dòng 8

Scope: loadResearchDataset. Kiểu khai báo: inferred.

```ts
row
```
### parsed — dòng 8

Scope: loadResearchDataset. Kiểu khai báo: inferred.

```ts
paperSchema.safeParse(rest)
```
### vectors — dòng 10

Scope: loadResearchDataset. Kiểu khai báo: inferred.

```ts
await db.collection('onlineEmbeddings').find({paperId:{$in:papers.map(p=>p.id)},modelRevision:base.snapshot.model.revision}).toArray()
```
### byId — dòng 10

Scope: loadResearchDataset. Kiểu khai báo: inferred.

```ts
new Map(vectors.map(({_id,modelRevision,...row})=>[row.paperId,row]))
```
### valid — dòng 11

Scope: loadResearchDataset. Kiểu khai báo: inferred.

```ts
papers.filter(p=>byId.has(p.id))
```
### version — dòng 11

Scope: loadResearchDataset. Kiểu khai báo: inferred.

```ts
base.corpus.version+'-mongo-'+valid.map(p=>p.id).sort().join('-')
```
### db — dòng 15

Scope: saveResearch. Kiểu khai báo: inferred.

```ts
await database()
```
### papers — dòng 16

Scope: saveResearch. Kiểu khai báo: inferred.

```ts
response.dataset.corpus.papers.filter(p=>p.provenance)
```
### ids — dòng 16

Scope: saveResearch. Kiểu khai báo: inferred.

```ts
new Set(papers.map(p=>p.id))
```

## apps/api/lib/rag/rerank-runtime.mjs

### manifest — dòng 8

Scope: rerankLocal. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile(path.join(root,'data/rerank-model-manifest.json'),'utf8'))
```
### hash — dòng 8

Scope: rerankLocal. Kiểu khai báo: inferred.

```ts
createHash('sha256')
```
### tokenizer — dòng 8

Scope: rerankLocal. Kiểu khai báo: inferred.

```ts
await AutoTokenizer.from_pretrained(manifest.modelId,{local_files_only:true})
```
### model — dòng 8

Scope: rerankLocal. Kiểu khai báo: inferred.

```ts
await AutoModelForSequenceClassification.from_pretrained(manifest.modelId,{dtype:'q8',device:'cpu',local_files_only:true,session_options:{intraOpNumThreads:2,interOpNumThreads:1}})
```
### {tokenizer,model} — dòng 9

Scope: rerankLocal. Kiểu khai báo: inferred.

```ts
await resources
```
### scores — dòng 9

Scope: rerankLocal. Kiểu khai báo: inferred.

```ts
[]
```
### i — dòng 10

Scope: rerankLocal. Kiểu khai báo: inferred.

```ts
0
```
### batch — dòng 10

Scope: rerankLocal. Kiểu khai báo: inferred.

```ts
texts.slice(i,i+2)
```
### inputs — dòng 10

Scope: rerankLocal. Kiểu khai báo: inferred.

```ts
tokenizer(batch.map(()=>query),{text_pair:batch,padding:true,truncation:true,max_length:384})
```
### output — dòng 10

Scope: rerankLocal. Kiểu khai báo: inferred.

```ts
await model(inputs)
```

## apps/api/lib/rag/search.ts

### vectors — dòng 8

Scope: batches. Kiểu khai báo: number[][].

```ts
[]
```
### i — dòng 8

Scope: batches. Kiểu khai báo: inferred.

```ts
0
```
### batch — dòng 8

Scope: batches. Kiểu khai báo: inferred.

```ts
await embed(texts.slice(i,i+2))
```
### started — dòng 10

Scope: runResearch. Kiểu khai báo: inferred.

```ts
performance.now()
```
### traceId — dòng 10

Scope: runResearch. Kiểu khai báo: inferred.

```ts
crypto.randomUUID()
```
### base — dòng 10

Scope: runResearch. Kiểu khai báo: inferred.

```ts
await deps.dataset()
```
### warnings — dòng 10

Scope: runResearch. Kiểu khai báo: string[].

```ts
[]
```
### plan — dòng 11

Scope: runResearch. Kiểu khai báo: QueryPlan.

```ts
{original:input.query,intent:input.query,queries:[input.query.slice(0,160)],method:'original'}
```
### conceptual — dòng 12

Scope: runResearch. Kiểu khai báo: inferred.

```ts
input.query.trim().split(/\s+/).length>=5
```
### messages — dòng 13

Scope: runResearch. Kiểu khai báo: inferred.

```ts
planningPrompt(input.query)
```
### output — dòng 13

Scope: runResearch. Kiểu khai báo: inferred.

```ts
''
```
### accepted — dòng 13

Scope: runResearch. Kiểu khai báo: inferred.

```ts
false
```
### sources — dòng 14

Scope: runResearch. Kiểu khai báo: inferred.

```ts
input.scope==='library'?[]:await Promise.all(plan.queries.slice(0,2).flatMap(query=>(['arxiv','openalex'] as const).map(provider=>deps.provider(provider,query))))
```
### candidates — dòng 15

Scope: runResearch. Kiểu khai báo: inferred.

```ts
Array.from({length:8},(_,i)=>sources.flatMap(source=>source.papers[i]?[source.papers[i]!]:[])).flat()
```
### fresh — dòng 17

Scope: runResearch. Kiểu khai báo: inferred.

```ts
deduplicatePapers(candidates,base.corpus.papers).filter(matches).slice(0,24)
```
### freshVectors — dòng 17

Scope: runResearch. Kiểu khai báo: inferred.

```ts
await batches(fresh.map(embeddingText),deps.embed)
```
### papers — dòng 17

Scope: runResearch. Kiểu khai báo: inferred.

```ts
[...base.corpus.papers,...fresh]
```
### version — dòng 18

Scope: runResearch. Kiểu khai báo: inferred.

```ts
'research-'+digest(papers.map(p=>p.id).join('|')).slice(0,16)
```
### corpus — dòng 18

Scope: runResearch. Kiểu khai báo: inferred.

```ts
{...base.corpus,version,papers}
```
### snapshot — dòng 18

Scope: runResearch. Kiểu khai báo: inferred.

```ts
{...base.snapshot,corpusVersion:version,papers:[...base.snapshot.papers,...fresh.map((paper,i)=>({paperId:paper.id,textHash:digest(embeddingText(paper)),vector:freshVectors[i]!,point:projectPca(freshVectors[i]!,base.snapshot.projection)}))]}
```
### externalIds — dòng 19

Scope: runResearch. Kiểu khai báo: inferred.

```ts
new Set(candidates.map(p=>p.id))
```
### eligible — dòng 19

Scope: runResearch. Kiểu khai báo: inferred.

```ts
papers.filter(p=>matches(p)&&(input.scope!=='online'||externalIds.has(p.id)))
```
### passages — dòng 19

Scope: runResearch. Kiểu khai báo: inferred.

```ts
eligible.flatMap(p=>chunkPaper(p))
```
### queryTexts — dòng 19

Scope: runResearch. Kiểu khai báo: inferred.

```ts
[input.query,...plan.method==='local-llm'?[plan.intent+' '+plan.queries.join(' ')]:[]]
```
### queryVectors — dòng 20

Scope: runResearch. Kiểu khai báo: inferred.

```ts
await batches(queryTexts.map(q=>'query: '+q),deps.embed)
```
### vectors — dòng 20

Scope: runResearch. Kiểu khai báo: inferred.

```ts
await batches(passages.map(p=>'passage: '+p.paper.title+'\n'+p.text),deps.embed)
```
### allEvidence — dòng 21

Scope: runResearch. Kiểu khai báo: inferred.

```ts
rankPassages(passages,vectors,queryVectors,queryTexts.join(' '),Math.min(40,input.topK*2))
```
### shortlist — dòng 22

Scope: runResearch. Kiểu khai báo: inferred.

```ts
allEvidence.slice(0,20)
```
### scores — dòng 22

Scope: runResearch. Kiểu khai báo: inferred.

```ts
await deps.rerank(plan.intent+' '+plan.queries.join(' '),shortlist.map(e=>e.title+'\n'+e.quote))
```
### crossRanks — dòng 22

Scope: runResearch. Kiểu khai báo: inferred.

```ts
scores.map((score,i)=>({score,i})).sort((a,b)=>b.score-a.score||a.i-b.i)
```
### byIndex — dòng 22

Scope: runResearch. Kiểu khai báo: inferred.

```ts
new Map(crossRanks.map((row,rank)=>[row.i,rank]))
```
### seen — dòng 23

Scope: runResearch. Kiểu khai báo: inferred.

```ts
new Set<string>()
```
### items — dòng 23

Scope: runResearch. Kiểu khai báo: ResearchResponse['result']['items'].

```ts
[]
```
### paper — dòng 24

Scope: runResearch. Kiểu khai báo: inferred.

```ts
eligible.find(p=>p.id===evidence.paperId)!
```
### evidence — dòng 25

Scope: runResearch. Kiểu khai báo: inferred.

```ts
allEvidence.slice(0,6)
```
### research — dòng 25

Scope: runResearch. Kiểu khai báo: inferred.

```ts
extractiveReport(input.query,plan,evidence,eligible.length,passages.length)
```
### messages — dòng 26

Scope: runResearch. Kiểu khai báo: inferred.

```ts
synthesisPrompt(input.query,evidence.slice(0,4))
```
### output — dòng 26

Scope: runResearch. Kiểu khai báo: inferred.

```ts
''
```
### accepted — dòng 26

Scope: runResearch. Kiểu khai báo: inferred.

```ts
false
```
### providers — dòng 27

Scope: runResearch. Kiểu khai báo: ProviderStatus[].

```ts
(['arxiv','openalex'] as const).flatMap(provider=>{const rows=sources.filter(s=>s.status.provider===provider);if(!rows.length)return[];const ok=rows.filter(s=>s.status.status==='ok'||s.status.status==='cached'),count=new Set(rows.flatMap(s=>s.papers.map(p=>p.id))).size;return[{provider,status:ok.length?(rows.every(s=>s.status.status==='cached')?'cached':'ok'):rows[0]!.status.status,count,message:ok.length?'Đã tìm qua '+rows.length+' cách diễn đạt.':rows[0]!.status.message,durationMs:Math.max(...rows.map(s=>s.status.durationMs))}]})
```
### rows — dòng 27

Scope: runResearch. Kiểu khai báo: inferred.

```ts
sources.filter(s=>s.status.provider===provider)
```
### ok — dòng 27

Scope: runResearch. Kiểu khai báo: inferred.

```ts
rows.filter(s=>s.status.status==='ok'||s.status.status==='cached')
```
### count — dòng 27

Scope: runResearch. Kiểu khai báo: inferred.

```ts
new Set(rows.flatMap(s=>s.papers.map(p=>p.id))).size
```

## apps/api/lib/rag/service.ts

### cache — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
new Map<string,{until:number;response:ResearchResponse}>()
```
### data — dòng 13

Scope: researchSearch. Kiểu khai báo: inferred.

```ts
await getDataset()
```
### warnings — dòng 13

Scope: researchSearch. Kiểu khai báo: string[].

```ts
[]
```
### base — dòng 13

Scope: researchSearch. Kiểu khai báo: inferred.

```ts
{corpus:data.corpus,snapshot:data.index.snapshot}
```
### key — dòng 15

Scope: researchSearch. Kiểu khai báo: inferred.

```ts
JSON.stringify(input)+base.corpus.version
```
### found — dòng 15

Scope: researchSearch. Kiểu khai báo: inferred.

```ts
cache.get(key)
```
### response — dòng 16

Scope: researchSearch. Kiểu khai báo: inferred.

```ts
await runResearch(input,{dataset:async()=>base,embed:embedBatch,provider:searchProvider,generate,audit:auditPrompt,rerank:(query,texts)=>rerankLocal(path.resolve(process.cwd(),'../..'),query,texts)})
```

## apps/api/lib/repository.ts

### uri — dòng 14

Scope: getDataset. Kiểu khai báo: inferred.

```ts
process.env.MONGODB_URI
```
### storage — dòng 15

Scope: getDataset. Kiểu khai báo: StorageMode.

```ts
uri?'mongodb':'json'
```
### db — dòng 18

Scope: getDataset. Kiểu khai báo: inferred.

```ts
client.db()
```
### metadata — dòng 19

Scope: getDataset. Kiểu khai báo: inferred.

```ts
await db.collection('datasets').findOne({active:true},{projection:{_id:0}})
```
### papers — dòng 21

Scope: getDataset. Kiểu khai báo: inferred.

```ts
await db.collection('papers').find({},{projection:{_id:0}}).toArray()
```
### embeddings — dòng 23

Scope: getDataset. Kiểu khai báo: inferred.

```ts
await db.collection('embeddings').find({},{projection:{_id:0}}).toArray()
```
### bytes — dòng 23

Scope: getDataset. Kiểu khai báo: inferred.

```ts
e.vector instanceof Binary?Buffer.from(e.vector.buffer):undefined
```
### corpus — dòng 25

Scope: getDataset. Kiểu khai báo: inferred.

```ts
corpusSchema.parse(raw)
```
### snapshot — dòng 25

Scope: getDataset. Kiểu khai báo: inferred.

```ts
validateSnapshot(corpus,semanticRaw)
```
### hash — dòng 26

Scope: getDataset. Kiểu khai báo: inferred.

```ts
createHash('sha256').update('passage: '+paper.title+'\n'+paper.abstract).digest('hex')
```
### manifest — dòng 27

Scope: getDataset. Kiểu khai báo: inferred.

```ts
JSON.parse(await readFile(path.resolve(process.cwd(),'../../data/model-manifest.json'),'utf8'))
```
### result — dòng 28

Scope: getDataset. Kiểu khai báo: inferred.

```ts
{corpus,index:new SemanticIndex(corpus,snapshot),storage}
```

## apps/api/next.config.ts

### config — dòng 3

Scope: module. Kiểu khai báo: NextConfig.

```ts
{
  transpilePackages: ['@paper-galaxy/core'], poweredByHeader: false,
  serverExternalPackages:['@huggingface/transformers','onnxruntime-node'],
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  turbopack: { root: path.resolve(process.cwd(), '../..') },
  async headers() { return [{ source: '/:path*', headers: [ {key:'X-Content-Type-Options',value:'nosniff'}, {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'}, {key:'X-Frame-Options',value:'DENY'} ] }]; }
}
```

## apps/web/src/App.tsx

### MagicBook — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
lazy(()=>import('./scene/MagicBook'))
```
### initialCorpus — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
corpusSchema.parse(corpusFile)
```
### snapshot — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
validateSnapshot(initialCorpus,snapshotFile)
```
### initialBundle — dòng 14

Scope: module. Kiểu khai báo: DatasetBundle.

```ts
{corpus:initialCorpus,snapshot}
```
### [corpus,setCorpus] — dòng 17

Scope: App. Kiểu khai báo: inferred.

```ts
useState<Corpus>(initialCorpus)
```
### [source,setSource] — dòng 17

Scope: App. Kiểu khai báo: inferred.

```ts
useState<Source>('connecting')
```
### [onlineBundle,setOnlineBundle] — dòng 18

Scope: App. Kiểu khai báo: inferred.

```ts
useState<DatasetBundle|null>(null)
```
### [scope,setScope] — dòng 18

Scope: App. Kiểu khai báo: inferred.

```ts
useState<'library'|'online'|'combined'>('library')
```
### [providerStates,setProviderStates] — dòng 18

Scope: App. Kiểu khai báo: inferred.

```ts
useState<ProviderStatus[]>([])
```
### [searchEpoch,setSearchEpoch] — dòng 18

Scope: App. Kiểu khai báo: inferred.

```ts
useState(0)
```
### onlineRef — dòng 18

Scope: App. Kiểu khai báo: inferred.

```ts
useRef<DatasetBundle|null>(null)
```
### [draft,setDraft] — dòng 19

Scope: App. Kiểu khai báo: inferred.

```ts
useState('')
```
### [query,setQuery] — dòng 19

Scope: App. Kiểu khai báo: inferred.

```ts
useState('')
```
### [group,setGroup] — dòng 19

Scope: App. Kiểu khai báo: inferred.

```ts
useState<Group|'all'>('all')
```
### [year,setYear] — dòng 19

Scope: App. Kiểu khai báo: inferred.

```ts
useState('all')
```
### [selected,setSelected] — dòng 20

Scope: App. Kiểu khai báo: inferred.

```ts
useState<Paper|null>(null)
```
### [saved,setSaved] — dòng 20

Scope: App. Kiểu khai báo: inferred.

```ts
useState<string[]>([])
```
### [savedOnly,setSavedOnly] — dòng 20

Scope: App. Kiểu khai báo: inferred.

```ts
useState(false)
```
### [searching,setSearching] — dòng 20

Scope: App. Kiểu khai báo: inferred.

```ts
useState(false)
```
### [result,setResult] — dòng 21

Scope: App. Kiểu khai báo: inferred.

```ts
useState<SearchResult>(()=>new SemanticIndex(initialCorpus,snapshot).search({query:'',topK:50}))
```
### [completedQuery,setCompletedQuery] — dòng 22

Scope: App. Kiểu khai báo: inferred.

```ts
useState('')
```
### [research,setResearch] — dòng 23

Scope: App. Kiểu khai báo: inferred.

```ts
useState<ResearchReport|null>(null)
```
### [researchOpen,setResearchOpen] — dòng 23

Scope: App. Kiểu khai báo: inferred.

```ts
useState(false)
```
### [offlineReady,setOfflineReady] — dòng 24

Scope: App. Kiểu khai báo: inferred.

```ts
useState(()=>document.documentElement.dataset.offlineReady==='true')
```
### [castId,setCastId] — dòng 26

Scope: App. Kiểu khai báo: inferred.

```ts
useState(0)
```
### pendingOpen — dòng 26

Scope: App. Kiểu khai báo: inferred.

```ts
useRef<string|null>(null)
```
### [libraryOpen,setLibraryOpen] — dòng 27

Scope: App. Kiểu khai báo: inferred.

```ts
useState(false)
```
### [detailsOpen,setDetailsOpen] — dòng 27

Scope: App. Kiểu khai báo: inferred.

```ts
useState(false)
```
### selectPaper — dòng 28

Scope: App. Kiểu khai báo: inferred.

```ts
useCallback((paper:Paper|null)=>{pendingOpen.current=null;setSelected(paper);if(paper){setLibraryOpen(false);setDetailsOpen(false)}},[])
```
### [help,setHelp] — dòng 29

Scope: App. Kiểu khai báo: inferred.

```ts
useState(false)
```
### [sidebar,setSidebar] — dòng 29

Scope: App. Kiểu khai báo: inferred.

```ts
useState(false)
```
### [notice,setNotice] — dòng 29

Scope: App. Kiểu khai báo: inferred.

```ts
useState('')
```
### searchRef — dòng 29

Scope: App. Kiểu khai báo: inferred.

```ts
useRef<HTMLInputElement>(null)
```
### baseIndex — dòng 30

Scope: App. Kiểu khai báo: inferred.

```ts
useMemo(()=>new SemanticIndex(corpus,snapshot),[corpus])
```
### activeCorpus — dòng 31

Scope: App. Kiểu khai báo: inferred.

```ts
onlineBundle?.corpus??corpus
```
### activeSnapshot — dòng 31

Scope: App. Kiểu khai báo: inferred.

```ts
onlineBundle?.snapshot??snapshot
```
### index — dòng 32

Scope: App. Kiểu khai báo: inferred.

```ts
useMemo(()=>new SemanticIndex(activeCorpus,activeSnapshot),[activeCorpus,activeSnapshot])
```
### abort — dòng 34

Scope: App. Kiểu khai báo: inferred.

```ts
new AbortController()
```
### active — dòng 34

Scope: App. Kiểu khai báo: inferred.

```ts
true
```
### merged — dòng 36

Scope: App. Kiểu khai báo: inferred.

```ts
mergeBundles(initialBundle,bundle)
```
### response — dòng 37

Scope: App. Kiểu khai báo: inferred.

```ts
await fetch('/api/v1/papers',{signal:abort.signal})
```
### raw — dòng 37

Scope: App. Kiểu khai báo: unknown.

```ts
await response.json()
```
### data — dòng 37

Scope: App. Kiểu khai báo: inferred.

```ts
corpusSchema.parse(raw)
```
### storage — dòng 37

Scope: App. Kiểu khai báo: inferred.

```ts
raw&&typeof raw==='object'&&'storage'in raw?raw.storage:'json'
```
### local — dòng 37

Scope: App. Kiểu khai báo: inferred.

```ts
await loadCorpus()
```
### abort — dòng 45

Scope: App. Kiểu khai báo: inferred.

```ts
new AbortController()
```
### active — dòng 45

Scope: App. Kiểu khai báo: inferred.

```ts
true
```
### input — dòng 46

Scope: App. Kiểu khai báo: inferred.

```ts
searchSchema.parse({query,topK:50,...(group!=='all'?{group}:{}),...(year!=='all'?{yearFrom:Number(year)}:{})})
```
### timer — dòng 48

Scope: App. Kiểu khai báo: inferred.

```ts
window.setTimeout(async()=>{
   const local=async()=>{try{const started=performance.now(),localIndex=onlineRef.current?new SemanticIndex(onlineRef.current.corpus,onlineRef.current.snapshot):baseIndex;const vector=input.query?await embedQueryLocal(input.query):undefined;if(!active)return;const result=localIndex.search(input,vector);if(vector)result.queryPoint=localIndex.projectQuery(vector);result.durationMs=performance.now()-started;setResult(result);setResearch(input.query?documentFallbackReport(input.query,result):null);setCompletedQuery(input.query);setProviderStates([]);}catch(error){if(active){setNotice(error instanceof Error?error.message:'Không chạy được AI offline.');setResult({items:[],total:0,durationMs:0,method:'semantic',datasetVersion:corpus.version});setCompletedQuery(input.query);}}finally{if(active)setSearching(false)}};
   if(input.query.length>=2&&source!=='connecting'&&(source!=='local'||scope!=='library')){
    try{const response=await fetch('/api/v3/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,topK:12,scope}),signal:abort.signal});if(!response.ok)throw new Error('Truy xuất AI chưa sẵn sàng.');const data=researchResponseSchema.parse(await response.json());validateBundle(data.dataset);if(!active)return;const merged=mergeBundles(initialBundle,data.dataset,onlineRef.current??undefined);onlineRef.current=merged;setOnlineBundle(merged);setProviderStates(data.providers);setResearch(data.research);setResearchOpen(input.query.split(/\s+/).length>=5);const{queryPoint,...rest}=data.result;setResult(queryPoint?{...rest,queryPoint}:rest);setCompletedQuery(input.query);setSearching(false);if(data.warnings.length)setNotice(data.warnings.join(' '));saveOnlineDataset(merged).catch(()=>setNotice('Chưa lưu được bài/vector để dùng offline.'));return}catch{if(!active||abort.signal.aborted)return;setSource('local');setNotice('Backend AI chưa sẵn sàng; đang tìm bằng vector trong trình duyệt.');await local();return}
   }
   if(onlineRef.current){await local();return}
   if(source==='local'||source==='connecting'){await local();return}
   try{const response=await fetch('/api/v1/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:abort.signal});if(!response.ok)throw new Error('Search unavailable');const raw:unknown=await response.json();
    const parsed=searchResultSchema.parse(raw);
    if(parsed.datasetVersion!==corpus.version)throw new Error('Dataset version mismatch');
    if(active){const{queryPoint,...rest}=parsed;setResult(queryPoint?{...rest,queryPoint}:rest);setCompletedQuery(input.query);setSearching(false)}
   }catch{if(!active||abort.signal.aborted)return;setSource('local');await local();}
  },180)
```
### started — dòng 49

Scope: App. Kiểu khai báo: inferred.

```ts
performance.now()
```
### localIndex — dòng 49

Scope: App. Kiểu khai báo: inferred.

```ts
onlineRef.current?new SemanticIndex(onlineRef.current.corpus,onlineRef.current.snapshot):baseIndex
```
### vector — dòng 49

Scope: App. Kiểu khai báo: inferred.

```ts
input.query?await embedQueryLocal(input.query):undefined
```
### result — dòng 49

Scope: App. Kiểu khai báo: inferred.

```ts
localIndex.search(input,vector)
```
### response — dòng 51

Scope: App. Kiểu khai báo: inferred.

```ts
await fetch('/api/v3/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,topK:12,scope}),signal:abort.signal})
```
### data — dòng 51

Scope: App. Kiểu khai báo: inferred.

```ts
researchResponseSchema.parse(await response.json())
```
### merged — dòng 51

Scope: App. Kiểu khai báo: inferred.

```ts
mergeBundles(initialBundle,data.dataset,onlineRef.current??undefined)
```
### {queryPoint,...rest} — dòng 51

Scope: App. Kiểu khai báo: inferred.

```ts
data.result
```
### response — dòng 55

Scope: App. Kiểu khai báo: inferred.

```ts
await fetch('/api/v1/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:abort.signal})
```
### raw — dòng 55

Scope: App. Kiểu khai báo: unknown.

```ts
await response.json()
```
### parsed — dòng 56

Scope: App. Kiểu khai báo: inferred.

```ts
searchResultSchema.parse(raw)
```
### {queryPoint,...rest} — dòng 58

Scope: App. Kiểu khai báo: inferred.

```ts
parsed
```
### hits — dòng 63

Scope: App. Kiểu khai báo: inferred.

```ts
savedOnly&&!query?activeCorpus.papers.filter(paper=>saved.includes(paper.id)&&(group==='all'||paper.group===group)&&(year==='all'||paper.year>=Number(year))).map(paper=>({paper,score:0})):savedOnly?result.items.filter(hit=>saved.includes(hit.paper.id)):result.items
```
### counts — dòng 64

Scope: App. Kiểu khai báo: inferred.

```ts
useMemo(()=>Object.fromEntries(Object.keys(GROUPS).map(g=>[g,activeCorpus.papers.filter(p=>p.group===g).length])),[activeCorpus])
```
### neighbors — dòng 66

Scope: App. Kiểu khai báo: inferred.

```ts
useMemo(()=>selected?index.neighbors(selected,3):[],[selected,index])
```
### visualScores — dòng 67

Scope: App. Kiểu khai báo: inferred.

```ts
useMemo(()=>query?(completedQuery===query&&!searching?result.items.map(h=>({id:h.paper.id,score:h.score})):[]):selected?index.neighbors(selected,activeCorpus.papers.length-1).map(h=>({id:h.paper.id,score:h.score})).concat({id:selected.id,score:1}):[],[selected,index,activeCorpus.papers.length,query,result,completedQuery,searching])
```
### parsed — dòng 69

Scope: search. Kiểu khai báo: inferred.

```ts
searchSchema.safeParse({query:value,topK:50})
```
### next — dòng 69

Scope: search. Kiểu khai báo: inferred.

```ts
parsed.data.query
```
### next — dòng 71

Scope: bookmark. Kiểu khai báo: inferred.

```ts
!saved.includes(paper.id)
```
### isLocal — dòng 73

Scope: App. Kiểu khai báo: inferred.

```ts
source==='local'
```
### tone — dòng 95

Scope: App. Kiểu khai báo: inferred.

```ts
similarityTone(query?score:null)
```

## apps/web/src/main.tsx

### root — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
document.getElementById('root')
```

## apps/web/src/offline-ready.ts

### worker — dòng 5

Scope: checkOfflineReady. Kiểu khai báo: inferred.

```ts
navigator.serviceWorker.controller
```
### channel — dòng 5

Scope: checkOfflineReady. Kiểu khai báo: inferred.

```ts
new MessageChannel()
```
### timer — dòng 5

Scope: checkOfflineReady. Kiểu khai báo: inferred.

```ts
setTimeout(()=>channel.port1.close(),15000)
```

## apps/web/src/PaperDossier.tsx

### hasAbstract — dòng 8

Scope: PaperDossier. Kiểu khai báo: inferred.

```ts
paper.provenance?.abstractAvailable!==false
```
### words — dòng 8

Scope: PaperDossier. Kiểu khai báo: inferred.

```ts
hasAbstract?paper.abstract.trim().split(/\s+/).length:0
```
### source — dòng 8

Scope: PaperDossier. Kiểu khai báo: inferred.

```ts
paperSource(paper)
```
### pdfUrl — dòng 8

Scope: PaperDossier. Kiểu khai báo: inferred.

```ts
paper.provenance?.pdfUrl??(paper.sourceUrl.startsWith('https://arxiv.org/abs/')?'https://arxiv.org/pdf/'+paper.id:null)
```

## apps/web/src/ResearchPanel.tsx

### paper — dòng 10

Scope: ResearchPanel. Kiểu khai báo: inferred.

```ts
papers.find(p=>p.id===evidence.paperId)
```
### tone — dòng 10

Scope: ResearchPanel. Kiểu khai báo: inferred.

```ts
similarityTone(evidence.cosine)
```

## apps/web/src/scene/atmosphere.ts

### group — dòng 5

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new THREE.Group()
```
### ribbons — dòng 5

Scope: createAtmosphere. Kiểu khai báo: THREE.Mesh[].

```ts
[]
```
### hazeCanvas — dòng 6

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
document.createElement('canvas')
```
### ctx — dòng 6

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
hazeCanvas.getContext('2d')
```
### gradient — dòng 6

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
ctx.createRadialGradient(64,64,0,64,64,64)
```
### hazeMap — dòng 6

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new THREE.CanvasTexture(hazeCanvas)
```
### hazes — dòng 7

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
['#a63cff','#15d9ef','#ff4bba','#ffaf4b'].map((color,i)=>{const haze=new THREE.Sprite(new THREE.SpriteMaterial({map:hazeMap,color,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,toneMapped:false}));haze.scale.setScalar(18);haze.position.set((i-1.5)*7,3,-10);group.add(haze);return haze})
```
### haze — dòng 7

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new THREE.Sprite(new THREE.SpriteMaterial({map:hazeMap,color,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,toneMapped:false}))
```
### band — dòng 8

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
0
```
### vertices — dòng 9

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new Float32Array(181*3*3)
```
### colors — dòng 9

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new Float32Array(181*3*3)
```
### indices — dòng 9

Scope: createAtmosphere. Kiểu khai báo: number[].

```ts
[]
```
### i — dòng 9

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
0
```
### row — dòng 9

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
0
```
### axis — dòng 9

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
0
```
### i — dòng 9

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
0
```
### row — dòng 9

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
0
```
### a — dòng 9

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
i*3+row
```
### geometry — dòng 10

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new THREE.BufferGeometry()
```
### mesh — dòng 11

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:['#b444ff','#ff54c6','#45dfff','#ffc57d','#58ffd5','#7188ff'][band]??'#b444ff',vertexColors:true,transparent:true,opacity:.33,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}))
```
### positions — dòng 13

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new Float32Array(420*3)
```
### i — dòng 13

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
0
```
### dustColors — dòng 14

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new Float32Array(420*3)
```
### i — dòng 14

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
0
```
### c — dòng 14

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new THREE.Color(['#f59dff','#74eaff','#ffc986'][i%3]!)
```
### geometry — dòng 14

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new THREE.BufferGeometry()
```
### dust — dòng 14

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new THREE.Points(geometry,new THREE.PointsMaterial({vertexColors:true,size:.035,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}))
```
### halos — dòng 15

Scope: createAtmosphere. Kiểu khai báo: THREE.LineLoop[].

```ts
[]
```
### j — dòng 15

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
0
```
### ring — dòng 15

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new THREE.BufferGeometry().setFromPoints(Array.from({length:241},(_,i)=>{const p=new Complex(3.5+j*.22,0).rotate(i/240*Math.PI*2);return new THREE.Vector3(p.re,-2.1,p.im)}))
```
### p — dòng 15

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new Complex(3.5+j*.22,0).rotate(i/240*Math.PI*2)
```
### halo — dòng 15

Scope: createAtmosphere. Kiểu khai báo: inferred.

```ts
new THREE.LineLoop(ring,new THREE.LineBasicMaterial({color:j%2?'#91c8c6':'#bea6ed',transparent:true,opacity:.12-j*.02}))
```
### position — dòng 18

Scope: update. Kiểu khai báo: inferred.

```ts
mesh.geometry.getAttribute('position')
```
### i — dòng 18

Scope: update. Kiểu khai báo: inferred.

```ts
0
```
### edge — dòng 18

Scope: update. Kiểu khai báo: inferred.

```ts
0
```
### t — dòng 18

Scope: update. Kiểu khai báo: inferred.

```ts
i/180*Math.PI*2
```
### p — dòng 18

Scope: update. Kiểu khai báo: inferred.

```ts
new Complex(9+band*.9,0).rotate(t+time*.025*(band%2?-1:1))
```
### y — dòng 18

Scope: update. Kiểu khai báo: inferred.

```ts
1.5+Math.sin(t*2+time*.2+band)*2+Math.sin(t*5-time*.11)*.5+(edge-1)*(1.0+Math.sin(t*3+band)*.65)
```

## apps/web/src/scene/book-pages.ts

### lines — dòng 4

Scope: wrapLines. Kiểu khai báo: string[].

```ts
[]
```
### line — dòng 4

Scope: wrapLines. Kiểu khai báo: inferred.

```ts
''
```
### pages — dòng 7

Scope: readingPages. Kiểu khai báo: BookPage[].

```ts
[{heading:'HỒ SƠ NGHIÊN CỨU',kind:'cover',paper,lines:[...wrapLines(paper.title,25),'',String(paper.year),...wrapLines(paper.authors.slice(0,3).join(', '),26)]}]
```
### i — dòng 8

Scope: readingPages. Kiểu khai báo: inferred.

```ts
0
```
### source — dòng 9

Scope: readingPages. Kiểu khai báo: BookPage.

```ts
{heading:'ĐỌC TIẾP TOÀN VĂN',kind:'source',paper,lines:['Bạn đang xem hồ sơ và','tóm tắt của bài nghiên cứu.','','Toàn văn còn có hình ảnh,','công thức và kết quả chi tiết.','','Dùng nút nguồn hoặc PDF','để mở tài liệu gốc.','','Nguồn ngoài cần Internet.']}
```
### i — dòng 14

Scope: orbitMark. Kiểu khai báo: inferred.

```ts
0
```
### canvas — dòng 16

Scope: createPageTexture. Kiểu khai báo: inferred.

```ts
document.createElement('canvas')
```
### ctx — dòng 16

Scope: createPageTexture. Kiểu khai báo: inferred.

```ts
canvas.getContext('2d')
```
### paper — dòng 17

Scope: createPageTexture. Kiểu khai báo: inferred.

```ts
page?.paper
```
### field — dòng 17

Scope: createPageTexture. Kiểu khai báo: inferred.

```ts
paper?GROUPS[paper.group]:null
```
### accent — dòng 17

Scope: createPageTexture. Kiểu khai báo: inferred.

```ts
field?.color??'#a69ac1'
```
### wash — dòng 18

Scope: createPageTexture. Kiểu khai báo: inferred.

```ts
ctx.createLinearGradient(0,0,768,0)
```
### titleLines — dòng 23

Scope: createPageTexture. Kiểu khai báo: inferred.

```ts
wrapLines(paper.title,26)
```
### shown — dòng 23

Scope: createPageTexture. Kiểu khai báo: inferred.

```ts
titleLines.slice(0,8)
```
### y — dòng 23

Scope: createPageTexture. Kiểu khai báo: inferred.

```ts
block(ctx,shown,74,315,48,65,'#2c2a34')
```
### texture — dòng 34

Scope: createPageTexture. Kiểu khai báo: inferred.

```ts
new THREE.CanvasTexture(canvas)
```

## apps/web/src/scene/create-book-scene.ts

### canvas — dòng 17

Scope: textTexture. Kiểu khai báo: inferred.

```ts
document.createElement('canvas')
```
### ctx — dòng 17

Scope: textTexture. Kiểu khai báo: inferred.

```ts
canvas.getContext('2d')
```
### texture — dòng 18

Scope: textTexture. Kiểu khai báo: inferred.

```ts
new THREE.CanvasTexture(canvas)
```
### x — dòng 21

Scope: setMathematicalRotation. Kiểu khai báo: inferred.

```ts
rotatePoint3D({x:1,y:0,z:0},angles)
```
### y — dòng 21

Scope: setMathematicalRotation. Kiểu khai báo: inferred.

```ts
rotatePoint3D({x:0,y:1,z:0},angles)
```
### z — dòng 21

Scope: setMathematicalRotation. Kiểu khai báo: inferred.

```ts
rotatePoint3D({x:0,y:0,z:1},angles)
```
### renderer — dòng 25

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})
```
### scene — dòng 26

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Scene()
```
### camera — dòng 26

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.PerspectiveCamera(42,1,.1,100)
```
### key — dòng 27

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.DirectionalLight('#fff4dd',3)
```
### light — dòng 28

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.PointLight('#a697ff',30,18)
```
### glow — dòng 28

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.PointLight('#a9ede1',10,8)
```
### atmosphere — dòng 29

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
createAtmosphere(scene)
```
### portal — dòng 30

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
createKnowledgePortal(scene)
```
### book — dòng 31

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Group()
```
### table — dòng 31

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
createEnchantingTable()
```
### floor — dòng 32

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.CylinderGeometry(3.1,3.4,.12,96),new THREE.MeshStandardMaterial({color:'#151b2d',metalness:.7,roughness:.25}))
```
### leather — dòng 33

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.MeshStandardMaterial({color:'#374258',roughness:.48,metalness:.38})
```
### gold — dòng 33

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.MeshStandardMaterial({color:'#cfb886',metalness:.8,roughness:.28})
```
### paperMaterial — dòng 33

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.MeshStandardMaterial({color:'#e6dac1',roughness:.9})
```
### pageMaps — dòng 35

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
[createPageTexture(null),createPageTexture(null)]
```
### pageMaterials — dòng 35

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
pageMaps.map(map=>new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide,toneMapped:false,transparent:true}))
```
### spine — dòng 36

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.BoxGeometry(.22,.25,2.65),leather)
```
### band — dòng 36

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.BoxGeometry(.24,.28,.085),gold)
```
### halves — dòng 37

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
[new THREE.Group(),new THREE.Group()]
```
### side — dòng 39

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
i===0?-1:1
```
### cover — dòng 39

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.BoxGeometry(1.6,.1,2.72),leather)
```
### edge — dòng 40

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.BoxGeometry(1.55,.115,2.65),gold)
```
### inset — dòng 41

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.BoxGeometry(1.48,.122,2.57),leather)
```
### block — dòng 42

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.BoxGeometry(1.46,.2,2.5),paperMaterial)
```
### j — dòng 43

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
0
```
### line — dòng 43

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.BoxGeometry(1.475,.006,2.51),new THREE.MeshStandardMaterial({color:j%2?'#d0bd99':'#f4e5c8'}))
```
### top — dòng 44

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.PlaneGeometry(1.46,2.5),pageMaterials[i])
```
### corner — dòng 45

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.BoxGeometry(.23,.145,.2),gold)
```
### leafGeometry — dòng 48

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.PlaneGeometry(1.46,2.5,24,1)
```
### leafBase — dòng 48

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
Float32Array.from(leafGeometry.getAttribute('position').array)
```
### leafMaterial — dòng 49

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.MeshBasicMaterial({side:THREE.FrontSide,toneMapped:false,transparent:true,depthTest:false})
```
### leafBackMaterial — dòng 49

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.MeshBasicMaterial({side:THREE.BackSide,toneMapped:false,transparent:true,depthTest:false})
```
### leaf — dòng 49

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(leafGeometry,leafMaterial)
```
### leafBack — dòng 49

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(leafGeometry,leafBackMaterial)
```
### turnFrontTexture — dòng 49

Scope: createBookScene. Kiểu khai báo: THREE.Texture|null.

```ts
null
```
### turnBackTexture — dòng 49

Scope: createBookScene. Kiểu khai báo: THREE.Texture|null.

```ts
null
```
### glyphTextures — dòng 50

Scope: createBookScene. Kiểu khai báo: THREE.Texture[].

```ts
[]
```
### textureCache — dòng 50

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new Map<string,THREE.Texture>()
```
### glyphs — dòng 50

Scope: createBookScene. Kiểu khai báo: Glyph[].

```ts
[]
```
### i — dòng 51

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
0
```
### paper — dòng 52

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
papers[i%papers.length]!
```
### characters — dòng 52

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
Array.from(paper.title.replace(/[^\p{L}\p{N}]/gu,''))
```
### character — dòng 52

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
characters[Math.floor(i/papers.length)%characters.length]??'∑'
```
### texture — dòng 52

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
textureCache.get(character)
```
### sprite — dòng 53

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#d1d5ef',transparent:true,opacity:.65,depthWrite:false,toneMapped:false}))
```
### map — dòng 56

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Group()
```
### mapNodes — dòng 56

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new Map<string,THREE.Mesh>()
```
### mapPaper — dòng 56

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new Map(papers.map(p=>[p.id,p]))
```
### halos — dòng 56

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new Map<string,THREE.Sprite>()
```
### semanticIndex — dòng 57

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new SemanticIndex({version:snapshot.corpusVersion,title:'',fetchedAt:'',papers},snapshot)
```
### haloCanvas — dòng 58

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
document.createElement('canvas')
```
### haloContext — dòng 58

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
haloCanvas.getContext('2d')!
```
### haloWash — dòng 58

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
haloContext.createRadialGradient(32,32,0,32,32,32)
```
### haloTexture — dòng 58

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.CanvasTexture(haloCanvas)
```
### paper — dòng 59

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
mapPaper.get(embedding.paperId)
```
### mesh — dòng 59

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.SphereGeometry(.085,16,12),new THREE.MeshBasicMaterial({color:GROUPS[paper.group].color,toneMapped:false,transparent:true,opacity:.55}))
```
### p — dòng 59

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
toLibraryPoint(embedding.point)
```
### halo — dòng 59

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Sprite(new THREE.SpriteMaterial({map:haloTexture,color:GROUPS[paper.group].color,transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}))
```
### queryNode — dòng 60

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.OctahedronGeometry(.12),new THREE.MeshBasicMaterial({color:'#fff3ad',wireframe:true}))
```
### edgeGeometry — dòng 61

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.BufferGeometry()
```
### edges — dòng 61

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.LineSegments(edgeGeometry,new THREE.LineBasicMaterial({color:'#79f6dc',transparent:true,opacity:.8,toneMapped:false}))
```
### beamGeometry — dòng 62

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.BufferGeometry()
```
### beamMaterial — dòng 62

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,toneMapped:false})
```
### beams — dòng 62

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.LineSegments(beamGeometry,beamMaterial)
```
### networkMaterial — dòng 63

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,toneMapped:false})
```
### network — dòng 63

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.LineSegments(new THREE.BufferGeometry(),networkMaterial)
```
### linkLights — dòng 63

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({vertexColors:true,size:.07,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,toneMapped:false,depthWrite:false}))
```
### links — dòng 63

Scope: createBookScene. Kiểu khai báo: SemanticLink[].

```ts
[]
```
### neighborRows — dòng 64

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
papers.map(paper=>({id:paper.id,neighbors:semanticIndex.neighbors(paper,papers.length-1).map(hit=>({id:hit.paper.id,score:hit.score}))}))
```
### visible — dòng 65

Scope: updateNetwork. Kiểu khai báo: inferred.

```ts
new Set([...mapNodes].filter(([,node])=>node.visible).map(([id])=>id))
```
### positions — dòng 65

Scope: updateNetwork. Kiểu khai báo: number[].

```ts
[]
```
### colors — dòng 65

Scope: updateNetwork. Kiểu khai báo: number[].

```ts
[]
```
### lightColors — dòng 65

Scope: updateNetwork. Kiểu khai báo: number[].

```ts
[]
```
### point — dòng 65

Scope: updateNetwork. Kiểu khai báo: inferred.

```ts
mapNodes.get(id)!.position
```
### color — dòng 65

Scope: updateNetwork. Kiểu khai báo: inferred.

```ts
baseColors.get(id)??new THREE.Color(GROUPS[mapPaper.get(id)!.group].color)
```
### color — dòng 65

Scope: updateNetwork. Kiểu khai báo: inferred.

```ts
baseColors.get(link.a)??new THREE.Color('#a9cfff')
```
### points — dòng 66

Scope: updateEdges. Kiểu khai báo: THREE.Vector3[].

```ts
[]
```
### source — dòng 66

Scope: updateEdges. Kiểu khai báo: inferred.

```ts
mapNodes.get(paper.id)
```
### target — dòng 66

Scope: updateEdges. Kiểu khai báo: inferred.

```ts
mapNodes.get(neighbor.paper.id)
```
### ritual — dòng 67

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new BookRitual()
```
### reduced — dòng 67

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
window.matchMedia('(prefers-reduced-motion: reduce)')
```
### selected — dòng 68

Scope: createBookScene. Kiểu khai báo: Paper|null.

```ts
null
```
### focus — dòng 68

Scope: createBookScene. Kiểu khai báo: PageFocus.

```ts
'auto'
```
### paused — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
false
```
### disposed — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
false
```
### elapsed — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
0
```
### last — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
0
```
### frame — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
0
```
### spread — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
0
```
### pendingSpread — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
0
```
### pages — dòng 68

Scope: createBookScene. Kiểu khai báo: BookPage[].

```ts
[]
```
### notified — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
''
```
### hoverId — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
''
```
### lastProjection — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
0
```
### activeLetterCount — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
0
```
### activeTargets — dòng 68

Scope: createBookScene. Kiểu khai báo: string[].

```ts
[]
```
### pendingScores — dòng 68

Scope: createBookScene. Kiểu khai báo: {id:string;score:number}[]|null.

```ts
null
```
### currentPageAngle — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
.72
```
### scoreValues — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new Map<string,number>()
```
### worldNodes — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new Map<string,Point3>()
```
### neutralInk — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Color('#d1d5ef')
```
### baseColors — dòng 68

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new Map<string,THREE.Color>()
```
### yaw — dòng 69

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
Math.PI/2
```
### targetYaw — dòng 69

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
Math.PI/2
```
### pitch — dòng 69

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
.43
```
### targetPitch — dòng 69

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
.43
```
### radius — dòng 69

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
16
```
### targetRadius — dòng 69

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
12
```
### centerY — dòng 69

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
2.8
```
### centerX — dòng 69

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
0
```
### centerZ — dòng 69

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
-1.8
```
### signature — dòng 70

Scope: publish. Kiểu khai báo: inferred.

```ts
`${ritual.phase}:${spread}:${pages.length}`
```
### material — dòng 71

Scope: paintPage. Kiểu khai báo: inferred.

```ts
pageMaterials[side]!
```
### plan — dòng 74

Scope: planLetters. Kiểu khai báo: inferred.

```ts
orderLetters(glyphs.map(g=>g.paperId),scoreValues,new Set([...mapNodes].filter(([,n])=>n.visible).map(([id])=>id)))
```
### positions — dòng 74

Scope: planLetters. Kiểu khai báo: inferred.

```ts
new Float32Array(activeTargets.length*6)
```
### colors — dòng 74

Scope: planLetters. Kiểu khai báo: inferred.

```ts
new Float32Array(activeTargets.length*6)
```
### c — dòng 74

Scope: planLetters. Kiểu khai báo: inferred.

```ts
new THREE.Color(similarityTone(scoreValues.get(id)??null).color)
```
### end — dòng 74

Scope: planLetters. Kiểu khai báo: inferred.

```ts
0
```
### color — dòng 75

Scope: colorScores. Kiểu khai báo: inferred.

```ts
scoreValues.has(id)?similarityTone(scoreValues.get(id)!).color:GROUPS[mapPaper.get(id)!.group].color
```
### resize — dòng 76

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new ResizeObserver(()=>{const rect=canvas.getBoundingClientRect();if(rect.width&&rect.height){renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix()}})
```
### rect — dòng 76

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
canvas.getBoundingClientRect()
```
### clickStart — dòng 77

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
{x:0,y:0}
```
### raycaster — dòng 77

Scope: createBookScene. Kiểu khai báo: inferred.

```ts
new THREE.Raycaster()
```
### rect — dòng 79

Scope: pickPaper. Kiểu khai báo: inferred.

```ts
canvas.getBoundingClientRect()
```
### hit — dòng 79

Scope: pickPaper. Kiểu khai báo: inferred.

```ts
raycaster.intersectObjects([book,table,...[...mapNodes.values()].filter(n=>n.visible)],true)[0]
```
### paper — dòng 80

Scope: move. Kiểu khai báo: inferred.

```ts
pickPaper(e.clientX,e.clientY)
```
### id — dòng 80

Scope: move. Kiểu khai báo: inferred.

```ts
paper?.id??''
```
### paper — dòng 81

Scope: up. Kiểu khai báo: inferred.

```ts
pickPaper(e.clientX,e.clientY)
```
### dt — dòng 88

Scope: animate. Kiểu khai báo: inferred.

```ts
Math.min(.05,Math.max(0,(now-last)/1000))
```
### motion — dòng 88

Scope: animate. Kiểu khai báo: inferred.

```ts
!paused&&!reduced.matches
```
### previous — dòng 89

Scope: animate. Kiểu khai báo: inferred.

```ts
ritual.phase
```
### side — dòng 89

Scope: animate. Kiểu khai báo: inferred.

```ts
pendingSpread>spread?1:0
```
### scores — dòng 89

Scope: animate. Kiểu khai báo: inferred.

```ts
pendingScores
```
### state — dòng 89

Scope: animate. Kiểu khai báo: inferred.

```ts
ritual.sample()
```
### blend — dòng 90

Scope: animate. Kiểu khai báo: inferred.

```ts
state.zoom
```
### turnView — dòng 90

Scope: animate. Kiểu khai báo: inferred.

```ts
state.phase==='turn-framing'||state.phase==='turning'
```
### reading — dòng 90

Scope: animate. Kiểu khai báo: inferred.

```ts
readingCamera(camera.aspect,turnView?'both':focus)
```
### compact — dòng 90

Scope: animate. Kiểu khai báo: inferred.

```ts
camera.aspect<.8
```
### foldFrame — dòng 91

Scope: animate. Kiểu khai báo: inferred.

```ts
state.phase==='zooming'||state.phase==='turn-framing'?1:state.phase==='opening'||state.phase==='turning'?1-smooth((state.p-.7)/.3):0
```
### protectInk — dòng 92

Scope: animate. Kiểu khai báo: inferred.

```ts
(state.phase==='reading'||turnView)&&currentPageAngle<.22
```
### filmYaw — dòng 93

Scope: animate. Kiểu khai báo: inferred.

```ts
Math.PI/2+(1.35-Math.PI/2)*state.cast
```
### filmPitch — dòng 93

Scope: animate. Kiểu khai báo: inferred.

```ts
.43+(.36-.43)*state.cast
```
### filmRadius — dòng 93

Scope: animate. Kiểu khai báo: inferred.

```ts
16+1.5*state.cast
```
### filmCenter — dòng 93

Scope: animate. Kiểu khai báo: inferred.

```ts
2.8+.2*state.cast
```
### pos — dòng 99

Scope: animate. Kiểu khai báo: inferred.

```ts
orbitPosition(radius,yaw,pitch,{x:centerX,y:centerY,z:centerZ})
```
### bookScale — dòng 99

Scope: animate. Kiểu khai báo: inferred.

```ts
1.2+.4*blend
```
### landing — dòng 100

Scope: animate. Kiểu khai báo: inferred.

```ts
state.phase==='settling'?state.linear*state.linear:state.land
```
### breathing — dòng 101

Scope: animate. Kiểu khai báo: inferred.

```ts
Math.sin(elapsed*1.25)*.055*(state.phase==='idle'?1:0)
```
### bookRoll — dòng 103

Scope: animate. Kiểu khai báo: inferred.

```ts
['opening','reading','turn-framing','turning','exit-closing'].includes(state.phase) ? .1-currentPageAngle : -(1.54-.1)*state.lay
```
### cloudAngle — dòng 104

Scope: animate. Kiểu khai báo: inferred.

```ts
Math.sin(elapsed*.18)*.12+elapsed*.018
```
### cloudScale — dòng 104

Scope: animate. Kiểu khai báo: inferred.

```ts
compact?.7:1
```
### point — dòng 105

Scope: animate. Kiểu khai báo: inferred.

```ts
node.getWorldPosition(new THREE.Vector3())
```
### forward — dòng 108

Scope: animate. Kiểu khai báo: inferred.

```ts
pendingSpread>spread
```
### attr — dòng 108

Scope: animate. Kiểu khai báo: inferred.

```ts
leafGeometry.getAttribute('position')
```
### i — dòng 108

Scope: animate. Kiểu khai báo: inferred.

```ts
0
```
### x — dòng 108

Scope: animate. Kiểu khai báo: inferred.

```ts
(leafBase[i*3]??0)+.78
```
### z — dòng 108

Scope: animate. Kiểu khai báo: inferred.

```ts
leafBase[i*3+1]??0
```
### angle — dòng 108

Scope: animate. Kiểu khai báo: inferred.

```ts
.1+(forward?state.flip:1-state.flip)*(Math.PI-.2)
```
### bend — dòng 108

Scope: animate. Kiểu khai báo: inferred.

```ts
Math.sin((x-.05)/1.46*Math.PI)*Math.sin(state.flip*Math.PI)*.18
```
### p — dòng 108

Scope: animate. Kiểu khai báo: inferred.

```ts
new Complex(x,bend).rotate(angle)
```
### arrived — dòng 109

Scope: animate. Kiểu khai báo: inferred.

```ts
0
```
### inTransit — dòng 109

Scope: animate. Kiểu khai báo: inferred.

```ts
0
```
### neutralGlyphs — dòng 109

Scope: animate. Kiểu khai báo: inferred.

```ts
0
```
### coloredGlyphs — dòng 109

Scope: animate. Kiểu khai báo: inferred.

```ts
0
```
### i — dòng 109

Scope: animate. Kiểu khai báo: inferred.

```ts
0
```
### g — dòng 110

Scope: animate. Kiểu khai báo: inferred.

```ts
glyphs[i]!
```
### orbit — dòng 110

Scope: animate. Kiểu khai báo: inferred.

```ts
new Complex(g.radius,0).rotate(g.angle+elapsed*g.speed)
```
### ambient — dòng 110

Scope: animate. Kiểu khai báo: inferred.

```ts
{x:orbit.re,y:g.height+Math.sin(elapsed*.8+g.phase)*.18,z:orbit.im}
```
### node — dòng 110

Scope: animate. Kiểu khai báo: inferred.

```ts
worldNodes.get(g.paperId)
```
### material — dòng 110

Scope: animate. Kiểu khai báo: inferred.

```ts
g.sprite.material as THREE.SpriteMaterial
```
### position — dòng 110

Scope: animate. Kiểu khai báo: inferred.

```ts
ambient
```
### visible — dòng 110

Scope: animate. Kiểu khai báo: inferred.

```ts
state.phase==='idle'||state.phase==='waiting'||state.phase==='exit-opening'
```
### opacity — dòng 110

Scope: animate. Kiểu khai báo: inferred.

```ts
.55+.18*Math.sin(elapsed+g.phase)
```
### colorMix — dòng 110

Scope: animate. Kiểu khai báo: inferred.

```ts
0
```
### t — dòng 111

Scope: animate. Kiểu khai báo: inferred.

```ts
flightProgress(ritual.age,g.rank,activeLetterCount)
```
### delay — dòng 113

Scope: animate. Kiểu khai báo: inferred.

```ts
g.rank/Math.max(1,activeLetterCount)*1.0
```
### local — dòng 113

Scope: animate. Kiểu khai báo: inferred.

```ts
(ritual.age-delay)%1.6
```
### t — dòng 113

Scope: animate. Kiểu khai báo: inferred.

```ts
local/1.3
```
### p — dòng 113

Scope: animate. Kiểu khai báo: inferred.

```ts
arcPoint(node,portal.group.position,smooth(t),.8)
```
### swirl — dòng 113

Scope: animate. Kiểu khai báo: inferred.

```ts
new Complex(.35*Math.sin(t*Math.PI)*(1-t),0).rotate(t*Math.PI*6+g.phase)
```
### delay — dòng 114

Scope: animate. Kiểu khai báo: inferred.

```ts
launchDelay(i,glyphs.length)*.3
```
### t — dòng 114

Scope: animate. Kiểu khai báo: inferred.

```ts
smooth((ritual.age-delay)/1.4)
```
### ink — dòng 115

Scope: animate. Kiểu khai báo: inferred.

```ts
baseColors.get(g.paperId)
```
### haloIndex — dòng 117

Scope: animate. Kiểu khai báo: inferred.

```ts
0
```
### node — dòng 117

Scope: animate. Kiểu khai báo: inferred.

```ts
mapNodes.get(id)!
```
### active — dòng 117

Scope: animate. Kiểu khai báo: inferred.

```ts
activeTargets.includes(id)
```
### pulse — dòng 117

Scope: animate. Kiểu khai báo: inferred.

```ts
active?state.charge:0
```
### base — dòng 117

Scope: animate. Kiểu khai báo: inferred.

```ts
scoreValues.has(id)?similarityTone(scoreValues.get(id)!).color:GROUPS[mapPaper.get(id)!.group].color
```
### emphasis — dòng 117

Scope: animate. Kiểu khai báo: inferred.

```ts
scoreValues.size===0?.95:active?1:.5
```
### material — dòng 117

Scope: animate. Kiểu khai báo: inferred.

```ts
node.material as THREE.MeshBasicMaterial
```
### lightPositions — dòng 118

Scope: animate. Kiểu khai báo: inferred.

```ts
linkLights.geometry.getAttribute('position')
```
### a — dòng 118

Scope: animate. Kiểu khai báo: inferred.

```ts
mapNodes.get(link.a)!.position
```
### b — dòng 118

Scope: animate. Kiểu khai báo: inferred.

```ts
mapNodes.get(link.b)!.position
```
### t — dòng 118

Scope: animate. Kiểu khai báo: inferred.

```ts
(elapsed*.23+i*.381)%1
```
### beamPositions — dòng 120

Scope: animate. Kiểu khai báo: inferred.

```ts
beams.geometry.getAttribute('position')
```
### point — dòng 120

Scope: animate. Kiểu khai báo: inferred.

```ts
worldNodes.get(id)!
```
### p — dòng 123

Scope: animate. Kiểu khai báo: inferred.

```ts
node.getWorldPosition(new THREE.Vector3()).project(camera)
```
### next — dòng 131

Scope: turn. Kiểu khai báo: inferred.

```ts
Math.max(0,Math.min(pages.length/2-1,spread+Math.sign(direction)))
```
### forward — dòng 131

Scope: turn. Kiểu khai báo: inferred.

```ts
next>spread
```
### frontIndex — dòng 131

Scope: turn. Kiểu khai báo: inferred.

```ts
forward?spread*2+1:next*2+1
```
### backIndex — dòng 131

Scope: turn. Kiểu khai báo: inferred.

```ts
forward?next*2:spread*2
```
### visible — dòng 134

Scope: filter. Kiểu khai báo: inferred.

```ts
new Set(ids)
```
### p — dòng 135

Scope: setQuery. Kiểu khai báo: inferred.

```ts
toLibraryPoint(point)
```
### geometries — dòng 136

Scope: dispose. Kiểu khai báo: inferred.

```ts
new Set<THREE.BufferGeometry>()
```
### materials — dòng 136

Scope: dispose. Kiểu khai báo: inferred.

```ts
new Set<THREE.Material>()
```
### textures — dòng 136

Scope: dispose. Kiểu khai báo: inferred.

```ts
new Set<THREE.Texture>(glyphTextures)
```

## apps/web/src/scene/enchanting-table.ts

### table — dòng 4

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
new THREE.Group()
```
### stoneColors — dòng 5

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
['#211c32','#292239','#30273e','#231f35','#3b2b48']
```
### stone — dòng 6

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
stoneColors.map(color=>new THREE.MeshStandardMaterial({color,roughness:.95,metalness:.16}))
```
### dark — dòng 7

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
new THREE.MeshStandardMaterial({color:'#161723',roughness:.85})
```
### red — dòng 8

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
new THREE.MeshStandardMaterial({color:'#a73746',roughness:.85})
```
### edge — dòng 9

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
new THREE.MeshStandardMaterial({color:'#63314a',roughness:.8})
```
### brass — dòng 10

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
new THREE.MeshStandardMaterial({color:'#bc9566',metalness:.5,roughness:.5})
```
### gem — dòng 11

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
new THREE.MeshStandardMaterial({color:'#47d8d4',emissive:'#168eac',emissiveIntensity:.8,roughness:.25,metalness:.35})
```
### mesh — dòng 12

Scope: block. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material)
```
### side — dòng 14

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
0
```
### row — dòng 14

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
0
```
### col — dòng 14

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
0
```
### center — dòng 15

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
-1.24+col*.413
```
### level — dòng 15

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
-1.59+row*.36
```
### material — dòng 16

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
stone[(col*3+row*5+side)%stone.length]??dark
```
### i — dòng 26

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
0
```
### angle — dòng 26

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
i*Math.PI/6
```
### rune — dòng 26

Scope: createEnchantingTable. Kiểu khai báo: inferred.

```ts
block(.05,.018,.18,Math.cos(angle)*.9,-.443,Math.sin(angle)*.9,brass)
```

## apps/web/src/scene/knowledge-portal.ts

### group — dòng 5

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
new THREE.Group()
```
### disk — dòng 6

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.CircleGeometry(.68,96),new THREE.MeshBasicMaterial({color:'#03020c',side:THREE.DoubleSide,toneMapped:false}))
```
### canvas — dòng 7

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
document.createElement('canvas')
```
### ctx — dòng 7

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
canvas.getContext('2d')!
```
### wash — dòng 7

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
ctx.createRadialGradient(128,128,0,128,128,128)
```
### map — dòng 7

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
new THREE.CanvasTexture(canvas)
```
### edge — dòng 8

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}))
```
### rings — dòng 9

Scope: createKnowledgePortal. Kiểu khai báo: THREE.Mesh[].

```ts
[]
```
### i — dòng 10

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
0
```
### ring — dòng 10

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
new THREE.Mesh(new THREE.TorusGeometry(.79,.008,6,96),new THREE.MeshBasicMaterial({color:'#ad83d8',transparent:true,opacity:.48,toneMapped:false}))
```
### spirals — dòng 11

Scope: createKnowledgePortal. Kiểu khai báo: THREE.Line[].

```ts
[]
```
### arm — dòng 12

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
0
```
### points — dòng 12

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
Array.from({length:94},(_,i)=>{const t=i/93,p=new Complex(.07+t*.68,0).rotate(t*Math.PI*3+arm*Math.PI);return new THREE.Vector3(p.re,.025+Math.sin(t*Math.PI)*.025,p.im)})
```
### t — dòng 12

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
i/93
```
### p — dòng 12

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
new Complex(.07+t*.68,0).rotate(t*Math.PI*3+arm*Math.PI)
```
### line — dòng 12

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:arm%2?'#7bbdb6':'#a88bd2',transparent:true,opacity:.38,toneMapped:false}))
```
### light — dòng 13

Scope: createKnowledgePortal. Kiểu khai báo: inferred.

```ts
new THREE.PointLight('#ae79ff',0,8)
```

## apps/web/src/scene/letter-flight.ts

### t — dòng 7

Scope: arcPoint. Kiểu khai báo: inferred.

```ts
Math.max(0,Math.min(1,progress))
```
### u — dòng 7

Scope: arcPoint. Kiểu khai báo: inferred.

```ts
1-t
```
### targets — dòng 11

Scope: orderLetters. Kiểu khai báo: inferred.

```ts
[...scores].filter(([id,score])=>visible.has(id)&&Number.isFinite(score)).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([id])=>id)
```
### priority — dòng 12

Scope: orderLetters. Kiểu khai báo: inferred.

```ts
new Map(targets.map((id,i)=>[id,i]))
```
### indices — dòng 13

Scope: orderLetters. Kiểu khai báo: inferred.

```ts
paperIds.map((paperId,index)=>({paperId,index,priority:priority.get(paperId)})).filter((x):x is{paperId:string;index:number;priority:number}=>x.priority!==undefined).sort((a,b)=>a.priority-b.priority||a.index-b.index)
```

## apps/web/src/scene/MagicBook.tsx

### phaseLabels — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
{idle:'Một câu hỏi mới đang chờ bạn.',waiting:'Đang hiểu câu hỏi và tính độ tương đồng…',vortex:'01 · Chữ tìm về các node liên quan — thưa rồi nhanh dần',charging:'02 · Các node tích sáng trong ba nhịp',channeling:'03 · Truyền tri thức vào hố đen trên sách',sealing:'Hố đen thu nhỏ và khép lại…',closing:'Khép sách, giữ lại những kết nối…',settling:'Cuốn sách hạ nhẹ xuống bục…',zooming:'Đến gần trang tri thức…',opening:'Mở sách để đọc…',reading:'Kéo để khám phá · Chọn trái/phải để đọc lớn','turn-framing':'Lùi góc nhìn để lật trang…',turning:'Lật sang một góc nhìn mới…','exit-closing':'Khép lại trang sách…','exit-zoom':'Lùi lại để giải phóng tri thức…','exit-reopen':'Mở sách trước khi giải phóng chữ…','exit-release':'Chữ trở về các node, rồi bay ra không gian','exit-opening':'Cuốn sách tiếp tục lơ lửng…'}
```
### canvas — dòng 9

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
useRef<HTMLCanvasElement>(null)
```
### scene — dòng 9

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
useRef<BookSceneHandle|null>(null)
```
### container — dòng 9

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
useRef<HTMLDivElement>(null)
```
### [status,setStatus] — dòng 10

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
useState('loading')
```
### [paused,setPaused] — dòng 10

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
useState(false)
```
### [focus,setFocus] — dòng 10

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
useState<PageFocus>('auto')
```
### [hover,setHover] — dòng 10

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
useState<SpatialHover>(null)
```
### [reading,setReading] — dòng 11

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
useState<ReadingState>({phase:'idle',spread:0,spreads:1})
```
### isReading — dòng 21

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
reading.phase==='reading'
```
### selectedIndex — dòng 21

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
visibleIds.indexOf(paper?.id??'')
```
### next — dòng 32

Scope: MagicBook. Kiểu khai báo: inferred.

```ts
papers.find(p=>p.id===visibleIds[selectedIndex+1])
```

## apps/web/src/scene/ritual.ts

### DURATIONS — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
{idle:0,waiting:0,vortex:5,charging:2.1,channeling:3.8,sealing:1,closing:.75,settling:1,zooming:.9,opening:1.2,reading:0,'turn-framing':.55,turning:1.05,'exit-closing':.8,'exit-zoom':1,'exit-reopen':1.1,'exit-release':2.6,'exit-opening':.8} as const
```
### t — dòng 4

Scope: smooth. Kiểu khai báo: inferred.

```ts
Math.max(0,Math.min(1,value))
```
### SIMILARITY_BANDS — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
{high:.82,medium:.79} as const
```
### s — dòng 18

Scope: close. Kiểu khai báo: inferred.

```ts
this.sample()
```
### next — dòng 24

Scope: tick. Kiểu khai báo: Partial<Record<Phase,Phase>>.

```ts
{vortex:'charging',charging:'channeling',channeling:'sealing',sealing:'closing',closing:'settling',settling:'zooming',zooming:'opening',opening:'reading','turn-framing':'turning',turning:'reading','exit-closing':'exit-zoom','exit-zoom':'exit-reopen','exit-reopen':'exit-release','exit-release':'exit-opening','exit-opening':'idle'}
```
### guard — dòng 25

Scope: tick. Kiểu khai báo: inferred.

```ts
0
```
### duration — dòng 27

Scope: tick. Kiểu khai báo: inferred.

```ts
DURATIONS[this.phase]
```
### target — dòng 27

Scope: tick. Kiểu khai báo: inferred.

```ts
next[this.phase]
```
### phase — dòng 31

Scope: sample. Kiểu khai báo: inferred.

```ts
this.phase
```
### linear — dòng 31

Scope: sample. Kiểu khai báo: inferred.

```ts
DURATIONS[phase]?Math.min(1,this.age/DURATIONS[phase]):0
```
### p — dòng 31

Scope: sample. Kiểu khai báo: inferred.

```ts
smooth(linear)
```
### closed — dòng 31

Scope: sample. Kiểu khai báo: inferred.

```ts
1.54
```
### rest — dòng 31

Scope: sample. Kiểu khai báo: inferred.

```ts
.72
```
### read — dòng 31

Scope: sample. Kiểu khai báo: inferred.

```ts
.10
```
### angle — dòng 32

Scope: sample. Kiểu khai báo: inferred.

```ts
rest
```
### zoom — dòng 32

Scope: sample. Kiểu khai báo: inferred.

```ts
0
```
### portal — dòng 32

Scope: sample. Kiểu khai báo: inferred.

```ts
0
```
### charge — dòng 32

Scope: sample. Kiểu khai báo: inferred.

```ts
0
```
### lay — dòng 32

Scope: sample. Kiểu khai báo: inferred.

```ts
0
```
### land — dòng 32

Scope: sample. Kiểu khai báo: inferred.

```ts
0
```
### release — dòng 32

Scope: sample. Kiểu khai báo: inferred.

```ts
0
```
### flip — dòng 32

Scope: sample. Kiểu khai báo: inferred.

```ts
0
```
### cast — dòng 32

Scope: sample. Kiểu khai báo: inferred.

```ts
0
```

## apps/web/src/scene/semantic-links.ts

### links — dòng 4

Scope: sparseSemanticLinks. Kiểu khai báo: SemanticLink[].

```ts
[]
```
### seen — dòng 4

Scope: sparseSemanticLinks. Kiểu khai báo: inferred.

```ts
new Set<string>()
```
### degree — dòng 4

Scope: sparseSemanticLinks. Kiểu khai báo: inferred.

```ts
new Map<string,number>()
```
### pass — dòng 5

Scope: sparseSemanticLinks. Kiểu khai báo: inferred.

```ts
0
```
### key — dòng 8

Scope: sparseSemanticLinks. Kiểu khai báo: inferred.

```ts
[row.id,neighbor.id].sort().join('|')
```

## apps/web/src/scene/spatial-layout.ts

### CLOUD_SCALE — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
2
```
### PAGE_WIDTH_SCALE — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
1.22
```
### single — dòng 8

Scope: readingCamera. Kiểu khai báo: inferred.

```ts
focus==='left'||focus==='right'||focus==='auto'&&aspect<.8
```
### side — dòng 9

Scope: readingCamera. Kiểu khai báo: inferred.

```ts
focus==='right'?1:-1
```
### width — dòng 10

Scope: readingCamera. Kiểu khai báo: inferred.

```ts
single?2.5*PAGE_WIDTH_SCALE:5.4*PAGE_WIDTH_SCALE
```
### distance — dòng 11

Scope: readingCamera. Kiểu khai báo: inferred.

```ts
Math.max(single?5.8:7.25,width/(2*Math.tan(21*Math.PI/180)*Math.max(.2,aspect)*.76))
```

## apps/web/src/semantic/client.ts

### cache — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
new Map<string,number[]>()
```
### pending — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
new Map<string,{resolve:(vector:number[])=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>()
```
### request — dòng 4

Scope: getWorker. Kiểu khai báo: inferred.

```ts
pending.get(event.data.id)
```
### found — dòng 5

Scope: embedQueryLocal. Kiểu khai báo: inferred.

```ts
cache.get(query)
```
### w — dòng 5

Scope: embedQueryLocal. Kiểu khai báo: inferred.

```ts
getWorker()
```
### id — dòng 5

Scope: embedQueryLocal. Kiểu khai báo: inferred.

```ts
crypto.randomUUID()
```
### vector — dòng 5

Scope: embedQueryLocal. Kiểu khai báo: inferred.

```ts
await new Promise<number[]>((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Model offline mất quá nhiều thời gian.'))},90000);pending.set(id,{resolve,reject,timer});w.postMessage({id,query})})
```
### timer — dòng 5

Scope: embedQueryLocal. Kiểu khai báo: inferred.

```ts
setTimeout(()=>{pending.delete(id);reject(new Error('Model offline mất quá nhiều thời gian.'))},90000)
```

## apps/web/src/semantic/embedding.worker.ts

### queue — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
Promise.resolve()
```
### {id,query} — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
event.data
```
### model — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
await extractor
```
### output — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
await model('query: '+query,{pooling:'mean',normalize:true})
```

## apps/web/src/storage.ts

### database — dòng 4

Scope: saveCorpus. Kiểu khai báo: inferred.

```ts
await db()
```
### database — dòng 5

Scope: loadCorpus. Kiểu khai báo: inferred.

```ts
await db()
```
### raw — dòng 5

Scope: loadCorpus. Kiểu khai báo: unknown.

```ts
await database.get('library','active')
```
### parsed — dòng 5

Scope: loadCorpus. Kiểu khai báo: inferred.

```ts
corpusSchema.safeParse(raw)
```
### database — dòng 6

Scope: loadBookmarks. Kiểu khai báo: inferred.

```ts
await db()
```
### keys — dòng 6

Scope: loadBookmarks. Kiểu khai báo: inferred.

```ts
await database.getAllKeys('bookmarks')
```
### database — dòng 7

Scope: setBookmark. Kiểu khai báo: inferred.

```ts
await db()
```
### database — dòng 8

Scope: saveOnlineDataset. Kiểu khai báo: inferred.

```ts
await db()
```
### database — dòng 9

Scope: loadOnlineDataset. Kiểu khai báo: inferred.

```ts
await db()
```
### raw — dòng 9

Scope: loadOnlineDataset. Kiểu khai báo: unknown.

```ts
await database.get('online','active')
```

## apps/web/vite.config.ts

### filename — dòng 6

Scope: configureServer. Kiểu khai báo: inferred.

```ts
new URL(req.url,'http://local').pathname.slice('/wasm/'.length)
```
### bytes — dòng 6

Scope: configureServer. Kiểu khai báo: inferred.

```ts
await readFile(path.join(server.config.publicDir,'wasm',filename))
```

## packages/core/src/contracts.ts

### groupSchema — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
z.enum(['ai', 'biology', 'medicine', 'physics'])
```
### GROUPS — dòng 4

Scope: module. Kiểu khai báo: Record<Group, { label: string; color: string; short: string }>.

```ts
{
  ai: { label: 'Trí tuệ nhân tạo', color: '#a68aef', short: 'AI' },
  biology: { label: 'Sinh học', color: '#58bdb0', short: 'BIO' },
  medicine: { label: 'Y sinh', color: '#e4a773', short: 'MED' },
  physics: { label: 'Vật lý', color: '#7da7e5', short: 'PHY' }
}
```
### safeHttpsUrl — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
z.string().url().refine(value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password}catch{return false}},'Cần URL HTTPS hợp lệ.')
```
### url — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
new URL(value)
```
### paperSchema — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({
  id: z.string().regex(/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7}|oa:W\d+)$/),
  title: z.string().min(1).max(1000), abstract: z.string().min(1).max(20000),
  authors: z.array(z.string()).min(1), year: z.number().int().min(1900).max(2100),
  group: groupSchema, categories: z.array(z.string()), sourceUrl: safeHttpsUrl.refine(s=>{const url=new URL(s);return url.hostname==='arxiv.org'&&url.pathname.startsWith('/abs/')||url.hostname==='openalex.org'&&/^\/W\d+$/.test(url.pathname)||url.hostname==='doi.org'&&url.pathname.startsWith('/10.')}),
  tags: z.array(z.string()), summary: z.string().min(1),
  provenance:z.object({provider:z.enum(['arxiv','openalex']),fetchedAt:z.string().datetime(),doi:z.string().max(300).nullable(),abstractAvailable:z.boolean(),pdfUrl:safeHttpsUrl.nullable()}).strict().optional(),
}).strict()
```
### url — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
new URL(s)
```
### corpusSchema — dòng 20

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({ version: z.string(), title: z.string(), fetchedAt: z.string(), papers: z.array(paperSchema).min(1) })
```
### searchSchema — dòng 22

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({
  query: z.string().trim().max(300).default(''),
  group: groupSchema.optional(),
  yearFrom: z.number().int().min(1900).max(2100).optional(),
  yearTo: z.number().int().min(1900).max(2100).optional(),
  topK: z.number().int().min(1).max(50).default(20)
}).strict().refine(x=>x.yearFrom===undefined||x.yearTo===undefined||x.yearFrom<=x.yearTo,{message:'Năm bắt đầu phải nhỏ hơn hoặc bằng năm kết thúc.'})
```
### searchResultSchema — dòng 32

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({items:z.array(z.object({paper:paperSchema,score:z.number().finite().min(-1).max(1)}).strict()),total:z.number().int().min(0),durationMs:z.number().finite().min(0),method:z.enum(['tfidf','semantic']),datasetVersion:z.string(),queryPoint:z.object({x:z.number().finite(),y:z.number().finite(),z:z.number().finite()}).strict().optional()}).strict()
```

## packages/core/src/math.ts

### c — dòng 5

Scope: rotate. Kiểu khai báo: inferred.

```ts
Math.cos(angle)
```
### s — dòng 5

Scope: rotate. Kiểu khai báo: inferred.

```ts
Math.sin(angle)
```
### yz — dòng 9

Scope: rotatePoint3D. Kiểu khai báo: inferred.

```ts
new Complex(point.y,point.z).rotate(angles.x)
```
### zx — dòng 10

Scope: rotatePoint3D. Kiểu khai báo: inferred.

```ts
new Complex(yz.im,point.x).rotate(angles.y)
```
### xy — dòng 11

Scope: rotatePoint3D. Kiểu khai báo: inferred.

```ts
new Complex(zx.im,yz.re).rotate(angles.z)
```
### p — dòng 17

Scope: orbitPosition. Kiểu khai báo: inferred.

```ts
Math.max(-1.25,Math.min(1.25,pitch))
```
### horizontal — dòng 18

Scope: orbitPosition. Kiểu khai báo: inferred.

```ts
new Complex(radius*Math.cos(p),0).rotate(yaw)
```

## packages/core/src/online.ts

### onlineSearchSchema — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({query:z.string().trim().min(2).max(300),scope:z.enum(['online','combined']),group:z.enum(['ai','biology','medicine','physics']).optional(),yearFrom:z.number().int().min(1900).max(2100).optional(),yearTo:z.number().int().min(1900).max(2100).optional(),topK:z.number().int().min(1).max(20).default(12)}).strict().refine(value=>searchSchema.safeParse({query:value.query,topK:value.topK,...(value.group?{group:value.group}:{}),...(value.yearFrom!==undefined?{yearFrom:value.yearFrom}:{}),...(value.yearTo!==undefined?{yearTo:value.yearTo}:{})}).success,'Bộ lọc không hợp lệ.')
```
### datasetBundleSchema — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({corpus:corpusSchema,snapshot:semanticSnapshotSchema}).strict()
```
### providerStatusSchema — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({provider:z.enum(['arxiv','openalex']),status:z.enum(['ok','cached','error','rate-limited']),count:z.number().int().nonnegative(),message:z.string(),durationMs:z.number().nonnegative()}).strict()
```
### onlineResponseSchema — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({dataset:datasetBundleSchema,result:searchResultSchema,providers:z.array(providerStatusSchema),scope:z.enum(['online','combined']),ranking:z.literal('e5-cosine-384d'),storage:z.enum(['mongodb','memory']),warnings:z.array(z.string())}).strict()
```
### researchResponseSchema — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
onlineResponseSchema.omit({scope:true,ranking:true}).extend({scope:z.enum(['library','online','combined']),ranking:z.enum(['hybrid-e5-bm25-rrf','hybrid-e5-bm25-rrf-rerank']),research:researchReportSchema}).strict()
```
### bundle — dòng 15

Scope: validateBundle. Kiểu khai báo: inferred.

```ts
datasetBundleSchema.parse(raw)
```
### papers — dòng 19

Scope: mergeBundles. Kiểu khai báo: inferred.

```ts
new Map(base.corpus.papers.map(p=>[p.id,p]))
```
### vectors — dòng 19

Scope: mergeBundles. Kiểu khai báo: inferred.

```ts
new Map(base.snapshot.papers.map(p=>[p.paperId,p]))
```
### byId — dòng 20

Scope: mergeBundles. Kiểu khai báo: inferred.

```ts
new Map(bundle.snapshot.papers.map(p=>[p.paperId,p]))
```
### version — dòng 21

Scope: mergeBundles. Kiểu khai báo: inferred.

```ts
`${base.corpus.version}-cached-${papers.size}-${incoming.corpus.version}`
```
### corpus — dòng 22

Scope: mergeBundles. Kiểu khai báo: Corpus.

```ts
{...base.corpus,version,papers:[...papers.values()]}
```
### snapshot — dòng 22

Scope: mergeBundles. Kiểu khai báo: SemanticSnapshot.

```ts
{...base.snapshot,corpusVersion:version,papers:[...papers.keys()].map(id=>vectors.get(id)!)}
```

## packages/core/src/rag.ts

### researchRequestSchema — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({query:z.string().trim().min(2).max(300),scope:z.enum(['library','online','combined']).default('library'),topK:z.number().int().min(1).max(20).default(12),group:z.enum(['ai','biology','medicine','physics']).optional(),yearFrom:z.number().int().min(1900).max(2100).optional(),yearTo:z.number().int().min(1900).max(2100).optional()}).strict().refine(({scope,...input})=>searchSchema.safeParse(input).success,'Bộ lọc không hợp lệ.')
```
### queryPlanSchema — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({original:z.string(),intent:z.string().min(1).max(500),queries:z.array(z.string().min(2).max(160)).min(1).max(3),method:z.enum(['local-llm','original'])}).strict()
```
### evidenceSchema — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({id:z.string().regex(/^E\d+$/),paperId:z.string(),title:z.string(),url:safeHttpsUrl,quote:z.string(),start:z.number().int().nonnegative(),end:z.number().int().nonnegative(),cosine:z.number().min(-1).max(1),fusionScore:z.number().nonnegative(),coverage:z.enum(['abstract','title']),rerankScore:z.number().optional()}).strict()
```
### researchReportSchema — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({query:z.string(),plan:queryPlanSchema,retrieval:z.enum(['hybrid-passages','document-fallback']),mode:z.enum(['grounded-generation','extractive','insufficient']),claims:z.array(z.object({text:z.string().min(1).max(900),evidenceIds:z.array(z.string()).min(1).max(4)}).strict()).max(4),evidence:z.array(evidenceSchema).max(6),gaps:z.array(z.string()).max(8),traceId:z.string().nullable(),model:z.string().nullable(),metrics:z.object({candidates:z.number().int().nonnegative(),passages:z.number().int().nonnegative(),elapsedMs:z.number().nonnegative()})}).strict()
```
### coverage — dòng 18

Scope: chunkPaper. Kiểu khai báo: inferred.

```ts
paper.provenance?.abstractAvailable===false?'title':'abstract'
```
### text — dòng 18

Scope: chunkPaper. Kiểu khai báo: inferred.

```ts
coverage==='title'?paper.title:paper.abstract
```
### words — dòng 18

Scope: chunkPaper. Kiểu khai báo: inferred.

```ts
[...text.matchAll(/\S+/g)]
```
### chunks — dòng 18

Scope: chunkPaper. Kiểu khai báo: Passage[].

```ts
[]
```
### i — dòng 19

Scope: chunkPaper. Kiểu khai báo: inferred.

```ts
0
```
### start — dòng 19

Scope: chunkPaper. Kiểu khai báo: inferred.

```ts
words[i]!.index!
```
### last — dòng 19

Scope: chunkPaper. Kiểu khai báo: inferred.

```ts
words[Math.min(words.length,i+maxWords)-1]!
```
### end — dòng 19

Scope: chunkPaper. Kiểu khai báo: inferred.

```ts
last.index!+last[0].length
```
### tokens — dòng 26

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
passages.map(p=>terms(p.paper.title+' '+p.text))
```
### needles — dòng 26

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
[...new Set(terms(queryText))]
```
### average — dòng 26

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
tokens.reduce((n,t)=>n+t.length,0)/Math.max(1,tokens.length)
```
### df — dòng 26

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
new Map(needles.map(word=>[word,tokens.filter(row=>row.includes(word)).length]))
```
### lexical — dòng 27

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
tokens.map(row=>needles.reduce((sum,word)=>{const tf=row.filter(w=>w===word).length;if(!tf)return sum;const idf=Math.log(1+(tokens.length-(df.get(word)??0)+.5)/((df.get(word)??0)+.5));return sum+idf*tf*2.2/(tf+1.2*(.25+.75*row.length/Math.max(1,average)))},0))
```
### tf — dòng 27

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
row.filter(w=>w===word).length
```
### idf — dòng 27

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
Math.log(1+(tokens.length-(df.get(word)??0)+.5)/((df.get(word)??0)+.5))
```
### dense — dòng 28

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
queries.map(query=>vectors.map(vector=>cosineSimilarity(query,vector)))
```
### ranks — dòng 28

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
dense.map(scores=>scores.map((score,i)=>({score,i})).sort((a,b)=>b.score-a.score||a.i-b.i))
```
### fusion — dòng 29

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
passages.map(()=>0)
```
### selected — dòng 31

Scope: rankPassages. Kiểu khai báo: number[].

```ts
[]
```
### perPaper — dòng 31

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
new Map<string,number>()
```
### passage — dòng 31

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
passages[row.i]!
```
### count — dòng 31

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
perPaper.get(passage.paper.id)??0
```
### p — dòng 32

Scope: rankPassages. Kiểu khai báo: inferred.

```ts
passages[i]!
```
### evidence — dòng 38

Scope: documentFallbackReport. Kiểu khai báo: inferred.

```ts
result.items.slice(0,6).flatMap((hit,i)=>{const chunk=chunkPaper(hit.paper)[0];return chunk?[{id:'E'+(i+1),paperId:hit.paper.id,title:hit.paper.title,url:hit.paper.sourceUrl,quote:chunk.text,start:chunk.start,end:chunk.end,cosine:hit.score,fusionScore:0,coverage:chunk.coverage}]:[]})
```
### chunk — dòng 38

Scope: documentFallbackReport. Kiểu khai báo: inferred.

```ts
chunkPaper(hit.paper)[0]
```
### report — dòng 39

Scope: documentFallbackReport. Kiểu khai báo: inferred.

```ts
extractiveReport(query,{original:query,intent:query,queries:[query.slice(0,160)],method:'original'},evidence,result.total,result.total,result.durationMs)
```
### parsed — dòng 43

Scope: validateGroundedClaims. Kiểu khai báo: inferred.

```ts
z.object({claims:z.array(z.object({text:z.string().trim().min(1).max(900),evidenceIds:z.array(z.string()).min(1).max(4)}).strict()).min(1).max(4)}).strict().parse(raw)
```
### ids — dòng 43

Scope: validateGroundedClaims. Kiểu khai báo: inferred.

```ts
new Set(evidence.map(e=>e.id))
```

## packages/core/src/search.ts

### stop — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
new Set('the a an of and or to in on for with is are by from as at we this that our be using via can it its'.split(' '))
```
### dictionary — dòng 3

Scope: module. Kiểu khai báo: Record<string,string>.

```ts
{ 'ai':'artificial intelligence learning neural','tri tue nhan tao':'artificial intelligence learning neural','hoc may':'machine learning','hoc sau':'deep learning neural','anh':'image imaging vision','te bao':'cell cellular','sinh hoc':'biology biological protein gene','protein':'protein folding structure','y te':'medical clinical health','y sinh':'biomedical medical imaging','benh':'disease diagnosis medical','ung thu':'cancer tumor','vat ly':'physics physical','luong tu':'quantum','tim kiem':'search retrieval','ngon ngu':'language linguistic','mang no ron':'neural network','phat hien':'detection classification','phan doan':'segmentation','gen':'gene genome genetic','sinh anh':'image generative diffusion','nguoi may':'robot robotics','vaccine':'vaccine immune' }
```
### normalized — dòng 6

Scope: expandQuery. Kiểu khai báo: inferred.

```ts
normalizeText(query)
```
### out — dòng 7

Scope: counts. Kiểu khai báo: inferred.

```ts
new Map<string,number>()
```
### docs — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
corpus.papers.map(p=>counts(tokenize(`${p.title} ${p.title} ${p.abstract} ${p.tags.join(' ')} ${p.summary}`)))
```
### frequencies — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
new Map<string,number>()
```
### vector — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
new Map([...doc].map(([t,n])=>[t,(1+Math.log(n))*(this.idf.get(t)||1)]))
```
### norm — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
magnitude(vector)
```
### input — dòng 18

Scope: search. Kiểu khai báo: inferred.

```ts
searchSchema.parse(raw)
```
### started — dòng 18

Scope: search. Kiểu khai báo: inferred.

```ts
performance.now()
```
### queryCounts — dòng 18

Scope: search. Kiểu khai báo: inferred.

```ts
counts(tokenize(expandQuery(input.query)))
```
### q — dòng 19

Scope: search. Kiểu khai báo: inferred.

```ts
new Map([...queryCounts].map(([t,n])=>[t,(1+Math.log(n))*(this.idf.get(t)||0)]))
```
### norm — dòng 19

Scope: search. Kiểu khai báo: inferred.

```ts
magnitude(q)
```
### items — dòng 20

Scope: search. Kiểu khai báo: inferred.

```ts
this.corpus.papers.flatMap((paper,i)=>{
   if(input.group!==undefined&&paper.group!==input.group||input.yearFrom!==undefined&&paper.year<input.yearFrom||input.yearTo!==undefined&&paper.year>input.yearTo)return [];
   const vector=this.documents[i];const score=input.query?Math.min(1,[...q].reduce((sum,[t,n])=>sum+n*(vector?.get(t)||0),0)):0;
   return input.query&&score<0.00001?[]:[{paper,score}];
  }).sort((a,b)=>input.query?b.score-a.score||a.paper.id.localeCompare(b.paper.id):b.paper.year-a.paper.year||a.paper.id.localeCompare(b.paper.id))
```
### vector — dòng 22

Scope: search. Kiểu khai báo: inferred.

```ts
this.documents[i]
```
### score — dòng 22

Scope: search. Kiểu khai báo: inferred.

```ts
input.query?Math.min(1,[...q].reduce((sum,[t,n])=>sum+n*(vector?.get(t)||0),0)):0
```

## packages/core/src/semantic.ts

### finite — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
z.number().finite()
```
### pointSchema — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({x:finite,y:finite,z:finite}).strict()
```
### vectorSchema — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
z.array(finite).length(384).refine(v=>Math.abs(Math.hypot(...v)-1)<.002,'Vector chưa L2 normalize.')
```
### semanticSnapshotSchema — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
z.object({
 version:z.string(),corpusVersion:z.string(),createdAt:z.string(),corpusHash:z.string(),
 model:z.object({id:z.literal('Xenova/multilingual-e5-small'),revision:z.string(),dtype:z.literal('q8'),dimensions:z.literal(384),pipelineVersion:z.string()}).strict(),
 projection:z.object({mean:z.array(finite).length(384),components:z.array(z.array(finite).length(384)).length(3),explainedVariance:z.array(finite).length(3),center:pointSchema,scale:finite.positive(),seed:z.number().int()}).strict(),
 papers:z.array(z.object({paperId:z.string(),textHash:z.string(),vector:vectorSchema,point:pointSchema}).strict()).min(2)
}).strict()
```
### snapshot — dòng 15

Scope: validateSnapshot. Kiểu khai báo: inferred.

```ts
semanticSnapshotSchema.parse(raw)
```
### ids — dòng 17

Scope: validateSnapshot. Kiểu khai báo: inferred.

```ts
new Set(snapshot.papers.map(p=>p.paperId))
```
### expected — dòng 18

Scope: validateSnapshot. Kiểu khai báo: inferred.

```ts
projectPca(p.vector,snapshot.projection)
```
### input — dòng 25

Scope: search. Kiểu khai báo: inferred.

```ts
searchSchema.parse(raw)
```
### started — dòng 25

Scope: search. Kiểu khai báo: inferred.

```ts
performance.now()
```
### hits — dòng 26

Scope: search. Kiểu khai báo: inferred.

```ts
this.corpus.papers.flatMap(paper=>{
   if(input.group&&paper.group!==input.group||input.yearFrom!==undefined&&paper.year<input.yearFrom||input.yearTo!==undefined&&paper.year>input.yearTo)return[];
   const embedding=this.byId.get(paper.id);if(!embedding)throw new Error('Thiếu vector.');return[{paper,score:queryVector?cosineSimilarity(queryVector,embedding.vector):0}];
  }).sort((a,b)=>queryVector?b.score-a.score||a.paper.id.localeCompare(b.paper.id):b.paper.year-a.paper.year||a.paper.id.localeCompare(b.paper.id))
```
### embedding — dòng 28

Scope: search. Kiểu khai báo: inferred.

```ts
this.byId.get(paper.id)
```
### own — dòng 32

Scope: neighbors. Kiểu khai báo: inferred.

```ts
this.byId.get(paper.id)
```
### neighbors — dòng 34

Scope: bridgeEvidence. Kiểu khai báo: inferred.

```ts
this.neighbors(paper,10)
```
### counts — dòng 34

Scope: bridgeEvidence. Kiểu khai báo: Record<string,number>.

```ts
{}
```
### entropy — dòng 34

Scope: bridgeEvidence. Kiểu khai báo: inferred.

```ts
neighbors.length?-Object.values(counts).reduce((sum,n)=>sum+(n/neighbors.length)*Math.log(n/neighbors.length),0)/Math.log(4):0
```

## packages/core/src/vector.ts

### norm — dòng 5

Scope: normalizeVector. Kiểu khai báo: inferred.

```ts
Math.hypot(...input)
```
### av — dòng 8

Scope: cosineSimilarity. Kiểu khai báo: inferred.

```ts
normalizeVector(a)
```
### bv — dòng 8

Scope: cosineSimilarity. Kiểu khai báo: inferred.

```ts
normalizeVector(b,a.length)
```
### centered — dòng 13

Scope: projectPca. Kiểu khai báo: inferred.

```ts
vector.map((x,i)=>x-(projection.mean[i]??0))
```
### raw — dòng 13

Scope: projectPca. Kiểu khai báo: inferred.

```ts
projection.components.map(v=>dot(centered,v))
```
### first — dòng 18

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
vectors[0]
```
### dimensions — dòng 18

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
first.length
```
### mean — dòng 20

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
Array.from({length:dimensions},(_,i)=>vectors.reduce((sum,v)=>sum+(v[i]??0),0)/vectors.length)
```
### centered — dòng 21

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
vectors.map(v=>v.map((x,i)=>x-(mean[i]??0)))
```
### totalVariance — dòng 21

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
centered.reduce((sum,v)=>sum+dot(v,v),0)
```
### components — dòng 22

Scope: fitPca3. Kiểu khai báo: number[][].

```ts
[]
```
### explainedVariance — dòng 22

Scope: fitPca3. Kiểu khai báo: number[].

```ts
[]
```
### axis — dòng 23

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
0
```
### direction — dòng 24

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
Array.from({length:dimensions},(_,i)=>Math.sin((i+1)*(seed+axis*13.37)))
```
### iteration — dòng 25

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
0
```
### next — dòng 26

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
new Array<number>(dimensions).fill(0)
```
### weight — dòng 27

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
dot(row,direction)
```
### d — dòng 27

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
0
```
### amount — dòng 28

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
dot(next,previous)
```
### d — dòng 28

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
0
```
### norm — dòng 29

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
Math.hypot(...next)
```
### normalized — dòng 30

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
next.map(x=>x/norm)
```
### change — dòng 30

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
Math.hypot(...normalized.map((x,i)=>x-(direction[i]??0)))
```
### signIndex — dòng 32

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
0
```
### d — dòng 32

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
1
```
### variance — dòng 34

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
centered.reduce((sum,row)=>sum+dot(row,direction)**2,0)
```
### raw — dòng 36

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
centered.map(v=>components.map(c=>dot(v,c)))
```
### mins — dòng 36

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
[0,1,2].map(i=>Math.min(...raw.map(v=>v[i]??0)))
```
### maxs — dòng 36

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
[0,1,2].map(i=>Math.max(...raw.map(v=>v[i]??0)))
```
### center — dòng 37

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
{x:((mins[0]??0)+(maxs[0]??0))/2,y:((mins[1]??0)+(maxs[1]??0))/2,z:((mins[2]??0)+(maxs[2]??0))/2}
```
### maxRadius — dòng 38

Scope: fitPca3. Kiểu khai báo: inferred.

```ts
Math.max(...raw.map(p=>Math.hypot((p[0]??0)-center.x,(p[1]??0)-center.y,(p[2]??0)-center.z)),1e-8)
```

## scripts/build-sw.mjs

### folder — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('apps/web/dist')
```
### entries — dòng 5

Scope: walk. Kiểu khai báo: inferred.

```ts
await fs.readdir(dir,{withFileTypes:true})
```
### lists — dòng 5

Scope: walk. Kiểu khai báo: inferred.

```ts
await Promise.all(entries.map(async e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.relative(folder,path.join(dir,e.name)).replaceAll('\\','/')]))
```
### files — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
(await walk(folder)).filter(f=>!f.endsWith('.map')&&f!=='sw.js')
```
### version — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
createHash('sha256').update(await fs.readFile(path.join(folder,'index.html'))).digest('hex').slice(0,12)
```
### sw — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
`const CACHE='paper-magic-${version}-v2';
const ASSETS=${JSON.stringify(files.map(f=>'/'+f))};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('paper-magic-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',event=>{if(event.data?.type!=='offline-status')return;event.waitUntil((async()=>{const cache=await caches.open(CACHE);let missing=(await Promise.all(ASSETS.map(async url=>await cache.match(url,{ignoreVary:true})?null:url))).filter(Boolean);if(missing.length){try{await cache.addAll(missing.map(url=>new Request(url,{cache:'reload'})));missing=[]}catch{}}event.ports[0]?.postMessage({ready:missing.length===0,version:CACHE,missing})})())});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;if(event.request.mode==='navigate'){event.respondWith((async()=>{try{return await fetch(event.request)}catch{const cache=await caches.open(CACHE);return await cache.match('/index.html',{ignoreVary:true})||new Response('Chưa cài đủ dữ liệu offline. Mở trang có mạng một lần để cài lại.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})}})());return;}event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreVary:true})).then(cached=>cached||fetch(event.request)));});
`
```

## scripts/capture-book-qa.mjs

### browser — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']})
```
### page — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
await browser.newPage({viewport:{width:1440,height:1000}})
```
### errors — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### shots — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### canvas — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
page.getByTestId('magic-book')
```
### initialNeutral — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
Number(await canvas.getAttribute('data-neutral-glyphs'))
```
### initialColored — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
Number(await canvas.getAttribute('data-colored-glyphs'))
```
### c — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
document.querySelector('canvas')
```
### path — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
'.local/screenshots/qa-'+name+'.png'
```
### c — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
document.querySelector('canvas')
```
### path — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
'.local/screenshots/qa-'+name+'.png'
```
### reopenLetters — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
Number(await canvas.getAttribute('data-letters-in-transit'))
```
### c — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
document.querySelector('canvas')
```
### releaseAngle — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
Number(await canvas.getAttribute('data-page-angle'))
```
### report — dòng 14

Scope: module. Kiểu khai báo: inferred.

```ts
{timestamp:new Date().toISOString(),errors,shots,spread:await canvas.getAttribute('data-spread'),neutralGlyphsInitially:initialNeutral,coloredGlyphsInitially:initialColored,reopenLetters,releaseAngle,networkEdges:Number(await canvas.getAttribute('data-network-edges')),pageFocus:await canvas.getAttribute('data-page-focus'),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}
```

## scripts/capture-dossier.mjs

### browser — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']})
```
### page — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
```
### errors — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### canvas — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
page.getByTestId('magic-book')
```
### pdf — dòng 25

Scope: module. Kiểu khai báo: inferred.

```ts
await page.getByRole('link',{name:/Đọc PDF đầy đủ/}).getAttribute('href')
```
### overflow — dòng 30

Scope: module. Kiểu khai báo: inferred.

```ts
await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
```
### report — dòng 33

Scope: module. Kiểu khai báo: inferred.

```ts
{timestamp:new Date().toISOString(),errors,overflow,pdf,paper:await canvas.getAttribute('data-paper'),pageCount:await page.locator('.reader-navigation').textContent(),screenshots:['dossier-book','dossier-abstract-pages','dossier-desktop','dossier-fulltext','dossier-mobile','dossier-mobile-fulltext']}
```

## scripts/capture-liquid.mjs

### browser — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']})
```
### page — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1})
```
### errors — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### canvas — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
page.getByTestId('magic-book')
```

## scripts/capture-online.mjs

### browser — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']})
```
### page — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
```
### errors — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### canvas — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
page.getByTestId('magic-book')
```
### report — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
{errors,selected:await canvas.getAttribute('data-paper'),nodes:await canvas.getAttribute('data-nodes'),providers:await page.locator('.provider-status').textContent(),link:await page.getByRole('link',{name:'Mở bài gốc',exact:true}).getAttribute('href')}
```

## scripts/capture-research.mjs

### browser — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']})
```
### page — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
```
### errors — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### panel — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
page.getByRole('region',{name:'Dẫn chứng ngữ nghĩa'})
```
### report — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
{date:new Date().toISOString(),realApi:true,requestedTopK:6,errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),mode:response?.research?.mode,plan:response?.research?.plan,claims:response?.research?.claims,traceId:response?.research?.traceId,quotes:await panel.locator('blockquote').count()}
```

## scripts/capture-ritual.mjs

### browser — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']})
```
### mobile — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
process.env.PAPER_MAGIC_MOBILE==='1'
```
### prefix — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
mobile?'ritual-mobile-':'ritual-'
```
### page — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}})
```
### errors — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### canvas — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
page.getByTestId('magic-book')
```
### c — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
document.querySelector('canvas')
```
### c — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
document.querySelector('canvas')
```

## scripts/check-browser-semantic.mjs

### browser — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']})
```
### page — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
await browser.newPage({viewport:{width:1440,height:1000}})
```
### first — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
await page.getByTestId('paper-card').first().textContent()
```

## scripts/check-model.mjs

### originalFetch — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
globalThis.fetch
```
### started — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### vectors — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
await embedTexts(process.cwd(),['query: phát hiện tế bào trong ảnh y sinh','passage: Biomedical image segmentation with neural networks'])
```

## scripts/check-offline-ai.mjs

### fetchOriginal — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
globalThis.fetch
```
### networkAttempts — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### started — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### vectors — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
await embedTexts(process.cwd(),['query: medical image segmentation'])
```
### scores — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
await rerankLocal(process.cwd(),'medical image segmentation',['U-Net segments biomedical images.','A gravitational wave detector.'])
```
### text — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
await generateLocal(process.cwd(),[{role:'system',content:'Reply with the single word READY.'},{role:'user',content:'Confirm.'}],8)
```
### report — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
{date:new Date().toISOString(),networkFetchDisabled:true,networkAttempts,embeddingDimensions:vectors[0].length,rerankScores:scores,generation:text,elapsedMs:Math.round(performance.now()-started),scope:'Inference runtimes only; not OS-wide network isolation or complete offline backend E2E'}
```

## scripts/check-online.mjs

### started — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### response — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
await fetch((process.env.PAPER_MAGIC_URL||'http://127.0.0.1:5173')+'/api/v2/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'graph neural networks',scope:'online',topK:8}),signal:AbortSignal.timeout(90000)})
```
### text — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
await response.text()
```
### result — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(text)
```
### ids — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
result.result.items.map(hit=>hit.paper.id)
```
### mongoCount — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
null
```
### uri — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
process.env.MONGODB_URI
```
### client — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
new MongoClient(uri)
```
### report — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
{measuredAt:new Date().toISOString(),http:response.status,query:'graph neural networks',durationMs:performance.now()-started,decodedBytes:Buffer.byteLength(text),sources:result.providers,storage:result.storage,mongoCount,paperCount:result.result.total,top:result.result.items.slice(0,3).map(h=>({id:h.paper.id,title:h.paper.title,cosine:h.score,sourceUrl:h.paper.sourceUrl})),vectorDimensions:384,modelTrainedByUs:false,warnings:result.warnings}
```

## scripts/check-proxy-cancellation.mjs

### upstream — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
http.createServer((request,response)=>{setTimeout(()=>{if(!response.destroyed)response.writeHead(200,{'Content-Type':'application/json'}).end('{"alive":true}')},100)})
```
### apiPort — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
upstream.address().port
```
### child — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
spawn(process.execPath,['scripts/serve-production.mjs'],{env:{...process.env,SERVER_HOST:'127.0.0.1',SERVER_PORT:'8189',API_ORIGIN:'http://127.0.0.1:'+apiPort},stdio:['ignore','pipe','pipe']})
```
### output — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
''
```
### timer — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
setTimeout(()=>reject(new Error('Server startup timeout')),5000)
```
### request — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
http.get('http://127.0.0.1:8189/api/test')
```
### response — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
await fetch('http://127.0.0.1:8189/api/health')
```
### body — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
await response.json()
```
### report — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
{date:new Date().toISOString(),abortedRequests:12,delayedUpstreamMs:100,survived:true,followupStatus:response.status}
```

## scripts/check-research.mjs

### cases — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
process.argv.includes('--quick')?[{query:'U-Net',scope:'library'}]:[{query:'Tôi muốn tìm phương pháp nhận diện vùng bệnh trong ảnh y tế',scope:'library'},{query:'Tôi muốn giảm lỗi khi truyền thông tin bằng máy tính lượng tử',scope:'online'},{query:'Tìm cách chạy mô hình lớn khi bộ nhớ VRAM không đủ',scope:'online'}]
```
### reports — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### started — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### response — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
await fetch('http://127.0.0.1:8080/api/v3/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,topK:6}),signal:AbortSignal.timeout(130000)})
```
### text — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
await response.text()
```
### report — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
{input,status:response.status,elapsedMs:Math.round(performance.now()-started),decodedBytes:Buffer.byteLength(text),research:body.research,providers:body.providers,storage:body.storage,warnings:body.warnings,top:body.result?.items.map(hit=>({id:hit.paper.id,title:hit.paper.title,cosine:hit.score,url:hit.paper.sourceUrl})),error:body.error}
```
### byId — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
new Map(body.dataset.corpus.papers.map(p=>[p.id,p]))
```
### paper — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
byId.get(e.paperId)
```
### source — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
e.coverage==='title'?paper.title:paper.abstract
```

## scripts/copy-wasm.mjs

### store — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('node_modules/.pnpm')
```
### entries — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
await fs.readdir(store)
```
### pkg — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
entries.find(n=>n.startsWith('onnxruntime-web@'))
```
### dir — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
path.join(store,pkg,'node_modules/onnxruntime-web/dist')
```

## scripts/debug-offline.mjs

### browser — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']})
```
### c — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
await browser.newContext()
```
### p — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
await c.newPage()
```

## scripts/dev.mjs

### root — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
fileURLToPath(new URL('..',import.meta.url))
```
### backendPort — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
process.env.API_PORT||'3001'
```
### children — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
[
 spawn(process.execPath,[path.join(root,'apps/api/node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',backendPort],{cwd:path.join(root,'apps/api'),stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}}),
 spawn(process.execPath,[path.join(root,'apps/web/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',process.env.WEB_PORT||'5173'],{cwd:path.join(root,'apps/web'),stdio:'inherit'})
]
```
### closing — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
false
```

## scripts/document-code.mjs

### entries — dòng 4

Scope: files. Kiểu khai báo: inferred.

```ts
await fs.readdir(folder,{withFileTypes:true})
```
### result — dòng 4

Scope: files. Kiểu khai báo: inferred.

```ts
[]
```
### p — dòng 4

Scope: files. Kiểu khai báo: inferred.

```ts
path.join(folder,e.name)
```
### rows — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### text — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
await fs.readFile(filename,'utf8')
```
### source — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true,filename.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
```
### initial — dòng 10

Scope: visit. Kiểu khai báo: inferred.

```ts
node.initializer.getText(source)
```
### ancestor — dòng 10

Scope: visit. Kiểu khai báo: inferred.

```ts
node.parent
```
### scope — dòng 10

Scope: visit. Kiểu khai báo: inferred.

```ts
'module'
```
### content — dòng 16

Scope: module. Kiểu khai báo: inferred.

```ts
'# Danh mục mã đang có\n\nSinh từ AST TypeScript, không nhập tay số lượng. Tính named functions / methods / constructors, không tính callback JSX vô danh. Các giá trị gán biến được lưu trong code-catalog.json.\n\n| File:dòng | Hàm | Tham số | Return |\n|---|---|---|---|\n'+rows.filter(r=>r.kind==='function').map(r=>`| ${r.file}:${r.line} | ${escape(r.name)} | ${escape(r.parameters.join(', '))} | ${escape(r.returnType)} |`).join('\n')+'\n'
```
### variableRows — dòng 18

Scope: module. Kiểu khai báo: inferred.

```ts
rows.filter(r=>r.kind==='variable')
```
### variables — dòng 18

Scope: module. Kiểu khai báo: inferred.

```ts
'# Danh mục khai báo biến và giá trị khởi tạo\n\nSinh tự động từ AST, không giới hạn độ dài biểu thức hoặc số dòng. Giá trị là biểu thức trong mã, không phải giá trị môi trường/secret khi chạy. Function-valued variables nằm ở function-catalog.md. Tái gán sau khai báo không được tính thành biến mới.\n'
```

## scripts/document-modules.mjs

### catalog — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile('docs/code-catalog.json','utf8'))
```
### modules — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
[
 {name:'Scene3D',prefix:'apps/web/src/scene/',readme:'apps/web/src/scene/README.md',log:'apps/web/src/scene/ai-development-log.jsonl'},
 {name:'Model trong browser',prefix:'apps/web/src/semantic/',readme:'apps/web/src/semantic/README.md',log:'apps/web/ai-development-log.jsonl'},
 {name:'RAG backend',prefix:'apps/api/lib/rag/',readme:'apps/api/lib/rag/README.md',log:'apps/api/lib/rag/ai-development-log.jsonl'},
 {name:'Nguồn học thuật',prefix:'apps/api/lib/online/',readme:'apps/api/lib/online/README.md',log:'apps/api/lib/online/ai-development-log.jsonl'},
 {name:'Frontend và lưu web',prefix:'apps/web/',readme:'apps/web/README.md',log:'apps/web/ai-development-log.jsonl'},
 {name:'Backend/API',prefix:'apps/api/',readme:'apps/api/README.md',log:'apps/api/ai-development-log.jsonl'},
 {name:'Core dùng chung',prefix:'packages/core/',readme:'packages/core/README.md',log:'packages/core/ai-development-log.jsonl'},
 {name:'Công cụ và kiểm chứng',prefix:'scripts/',readme:'scripts/README.md',log:'scripts/ai-development-log.jsonl'}
]
```
### grouped — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
modules.map(module=>({...module,entries:[]}))
```
### module — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
grouped.find(m=>entry.file.startsWith(m.prefix))
```
### text — dòng 14

Scope: module. Kiểu khai báo: inferred.

```ts
'# Module, số hàm/biến và nhật ký AI\n\nSinh từ code-catalog.json. Hàm có tên và các biến khởi tạo được đếm theo quy tắc AST trong03-ham-bien-toan.md; không tính anonymouscallbacks hoặc node_modules. Phạm viapps/packages/scripts, không cộng mã test/presentation thành chức năng ứng dụng. Không dùng số cũ sau khi sửa mã.\n\n'
```
### functions — dòng 19

Scope: module. Kiểu khai báo: inferred.

```ts
module.entries.filter(e=>e.file===file&&e.kind==='function')
```

## scripts/evaluate-semantic.mjs

### snapshot — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile('data/semantic-snapshot.json','utf8'))
```
### cases — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
[{query:'neural networks for segmenting biomedical images',expected:'1505.04597'},{query:'mô hình ngôn ngữ và attention',expected:'1706.03762'},{query:'dùng hai mạng đối kháng để tạo dữ liệu',expected:'1406.2661'},{query:'học cấu trúc protein bằng đồ thị ba chiều',expected:'2007.06252'},{query:'image generation through iterative denoising',expected:'2006.11239'},{query:'low rank adaptation of language models',expected:'2106.09685'}]
```
### externalFetch — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
globalThis.fetch
```
### results — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### start — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### [v] — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
await embedTexts(process.cwd(),['query: '+item.query])
```
### ranks — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
snapshot.papers.map(p=>({id:p.paperId,score:cosineSimilarity(v,p.vector)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
```
### rank — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
ranks.findIndex(p=>p.id===item.expected)+1
```
### report — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
{model:snapshot.model,offline:true,caseCount:cases.length,scope:'6 development smoke judgments, not held-out academic relevance evaluation.',mrr:results.reduce((s,r)=>s+1/r.rank,0)/results.length,recallAt3:results.filter(r=>r.rank<=3).length/results.length,results}
```

## scripts/fetch-papers.mjs

### root — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
fileURLToPath(new URL('..',import.meta.url))
```
### summaries — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
{
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
}
```
### id — dòng 23

Scope: parse. Kiểu khai báo: inferred.

```ts
field(entry,'id').split('/abs/')[1]?.replace(/v\d+$/,'')
```
### categories — dòng 24

Scope: parse. Kiểu khai báo: inferred.

```ts
[...entry.matchAll(/<category[^>]*term="([^"]+)"/g)].map(m=>m[1])
```
### group — dòng 25

Scope: parse. Kiểu khai báo: inferred.

```ts
id==='1505.04597'?'medicine':forced|| (categories.some(c=>c.startsWith('q-bio'))?'biology':categories.some(c=>c.includes('med-ph'))?'medicine':categories.some(c=>c.startsWith('quant-')||c.startsWith('physics'))?'physics':'ai')
```
### title — dòng 26

Scope: parse. Kiểu khai báo: inferred.

```ts
field(entry,'title')
```
### abstract — dòng 26

Scope: parse. Kiểu khai báo: inferred.

```ts
field(entry,'summary')
```
### seed — dòng 30

Scope: module. Kiểu khai báo: inferred.

```ts
await fs.readFile(path.join(root,'data/arxiv-seed.atom'),'utf8')
```
### papers — dòng 30

Scope: module. Kiểu khai báo: inferred.

```ts
parse(seed)
```
### queries — dòng 31

Scope: module. Kiểu khai báo: inferred.

```ts
[['biology','cat:q-bio.BM AND all:learning'],['medicine','cat:physics.med-ph AND all:imaging'],['physics','cat:quant-ph AND all:learning']]
```
### response — dòng 34

Scope: module. Kiểu khai báo: inferred.

```ts
await fetch('https://export.arxiv.org/api/query?'+new URLSearchParams({search_query:query,max_results:'6',sortBy:'relevance'}),{signal:AbortSignal.timeout(30000)})
```
### xml — dòng 36

Scope: module. Kiểu khai báo: inferred.

```ts
await response.text()
```
### corpus — dòng 39

Scope: module. Kiểu khai báo: inferred.

```ts
{version:'arxiv-starter-2026-11-04-v1',title:'Thư viện khởi đầu · arXiv',fetchedAt:new Date().toISOString(),papers}
```

## scripts/log-immersive.mjs

### evidence — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile('docs/verification-immersive.json','utf8'))
```
### humanRequests — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
['ý tôi là trang sách bự ra được không ngoài ra ngoại cảnh hiệu ứng sặc sỡ vào còn bản đồ vecto 3d để vậy chả có ý nghĩa tôi muôn làm sao trong một thứ mà hiện được luôn cơ','rồi nguyên cái web là cái dạng liquid luôn tức là ảnh nền các thứ là trong cái nền cuốn sách các thứ luôn nên nó sẽ bự to']
```
### outputFiles — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
await Promise.all(module.files.map(async file=>{const path=module.folder+'/'+file;return{path,sha256:createHash('sha256').update(await fs.readFile(path)).digest('hex')}}))
```
### path — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
module.folder+'/'+file
```

## scripts/log-liquid.mjs

### evidence — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile('docs/verification-liquid.json','utf8'))
```
### humanPrompt — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
'thiết kế lại nhé cuốn sách mở vậy là được nhưng mà cho các nền sống động thêm nữa đi hơi chán quá rồi , thiết kế trang này theo ngôn ngữ thiết kế của apple là liquid cho sang trọng bố cục sửa lại hết , rồi về cách hiệu ứng fr báo tôi lại là các hình ảnh là tạo từ toán học nhé không có gì nữa nhé chuyển động các thứ cũng vậy rồi nói về thiết kế thì là ban đầu sách lơ lửng như bay bay mở rộng ra nhỏ tí rồi hẹp vào một tí cho như là dạng bay bay lơ lửng có phép thuật vậy á rồi , khi muốn tìm gì đó thì vào search nhấn search thì các dòng chữ hiệu ứng bắt đầu xoay mạnh biến thành lốc xoáy rồi bay vào sách rồi sách đóng lại rồi xong màn hình zoom vào sách lật ra thì thường nó sẽ có các trang đó thì để các thông tin trên mặt trang sách đó cái gì đó mà người cần search xong bấm qua trang thì có các thông tin khác kiểu vậy khi người ta rời bấm thoát thì sách đóng lại outzoom ròi mở ra bay lơ lửng tiếp nhưng có cái là bạn tôi muốn các thôn tin bài báo liên quan khi các hiệu ứng vào á thì nó đổi màu tùy theo mức độ tương thích thì có màu khác nhau á'
```
### outputFiles — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
await Promise.all(module.files.map(async file=>{const path=module.folder+'/'+file;return{path,sha256:createHash('sha256').update(await fs.readFile(path)).digest('hex')}}))
```
### path — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
module.folder+'/'+file
```
### entry — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
{timestamp:new Date().toISOString(),phase:'liquid-magic-0.3.0',module:module.folder,assistantModel:null,modelMetadataReason:'Exact model build not exposed; not invented.',humanPrompt,output:module.output,outputFiles,corrections:['Kept Next.js backend, E5 model and Mongo schema unchanged.','Wait for actual result; cancel stale auto-open on Escape or selection.','Shared glyph textures and cleaned up GPU/listener resources.','Changed page surface to unlit material so nearby point light cannot wash out ink.','Fixed mobile result row collapse after inspecting real screenshots.','Kept camera drag and zoom functional during reading.','No downloaded images, videos or 3D models; no handwritten GLSL or Python.'],verification:evidence,review:{selfChecked:true,independentReview:false},runtimePrompting:{changed:false,status:'embedding-prefix-only',prefixes:['query: ','passage: '],note:'No generative prompt or fabricated runtime LLM log added.'}}
```

## scripts/log-online.mjs

### evidence — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile('docs/verification-online.json','utf8'))
```
### outputFiles — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
await Promise.all(module.files.map(async file=>{const path=module.folder+'/'+file;return{path,sha256:createHash('sha256').update(await fs.readFile(path)).digest('hex')}}))
```
### path — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
module.folder+'/'+file
```

## scripts/log-ritual.mjs

### evidence — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile('docs/verification-ritual.json','utf8'))
```
### requests — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
['Node màu theo tương đồng; chữ bay thưa rồi tăng tốc vào node, tích sáng, truyền vào hố đen, hạ sách, mở đọc; thoát giải phóng chữ.','Ký tự đơn sắc lúc chờ, nới rộng trang.','Chụp lúc mở và lật trang để tìm lỗi.','Node tách khỏi sách, tự nhiên và bớt rối.','Sách phải mở lại rồi mới nhả chữ; node hai phía, có link và sáng hơn.','tiếp tục đi']
```
### outputFiles — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
await Promise.all(module.files.map(async file=>{const path=module.folder+'/'+file;return{path,sha256:createHash('sha256').update(await fs.readFile(path)).digest('hex')}}))
```
### path — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
module.folder+'/'+file
```

## scripts/measure-online.mjs

### base — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
process.env.PAPER_MAGIC_URL||'http://127.0.0.1:8080'
```
### samples — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### i — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### started — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### response — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
await fetch(base+'/api/v2/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'graph neural networks',scope:'online',topK:8})})
```
### body — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
await response.text()
```
### data — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(body)
```
### sorted — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
samples.map(s=>s.durationMs).sort((a,b)=>a-b)
```
### security — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### response — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
await fetch(base+url)
```
### report — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
{measuredAt:new Date().toISOString(),base,conditions:'5 sequential repeated identical query requests, warm source/model cache, corpus30 + max12 external candidates, includes full vector snapshot transfer and Mongo upserts. Not cold network latency, not concurrent load, not 20,000 papers.',unit:'ms',p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),maxDecodedBytes:Math.max(...samples.map(s=>s.decodedBytes)),samples,staticProxyChecks:security,tlsVerified:false}
```

## scripts/measure-research.mjs

### input — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
{query:'Tôi muốn tìm phương pháp nhận diện vùng bệnh trong ảnh y tế',scope:'library',topK:6}
```
### start — dòng 3

Scope: request. Kiểu khai báo: inferred.

```ts
performance.now()
```
### response — dòng 3

Scope: request. Kiểu khai báo: inferred.

```ts
await fetch('http://127.0.0.1:8080/api/v3/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})
```
### body — dòng 3

Scope: request. Kiểu khai báo: inferred.

```ts
await response.text()
```
### samples — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### i — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### sorted — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
samples.map(s=>s.ms).sort((a,b)=>a-b)
```
### report — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
{date:new Date().toISOString(),input,conditions:'5 identical sequential requests after one warm-up; includes HTTP+Mongo cache loading, usually response cache hits, not fresh generation/network/load benchmark',samples,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),maxDecodedBytes:Math.max(...samples.map(s=>s.bytes))}
```

## scripts/measure.mjs

### url — dòng 2

Scope: module. Kiểu khai báo: inferred.

```ts
'http://127.0.0.1:5173/api/v1/search'
```
### input — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.stringify({query:'learning',topK:20})
```
### i — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### samples — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### i — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### query — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
'research about learning and biomedical images sample '+i
```
### start — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### response — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,topK:20})})
```
### body — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
await response.arrayBuffer()
```
### times — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
samples.map(s=>s.durationMs).sort((a,b)=>a-b)
```
### report — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
{measuredAt:new Date().toISOString(),conditions:'30 sequential local HTTP requests with distinct queries, 3 model warmup calls, corpus 30, real E5 Q8 inference in Node worker plus cosine ranking from MongoDB snapshot. Excludes browser rendering and model cold start. Not a 20,000-paper / 20-VU benchmark.',unit:'milliseconds',p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),maxDecodedBytes:Math.max(...samples.map(s=>s.decodedBytes)),samples}
```

## scripts/mongo.mjs

### folder — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('.local/mongo')
```
### mongo — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
await MongoMemoryServer.create({binary:{version:'8.0.16',downloadDir:path.resolve('.local/mongodb-binaries')},instance:{ip:'127.0.0.1',port:27017,dbPath:folder,storageEngine:'wiredTiger',dbName:'paper_galaxy'},dispose:{cleanup:false}})
```

## scripts/prepare-semantic.mjs

### corpus — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile('data/corpus.json','utf8'))
```
### manifest — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile('data/model-manifest.json','utf8'))
```
### passages — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
corpus.papers.map(p=>'passage: '+p.title+'\n'+p.abstract)
```
### vectors — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### start — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### i — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### projection — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
fitPca3(vectors,42)
```
### snapshot — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
{version:'semantic-e5-q8-v1',corpusVersion:corpus.version,createdAt:new Date().toISOString(),corpusHash:hash(JSON.stringify(passages)),model:{id:manifest.modelId,revision:manifest.revision,dtype:manifest.dtype,dimensions:384,pipelineVersion:manifest.pipelineVersion},projection,papers:corpus.papers.map((p,i)=>({paperId:p.id,textHash:hash(passages[i]),vector:vectors[i],point:projectPca(vectors[i],projection)}))}
```

## scripts/preview.mjs

### children — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
[spawn(process.execPath,[path.resolve('apps/api/node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3001'],{cwd:path.resolve('apps/api'),stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}}),spawn(process.execPath,[path.resolve('apps/web/node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','5173'],{cwd:path.resolve('apps/web'),stdio:'inherit'})]
```
### closing — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
false
```

## scripts/seed.mjs

### corpus — dòng 3

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile('data/corpus.json','utf8'))
```
### snapshot — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile('data/semantic-snapshot.json','utf8'))
```
### client — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/paper_galaxy',{serverSelectionTimeoutMS:4000})
```
### db — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
client.db()
```
### {papers:_,...semanticMetadata} — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
snapshot
```

## scripts/serve-production.mjs

### root — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('apps/web/dist')
```
### host — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
process.env.SERVER_HOST||'127.0.0.1'
```
### port — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
Number(process.env.SERVER_PORT||'8080')
```
### api — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
new URL(process.env.API_ORIGIN||'http://127.0.0.1:3001')
```
### cert — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
process.env.TLS_CERT_FILE
```
### key — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
process.env.TLS_KEY_FILE
```
### types — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
{'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.wasm':'application/wasm','.onnx':'application/octet-stream','.svg':'image/svg+xml','.png':'image/png'}
```
### hop — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
new Set(['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade'])
```
### headers — dòng 18

Scope: handle. Kiểu khai báo: inferred.

```ts
Object.fromEntries(Object.entries(request.headers).filter(([name])=>!hop.has(name)&&name!=='host'))
```
### proxy — dòng 19

Scope: handle. Kiểu khai báo: inferred.

```ts
http.request(new URL(url.pathname+url.search,api),{method:request.method,headers},upstream=>{if(response.destroyed||response.writableEnded){upstream.destroy();return}try{for(const[name,value]of Object.entries(upstream.headers))if(value!==undefined&&!hop.has(name))response.setHeader(name,value);response.writeHead(upstream.statusCode||502);pipeline(upstream,response,()=>{})}catch{upstream.destroy();response.destroy()}})
```
### file — dòng 24

Scope: handle. Kiểu khai báo: inferred.

```ts
path.resolve(root,'.'+pathname)
```
### real — dòng 27

Scope: handle. Kiểu khai báo: inferred.

```ts
fs.realpathSync(file)
```
### stat — dòng 27

Scope: handle. Kiểu khai báo: inferred.

```ts
fs.statSync(real)
```
### extension — dòng 27

Scope: handle. Kiểu khai báo: inferred.

```ts
path.extname(real)
```
### server — dòng 29

Scope: module. Kiểu khai báo: inferred.

```ts
cert?https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},handle):http.createServer(handle)
```

## scripts/setup-model.mjs

### modelId — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
'Xenova/multilingual-e5-small'
```
### revision — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
'761b726dd34fb83930e26aab4e9ac3899aa1fa78'
```
### root — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('.local/models',modelId)
```
### files — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx']
```
### manifest — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### target — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
path.join(root,name)
```
### response — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
await fetch(`https://huggingface.co/${modelId}/resolve/${revision}/${name}`,{signal:AbortSignal.timeout(240000)})
```
### data — dòng 16

Scope: module. Kiểu khai báo: inferred.

```ts
await fs.readFile(target)
```
### browserTarget — dòng 18

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('apps/web/public/models',modelId,name)
```
### metadata — dòng 20

Scope: module. Kiểu khai báo: inferred.

```ts
{modelId,revision,dtype:'q8',dimensions:384,pipelineVersion:'e5-mean-l2-512-v1',files:manifest}
```

## scripts/setup-rag-model.mjs

### reranker — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
process.argv.includes('--reranker')
```
### modelId — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
reranker?'Xenova/ms-marco-MiniLM-L-6-v2':'onnx-community/Qwen3-0.6B-ONNX'
```
### revision — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
reranker?'a09144355adeed5f58c8ed011d209bf8ee5a1fec':'58ca03a5e7b354b480b1a82b34bde8dc7b854cc0'
```
### files — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
reranker?['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx']:['config.json','generation_config.json','tokenizer.json','tokenizer_config.json','onnx/model_q4.onnx']
```
### root — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('.local/models',modelId)
```
### manifest — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### target — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
path.join(root,file)
```
### response — dòng 14

Scope: module. Kiểu khai báo: inferred.

```ts
await fetch(`https://huggingface.co/${modelId}/resolve/${revision}/${file}`,{signal:AbortSignal.timeout(240000)})
```
### temporary — dòng 16

Scope: module. Kiểu khai báo: inferred.

```ts
target+'.download'
```
### hash — dòng 18

Scope: module. Kiểu khai báo: inferred.

```ts
createHash('sha256')
```

## scripts/test-https.mjs

### folder — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('.local/tls-test')
```
### key — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
path.join(folder,'localhost.key.pem')
```
### cert — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
path.join(folder,'localhost.cert.pem')
```
### openssl — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
process.env.OPENSSL_PATH||(process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl')
```
### created — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
spawnSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','2','-keyout',key,'-out',cert,'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{encoding:'utf8'})
```
### server — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
spawn(process.execPath,['scripts/serve-production.mjs'],{env:{...process.env,SERVER_HOST:'127.0.0.1',SERVER_PORT:'443',TLS_CERT_FILE:cert,TLS_KEY_FILE:key,API_ORIGIN:'http://127.0.0.1:3001'},stdio:['ignore','pipe','pipe']})
```
### logs — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
''
```
### request — dòng 9

Scope: get. Kiểu khai báo: inferred.

```ts
https.get('https://127.0.0.1:443'+route,{...(ca?{ca}:{}),rejectUnauthorized:true,timeout:5000},response=>{const protocol=response.socket.getProtocol(),authorized=response.socket.authorized,parts=[];response.on('data',part=>parts.push(part));response.on('end',()=>resolve({status:response.statusCode,protocol,authorized,hsts:response.headers['strict-transport-security'],bytes:Buffer.concat(parts).length}))})
```
### protocol — dòng 9

Scope: get. Kiểu khai báo: inferred.

```ts
response.socket.getProtocol()
```
### authorized — dòng 9

Scope: get. Kiểu khai báo: inferred.

```ts
response.socket.authorized
```
### parts — dòng 9

Scope: get. Kiểu khai báo: inferred.

```ts
[]
```
### timer — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
setTimeout(()=>reject(new Error('TLS server startup: '+logs)),6000)
```
### ca — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
await fs.readFile(cert)
```
### page — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
await get('/',ca)
```
### api — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
await get('/api/v1/health',ca)
```
### untrustedRejected — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
false
```
### report — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
{date:new Date().toISOString(),host:'127.0.0.1',port:443,certificate:'Local self-signed test certificate trusted only by this test client;not public CA',page,api,untrustedRejected,publicDomainVerified:false,passed:page.status===200&&api.status===200&&page.authorized&&untrustedRejected}
```

## scripts/test-network-guard.mjs

### original — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
globalThis.fetch
```
### blocked — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### url — dòng 7

Scope: module. Kiểu khai báo: inferred.

```ts
new URL(typeof input==='string'||input instanceof URL?String(input):input.url)
```
### histogram — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
monitorEventLoopDelay({resolution:20})
```
### samples — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### previous — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
process.cpuUsage()
```
### last — dòng 9

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### timer — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
setInterval(()=>{const now=performance.now(),cpu=process.cpuUsage(previous);previous=process.cpuUsage();const memory=process.memoryUsage();samples.push({at:new Date().toISOString(),rssBytes:memory.rss,heapUsedBytes:memory.heapUsed,eventLoopP99Ms:histogram.percentile(99)/1e6,cpuPercent:(cpu.user+cpu.system)/((now-last)*1000)*100,externalFetchBlocked:blocked});last=now;histogram.reset();if(samples.length>600)samples.shift();try{fs.writeFileSync(process.env.PAPER_MAGIC_TEST_METRICS,JSON.stringify({pid:process.pid,networkGuard:true,samples}))}catch{}},1000)
```
### now — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### cpu — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
process.cpuUsage(previous)
```
### memory — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
process.memoryUsage()
```

## scripts/test-nginx.mjs

### root — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
process.cwd()
```
### folder — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('.local/nginx-check')
```
### executable — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
path.join(folder,'nginx-1.30.6/nginx.exe')
```
### cert — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('.local/tls-test/localhost.cert.pem').replaceAll('\\','/')
```
### key — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
path.resolve('.local/tls-test/localhost.key.pem').replaceAll('\\','/')
```
### auth — dòng 8

Scope: module. Kiểu khai báo: inferred.

```ts
path.join(folder,'demo.htpasswd').replaceAll('\\','/')
```
### config — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
await fs.readFile('deploy/nginx.conf','utf8')
```
### prefix — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
folder.replaceAll('\\','/')+'/'
```
### checked — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
spawnSync(executable,['-p',prefix,'-c','test.conf','-t'],{encoding:'utf8'})
```
### server — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
spawn(executable,['-p',prefix,'-c','test.conf','-g','daemon off;'],{stdio:'ignore'})
```
### ca — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
await fs.readFile(cert)
```
### request — dòng 14

Scope: get. Kiểu khai báo: inferred.

```ts
https.get('https://127.0.0.1:443'+route,{ca,rejectUnauthorized:true,headers:authenticated?{Authorization:'Basic '+Buffer.from('demo:local-only-test').toString('base64')}:{}},response=>{const tls=response.socket.getProtocol(),authorized=response.socket.authorized;response.resume();response.on('end',()=>resolve({status:response.statusCode,tls,authorized,hsts:response.headers['strict-transport-security']}))})
```
### tls — dòng 14

Scope: get. Kiểu khai báo: inferred.

```ts
response.socket.getProtocol()
```
### authorized — dòng 14

Scope: get. Kiểu khai báo: inferred.

```ts
response.socket.authorized
```
### ready — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
false
```
### i — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### denied — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
await get('/')
```
### web — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
await get('/',true)
```
### api — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
await get('/api/v1/health',true)
```
### version — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
spawnSync(executable,['-v'],{encoding:'utf8'}).stderr.trim()
```
### report — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
{date:new Date().toISOString(),version,configurationCheck:checked.status===0,port:443,untrustedPublicCertificate:false,certificate:'Local self-signed test CA only;does not prove public deployment',denied,web,api,passed:denied.status===401&&web.status===200&&api.status===200}
```

## scripts/test-resilience.mjs

### root — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
process.cwd()
```
### base — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
'http://127.0.0.1:3102'
```
### metricsFile — dòng 5

Scope: module. Kiểu khai báo: inferred.

```ts
path.join(root,'.local/resilience-metrics.json')
```
### child — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
spawn(process.execPath,['--import',pathToFileURL(path.join(root,'scripts/test-network-guard.mjs')).href,path.join(root,'apps/api/node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3102'],{cwd:path.join(root,'apps/api'),env:{...process.env,PAPER_MAGIC_TEST_METRICS:metricsFile,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']})
```
### logs — dòng 6

Scope: module. Kiểu khai báo: inferred.

```ts
''
```
### started — dòng 8

Scope: request. Kiểu khai báo: inferred.

```ts
performance.now()
```
### response — dòng 8

Scope: request. Kiểu khai báo: inferred.

```ts
await fetch(base+route,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(130000)})
```
### raw — dòng 8

Scope: request. Kiểu khai báo: inferred.

```ts
await response.text()
```
### times — dòng 9

Scope: summarize. Kiểu khai báo: inferred.

```ts
rows.map(r=>r.ms).sort((a,b)=>a-b)
```
### statuses — dòng 9

Scope: summarize. Kiểu khai báo: inferred.

```ts
{}
```
### report — dòng 10

Scope: module. Kiểu khai báo: inferred.

```ts
{date:new Date().toISOString(),baseURL:base,isolatedProcess:true,network:'Non-loopback global fetch blocked by preload;not OS firewall isolation',phases:{},criteria:{unexpected5xx:0,soakSuccessRatio:1,survivesOverload:true,scope:'Local prototype only,not capacity/SLA certification'}}
```
### i — dòng 13

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### warm — dòng 14

Scope: module. Kiểu khai báo: inferred.

```ts
await request('/api/v3/research',{query:'U-Net',scope:'library',topK:6})
```
### queries — dòng 15

Scope: module. Kiểu khai báo: inferred.

```ts
['U-Net','quantum codes','protein folding','graph neural networks']
```
### load — dòng 16

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### next — dòng 16

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### i — dòng 16

Scope: module. Kiểu khai báo: inferred.

```ts
next++
```
### invalid — dòng 17

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### index — dòng 17

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### soak — dòng 18

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### started — dòng 18

Scope: module. Kiểu khai báo: inferred.

```ts
performance.now()
```
### i — dòng 18

Scope: module. Kiểu khai báo: inferred.

```ts
0
```
### target — dòng 18

Scope: module. Kiểu khai báo: inferred.

```ts
started+i*4000
```
### burst — dòng 20

Scope: module. Kiểu khai báo: inferred.

```ts
await Promise.all(Array.from({length:12},()=>request('/api/v3/research',{query:'U-Net',scope:'library',topK:6})))
```
### offline — dòng 22

Scope: module. Kiểu khai báo: inferred.

```ts
await request('/api/v3/research',{query:'Tìm phương pháp xác định vùng bệnh trong ảnh y tế',scope:'library',topK:6})
```
### data — dòng 23

Scope: module. Kiểu khai báo: inferred.

```ts
JSON.parse(await fs.readFile(metricsFile,'utf8'))
```

## scripts/write-development-logs.mjs

### entries — dòng 4

Scope: module. Kiểu khai báo: inferred.

```ts
[
 {folder:'packages/core',files:['src/contracts.ts','src/math.ts','src/search.ts','src/vector.ts','src/semantic.ts','src/index.ts'],work:'Schema strict, semantic cosine384D, deterministic PCA3D, snapshot validation và toán số phức.'},
 {folder:'apps/api',files:['lib/repository.ts','lib/http.ts','lib/embedding.ts','lib/embedding-runtime.mjs','lib/embedding-worker.mjs','app/api/v1/health/route.ts','app/api/v1/search/route.ts','app/api/v1/papers/route.ts','app/api/v1/papers/[paperId]/route.ts','app/api/v1/papers/[paperId]/neighbors/route.ts','app/api/v1/graph/route.ts'],work:'Next.js API semantic, model JS trong Node worker, Mongo binary vectors, model integrity.'},
 {folder:'apps/web',files:['src/App.tsx','src/storage.ts','src/main.tsx','src/styles.css'],work:'React/Vite UI, tìm kiếm, filter, thông tin, bookmark IDB và offline.'},
 {folder:'apps/web/src/scene',files:['create-book-scene.ts','MagicBook.tsx','enchanting-table.ts'],work:'Bàn phù phép voxel nguyên gốc, sách và glyph dùng toán/số phức; map PCA có picking/filter/query point.'},
 {folder:'apps/web/src/semantic',files:['client.ts','embedding.worker.ts'],work:'Inference E5 Q8 offline trong browser worker JS/WASM, không Python hay cloud.'}
]
```
### outputFiles — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
[]
```
### content — dòng 11

Scope: module. Kiểu khai báo: inferred.

```ts
await fs.readFile(path.join(entry.folder,file))
```
### log — dòng 12

Scope: module. Kiểu khai báo: inferred.

```ts
{timestamp:new Date().toISOString(),phase:'semantic-0.2.0',module:entry.folder,assistantModel:null,modelMetadataReason:'Exact model version was not exposed in tool runtime; not fabricated.',humanRequests:['bây giờ làm luôn full cơ bản trước đi','giống cái bàn phù phép trong minecraft','be dùng nextjs','chỉ JS/TS, 3D tạo từ toán học, docs hàm và biến'],interpretedContract:entry.work,outputFiles,corrections:['Use actual multilingual E5 384D; never label lexical fallback semantic.','Pin model revision and verify SHA256.','Reuse PCA projection for query, rank only on original vector.','Fix dev serving of local WASM module, stale query selection, geometry buffer resizing, mobile information overlap.','Disable separate transformer cache so SW controls model version.'],verification:{typecheck:'passed-3-workspaces',unit:'58/58-passed',e2e:'8/8-passed-on-production-build',build:'Vite-and-Next-passed',realModelSmoke:'6-cases-offline-MRR0.778-recallAt3-5of6',report:'docs/verification.md'},review:{selfChecked:true,independentReview:false},runtimePrompting:{status:'embedding-prefix-only',prefixes:['query: ','passage: '],reason:'Real embedding inference; no generative LLM yet. No fabricated chat prompt logs.'}}
```
