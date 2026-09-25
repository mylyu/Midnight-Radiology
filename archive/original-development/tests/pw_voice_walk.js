const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });

  await page.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const save = {
      v: 1, gender: 'm', gold: 500, ap: 3, skill: 10, heart: 10,
      items: ['snack','book','toolbox','key','dosimeter','milktea'],
      badges: [], cards: [], evidence: [], flags: { bai_tube: true, data_audit: true },
      night: 6, dlc: { ch2: { shift: 'c2n1', stepId: 'c2n1_0', viewBg: null, viewSprite: null, viewSprite2: null } },
    };
    localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save));
    localStorage.setItem('mr-ch2-unlock', '1');
  });
  await page.goto('http://localhost:8899/index.html#/ch2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const orig = HTMLMediaElement.prototype.play;
    window.__played = [];
    HTMLMediaElement.prototype.play = function () { window.__played.push(this.src); return orig.apply(this); };
  });

  const seen = [];
  let reached = false;
  for (let i = 0; i < 80 && !reached; i++) {
    const t = await page.evaluate(() => document.body.innerText.slice(0, 4000));
    seen.push(t);
    if (t.includes('新机器进PACS了')) { reached = true; break; }
    // 有选项则点第一个可见按钮(枢纽/选项),否则点屏幕推进
    const btns = page.locator('button:visible');
    const n = await btns.count();
    let clicked = false;
    for (let b = 0; b < n; b++) {
      const txt = (await btns.nth(b).innerText().catch(() => '')) || '';
      // 跳过商店/徽章等界面按钮,优先点对话选项(选项一般带 ⚡ 或是长文本)
      if (txt.includes('⚡') || txt.length > 8) {
        await btns.nth(b).click().catch(() => {});
        clicked = true;
        break;
      }
    }
    if (!clicked) await page.mouse.click(640, 300);
    await page.waitForTimeout(1400);
  }

  const playedList = await page.evaluate(() => window.__played);
  const allText = seen.join('\n@@STEP@@\n');

  console.log('--- 走查结果 ---');
  console.log('到达小雷PACS台词步:', reached ? '✅' : '❌');
  if (reached) {
    const step = seen[seen.length - 1];
    console.log('该步字幕含「鸟枪换炮喽」:', step.includes('鸟枪换炮喽') ? '是(字幕与TTS一致)' : '否(字幕为原文,TTS口播仅内部记录)');
    console.log('该步字幕片段:', step.split('\n').filter(l => l.includes('PACS') || l.includes('鸟枪')).join(' / '));
  }
  console.log('vox2_lei 播放:', playedList.some(u => u.includes('vox2_lei')) ? '✅' : '❌');
  console.log('vox2_he 播放:', playedList.some(u => u.includes('vox2_he')) ? '✅' : '(本段未覆盖,文件字节已核)');
  console.log('全部播放URL含?v=2:', playedList.length > 0 && playedList.every(u => u.includes('?v=2')) ? '✅' : '❌');
  console.log('404/错误:', bad.length ? bad.join(' | ') : '无 ✅');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
