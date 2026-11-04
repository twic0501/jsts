/** Verification-only preload: block non-loopback fetch and sample the test process. */
import fs from 'node:fs';
import {isMainThread} from 'node:worker_threads';
import {monitorEventLoopDelay} from 'node:perf_hooks';
const original=globalThis.fetch;
let blocked=0;
globalThis.fetch=async(input,options)=>{const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url);if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)){blocked++;throw new Error('External fetch blocked by offline verification')}return original(input,options)};
if(isMainThread&&process.env.PAPER_MAGIC_TEST_METRICS){
 const histogram=monitorEventLoopDelay({resolution:20});histogram.enable();const samples=[];let previous=process.cpuUsage(),last=performance.now();
 const timer=setInterval(()=>{const now=performance.now(),cpu=process.cpuUsage(previous);previous=process.cpuUsage();const memory=process.memoryUsage();samples.push({at:new Date().toISOString(),rssBytes:memory.rss,heapUsedBytes:memory.heapUsed,eventLoopP99Ms:histogram.percentile(99)/1e6,cpuPercent:(cpu.user+cpu.system)/((now-last)*1000)*100,externalFetchBlocked:blocked});last=now;histogram.reset();if(samples.length>600)samples.shift();try{fs.writeFileSync(process.env.PAPER_MAGIC_TEST_METRICS,JSON.stringify({pid:process.pid,networkGuard:true,samples}))}catch{}},1000);timer.unref();
}
