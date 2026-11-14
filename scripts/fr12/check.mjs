// Run from any directory. No public server or production DB is used by the tests.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root=fileURLToPath(new URL('../../',import.meta.url))
async function run(args,cwd=root) {
  await new Promise((resolve,reject)=>{
    const env={...process.env,NEXT_TELEMETRY_DISABLED:'1'}
    for(const key of Object.keys(env))if(key==='MONGODB_URI'||key.startsWith('IDENTITY_'))delete env[key]
    const child=spawn(process.execPath,args,{cwd,stdio:'inherit',windowsHide:true,env})
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`FR12 check failed (${code})`)))
  })
}
const vitest=['node_modules/vitest/vitest.mjs','run']
const config=['--config','apps/api/src/modules/identity/tests/vitest.config.ts','--no-file-parallelism','--maxWorkers=1']
try {
  console.log('FR12 Backend Unit (no Mongo integration file)')
  await run([...vitest,...config,'--exclude','**/identity.authentication.test.ts'])
  console.log('FR12 Backend Mongo Integration (isolated replica)')
  await run([...vitest,...config,'apps/api/src/modules/identity/tests/identity.authentication.test.ts'])
  console.log('FR12 Frontend auth + transport policy')
  await run([...vitest,'tests/auth.unit.test.ts','tests/bookmarks.unit.test.ts','tests/real-auth.unit.test.ts','tests/auth-events.unit.test.ts','tests/fr12-https.unit.test.ts'])
  if(process.argv.includes('--build')) {
    await run(['node_modules/typescript/bin/tsc','-p','apps/web/tsconfig.json'])
    await run(['node_modules/typescript/bin/tsc','-p','apps/api/tsconfig.json'])
    await run(['node_modules/vite/bin/vite.js','build'],path.join(root,'apps/web'))
    await run(['node_modules/next/dist/bin/next','build'],path.join(root,'apps/api'))
  }
  if(process.argv.includes('--browser')) await run(['tests/real-auth.browser.mjs'])
  console.log('FR12 requested checks passed. Browser ran only when --browser was supplied.')
} catch(error) { console.error(error.message);process.exitCode=1 }
