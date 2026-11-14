// Run against an opted-in Vite dev server: AUTH_TEST_URL defaults to http://127.0.0.1:5174.
// Optionally set AUTH_DISABLED_TEST_URL to a second server with VITE_AUTH_MODE=disabled.
// Public search/corpus responses are fixtures; auth and bookmark code are the actual app modules.
import { chromium, expect } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'

const corpus = JSON.parse(await readFile(new URL('../data/corpus.json', import.meta.url), 'utf8'))
const baseURL = process.env.AUTH_TEST_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--enable-unsafe-swiftshader'] })
const failures = [], protectedRequests = [], passwordLogs = []
const demo = ['demo@papermagic.local', 'Demo@123456']
const other = ['second@papermagic.local', 'x']
await mkdir('.local', { recursive: true })

async function legacy(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('paper-magic-v1', 2)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, store = db.transaction('bookmarks').objectStore('bookmarks')
      const keys = store.getAllKeys(), records = store.getAll()
      records.onsuccess = () => { resolve({ keys: keys.result, records: records.result }); db.close() }
    }
  }))
}
async function count(page, expected) {
  await expect(page.locator('.topnav-tabs .topnav-count')).toHaveText(String(expected))
}
async function library(page) {
  const button = page.getByRole('button', { name: 'Thư viện bài báo', exact: true })
  if (await button.getAttribute('aria-expanded') !== 'true') await button.click()
}
async function openLogin(page) {
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  return loginDialog(page)
}
function loginDialog(page) { return page.getByRole('dialog', { name: 'Đăng nhập vào Paper Magic', exact: true }) }
async function fill(dialog, values) {
  await dialog.getByLabel('Email', { exact: true }).fill(values[0])
  await dialog.getByLabel('Mật khẩu', { exact: true }).fill(values[1])
}
async function login(page, values = demo, open = true) {
  const dialog = open ? await openLogin(page) : loginDialog(page)
  await fill(dialog, values)
  await dialog.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.locator('.pm-auth-dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Đăng xuất demo', exact: true })).toBeEnabled()
}
async function logout(page) {
  await page.getByRole('button', { name: 'Đăng xuất demo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeEnabled()
  await count(page, 0)
}
async function capture(page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="magic-book"]')
    window.qaCanvas = canvas
    window.qaContext = {
      cast: canvas.dataset.castId, focus: canvas.dataset.focus, paper: canvas.dataset.paper,
      width: canvas.clientWidth, creates: window.qaWebGLCreates, query: document.querySelector('[aria-label="Tìm bài báo"]').value,
      selected: document.querySelector('.dossier-cover h2')?.textContent,
      filter: document.querySelector('[aria-label="Bộ lọc kết quả"] .topnav-count')?.textContent,
    }
  })
}
async function preserved(page, original) {
  expect(await legacy(page)).toEqual(original)
  expect(await page.evaluate(() => window.qaLegacyWrites)).toEqual([])
  expect(await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="magic-book"]')
    return canvas === window.qaCanvas && JSON.stringify(window.qaContext) === JSON.stringify({
      cast: canvas.dataset.castId, focus: canvas.dataset.focus, paper: canvas.dataset.paper,
      width: canvas.clientWidth, creates: window.qaWebGLCreates, query: document.querySelector('[aria-label="Tìm bài báo"]').value,
      selected: document.querySelector('.dossier-cover h2')?.textContent,
      filter: document.querySelector('[aria-label="Bộ lọc kết quả"] .topnav-count')?.textContent,
    })
  })).toBe(true)
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(demo[1])
}
async function setup(width, disabled = false) {
  const page = await browser.newPage({ viewport: { width, height: 960 }, reducedMotion: width < 1000 ? 'reduce' : 'no-preference' })
  page.on('pageerror', error => failures.push(error.message))
  page.on('request', request => { if (/\/api\/v4\//.test(request.url())) protectedRequests.push(request.url()) })
  page.on('console', message => { if (message.text().includes(demo[1])) passwordLogs.push('credential logged') })
  await page.addInitScript(theme => {
    localStorage.setItem('paper-magic-theme', theme)
    localStorage.setItem('paper-magic-view', '3d')
    window.qaLegacyWrites = []
    for (const method of ['put', 'add', 'delete', 'clear']) {
      const original = IDBObjectStore.prototype[method]
      IDBObjectStore.prototype[method] = function (...args) {
        if (this.name === 'bookmarks') window.qaLegacyWrites.push(method)
        return original.apply(this, args)
      }
    }
    window.qaWebGLCreates = 0
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.includes('webgl') && this.dataset.testid === 'magic-book') window.qaWebGLCreates++
      return original.call(this, type, ...args)
    }
  }, width === 1440 || width === 390 ? 'light' : 'dark')
  await page.route('**/api/v1/papers', route => route.fulfill({ json: { ...corpus, storage: 'json' } }))
  await page.route('**/api/v1/search', route => route.fulfill({ json: { items: corpus.papers.map((paper, index) => ({ paper, score: .9 - index / 1000 })), total: corpus.papers.length, durationMs: 10, method: 'semantic', datasetVersion: corpus.version } }))
  await page.goto(disabled ? process.env.AUTH_DISABLED_TEST_URL : baseURL)
  await expect(page.getByTestId('magic-book')).toHaveAttribute('data-state', 'idle')
  await page.evaluate(id => new Promise((resolve, reject) => {
    const request = indexedDB.open('paper-magic-v1', 2)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, transaction = db.transaction('bookmarks', 'readwrite')
      transaction.objectStore('bookmarks').put({ savedAt: '2020-01-01T00:00:00.000Z', legacy: 'retain-exactly' }, id)
      transaction.oncomplete = () => { db.close(); resolve() }
    }
  }), corpus.papers[0].id)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeEnabled()
  await expect(page.locator('.pm-auth-dialog')).toHaveCount(0)
  await count(page, 0)
  const original = await legacy(page)
  if (!disabled) await page.evaluate(async () => {
    const { getBookmarkClient } = await import('/src/features/auth/services/bookmark-client.ts')
    const client = await getBookmarkClient()
    const save = client.save, remove = client.remove
    window.qaMutations = []
    window.qaClient = client
    client.save = async (...args) => {
      window.qaMutations.push({ action: 'save', user: args[0].user.id, paper: args[1] })
      if (window.qaSlowPaper === args[1]) await new Promise(resolve => setTimeout(resolve, 900))
      return save(...args)
    }
    client.remove = async (...args) => { window.qaMutations.push({ action: 'remove', user: args[0].user.id, paper: args[1] }); return remove(...args) }
  })
  await page.getByRole('searchbox', { name: 'Tìm bài báo', exact: true }).fill('machine')
  await page.getByRole('button', { name: 'Tìm trong sách', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Dẫn chứng ngữ nghĩa', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Bộ lọc kết quả', exact: true }).click()
  await page.getByRole('button', { name: '10', exact: true }).click()
  await page.getByRole('button', { name: 'Đóng bộ lọc', exact: true }).click()
  await page.waitForTimeout(300) // Existing filter replay debounces for 220ms.
  await library(page)
  await expect(page.locator('.save-card').first()).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('paper-card')).toHaveCount(10)
  const ids = await page.getByTestId('paper-card').evaluateAll(elements => elements.map(element => element.dataset.paperId))
  await page.locator('.paper-select').first().click()
  await capture(page)
  return { page, original, ids }
}
async function accountList(page, id) {
  return page.evaluate(async id => window.qaClient.list({ source: 'mock', user: { id, email: '', displayName: '', role: 'user' } }), id)
}

