// Disposable seeded saves, not a claimed full two-chapter playthrough.
// Real production rendering and localStorage; audio is denied to test nonblocking issue.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState, makeCredCode } from '../src/game/store.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const base = (process.env.GAME_URL || 'http://127.0.0.1:8805/').replace(/\/$/, '')
const out = resolve(process.env.CERTIFICATE_OUTPUT || '../../ch2-certificate-review')
mkdirSync(out, { recursive: true })
const key = 'midnight-radiology-save-v1', results = [], errors = [], failures = []
const browser = await chromium.launch({ channel: 'msedge', headless: true })
let activePage
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
function fixture(extra = {}, progress = {}) {
  return { ...freshState('f'), gold: 923, skill: 10, heart: 7, wealth: 4, ap: 0,
    night: 5, finished: true, screenHint: 'chapterEnd', stepId: 'n5_end',
    flags: { quiz_grade: 'A', quiz2_grade: 'B' }, stamps: [1, 2, 3, 4, 5],
    badges: ['first_ct', 'first_night', 'checklist_zero'], cards: [], events: [], buyCount: 17,
    ...extra, dlc: { dr: { done: true }, dsa: { dose: 32 }, ch2: {
      shift: 'c2am', stepId: 'c2am_lowdose_teaser2', phase: 'done', done: true,
      appliedSteps: ['ch2-c2am_lowdose_teaser2'], ...progress,
    } } }
}
async function open(save, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(({ save, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    localStorage.setItem('mr-ch2-unlock', '1'); sessionStorage.setItem('mr-rotate-dismissed', '1')
    HTMLMediaElement.prototype.play = function () {
      const sounds = JSON.parse(sessionStorage.getItem('certificate-audio') || '[]')
      sounds.push(this.src); sessionStorage.setItem('certificate-audio', JSON.stringify(sounds))
      return Promise.reject(new DOMException('Fixture autoplay denied', 'NotAllowedError'))
    }
  }, { save, key })
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(12000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', r => { if (r.status() >= 400 && /\.(?:webp|png|mp3)(?:\?|$)/.test(r.url())) failures.push(r.url()) })
  await page.goto(`${base}/#/ch2`)
  await page.locator('[data-ch2-step]').waitFor()
  return { context, page }
}
const withoutCertificate = save => {
  const copy = structuredClone(save); delete copy.dlc.ch2.certificate; return copy
}
async function fit(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page horizontal overflow')
  const card = page.locator('[data-ch2-certificate]')
  await card.scrollIntoViewIfNeeded()
  const box = await card.boundingBox()
  assert(box.x >= 0 && box.x + box.width <= page.viewportSize().width + 1)
  assert(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Certificate text fits its paper')
  const stamp = card.locator('img')
  if (await stamp.count()) {
    // On Pages the issued DOM can precede image download/decode. Wait for this
    // specific stamp, then retain the original image and layout assertions.
    const image = await stamp.elementHandle()
    await page.waitForFunction(el => el?.complete && el.naturalWidth > 0, image, { timeout: 20000 })
    assert(await stamp.evaluate(el => el.complete && el.naturalWidth > 0))
    await image?.dispose()
  }
}
async function fillVerification(page, certificate) {
  for (const [label, value] of [['姓名', certificate.name], ['学号', certificate.studentId], ['金币数', certificate.gold],
    ['本章勋章数', certificate.badgeCount], ['班次数', certificate.shiftCount], ['通关码', certificate.code]]) {
    await page.getByLabel(label, { exact: true }).fill(String(value))
  }
  await page.getByLabel('晨会评级', { exact: true }).selectOption(certificate.grade)
}

try {
  let issuedForVerifier
  for (const mobile of [false, true]) {
    const save = fixture(mobile ? { playerName: '第一章原名', playerId: 'CH1-2026' } : {})
    const { context, page } = await open(save, mobile)
    const form = page.locator('[data-ch2-certificate="form"]')
    await form.waitFor(); const before = await read(page)
    assert(!before.dlc.ch2.certificate, 'Done saves still require explicit identification confirmation')
    if (mobile) {
      assert.equal(await form.getByLabel('姓名', { exact: true }).inputValue(), save.playerName)
      assert.equal(await form.getByLabel('学号', { exact: true }).inputValue(), save.playerId)
    } else assert(await form.getByRole('button', { name: '盖章发证', exact: true }).isDisabled())
    await form.getByLabel('姓名', { exact: true }).fill('   ')
    await form.getByLabel('学号', { exact: true }).fill('S2026001')
    assert(await form.getByRole('button', { name: '盖章发证', exact: true }).isDisabled(), 'Blank name cannot issue')
    const name = mobile ? '阿依古丽·测试同学' : '测试同学'
    const sid = mobile ? 'BME2026092500001234567890' : 'S2026001'
    await form.getByLabel('姓名', { exact: true }).fill(` ${name} `)
    await form.getByLabel('学号', { exact: true }).fill(` ${sid} `)
    await fit(page)
    await page.screenshot({ path: resolve(out, `form-${mobile ? 'mobile' : 'desktop'}.png`) })
    await form.getByRole('button', { name: '盖章发证', exact: true }).evaluate(button => { button.click(); button.click() })
    await page.locator('[data-ch2-certificate="issued"]').waitFor()
    const after = await read(page), cert = after.dlc.ch2.certificate
    assert.equal(cert.name, name); assert.equal(cert.studentId, sid)
    assert.equal(cert.gold, 923); assert.equal(cert.shiftCount, 5); assert.equal(cert.grade, 'B')
    assert.equal(cert.badgeCount, 1, 'Only chapter-two active badge included')
    assert.match(cert.code, /^YSK2-/)
    assert.deepEqual(withoutCertificate(after), withoutCertificate(before), 'Issuance writes only its chapter-two snapshot')
    const sounds = await page.evaluate(() => JSON.parse(sessionStorage.getItem('certificate-audio') || '[]'))
    assert.equal(sounds.filter(src => /\/stamp\.mp3(?:\?|$)/.test(src)).length, 1, 'Double-click stamps once despite autoplay rejection')
    await fit(page); await page.screenshot({ path: resolve(out, `issued-${mobile ? 'mobile' : 'desktop'}.png`) })
    await page.reload(); await page.locator('[data-ch2-certificate="issued"]').waitFor()
    assert.deepEqual((await read(page)).dlc.ch2.certificate, cert)
    await page.evaluate(key => {
      const save = JSON.parse(localStorage.getItem(key)); save.gold += 77; save.badges.push('night_keeper2')
      localStorage.setItem(key, JSON.stringify(save))
    }, key)
    await page.reload(); await page.locator('[data-ch2-certificate="issued"]').waitFor()
    assert.equal(await page.locator('[data-ch2-certificate-code]').textContent(), cert.code)
    assert.deepEqual((await read(page)).dlc.ch2.certificate, cert, 'Later balances cannot alter issued evidence')
    assert(await page.locator('[data-ch2-case-reading]').count(), 'Original further reading remains')
    await page.getByRole('button', { name: '📖 夜班手册', exact: true }).click()
    await page.getByRole('button', { name: '合上手册', exact: true }).click()
    results.push({ test: mobile ? 'mobile-prefill-explicit-issue' : 'desktop-new-identity', code: cert.code, snapshotStable: true, chapter1Unchanged: true })
    issuedForVerifier ??= cert
    await context.close()
  }
  {
    const { context, page } = await open(fixture({}, { done: false, phase: 'story' }))
    assert.equal(await page.locator('[data-ch2-certificate]').count(), 0)
    await page.waitForTimeout(350); await page.locator('.dialog-box > p').click()
    const finish = page.getByRole('button', { name: '🏁 第二章 · 完 —— 结算', exact: true })
    await finish.waitFor(); await page.waitForTimeout(1000); await finish.click()
    await page.locator('[data-ch2-certificate="form"]').waitFor()
    assert((await read(page)).dlc.ch2.done)
    results.push({ test: 'actual-epilogue-to-certificate' }); await context.close()
  }
  for (const [label, progress] of [
    ['ordinary-settlement', { done: false, phase: 'settle', shift: 'c2n1', stepId: 'c2n1_s3', appliedSteps: ['ch2-c2n1_s3'] }],
    ['unfinished-quiz', { quiz: { questions: [], index: 0, completed: false } }],
  ]) {
    const { context, page } = await open(fixture({}, progress))
    await page.locator('[data-ch2-settlement]').waitFor()
    assert.equal(await page.getByRole('button', { name: '盖章发证', exact: true }).count(), 0)
    assert(!(await read(page)).dlc.ch2.certificate)
    results.push({ test: label }); await context.close()
  }
  {
    const save = fixture({ flags: { quiz_grade: 'S' } })
    const { context, page } = await open(save)
    const form = page.locator('[data-ch2-certificate="form"]'); await form.waitFor()
    await form.getByLabel('姓名', { exact: true }).fill('旧档同学')
    await form.getByLabel('学号', { exact: true }).fill('OLD-001')
    await form.getByRole('button', { name: '盖章发证', exact: true }).click()
    await page.locator('[data-ch2-certificate="issued"]').waitFor()
    assert.equal((await read(page)).dlc.ch2.certificate.grade, '未记录', 'Do not borrow chapter-one grade for legacy chapter two')
    results.push({ test: 'legacy-done-missing-grade' }); await context.close()
  }
  {
    const save = fixture({ playerName: '第一章同学', playerId: 'FIRST-01' })
    const { context, page } = await open(save, true)
    const before = await read(page)
    await page.goto(`${base}/`)
    await page.getByRole('button', { name: '教师验证入口', exact: true }).click()
    await page.getByRole('button', { name: '校验第二章凭证', exact: true }).click()
    await page.locator('[data-ch2-certificate-verify]').waitFor()
    await fillVerification(page, issuedForVerifier)
    await page.getByRole('button', { name: '校验', exact: true }).click()
    await page.getByText(/校验通过/).waitFor()
    await page.screenshot({ path: resolve(out, 'teacher-ch2-mobile.png') })
    await page.getByLabel('金币数', { exact: true }).fill(String(issuedForVerifier.gold + 1))
    await page.getByRole('button', { name: '校验', exact: true }).click()
    await page.getByText(/校验失败/).waitFor()
    await page.getByRole('button', { name: /返回.*教师|返回.*第一章|第一章.*验证/ }).click()
    const code1 = makeCredCode(save, save.playerName, save.playerId)
    for (const [placeholder, value] of [['姓名', save.playerName], ['学号', save.playerId], ['金币数', save.gold],
      ['勋章数', save.badges.length], ['夜班数（日志）', save.stamps.length], ['通关码（YSK-XXXXX-XXXX）', code1]]) {
      await page.getByPlaceholder(placeholder, { exact: true }).fill(String(value))
    }
    await page.getByRole('button', { name: '校验', exact: true }).click()
    await page.getByText('✅ 校验通过——这是真实的第一章通关记录', { exact: true }).waitFor()
    assert.deepEqual(await read(page), before, 'Teacher verification never changes the save')
    results.push({ test: 'both-teacher-verifiers-correct-and-tampered', originalChapter1Code: code1 }); await context.close()
  }
  assert.deepEqual(errors, []); assert.deepEqual(failures, [])
  writeFileSync(resolve(out, 'results.json'), JSON.stringify({ base, results, errors, failures }, null, 2))
  console.log(`PASS chapter-two certificate production UI: ${results.length} fixtures, desktop/390px, issuance/reload/snapshot/legacy/epilogue/teacher verification; no errors or asset failures`)
} catch (error) {
  writeFileSync(resolve(out, 'failure.json'), JSON.stringify({ error: error.stack, results, errors, failures }, null, 2))
  await activePage?.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {})
  throw error
} finally { await browser.close() }
