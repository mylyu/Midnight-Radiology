const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');

const CASES = [
  ['c2n1_e1', '新机器进PACS了，今晚的图直接上工作站', 'vox2_lei'],
  ['c2d2_1', '白班跟夜班不是一个打法', 'vox2_director'],
  ['c2am_1', '题库', 'vox2_director_am'],
  ['c2n3_x1', '医生，又是我', 'vox2_mystery'],
  ['c2n1_4', '老周', 'vox2_zhou'],
];

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });

  for (const [stepId, expectText, expectVox] of CASES) {
    const shift = stepId.startsWith('c2am') ? 'c2am' : stepId.slice(0, 4);
    await page.goto('about:blank');
    await page.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ stepId, shift }) => {
      const save = {
        v: 1, gender: 'm', gold: 500, ap: 3, skill: 10, heart: 10,
        items: [], badges: [], cards: [], evidence: [], flags: { bai_tube: true, data_audit: true },
        night: 6, dlc: { ch2: { shift, stepId, viewBg: null, viewSprite: null, viewSprite2: null } },
      };
      localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save));
      localStorage.setItem('mr-ch2-unlock', '1');
      const orig = HTMLMediaElement.prototype.play;
      window.__played = [];
      HTMLMediaElement.prototype.play = function () { window.__played.push(this.src); return orig.apply(this); };
    }, { stepId, shift });
    await page.goto('http://localhost:8899/index.html#/ch2', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    const text = await page.evaluate(() => document.body.innerText);
    const played = await page.evaluate(() => window.__played || []);
    const textOk = text.includes(expectText);
    const voxOk = played.some(u => u.includes(expectVox + '.mp3?v=2'));
    console.log(`${stepId}: 字幕原文${textOk ? '✅' : '❌ 未找到「' + expectText + '」'} | ${expectVox} ${voxOk ? '✅播放' : '❌未播放 ' + played.join(',')}`);
  }
  console.log('404/错误:', bad.length ? bad.join(' | ') : '无 ✅');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
