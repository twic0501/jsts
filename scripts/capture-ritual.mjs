import{chromium}from'@playwright/test';
import fs from'node:fs/promises';
await fs.mkdir('.local/screenshots',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']});
try{
 const mobile=process.env.PAPER_MAGIC_MOBILE==='1',prefix=mobile?'ritual-mobile-':'ritual-';const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto('http://127.0.0.1:5173');const canvas=page.getByTestId('magic-book');await page.waitForFunction(()=>document.querySelector('canvas')?.getAttribute('data-phase')==='idle');await page.waitForTimeout(500);
 await page.getByLabel('Tìm bài báo',{exact:true}).fill('U-Net');await page.getByRole('button',{name:'Tìm trong sách'}).click();
 for(const[phase,age,name]of[['vortex',1,'first-letters'],['vortex',3.9,'letters-rush'],['charging',1.05,'pulse'],['channeling',1.7,'portal'],['sealing',.5,'seal'],['settling',.8,'land'],['reading',.2,'reading']]){
  await page.waitForFunction(({phase,age})=>{const c=document.querySelector('canvas');return c?.getAttribute('data-phase')===phase&&Number(c.getAttribute('data-phase-age'))>=age},{phase,age},{timeout:35000});await page.screenshot({path:'.local/screenshots/'+prefix+name+'.png'});
 }
 await page.getByRole('button',{name:'Thoát đọc sách'}).click();await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c?.getAttribute('data-phase')==='exit-release'&&Number(c.getAttribute('data-phase-age'))>1.2});await page.screenshot({path:'.local/screenshots/'+prefix+'release.png'});await page.waitForFunction(()=>document.querySelector('canvas')?.getAttribute('data-phase')==='idle');
 console.log(JSON.stringify({errors,routed:await canvas.getAttribute('data-routed-letters'),targets:await canvas.getAttribute('data-route-targets')},null,2));
}finally{await browser.close()}
