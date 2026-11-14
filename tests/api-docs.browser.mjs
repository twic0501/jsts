// Exercises the actual Swagger page and real cookie/CSRF flow on persistent development.
// Adds one labelled QA account; never deletes existing data or stores credentials.
import { chromium, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import { randomBytes, randomUUID } from 'node:crypto'
const state=JSON.parse(await fs.readFile('.local/fr14-persistent/state.json','utf8'))
if(state.status!=='running'||state.kind!=='persistent-development'||state.origin!=='https://localhost:5444'||state.dbName!=='paper_magic_development')throw new Error('Start the isolated persistent development stack first.')
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true})
let stage='load'
try {
  const context=await browser.newContext({ignoreHTTPSErrors:true})
  const page=await context.newPage(),errors=[],remote=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{if(new URL(request.url()).origin!==state.origin)remote.push(request.url())})
  await page.goto(state.origin+'/api-docs')
  await expect(page.locator('.opblock')).toHaveCount(9)
  await expect(page.getByRole('heading',{level:1})).toContainText('Paper Magic — FR12 & FR14')
  const spec=await(await context.request.get(state.origin+'/api-docs/openapi.json')).json()
  expect(spec.openapi).toBe('3.0.3')
  expect(spec.servers).toEqual([{url:'/',description:'Backend cùng origin với trang tài liệu'}])
  expect((await context.request.get(state.origin+'/api-docs/assets/unknown.js')).status()).toBe(404)
  const operation=(method,path)=>page.locator('.opblock-'+method).filter({has:page.getByText(path,{exact:true})})
  async function open(method,path){
    stage=method+' '+path
    const block=operation(method,path)
    // Click the method badge, avoiding the nested deep-link anchor in the summary.
    await block.locator('.opblock-summary-method').click()
    await block.getByRole('button',{name:'Try it out'}).click({timeout:5000})
    return block
  }
  const current=await open('get','/api/v4/sessions/current')
  const guestResponse=page.waitForResponse(r=>r.url()===state.origin+'/api/v4/sessions/current')
  await current.getByRole('button',{name:'Execute',exact:true}).click()
  expect((await(await guestResponse).json()).user).toBeNull()
  const email='swagger-qa-'+randomUUID()+'@example.test',password=randomBytes(24).toString('hex')
  const register=await open('post','/api/v4/users')
  await register.locator('textarea').fill(JSON.stringify({email,password,displayName:'Swagger QA'}))
  let result=page.waitForResponse(r=>r.url()===state.origin+'/api/v4/users'&&r.request().method()==='POST')
  await register.getByRole('button',{name:'Execute',exact:true}).click()
  expect((await result).status()).toBe(201)
  const login=await open('post','/api/v4/sessions')
  await login.locator('textarea').fill(JSON.stringify({email,password:'incorrect-qa-password'}))
  result=page.waitForResponse(r=>r.url()===state.origin+'/api/v4/sessions'&&r.request().method()==='POST')
  await login.getByRole('button',{name:'Execute',exact:true}).click()
  expect((await result).status()).toBe(401)
  await login.locator('textarea').fill(JSON.stringify({email,password}))
  result=page.waitForResponse(r=>r.url()===state.origin+'/api/v4/sessions'&&r.request().method()==='POST')
  await login.getByRole('button',{name:'Execute',exact:true}).click()
  expect((await result).status()).toBe(200)
  expect((await context.cookies()).some(cookie=>cookie.name==='__Host-pm_session'&&cookie.secure&&cookie.httpOnly)).toBe(true)
  const me=await open('get','/api/v4/users/me')
  result=page.waitForResponse(r=>r.url()===state.origin+'/api/v4/users/me')
  await me.getByRole('button',{name:'Execute',exact:true}).click()
  expect((await(await result).json()).email).toBe(email)
  const bookmarks=await open('get','/api/v4/users/me/bookmarks')
  result=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v4/users/me/bookmarks')
  await bookmarks.getByRole('button',{name:'Execute',exact:true}).click()
  expect((await(await result).json()).error.code).toBe('BOOKMARK_DEPENDENCY_UNAVAILABLE')
  const logout=await open('delete','/api/v4/sessions/current')
  result=page.waitForResponse(r=>r.url()===state.origin+'/api/v4/sessions/current'&&r.request().method()==='DELETE')
  await logout.getByRole('button',{name:'Execute',exact:true}).click()
  expect((await result).status()).toBe(204)
  expect((await context.request.get(state.origin+'/api/v4/users/me')).status()).toBe(401)
  expect(errors).toEqual([])
  expect(remote).toEqual([])
  await page.setViewportSize({width:390,height:844})
  await page.reload()
  await expect(page.locator('.opblock')).toHaveCount(9)
  console.log('PASS Swagger UI: 9 endpoints, local assets only, Guest GET, real registration with generated idempotency key, wrong/correct real login, HttpOnly cookie, profile, truthful bookmark dependency error, logout with automatic CSRF; mobile render. QA account retained, credentials not stored.')
}catch{console.error('Swagger browser verification failed at:',stage);process.exitCode=1}
finally{await browser.close()}
