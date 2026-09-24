import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const output = resolve(process.env.POLISH_OUTPUT || '../../image-polish-review')
mkdirSync(output, { recursive: true })
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/#/ch2'
const saveKey = 'midnight-radiology-save-v1', errors = [], results = []
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey)
async function open(id, mobile) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  const save = { ...freshState('f'), finished: true, flags: { quiz_grade: 'S' }, gold: 500,
    dlc: { dr: { done: true }, dsa: { dose: 39 }, ch2: { shift: id.startsWith('c2d2') ? 'c2d2' : 'c2n3', stepId: id, phase: 'story', appliedSteps: [], viewBg: 'bg_ctcontrol', viewSprite: 'pat_mystery' } } }
  await context.addInitScript(({save,key}) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    localStorage.setItem('mr-ch2-unlock', '1')
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Audio blocked by fixture', 'NotAllowedError'))
  }, { save, key: saveKey })
  const page = await context.newPage(); page.setDefaultTimeout(12000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  await page.locator(`[data-ch2-step="${id}"]`).waitFor()
  const rotate = page.getByRole('button', { name: '不了，竖屏也能玩', exact: true })
  if (await rotate.isVisible()) await rotate.click()
  return {page,context}
}
async function reveal(page) {
  if (await page.locator('.dialog-box .animate-bounce, .choice-in button').count()) return
  await page.locator('.dialog-box > p').click()
}
async function advance(page, next) {
  await reveal(page); await page.locator('.dialog-box .animate-bounce').waitFor()
  await page.locator('.dialog-box > p').click()
  await page.locator(`[data-ch2-step="${next}"]`).waitFor()
}
try {
  for (const mobile of [false, true]) {
    const {page,context} = await open('c2d2_4', mobile)
    await reveal(page)
    const thick = page.locator('img[alt="影像或证物"]')
    await thick.waitFor()
    assert((await thick.getAttribute('src')).includes('ch2_lung_thick_v2'))
    await thick.evaluate(img => img.decode())
    await page.getByText('本次数据 · 5 mm 厚层', {exact:true}).waitFor()
    await page.screenshot({path: `${output}/${mobile ? 'mobile' : 'desktop'}-thick.png`})
    await advance(page, 'c2d2_5'); await reveal(page)
    await page.getByRole('button', {name:'「这套层厚太厚了，先用原始数据重建薄层。」',exact:true}).click()
    await page.locator('[data-ch2-step="c2d2_6b"]').waitFor()
    await advance(page, 'c2d2_w1'); await reveal(page)
    const reconstruction = page.getByRole('dialog', {name:'胸部薄层重建',exact:true})
    await reconstruction.waitFor()
    assert.equal(await page.locator('img[alt="影像或证物"]').count(), 0, 'Thin result cannot precede reconstruction')
    await reconstruction.waitFor({state:'detached'})
    await reveal(page)
    await page.getByRole('button', {name:/ 1500\/-500$/}).click()
    await page.getByRole('button', {name:/^就这个窗口 · 确认/}).click()
    await page.locator('[data-ch2-step="c2d2_w1ok"]').waitFor(); await reveal(page)
    const thin = page.locator('img[alt="影像或证物"]')
    await thin.waitFor(); await thin.evaluate(img => img.decode())
    assert((await thin.getAttribute('src')).endsWith('/ct_lung.png'))
    await page.getByText('本次数据 · 1 mm 薄层重建', {exact:true}).waitFor()
    await page.locator('.choice-in button').first().waitFor()
    assert.equal(await page.locator('[aria-label="与邻层、旧片对照的小结节"]').count(),0,'No answer ring before choice')
    await page.screenshot({path: `${output}/${mobile ? 'mobile' : 'desktop'}-thin.png`})
    const current = await read(page)
    assert.equal(Object.values(current.dlc.ch2.scanSessions).filter(scan=>scan.completed).length,1)
    await context.close()

    const dawn = await open('c2n3_handoff0',mobile)
    const before = await read(dawn.page)
    for (const [id,next,bg] of [['c2n3_handoff0','c2n3_handoff1','bg_ctcontrol_ready'],['c2n3_handoff1','c2n3_handoff2','bg_ctcontrol_day_ready'],['c2n3_handoff2','c2n3_dawn0','bg_corridor']]) {
      await dawn.page.locator(`[data-scene-background="${bg}"]`).waitFor()
      assert.equal(await dawn.page.locator('[data-ch2-sunrise-cinematic]').count(),0)
      assert.equal(await dawn.page.locator('img[src*="pat_mystery"]').count(),0)
      await reveal(dawn.page)
      await dawn.page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${id}.png`})
      await advance(dawn.page,next)
    }
    await dawn.page.locator('[data-ch2-sunrise-cinematic="arrival"][data-ready="true"]').waitFor()
    await dawn.page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-dawn-camera]')).opacity) >= .99)
    await reveal(dawn.page); await dawn.page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-sunrise.png`})
    const after = await read(dawn.page)
    for (const key of ['gold','ap','skill','heart','wealth','items','badges']) assert.deepEqual(after[key],before[key])
    const id = after.dlc.ch2.stepId
    await dawn.page.reload(); await dawn.page.locator(`[data-ch2-step="${id}"]`).waitFor()
    assert.equal((await read(dawn.page)).gold,after.gold)
    assert.equal(await dawn.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await dawn.context.close()
    results.push({mobile,distinctImages:true,reconstructionOnly:true,dawnLeadIn:3,passed:true})
  }
  assert.deepEqual(errors,[])
  writeFileSync(`${output}/story-results.json`,JSON.stringify({results,errors},null,2))
  console.log('PASS desktop/390px actual thick → reconstruction → original thin/window/observation; three visible handoff rooms → sunrise, refresh/no added rewards')
} finally {await browser.close()}
