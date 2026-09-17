const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');

// 从第2日白班开始：验证①白班背景 ②手册20页 ③证物图 ④AP动态文本
const SAVE = {
  gender: 'm', night: 6, gold: 500, skill: 5, wealth: 0, heart: 3, durability: 80,
  badges: [], stamps: [], flags: { bai_tube: true, remote_proposal: true, old_register: true, nameless_films: true, maintenance_draft: true, phantom_log: true },
  lastCheckin: '', streak: 0, finished: true, seed: 12345, items: [], ap: 2, buyCount: 0,
  dlc: { ch2: { shift: 'c2d2', stepId: 'c2d2_0' } }, cards: [], events: [],
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const notFound = [];
  page.on('response', r => { if (r.status() === 404) notFound.push(r.url()) });
  // 只在首次导航注入存档（避免reload覆盖）
  let injected = false;
  await page.addInitScript((save) => {
    if (!localStorage.getItem('mr-test-done')) {
      localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save));
      localStorage.setItem('mr-ch2-unlock', '1');
      localStorage.setItem('mr-test-done', '1');
    }
  }, SAVE);
  await page.goto('http://localhost:8899/index.html#/ch2');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/t_daybg.png' });

  // 点两下看白班队列场景 bg_waiting
  await page.mouse.click(640, 300); await page.waitForTimeout(400);
  await page.mouse.click(640, 300); await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/t_waiting.png' });

  // 手册：从哪个入口翻？白班没有hub书入口，直接测——退回第1夜hub测书和AP
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('midnight-radiology-save-v1'));
    s.dlc.ch2 = { shift: 'c2n1', stepId: 'c2n1_hub' };
    s.ap = 2;
    localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(2000);
  const bodyTxt = await page.textContent('body');
  console.log('hub动态AP文本:', bodyTxt.includes('行动力⚡×2') ? '✓ 显示×2' : '✗ ' + (bodyTxt.match(/行动力⚡×\d/) || ['无'])[0]);

  // 打开书
  await page.mouse.click(640, 300); await page.waitForTimeout(1100);
  await page.locator('button', { hasText: 'CT夜班二十页' }).first().click(); await page.waitForTimeout(800);
  const bookTxt = await page.textContent('body');
  console.log('手册含第20页内容:', bookTxt.includes('能谱CT') ? '✓' : '✗', '| 含第11页早出晚归:', bookTxt.includes('早出晚归') ? '✓' : '✗');
  await page.screenshot({ path: '/tmp/t_book.png' });
  // 点第11页
  await page.locator('button', { hasText: /^11$/ }).first().click(); await page.waitForTimeout(400);
  console.log('第11页内容:', (await page.textContent('body')).includes('快进快出') ? '✓' : '✗');
  // 合上书
  await page.locator('button', { hasText: '合上书' }).click(); await page.waitForTimeout(500);

  // 手册（证物）：顶部应该有手册按钮——找🗂️入口。先看有没有「手册」按钮
  const manualBtn = page.locator('button', { hasText: '手册' });
  console.log('手册按钮数量:', await manualBtn.count());
  if (await manualBtn.count()) {
    await manualBtn.first().click(); await page.waitForTimeout(600);
    await page.locator('button', { hasText: '证物回看' }).click(); await page.waitForTimeout(600);
    await page.screenshot({ path: '/tmp/t_evidence.png' });
    const evImgs = await page.locator('img[alt=""]').count();
    console.log('证物页img标签数:', evImgs);
  }

  console.log('404资源:', notFound.length ? notFound : '无');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
