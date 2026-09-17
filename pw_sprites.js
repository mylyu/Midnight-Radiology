const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');

const CASES = [
  ['c2n1', 'c2n1_p5', 'pat_stone'],
  ['c2d2', 'c2d2_7', 'pat_uncle2'],
  ['c2d2', 'c2d2_9b', 'pat_gut'],
  ['c2d4', 'c2d4_7', 'pat_enh'],
  ['c2d4', 'c2d4_12a', 'pat_grandpa2'],
  ['c2n5', 'c2n5_m1', 'pat_kiddad'],
  ['c2n5', 'c2n5_m11', 'pat_kidmom'],
  ['c2n5', 'c2n5_m16', 'pat_kid6'],
  ['c2n3', 'c2n3_h4', 'ct_coronary_cta'],
  ['c2n3', 'c2n3_m8', 'ct_head_stroke'],
  ['c2n3', 'c2n3_x8', 'ct_head_clean'],
  ['c2n5', 'c2n5_m8', 'ct_head_child'],
  ['c2d2', 'c2d2_t1', 'ct_abdomen_trauma'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().split('/').pop()); });

  for (const [shift, stepId, expect] of CASES) {
    await page.goto('about:blank');
    await page.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ shift, stepId }) => {
      const save = {
        v: 1, gender: 'm', gold: 500, ap: 3, skill: 10, heart: 10,
        items: [], badges: [], cards: [], evidence: [], flags: { bai_tube: true },
        night: 6, dlc: { ch2: { shift, stepId, viewBg: null, viewSprite: null, viewSprite2: null } },
      };
      localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save));
      localStorage.setItem('mr-ch2-unlock', '1');
    }, { shift, stepId });
    await page.goto('http://localhost:8899/index.html#/ch2', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const srcs = await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(i => i.src).join(' '));
    console.log(`${stepId} → ${expect}: ${srcs.includes(expect + '.png') ? '✅' : '❌ ' + srcs.slice(-200)}`);
  }
  console.log('404/错误:', bad.length ? bad.join(' | ') : '无 ✅');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
