// Requires the API build and a localhost test certificate; see auth REAL_AUTH.md.
import {chromium,expect} from '@playwright/test'
import {MongoMemoryReplSet} from 'mongodb-memory-server'
import {MongoClient} from 'mongodb'
import {randomBytes,randomUUID} from 'node:crypto'
import {spawn} from 'node:child_process'
import {createServer as netServer} from 'node:net'
import https from 'node:https'
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import {setTimeout as wait} from 'node:timers/promises'
async function port(){const s=netServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
const apiPort=await port(),webPort=await port(),publicPort=await port(),origin=`https://127.0.0.1:${publicPort}`
const replica=await MongoMemoryReplSet.create({binary:{version:'8.0.16',downloadDir:path.resolve('.local/fr12-test-mongodb-binaries')},replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}})
const dbName='fr12_browser_'+randomUUID().replaceAll('-',''), mongo=new MongoClient(replica.getUri())
await mongo.connect()
const children=[],errors=[],calls=[]
let browser,proxy
function start(args,cwd,env){const c=spawn(process.execPath,args,{cwd,env:{...process.env,...env},windowsHide:true,stdio:'ignore'});children.push(c);return c}
async function ready(url){for(let i=0;i<150;i++){try{if((await fetch(url)).ok)return}catch{} await wait(100)}throw new Error('Test server not ready')}
try{
 start(['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(apiPort)],path.resolve('apps/api'),{NODE_ENV:'production',MONGODB_URI:replica.getUri(),IDENTITY_MONGODB_DB:dbName,IDENTITY_SECRET:randomBytes(32).toString('base64'),IDENTITY_ALLOWED_ORIGINS:origin,IDENTITY_SESSION_TTL_SECONDS:'3600',IDENTITY_SESSION_SAME_SITE:'Lax',IDENTITY_AUTH_WINDOW_SECONDS:'60',IDENTITY_AUTH_MAX_ATTEMPTS:'100',IDENTITY_AUTH_MAX_CONCURRENT:'4',IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS:'3600'})
 start(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(webPort),'--strictPort'],path.resolve('apps/web'),{VITE_AUTH_MODE:'real',API_PROXY_TARGET:`http://127.0.0.1:${apiPort}`})
 await Promise.all([ready(`http://127.0.0.1:${apiPort}`),ready(`http://127.0.0.1:${webPort}`)])
 // FR14 routes now exist. No Document adapter is installed: auth must run, then fail closed.
 const missingBookmarkPath='/api/v4/users/me/bookmarks', probeId=randomUUID()
 for(const [method,suffix] of [['GET',''],['PUT','/'+probeId],['DELETE','/'+probeId]]) {
  const result=await fetch(`http://127.0.0.1:${apiPort}`+missingBookmarkPath+suffix,{method,headers:{Origin:origin,'Content-Type':'application/json'},...(method==='PUT'?{body:JSON.stringify({saved:true})}:{})})
  expect(result.status).toBe(401)
 }
 proxy=https.createServer({key:await fs.readFile('.local/fr12-browser-tls/key.pem'),cert:await fs.readFile('.local/fr12-browser-tls/cert.pem')},(req,res)=>{
  const upstream=http.request({hostname:'127.0.0.1',port:webPort,path:req.url,method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res)})
  upstream.on('error',()=>{res.writeHead(502);res.end()});req.pipe(upstream)
 })
 await new Promise(resolve=>proxy.listen(publicPort,'127.0.0.1',resolve))
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']})
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:960},reducedMotion:'reduce'})
 const page=await context.newPage(),corpus=JSON.parse(await fs.readFile('data/corpus.json','utf8'))
 page.on('pageerror',e=>errors.push(e.message))
 page.on('request',r=>{if(r.url().includes('/api/v4/'))calls.push(r.method()+' '+new URL(r.url()).pathname)})
 await page.route('**/api/v1/papers',route=>route.fulfill({json:{...corpus,storage:'json'}}))
 await page.route('**/api/v1/search',route=>route.fulfill({json:{items:corpus.papers.map((paper,i)=>({paper,score:.9-i/1000})),total:30,durationMs:1,method:'semantic',datasetVersion:corpus.version}}))
 await page.goto(origin)
 await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled()
 await expect(page.locator('.pm-auth-dialog')).toHaveCount(0)
 await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('paper-magic-v1',2);r.onsuccess=()=>{const d=r.result,t=d.transaction('bookmarks','readwrite');t.objectStore('bookmarks').put({legacy:true},'legacy-sentinel');t.oncomplete=()=>{d.close();resolve()}}}))
 await page.getByRole('searchbox',{name:'Tìm bài báo'}).fill('machine')
 await page.getByRole('button',{name:'Tìm trong sách',exact:true}).click()
 await expect(page.getByRole('button',{name:'Dẫn chứng ngữ nghĩa'})).toBeVisible()
 const library=page.getByRole('button',{name:'Thư viện bài báo',exact:true});if(await library.getAttribute('aria-expanded')!=='true')await library.click()
 await page.locator('.paper-select').first().click()
 await page.evaluate(()=>{window.savedCanvas=document.querySelector('[data-testid="magic-book"]');window.savedCast=window.savedCanvas.dataset.castId})
 const email='browser@example.test',password='browser-only-test-password'
 async function fill(){const d=page.locator('.pm-auth-dialog');await d.getByLabel('Email',{exact:true}).fill(email);await d.getByLabel('Mật khẩu',{exact:true}).fill(password);return d}
 await page.getByRole('button',{name:'Lưu bài báo',exact:true}).click()
 await expect(page.locator('.pm-auth-dialog')).toBeVisible()
 await page.keyboard.press('Escape')
 await expect(page.locator('.pm-auth-dialog')).toHaveCount(0)
 expect(calls.some(c=>c.includes('bookmarks'))).toBe(false)
 await page.getByRole('button',{name:'Lưu bài báo',exact:true}).click()
 await page.locator('.pm-auth-dialog').getByRole('button',{name:'Đăng ký',exact:true}).click()
 let dialog=await fill();await dialog.getByLabel('Tên hiển thị',{exact:true}).fill('Browser Reader');await dialog.getByLabel('Xác nhận mật khẩu',{exact:true}).fill(password)
 await dialog.getByRole('button',{name:'Tạo tài khoản',exact:true}).click()
 await expect(page.locator('.pm-auth-dialog')).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled()
 expect(await mongo.db(dbName).collection('identity_users').countDocuments()).toBe(1)
 expect(await mongo.db(dbName).collection('identity_sessions').countDocuments()).toBe(0)
 await page.getByRole('button',{name:'Lưu bài báo',exact:true}).click()
 dialog=await fill();await dialog.getByLabel('Mật khẩu',{exact:true}).fill('wrong')
 await dialog.getByRole('button',{name:'Đăng nhập',exact:true}).click()
 await expect(dialog.getByRole('alert')).toHaveText('Email hoặc mật khẩu không chính xác')
 await dialog.getByLabel('Mật khẩu',{exact:true}).fill(password)
 await dialog.getByRole('button',{name:'Đăng nhập',exact:true}).click()
 await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible()
 await expect(page.locator('.pm-auth-nav-notice')).toContainText('Đã đăng nhập')
 await expect(page.locator('.toast')).toContainText('cần Document Service')
 await page.getByRole('button',{name:'Lưu bài báo',exact:true}).dblclick()
 await expect(page.getByRole('button',{name:'Lưu bài báo',exact:true})).toHaveAttribute('aria-pressed','false')
 expect(calls.some(c=>c.includes('bookmarks'))).toBe(false)
 expect(await page.evaluate(()=>window.savedCanvas===document.querySelector('[data-testid="magic-book"]')&&window.savedCast===window.savedCanvas.dataset.castId)).toBe(true)
 await expect(page.getByRole('searchbox',{name:'Tìm bài báo'})).toHaveValue('machine')
 const cookies=await context.cookies(),cookie=cookies.find(c=>c.name==='__Host-pm_session')
 expect(Boolean(cookie?.httpOnly&&cookie?.secure)).toBe(true)
 expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain(cookie.value)
 const probeSession=await(await context.request.get(origin+'/api/v4/sessions/current')).json()
 for(const [method,suffix] of [['GET',''],['PUT','/'+probeId],['DELETE','/'+probeId]]) {
  const result=await context.request.fetch(origin+missingBookmarkPath+suffix,{method,headers:{Origin:origin,'X-CSRF-Token':probeSession.csrfToken,'Idempotency-Key':randomUUID(),...(method==='PUT'?{'If-None-Match':'*'}:method==='DELETE'?{'If-Match':'"1"'}:{})},...(method==='PUT'?{data:{saved:true}}:{})})
  const unavailableBody=await result.json()
  expect(result.status(),`${method}: ${unavailableBody.error?.code}`).toBe(503)
  expect(unavailableBody.error.code).toBe('BOOKMARK_DEPENDENCY_UNAVAILABLE')
 }
 for(const width of [1440,390,320]) {
  await page.setViewportSize({width,height:960})
  await page.getByRole('button',{name:/^Bài đã lưu/}).click()
  await expect(page.locator('.saved-local-note')).toContainText('Bookmark tài khoản chưa sẵn sàng')
  await expect(page.locator('.saved-page')).not.toContainText('đăng nhập demo')
  await expect(page.locator('.saved-card')).toHaveCount(0)
  await page.getByRole('button',{name:'Về trang khám phá',exact:true}).click()
 }
 await page.evaluate(async()=>{const c=await(await import('/src/features/auth/services/auth-client.ts')).getAuthClient();await c.getProfile();await c.updateProfile('Updated Reader');window.dispatchEvent(new Event('focus'))})
 await expect(page.locator('.pm-auth-account-name')).toHaveText('Updated Reader')
 await page.reload();await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible()
 // A second real Provider shares browser cookies, never a mock session.
 const peer=await context.newPage()
 await peer.route('**/__fr12_probe',route=>route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import('/src/features/auth/tests/auth-probe.tsx');</script>`}))
 await peer.goto(origin+'/__fr12_probe')
 await expect(peer.getByTestId('auth-probe')).toHaveText('authenticated')
 await page.evaluate(()=>{window.authCanvas=document.querySelector('[data-testid="magic-book"]')})
 expect(await peer.evaluate(()=>window.fr12Probe.logout())).toEqual({ok:true})
 await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled()
 const second={email:'second-browser@example.test',displayName:'Second Reader',password,confirmPassword:password}
 expect(await peer.evaluate(values=>window.fr12Probe.register(values),second)).toEqual({ok:true})
 await expect(peer.getByTestId('auth-probe')).toHaveText('guest')
 await peer.evaluate(()=>window.fr12Probe.requestLogin({message:'Test pending action',onAuthenticated:async()=>{throw new Error('test-only pending failure')}}))
 expect(await peer.evaluate(values=>window.fr12Probe.login(values),{email:second.email,password:'wrong'})).toEqual({ok:false,code:'INVALID_CREDENTIALS'})
 expect(await peer.evaluate(values=>window.fr12Probe.login(values),second)).toEqual({ok:true})
 await expect.poll(()=>peer.evaluate(()=>window.fr12Probe.notice)).toContain('Thao tác đang chờ chưa hoàn tất')
 await expect(page.locator('.pm-auth-account-name')).toHaveText('Second Reader')
 expect(await peer.evaluate(()=>window.fr12Probe.updateProfile('Second Updated'))).toEqual({ok:true})
 await expect(page.locator('.pm-auth-account-name')).toHaveText('Second Updated')
 expect(await peer.evaluate(()=>window.fr12Probe.logout())).toEqual({ok:true})
 await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled()
 expect(await peer.evaluate(values=>window.fr12Probe.login(values),{email,password})).toEqual({ok:true})
 await expect(page.locator('.pm-auth-account-name')).toHaveText('Updated Reader')
 expect(await page.evaluate(()=>window.authCanvas===document.querySelector('[data-testid="magic-book"]'))).toBe(true)
 await peer.close()
 expect(await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('paper-magic-v1',2);r.onsuccess=()=>{const d=r.result,g=d.transaction('bookmarks').objectStore('bookmarks').get('legacy-sentinel');g.onsuccess=()=>{resolve(g.result?.legacy);d.close()}}}))).toBe(true)
 const sessionURL='**/api/v4/sessions/current'
 await page.route(sessionURL,route=>route.request().method()==='DELETE'?route.fulfill({status:200,contentType:'text/html',body:'<html>wrong proxy response</html>'}):route.continue())
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click()
 await expect(page.locator('.pm-auth-nav-notice')).toContainText('chưa hợp lệ')
 await expect(page.locator('.pm-auth-nav-notice')).not.toContainText('Đã đăng xuất')
 expect((await context.request.get(origin+'/api/v4/users/me')).status()).toBe(200)
 await page.unroute(sessionURL)
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible()
 await page.route(sessionURL,route=>route.request().method()==='DELETE'?route.abort():route.continue())
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click()
 await expect(page.locator('.pm-auth-nav-notice')).toContainText('Không kết nối')
 await expect(page.locator('.pm-auth-nav-notice')).not.toContainText('Đã đăng xuất')
 await page.unroute(sessionURL)
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click()
 await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled()
 await page.reload();await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled()
 expect((await context.request.get(origin+'/api/v4/users/me')).status()).toBe(401)
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();dialog=await fill();await dialog.getByRole('button',{name:'Đăng ký',exact:true}).click();dialog=await fill();await dialog.getByLabel('Tên hiển thị',{exact:true}).fill('Duplicate');await dialog.getByLabel('Xác nhận mật khẩu',{exact:true}).fill(password);await dialog.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Email đã tồn tại')
 await expect(dialog.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled()
 await page.keyboard.press('Escape')
 await expect(page.locator('.pm-auth-dialog')).toHaveCount(0)
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();dialog=await fill()
 await dialog.getByRole('button',{name:'Đăng nhập',exact:true}).click()
 await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible()
 await mongo.db(dbName).collection('identity_sessions').updateMany({},{$set:{expiresAt:new Date(Date.now()-1000)}})
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled()
 await page.route('**/api/v4/sessions/current',route=>route.abort())
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await expect(page.locator('.pm-auth-nav-notice')).toContainText('Không kết nối')
 for(const key of ['POST /api/v4/users','POST /api/v4/sessions','GET /api/v4/sessions/current','DELETE /api/v4/sessions/current','GET /api/v4/users/me','PATCH /api/v4/users/me'])expect(calls).toContain(key)
 expect(calls.some(c=>c.includes('bookmarks'))).toBe(false);expect(errors).toEqual([])
 console.log('PASS real FR12 + isolated Mongo/HTTPS: six APIs, multi-tab logout/account/profile change, Provider success/failure results, rejected HTML logout, expiry/network errors, 401 after logout, same scene, Guest/mobile and retained IndexedDB; no application FR14 request')
}finally{
 await browser?.close();if(proxy)await new Promise(resolve=>proxy.close(resolve));for(const c of children)c.kill();await wait(500);await mongo.close();await replica.stop()
}
