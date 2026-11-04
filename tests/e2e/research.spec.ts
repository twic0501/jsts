import {test,expect} from '@playwright/test';
import {chunkPaper,extractiveReport,type ResearchResponse} from '../../packages/core/src/index';
import corpus from '../../data/corpus.json' with {type:'json'};
import snapshot from '../../data/semantic-snapshot.json' with {type:'json'};
const paper=corpus.papers.find(p=>p.id==='1505.04597')!,query='Tôi muốn phân đoạn vùng bệnh trong ảnh y tế';
function fixture():ResearchResponse{
 const chunk=chunkPaper(paper)[0]!,evidence={id:'E1',paperId:paper.id,title:paper.title,url:paper.sourceUrl,quote:chunk.text,start:chunk.start,end:chunk.end,cosine:.88,fusionScore:.03,coverage:'abstract' as const};
 const research=extractiveReport(query,{original:query,intent:'Segment diseased regions in medical images',queries:['medical image segmentation','lesion segmentation neural networks'],method:'local-llm'},[evidence],30,60,250);
 research.mode='grounded-generation';research.model='fixture-local-generator';research.claims=[{text:'Bài U-Net đề cập phân đoạn ảnh y sinh.',evidenceIds:['E1']}];research.traceId='fixture-trace';
 return{dataset:{corpus,snapshot},result:{items:[{paper,score:.88}],total:1,durationMs:250,method:'semantic',datasetVersion:corpus.version},providers:[],scope:'library',ranking:'hybrid-e5-bm25-rrf',storage:'memory',warnings:[],research};
}
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'})});
test('câu hỏi tự mở dẫn chứng, hiện ý định, citation, đoạn gốc và mở đúng bài trong sách',async({page})=>{
 await page.route('**/api/v3/research',async route=>{expect(route.request().postDataJSON().query).toBe(query);await route.fulfill({json:fixture()})});await page.goto('/');await page.getByLabel('Tìm bài báo',{exact:true}).fill(query);await page.getByRole('button',{name:'Tìm trong sách',exact:true}).click();
 const panel=page.getByRole('region',{name:'Dẫn chứng ngữ nghĩa'});await expect(panel).toBeVisible();await expect(panel.locator('.research-intent')).toContainText('medical images');await expect(panel.locator('.research-status')).toContainText('RAG');await expect(panel.locator('.research-claims')).toContainText('U-Net');await panel.getByRole('link',{name:'[E1]',exact:true}).click();await expect(panel.locator('blockquote')).toHaveText(chunkPaper(paper)[0]!.text);await expect(panel.getByRole('link',{name:'Nguồn',exact:true})).toHaveAttribute('href',paper.sourceUrl);
 await panel.getByRole('button',{name:'Mở trong sách',exact:true}).click();await expect(panel).not.toBeVisible();await expect(page.getByTestId('magic-book')).toHaveAttribute('data-paper',paper.id);await page.getByRole('button',{name:'Mở dẫn chứng ngữ nghĩa',exact:true}).click();await expect(panel).toBeVisible();
});
test('không có evidence thì không dựng câu trả lời, mobile không tràn ngang',async({page})=>{
 const data=fixture();data.research.mode='insufficient';data.research.evidence=[];data.research.claims=[];data.research.metrics.candidates=0;data.research.metrics.passages=0;data.result.items=[];data.result.total=0;await page.route('**/api/v3/research',route=>route.fulfill({json:data}));await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByLabel('Tìm bài báo',{exact:true}).fill(query);await page.getByRole('button',{name:'Tìm trong sách',exact:true}).click();const panel=page.getByRole('region',{name:'Dẫn chứng ngữ nghĩa'});await expect(panel).toBeVisible();await expect(panel.locator('.research-status')).toContainText('Chưa đủ');await expect(panel.locator('.research-claims')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('v3 kiểm JSON, body, scope và kiểu số trước khi gọi model',async({request})=>{
 expect((await request.post('/api/v3/research',{data:'plain text',headers:{'Content-Type':'text/plain'}})).status()).toBe(415);
 for(const data of[{query:'x'},{query:'ok',scope:'web'},{query:'ok',topK:'12'},{query:'ok',url:'http://localhost'},{query:'ok',yearFrom:2025,yearTo:2020}])expect((await request.post('/api/v3/research',{data})).status()).toBe(422);
 expect((await request.post('/api/v3/research',{data:{query:'x'.repeat(9000)}})).status()).toBe(413);
});
test('offline readiness kiểm tài nguyên thật, khôi phục shell thiếu trước khi tắt mạng',async({page,context})=>{
 test.setTimeout(90000);await page.goto('/');await page.waitForFunction(()=>document.documentElement.dataset.offlineReady==='true',{},{timeout:60000});
 const repaired=await page.evaluate(async()=>{const names=(await caches.keys()).filter(key=>key.startsWith('paper-magic-'));let removed=false;for(const name of names){const cache=await caches.open(name);removed=await cache.delete('/index.html')||removed}const channel=new MessageChannel();const status=await new Promise<{ready:boolean}>(resolve=>{channel.port1.onmessage=event=>{channel.port1.close();resolve(event.data)};navigator.serviceWorker.controller!.postMessage({type:'offline-status'},[channel.port2])});return{removed,ready:status.ready}});
 expect(repaired).toEqual({removed:true,ready:true});await context.setOffline(true);await page.reload();await expect(page.getByLabel('Tìm bài báo',{exact:true})).toBeVisible();
});