try {
  const { page, original, ids } = await setup(1440)
  const saveButton = page.getByRole('button', { name: 'Lưu bài báo', exact: true })
  await saveButton.click()
  let dialog = loginDialog(page)
  await expect(dialog).toContainText('Đăng nhập để lưu bài viết này vào thư viện của bạn.')
  await fill(dialog, [demo[0], 'wrong'])
  await dialog.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Email hoặc mật khẩu không chính xác')
  expect(await page.evaluate(() => window.qaMutations)).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.locator('.pm-auth-dialog')).toHaveCount(0)
  await expect(saveButton).toBeFocused()
  await preserved(page, original)
  await login(page)
  await count(page, 0) // A fresh nav login must not replay the cancelled save.
  expect(await accountList(page, 'mock-demo')).toEqual([])
  await logout(page)
  console.log('PASS Guest public search/filter/details, protected Dossier, failed login, cancel and later manual login without replay')

  await library(page)
  await capture(page)
  await page.locator('.save-card').first().evaluate(button => { for (let index = 0; index < 8; index++) button.click() })
  // Even a synthetic background request cannot replace the first pending paper.
  await page.locator('.save-card').nth(1).evaluate(button => button.click())
  await login(page, demo, false)
  await count(page, 1)
  await expect(page.locator('.save-card').first()).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => window.qaMutations)).toEqual([{ action: 'save', user: 'mock-demo', paper: ids[0] }])
  await preserved(page, original)
  await page.getByRole('button', { name: 'Đóng thông báo tài khoản', exact: true }).click()
  await page.waitForTimeout(400)
  expect(await accountList(page, 'mock-demo')).toEqual([ids[0]])
  await page.locator('.save-card').nth(1).evaluate(button => { for (let index = 0; index < 8; index++) button.click() })
  await expect(page.locator('.save-card').nth(1)).toBeDisabled()
  await expect(page.locator('.save-card').nth(1)).toHaveAttribute('aria-pressed', 'false')
  await count(page, 2)
  expect((await page.evaluate(() => window.qaMutations)).filter(event => event.action === 'save' && event.paper === ids[1])).toHaveLength(1)
  await page.locator('.paper-select').first().click()
  await page.getByRole('button', { name: 'Đã lưu', exact: true }).click()
  await count(page, 1)
  await saveButton.click()
  await count(page, 2)
  await page.getByRole('button', { name: /Bài đã lưu/ }).click()
  await expect(page.locator('.saved-card')).toHaveCount(2)
  await page.locator(`.saved-card[data-paper-id="${ids[1]}"] .danger`).evaluate(button => { button.click(); button.click() })
  await expect(page.locator('.saved-card')).toHaveCount(1)
  expect(await accountList(page, 'mock-demo')).toEqual([ids[0]])
  await page.screenshot({ path: '.local/protected-bookmarks-saved-demo.png' })
  console.log('PASS single explicit continuation, repeated clicks, no rerender replay, confirmed-only UI, save/remove across ResultsPanel, Dossier and SavedPage')

  await logout(page)
  await expect(page.locator('.saved-card')).toHaveCount(0)
  expect(await legacy(page)).toEqual(original)
  await page.getByRole('button', { name: 'Về trang khám phá', exact: true }).click()
  await library(page)
  await page.locator('.save-card').nth(2).click()
  await loginDialog(page).getByRole('button', { name: 'Đăng ký', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Tạo tài khoản Paper Magic', exact: true })
  await fill(dialog, other)
  await dialog.getByLabel('Xác nhận mật khẩu', { exact: true }).fill(other[1])
  await dialog.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click()
  await expect(page.locator('.pm-auth-dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Đăng xuất demo', exact: true })).toBeEnabled()
  await count(page, 1)
  const secondId = await page.evaluate(async () => (await (await import('/src/features/auth/services/auth-client.ts')).getAuthClient()).getSession().then(session => session.user.id))
  expect(await accountList(page, secondId)).toEqual([ids[2]])
  expect(await accountList(page, 'mock-demo')).toEqual([ids[0]])
  await logout(page)
  await login(page)
  await count(page, 1)
  await expect(page.locator('.save-card').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.save-card').nth(2)).toHaveAttribute('aria-pressed', 'false')
  console.log('PASS signup continuation, Guest sees no account bookmarks, A/B isolation and account data retained across logout/login')

  await page.evaluate(id => { window.qaSlowPaper = id }, ids[3])
  await page.locator('.save-card').nth(3).click()
  await expect.poll(() => page.evaluate(() => window.qaMutations.at(-1)?.paper)).toBe(ids[3])
  await logout(page)
  await login(page, other)
  await page.waitForTimeout(700)
  await count(page, 1)
  expect(await accountList(page, 'mock-demo')).toEqual([ids[0]])
  expect(await accountList(page, secondId)).toEqual([ids[2]])
  await logout(page)
  await page.evaluate(async () => {
    const client = await (await import('/src/features/auth/services/auth-client.ts')).getAuthClient()
    window.qaOriginalLogin = client.login
    // Exercise provider cancellation guards even if an adapter ignores AbortSignal.
    client.login = values => window.qaOriginalLogin(values)
  })
  await page.locator('.save-card').nth(4).click()
  dialog = loginDialog(page)
  await fill(dialog, demo)
  await dialog.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Đang đăng nhập…', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.locator('.pm-auth-dialog')).toHaveCount(0)
  await page.waitForTimeout(650)
  await count(page, 0)
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeEnabled()
  expect(await accountList(page, 'mock-demo')).toEqual([ids[0]])
  await page.evaluate(async () => {
    const client = await (await import('/src/features/auth/services/auth-client.ts')).getAuthClient()
    client.login = window.qaOriginalLogin
    await client.logout()
  })
  await login(page)
  await count(page, 1)
  expect(await accountList(page, 'mock-demo')).toEqual([ids[0]])
  expect(await legacy(page)).toEqual(original)
  expect(await page.evaluate(() => window.qaLegacyWrites)).toEqual([])
  await page.reload()
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeEnabled()
  await count(page, 0)
  expect(await legacy(page)).toEqual(original)
  await login(page)
  await count(page, 0)
  console.log('PASS account change aborts old writes, late auth cannot resume cancelled intent, reload clears demo only and retains original IndexedDB')
  await page.close()

  for (const width of [768, 390, 320]) {
    const { page, original } = await setup(width)
    await page.getByRole('button', { name: 'Lưu bài báo', exact: true }).click()
    dialog = loginDialog(page)
    await expect(dialog.getByLabel('Email', { exact: true })).toBeFocused()
    await dialog.getByRole('button', { name: 'Đăng ký', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Đóng cửa sổ đăng nhập', exact: true })).toBeFocused()
    await page.screenshot({ path: `.local/protected-bookmarks-modal-${width}.png` })
    await login(page, demo, false)
    await count(page, 1)
    await preserved(page, original)
    await page.getByRole('button', { name: 'Đã lưu', exact: true }).click()
    await count(page, 0)
    await preserved(page, original)
    await logout(page)
    await preserved(page, original)
    console.log(`PASS ${width}px: protected save, focus trap, remove/logout, same canvas/context/cast/selection/query/filter, legacy IndexedDB untouched`)
    await page.close()
  }
  {
    // Inject a client failure only in the demo harness; this is not a real FR14 test.
    const { page, original } = await setup(1440)
    await login(page)
    await page.evaluate(() => {
      window.qaSaveBeforeFailure = window.qaClient.save
      window.qaClient.save = async () => { throw new Error('test-only simulated client failure') }
    })
    await page.getByRole('button', { name: 'Lưu bài báo', exact: true }).click()
    await expect(page.locator('.toast')).toContainText('Chưa cập nhật được bookmark demo')
    await count(page, 0)
    await page.getByRole('button', { name: /^Bài đã lưu/ }).click()
    await expect(page.locator('.saved-local-note')).toContainText('Chưa đọc được thư viện')
    await expect(page.locator('.saved-card')).toHaveCount(0)
    await page.getByRole('button', { name: 'Về trang khám phá', exact: true }).click()
    await page.evaluate(() => { window.qaClient.save = window.qaSaveBeforeFailure })
    await library(page)
    await page.locator('.paper-select').first().click()
    await page.getByRole('button', { name: 'Lưu bài báo', exact: true }).click()
    await count(page, 1)
    await preserved(page, original)
    await logout(page)
    await page.close()
    console.log('PASS demo client failure: visible error, no false saved state, retry recovery and retained IndexedDB/scene')
  }
  if (process.env.AUTH_DISABLED_TEST_URL) {
    const { page, original } = await setup(1440, true)
    await page.getByRole('button', { name: 'Lưu bài báo', exact: true }).click()
    dialog = loginDialog(page)
    await fill(dialog, demo)
    await dialog.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(dialog.getByRole('alert')).toHaveText('Đăng nhập hiện chưa khả dụng. Vui lòng thử lại sau.')
    await page.keyboard.press('Escape')
    await expect(page.locator('.pm-auth-dialog')).toHaveCount(0)
    await count(page, 0)
    await preserved(page, original)
    console.log('PASS disabled mode never saves or authenticates')
    await page.close()
  }
  expect(failures).toEqual([])
  expect(protectedRequests).toEqual([])
  expect(passwordLogs).toEqual([])
  console.log('PASS no page exceptions, FR12/FR14 requests or password logs')
} finally { await browser.close() }
