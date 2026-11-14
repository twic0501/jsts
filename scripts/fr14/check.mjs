import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('../../',import.meta.url))
async function run(args){await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:root,windowsHide:true,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Check failed (${code})`)))})}
try {
  await run(['scripts/fr12/check.mjs',...(process.argv.includes('--build')?['--build']:[])])
  await run(['node_modules/vitest/vitest.mjs','run','--config','apps/api/src/modules/personal-library/bookmarks/tests/vitest.config.ts','--no-file-parallelism','--maxWorkers=1'])
  await run(['node_modules/vitest/vitest.mjs','run','tests/real-bookmarks.unit.test.ts'])
  if(process.argv.includes('--browser'))await run(['tests/real-auth.browser.mjs'])
  console.log('FR14 independent checks passed. Document access in integration uses an explicit fixture; full-stack bookmark success remains blocked.')
}catch(error){console.error(error.message);process.exitCode=1}
