// Real persistent development verification. Adds two labelled QA accounts, never deletes data.
// Passwords/cookies stay in RAM; no Documents or bookmark fixtures enter the development DB.
import { chromium, expect } from '@playwright/test'
import { randomBytes, randomUUID } from 'node:crypto'
import { startPersistent } from '../scripts/fr14/persistent.mjs'
import fs from 'node:fs/promises'
const initial=await fs.readFile(new URL('../apps/web/src/scene/create-book-scene.ts',import.meta.url))
let stack,browser
try {
  stack=await startPersistent()
  const origin=stack.info.origin
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']})
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:960},reducedMotion:'reduce'})
  const page=await context.newPage()
  await page.goto(origin)
  await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled()
  const api=context.request, email='persistent-qa-'+randomUUID()+'@example.test',password=randomBytes(24).toString('hex')
  const register=await api.post(origin+'/api/v4/users',{headers:{Origin:origin,'Idempotency-Key':randomUUID()},data:{email,password,displayName:'Persistent QA'}})
  expect(register.status()).toBe(201)
  const user=await register.json()
  expect((await(await api.get(origin+'/api/v4/sessions/current')).json()).user).toBeNull()
  const login=await api.post(origin+'/api/v4/sessions',{headers:{Origin:origin},data:{email,password}})
  expect(login.status()).toBe(200)
  let session=await(await api.get(origin+'/api/v4/sessions/current')).json()
  expect(session.user.id).toBe(user.id)
  const cookie=(await context.cookies()).find(c=>c.name==='__Host-pm_session')
  expect(Boolean(cookie?.secure&&cookie?.httpOnly)).toBe(true)
  const profile=await api.get(origin+'/api/v4/users/me')
  const patch=await api.patch(origin+'/api/v4/users/me',{headers:{Origin:origin,'X-CSRF-Token':session.csrfToken,'Idempotency-Key':randomUUID(),'If-Match':profile.headers().etag},data:{displayName:'Persistent QA Verified'}})
  expect(patch.status()).toBe(200)
  const profileBody=await patch.json(),etag=patch.headers().etag
  // Restart actual mongod, Next, Vite and TLS proxy; same browser cookie/config/database.
  await stack.stop();stack=undefined
  stack=await startPersistent()
  session=await(await api.get(origin+'/api/v4/sessions/current')).json()
  expect(session.user.id).toBe(user.id)
  expect(session.user.displayName).toBe('Persistent QA Verified')
  const restored=await api.get(origin+'/api/v4/users/me')
  expect(await restored.json()).toEqual(profileBody)
  expect(restored.headers().etag).toBe(etag)
  expect(session.csrfToken).toBeTruthy()
  await page.reload()
  await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible()
  await page.evaluate(()=>{window.persistenceCanvas=document.querySelector('[data-testid="magic-book"]')})
  for(const method of ['GET','PUT','DELETE']){
    const result=await api.fetch(origin+'/api/v4/users/me/bookmarks'+(method==='GET'?'':'/'+randomUUID()),{method,headers:{Origin:origin,'X-CSRF-Token':session.csrfToken,'Idempotency-Key':randomUUID(),...(method==='PUT'?{'If-None-Match':'*'}:method==='DELETE'?{'If-Match':'"1"'}:{})},...(method==='PUT'?{data:{saved:true}}:{})})
    expect(result.status()).toBe(503)
    expect((await result.json()).error.code).toBe('BOOKMARK_DEPENDENCY_UNAVAILABLE')
  }
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click()
  await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled()
  expect(await page.evaluate(()=>window.persistenceCanvas===document.querySelector('[data-testid="magic-book"]'))).toBe(true)
  expect((await api.get(origin+'/api/v4/users/me')).status()).toBe(401)
  expect((await api.get(origin+'/api/v4/users/me/bookmarks')).status()).toBe(401)
  // Re-use the old raw cookie only in RAM: revocation must survive another Mongo restart.
  await stack.stop();stack=undefined;stack=await startPersistent()
  const revoked=await api.get(origin+'/api/v4/users/me',{headers:{Cookie:`__Host-pm_session=${cookie.value}`}})
  expect(revoked.status()).toBe(401)
  expect((await api.post(origin+'/api/v4/sessions',{headers:{Origin:origin},data:{email,password}})).status()).toBe(200)
  const otherEmail='persistent-qa-'+randomUUID()+'@example.test'
  expect((await api.post(origin+'/api/v4/users',{headers:{Origin:origin,'X-CSRF-Token':(await(await api.get(origin+'/api/v4/sessions/current')).json()).csrfToken,'Idempotency-Key':randomUUID()},data:{email:otherEmail,password,displayName:'Persistent QA B'}})).status()).toBe(201)
  session=await(await api.get(origin+'/api/v4/sessions/current')).json()
  expect((await api.delete(origin+'/api/v4/sessions/current',{headers:{Origin:origin,'X-CSRF-Token':session.csrfToken}})).status()).toBe(204)
  expect((await api.post(origin+'/api/v4/sessions',{headers:{Origin:origin},data:{email:otherEmail,password}})).status()).toBe(200)
  expect((await(await api.get(origin+'/api/v4/users/me')).json()).id).not.toBe(user.id)
  session=await(await api.get(origin+'/api/v4/sessions/current')).json()
  expect((await api.delete(origin+'/api/v4/sessions/current',{headers:{Origin:origin,'X-CSRF-Token':session.csrfToken}})).status()).toBe(204)
  expect(await fs.readFile(new URL('../apps/web/src/scene/create-book-scene.ts',import.meta.url))).toEqual(initial)
  console.log('PASS persistent development: six real FR12 APIs, profile/ETag/session across full Mongo+application restart, revoked session after second restart, re-login and separate account B; three FR14 APIs fail closed, no bookmark persistence claimed. Two labelled QA accounts retained; credentials not stored.')
}finally{await browser?.close();await stack?.stop()}
