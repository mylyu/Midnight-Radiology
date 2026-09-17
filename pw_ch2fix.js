const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');

const NEW_IMG = ['item_remote', 'item_zhou_key', 'item_beef', 'item_thermos', 'item_disc'];

async function gotoShift(page, shift, stepId, flags, items) {
  await page.goto('about:blank');
  await page.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ shift, stepId, flags, items }) => {
    const save = {
      v: 1, gender: 'm', gold: 500, ap: 3, skill: 10, heart: 10,
      items: items || ['snack', 'book', 'toolbox', 'key', 'dosimeter', 'milktea'],
      badges: [], cards: [], evidence: [], flags: Object.assign({ bai_tube: true }, flags || {}),
      night: 6, dlc: { ch2: { shift, stepId, viewBg: null, viewSprite: null, viewSprite2: null } },
    };
    localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save));
    localStorage.setItem('mr-ch2-unlock', '1');
  }, { shift, stepId, flags, items });
  await page.goto('http://localhost:8899/index.html#/ch2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

async function bodyText(page) { return page.evaluate(() => document.body.innerText); }
async function clickAdv(page) { await page.mouse.click(640, 300); await page.waitForTimeout(1300); }
async function clickChoice(page, substr) {
  const btn = page.locator('button:visible', { hasText: substr }).first();
  if (await btn.count() === 0) return false;
  await btn.click(); await page.waitForTimeout(1300); return true;
}
async function runUntil(page, markers, maxSteps = 40) {
  for (let i = 0; i < maxSteps; i++) {
    const t = await bodyText(page);
    for (const m of markers) if (t.includes(m)) return m;
    const ok = await clickChoice(page, 'CTA');
    if (!ok) await clickAdv(page);
  }
  return null;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().split('/').pop()); });
  const results = [];
  const ok = (name, cond) => results.push(`${cond ? '✅' : '❌'} ${name}`);

  // 0) 新图可访问
  await page.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
  for (const n of NEW_IMG) {
    const r = await page.request.get(`http://localhost:8899/assets/${n}.png`);
    ok(`图片 ${n}.png`, r.status() === 200);
  }

  // 1) CTA 病例（从 m13 老周收尾进 h0）
  await gotoShift(page, 'c2n3', 'c2n3_m13');
  let hit = await runUntil(page, ['CTA还是造影']);
  ok('CTA病例到达抉择', !!hit);
  await clickChoice(page, '先冠脉CTA');
  hit = await runUntil(page, ['窄了七成']);
  ok('CTA扫描出图（右冠狭窄七成）', !!hit);
  hit = await runUntil(page, ['凌晨四点，胸痛病人收进心内科']);
  ok('衔接神秘病人（x0文本已改）', !!hit);
  const cards = await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).cards);
  ok('卡片 cta_vs_dsa 已收录', cards.includes('cta_vs_dsa'));

  // 2) 手机事件 · 有 data_audit
  await gotoShift(page, 'c2n5', 'c2n5_n6', { data_audit: true });
  let t = await bodyText(page);
  ok('手机事件显示（audit线）', t.includes('手机在口袋里震'));
  await clickChoice(page, '掏出手机看一眼');
  hit = await runUntil(page, ['出事了。看图']);
  ok('小雷审计消息线程', !!hit);
  hit = await runUntil(page, ['保存证据', '先别声张', '就算了']);
  ok('回复选项三选一', !!hit);
  await clickChoice(page, '保存证据');
  hit = await runUntil(page, ['早上六点，天边泛白']);
  ok('进入清晨告别', !!hit);

  // 3) 手机事件 · 无 data_audit
  await gotoShift(page, 'c2n5', 'c2n5_n6', {});
  t = await bodyText(page);
  ok('手机事件显示（无audit线）', t.includes('手机在口袋里震'));
  await clickChoice(page, '掏出手机看一眼');
  hit = await runUntil(page, ['伦理批件下周提交']);
  ok('陆舟消息线程', !!hit);
  await clickChoice(page, '体模数据记得带上');
  hit = await runUntil(page, ['抱拳的表情']);
  ok('回复后续步', !!hit);
  hit = await runUntil(page, ['早上六点，天边泛白']);
  ok('进入清晨告别(2)', !!hit);

  // 4) 白班车祸伤
  await gotoShift(page, 'c2d2', 'c2d2_q1a');
  hit = await runUntil(page, ['车祸伤到了']);
  ok('车祸伤病例出现', !!hit);
  hit = await runUntil(page, ['第四例，手腕摔伤的学生']);
  ok('接第四例（学生）', !!hit);

  // 5) 设备间巡检 · 断网矛盾修复（audit 与 非audit 两条线）
  await gotoShift(page, 'c2n5', 'c2n5_e1', { data_audit: true });
  ok('巡检选择肢', await clickChoice(page, '走过去看一眼'));
  hit = await runUntil(page, ['网线已经拔掉']);
  ok('audit线：终端已断网', !!hit);
  await gotoShift(page, 'c2n5', 'c2n5_e1', {});
  await clickChoice(page, '走过去看一眼');
  hit = await runUntil(page, ['天线一闪，一闪']);
  ok('非audit线：终端仍在线', !!hit);

  // 6) 晨考抽题页文案
  await gotoShift(page, 'c2am', 'c2am_1');
  t = await bodyText(page);
  ok('晨考文案 24题抽5', t.includes('24题抽5'));

  console.log(results.join('\n'));
  console.log('404/错误:', bad.length ? bad.join(' | ') : '无 ✅');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
