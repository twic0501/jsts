import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';

const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']});
try{
 await fs.mkdir('.local/screenshots',{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8080');
 await page.getByLabel('Tìm bài báo',{exact:true}).fill('U-Net');
 await page.getByRole('button',{name:'Tìm trong sách',exact:true}).click();
 const canvas=page.getByTestId('magic-book');
 await canvas.waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('canvas')?.getAttribute('data-phase')==='reading');
 await page.waitForTimeout(600);
 await page.screenshot({path:'.local/screenshots/dossier-book.png'});
 await page.getByRole('button',{name:'Trang sau',exact:true}).click();
 await page.waitForTimeout(700);
 await page.screenshot({path:'.local/screenshots/dossier-abstract-pages.png'});
 await page.getByRole('button',{name:'Mở góc đọc',exact:true}).click();
 await page.screenshot({path:'.local/screenshots/dossier-desktop.png'});
 await page.getByText('Đọc tóm tắt gốc',{exact:false}).click();
 await page.locator('.dossier-fulltext').scrollIntoViewIfNeeded();
 await page.screenshot({path:'.local/screenshots/dossier-fulltext.png'});
 const pdf=await page.getByRole('link',{name:/Đọc PDF đầy đủ/}).getAttribute('href');
 await page.setViewportSize({width:390,height:844});
 await page.locator('.detail-panel').evaluate(element=>{element.scrollTop=0});
 await page.waitForTimeout(400);
 await page.screenshot({path:'.local/screenshots/dossier-mobile.png'});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.locator('.dossier-fulltext').scrollIntoViewIfNeeded();
 await page.screenshot({path:'.local/screenshots/dossier-mobile-fulltext.png'});
 const report={timestamp:new Date().toISOString(),errors,overflow,pdf,paper:await canvas.getAttribute('data-paper'),pageCount:await page.locator('.reader-navigation').textContent(),screenshots:['dossier-book','dossier-abstract-pages','dossier-desktop','dossier-fulltext','dossier-mobile','dossier-mobile-fulltext']};
 await fs.writeFile('.local/dossier-browser.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
