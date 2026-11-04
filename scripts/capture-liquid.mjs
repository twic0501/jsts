import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
await fs.mkdir('.local/screenshots',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
 await page.goto('http://127.0.0.1:5173');const canvas=page.getByTestId('magic-book');await page.waitForFunction(()=>document.querySelector('[data-testid="magic-book"]')?.getAttribute('data-phase')==='idle');await page.waitForTimeout(800);await page.screenshot({path:'.local/screenshots/liquid-idle.png',fullPage:true});
 await page.getByLabel('Tìm bài báo',{exact:true}).fill('U-Net');await page.getByRole('button',{name:'Tìm trong sách'}).click();await page.waitForTimeout(450);await canvas.screenshot({path:'.local/screenshots/liquid-vortex.png'});
 await page.waitForFunction(()=>document.querySelector('[data-testid="magic-book"]')?.getAttribute('data-phase')==='reading');await page.waitForTimeout(1200);await page.screenshot({path:'.local/screenshots/liquid-reading.png',fullPage:true});await canvas.screenshot({path:'.local/screenshots/liquid-pages.png'});
 await page.getByRole('button',{name:'Trang sau',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-testid="magic-book"]')?.getAttribute('data-spread')==='1');await canvas.screenshot({path:'.local/screenshots/liquid-abstract.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1400);await page.screenshot({path:'.local/screenshots/liquid-mobile.png',fullPage:true});
 console.log(JSON.stringify({errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),phase:await canvas.getAttribute('data-phase'),pageText:await canvas.getAttribute('data-page-text')},null,2));
}finally{await browser.close()}
