import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { SearchHistory, SearchHistoryInput } from '@paper-galaxy/core';

async function fixture(page: Page, authenticated = true, mockScene = true) {
  const corpus = JSON.parse(await readFile(new URL('../../data/corpus.json', import.meta.url), 'utf8'));
  const rows = new Map<string, SearchHistory>(); let failSave = false;
  const writes: SearchHistoryInput[] = [];
  if (mockScene) await page.route('**/src/scene/MagicBook.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: 'export default function Book(){return null}' }));
  await page.route('**/api/v1/papers', r => r.fulfill({ json: corpus }));
  await page.route('**/api/v1/search', r => r.fulfill({ json: { items: [], total: 0, durationMs: 1, method: 'semantic', datasetVersion: corpus.version } }));
  if (authenticated) await page.route('**/src/main.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: `
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import App from '/src/App.tsx'; import '/src/styles.css';
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App,{historyAccess:{accountId:'fixture-owner',send:(path,init)=>fetch(path,init)}}));
  ` }));
  await page.route('**/api/v4/users/me/search-history**', async r => {
    const req = r.request();
    if (req.method() === 'GET') return r.fulfill({ json: { items: [...rows.values()].reverse(), nextCursor: null } });
    if (req.method() === 'POST') {
      const body = req.postDataJSON() as SearchHistoryInput; writes.push(body);
      rows.set(body.queryId, rows.get(body.queryId) ?? { ...body, revision: 1, updatedAt: new Date(Date.now() + writes.length * 1000).toISOString() });
      if (failSave) { failSave = false; return r.fulfill({ status: 503, json: { error: { message: 'Fixture: lost response after commit' } } }); }
      return r.fulfill({ status: 201, json: rows.get(body.queryId) });
    }
    for (const [id, row] of rows) if (row.id === new URL(req.url()).pathname.split('/').at(-1)) rows.delete(id);
    return r.fulfill({ status: 204 });
  });
  return { rows, writes, fail() { failSave = true; } };
}
async function submit(page: Page, query: string) {
  await page.getByRole('textbox', { name: 'Tìm bài báo' }).fill(query);
  await page.getByRole('button', { name: 'Tìm trong sách' }).click();
}

test('History opens recent list; submit records once, re-search restores filters, delete persists', async ({ page }) => {
  const f = await fixture(page); await page.goto('/');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Lịch sử tìm kiếm' });
  await expect(panel).toContainText('Bạn chưa có lượt tìm kiếm nào.');
  await expect(panel.getByRole('textbox')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Thư viện', exact: true }).click();
  await page.getByLabel('Lọc lĩnh vực').selectOption('medicine');
  await page.getByLabel('Năm xuất bản').selectOption('2020');
  expect(f.rows.size).toBe(0);
  await submit(page, 'neural networks'); await expect.poll(() => f.rows.size).toBe(1);
  await page.getByRole('button', { name: 'Thư viện', exact: true }).click();
  await page.getByLabel('Lọc lĩnh vực').selectOption('physics');
  await page.getByLabel('Năm xuất bản').selectOption('all');
  await submit(page, 'protein folding'); await expect.poll(() => f.rows.size).toBe(2);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(panel.getByRole('button', { name: /^Tìm lại:/ }).first()).toHaveAccessibleName('Tìm lại: protein folding');
  await panel.getByRole('button', { name: 'Tìm lại: neural networks' }).click();
  await expect(panel).not.toBeVisible(); await expect.poll(() => f.rows.size).toBe(3);
  await expect(page.getByRole('textbox', { name: 'Tìm bài báo' })).toHaveValue('neural networks');
  await expect(page.getByLabel('Lọc lĩnh vực')).toHaveValue('medicine');
  await expect(page.getByLabel('Năm xuất bản')).toHaveValue('2020');
  expect(f.writes[2]!.queryId).not.toBe(f.writes[0]!.queryId); expect(f.writes[2]!.filters).toEqual(f.writes[0]!.filters);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await panel.getByRole('button', { name: 'Xóa: protein folding', exact: true }).click();
  await expect(panel.getByRole('button', { name: /^Tìm lại:/ })).toHaveCount(2);
  await page.reload(); await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(panel.getByRole('button', { name: /^Tìm lại:/ })).toHaveCount(2);
});

test('history save retry keeps IDs even if the first response is lost', async ({ page }) => {
  const f = await fixture(page); f.fail(); await page.goto('/'); await submit(page, 'neural networks');
  await expect.poll(() => f.writes.length).toBe(1);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: 'Thử lưu lại lượt tìm vừa gửi' }).click();
  await expect.poll(() => f.writes.length).toBe(2);
  expect(f.rows.size).toBe(1); expect(f.writes[1]).toEqual(f.writes[0]);
});

test('mobile guest sees History and the FR12 message without account API calls', async ({ page }) => {
  const f = await fixture(page, false); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Lịch sử tìm kiếm' });
  await expect(panel).toContainText('Lịch sử trên thiết bị này');
  await expect(panel.getByRole('textbox')).toHaveCount(0); expect(f.writes).toHaveLength(0);
  expect(await panel.evaluate(el => el.getBoundingClientRect().width <= window.innerWidth)).toBe(true);
  await panel.getByRole('button', { name: 'Đóng lịch sử' }).click(); await expect(panel).not.toBeVisible();
});

test('guest saves and deletes real IndexedDB history offline without any account API', async ({page,context}) => {
  const f = await fixture(page,false);
  await page.route('**/src/semantic/client.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export async function embedQueryLocal(){return Array.from({length:384},(_,i)=>i===0?1:0)}'}));
  await page.goto('/'); await submit(page,'guest online query');
  await page.getByRole('button',{name:'History',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'Lịch sử tìm kiếm'});
  await expect(panel.getByRole('button',{name:'Tìm lại: guest online query',exact:true})).toBeVisible();
  await page.keyboard.press('Escape'); await page.reload();
  await context.setOffline(true);
  await page.getByRole('button',{name:'History',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Tìm lại: guest online query',exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'Xóa: guest online query',exact:true}).click();
  await expect(panel).toContainText('Bạn chưa có lượt tìm kiếm nào.');
  await page.keyboard.press('Escape'); await submit(page,'guest offline query');
  await page.getByRole('button',{name:'History',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Tìm lại: guest offline query',exact:true})).toBeVisible();
  expect(f.writes).toHaveLength(0);
  await context.setOffline(false); await page.reload();
  await page.getByRole('button',{name:'History',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Tìm lại: guest offline query',exact:true})).toBeVisible();
  await expect(panel.getByRole('button',{name:'Tìm lại: guest online query',exact:true})).toHaveCount(0);
});

test('device history serializes retry writes, keeps pagination stable and does not resurrect deleted entries',async({page})=>{
  await fixture(page,false);await page.goto('/');
  const outcome=await page.evaluate(async()=>{
    const {saveDeviceHistory,loadDeviceHistory,removeDeviceHistory}=await import('/src/features/search/device-history.ts');
    const input={id:crypto.randomUUID(),queryId:crypto.randomUUID(),query:'device retry query',filters:{yearFrom:2020}};
    const [one,two]=await Promise.all([saveDeviceHistory(input),saveDeviceHistory(input)]);
    await removeDeviceHistory(input.id);await removeDeviceHistory(input.id);
    let resurrected=false;try{await saveDeviceHistory(input);resurrected=true}catch{}
    for(let i=0;i<23;i++)await saveDeviceHistory({id:crypto.randomUUID(),queryId:crypto.randomUUID(),query:'page '+i,filters:{}});
    const page1=await loadDeviceHistory();await removeDeviceHistory(page1.nextCursor);
    const page2=await loadDeviceHistory(page1.nextCursor);
    return {same:one.id===two.id&&one.updatedAt===two.updatedAt,resurrected,
      first:page1.items.length,second:page2.items.length,overlap:page1.items.some(a=>page2.items.some(b=>a.id===b.id))};
  });
  expect(outcome).toEqual({same:true,resurrected:false,first:20,second:3,overlap:false});
});
