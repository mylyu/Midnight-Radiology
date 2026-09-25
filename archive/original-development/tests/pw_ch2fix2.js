const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');

async function gotoShift(page, shift, stepId, flags) {
  await page.goto('about:blank');
  await page.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ shift, stepId, flags }) => {
    const save = {
      v: 1, gender: 'm', gold: 500, ap: 3, skill: 10, heart: 10,
      items: [], badges: [], cards: [], evidence: [], flags: Object.assign({ bai_tube: true }, flags || {}),
      night: 6, dlc: { ch2: { shift, stepId, viewBg: null, viewSprite: null, viewSprite2: null } },
    };
    localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save));
    localStorage.setItem('mr-ch2-unlock', '1');
  }, { shift, stepId, flags });
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
async function runUntil(page, markers, maxSteps = 30) {
  for (let i = 0; i < maxSteps; i++) {
    const t = await bodyText(page);
    for (const m of markers) if (t.includes(m)) return m;
    await clickAdv(page);
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

  // 手机事件 · 无 data_audit（修正时序：先推进到选项步再点）
  await gotoShift(page, 'c2n5', 'c2n5_n6', {});
  let t = await bodyText(page);
  ok('手机事件显示', t.includes('手机在口袋里震'));
  await clickChoice(page, '掏出手机看一眼');
  let hit = await runUntil(page, ['伦理批件下周提交']);
  ok('陆舟消息线程', !!hit);
  await clickAdv(page);                       // p2b 是线性步，推进到 p2c 选项
  ok('回复选项出现', (await bodyText(page)).includes('回复什么'));
  await clickChoice(page, '体模数据记得带上');
  hit = await runUntil(page, ['抱拳的表情']);
  ok('回复后续步', !!hit);
  hit = await runUntil(page, ['早上六点，天边泛白']);
  ok('进入清晨告别', !!hit);

  // 手机事件 · 不看手机直接干活
  await gotoShift(page, 'c2n5', 'c2n5_n6', {});
  await clickChoice(page, '私人消息先不看');
  hit = await runUntil(page, ['早上六点，天边泛白']);
  ok('不看手机→直达清晨', !!hit);

  console.log(results.join('\n'));
  console.log('404/错误:', bad.length ? bad.join(' | ') : '无 ✅');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
