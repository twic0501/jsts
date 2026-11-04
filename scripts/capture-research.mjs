import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];let response;
 page.on('pageerror',error=>errors.push(error.message));
 // Real backend/provider/model response; reduce only the requested result count for QA.
 await page.route('**/api/v3/research',route=>route.continue({postData:JSON.stringify({...route.request().postDataJSON(),topK:6})}));
 page.on('response',async result=>{if(result.url().includes('/api/v3/research')&&result.status()===200)response=await result.json()});
 await page.goto('http://127.0.0.1:8080');await page.getByLabel('Tìm bài báo',{exact:true}).fill('Tôi muốn tìm phương pháp nhận diện vùng bệnh trong ảnh y tế');await page.getByRole('button',{name:'Tìm trong sách',exact:true}).click();
 const panel=page.getByRole('region',{name:'Dẫn chứng ngữ nghĩa'});await panel.waitFor({timeout:120000});await page.waitForTimeout(800);await fs.mkdir('.local/screenshots',{recursive:true});
 await page.screenshot({path:'.local/screenshots/research-desktop.png'});
 await panel.locator('.research-evidence').first().scrollIntoViewIfNeeded();await page.screenshot({path:'.local/screenshots/research-evidence.png'});
 await page.setViewportSize({width:390,height:844});await panel.evaluate(element=>{element.scrollTop=0});await page.waitForTimeout(400);await page.screenshot({path:'.local/screenshots/research-mobile.png'});
 const report={date:new Date().toISOString(),realApi:true,requestedTopK:6,errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),mode:response?.research?.mode,plan:response?.research?.plan,claims:response?.research?.claims,traceId:response?.research?.traceId,quotes:await panel.locator('blockquote').count()};await fs.writeFile('.local/research-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
