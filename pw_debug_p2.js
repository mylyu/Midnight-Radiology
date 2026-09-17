const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const save = {
      v: 1, gender: 'm', gold: 500, ap: 3, skill: 10, heart: 10,
      items: [], badges: [], cards: [], evidence: [], flags: { bai_tube: true },
      night: 6, dlc: { ch2: { shift: 'c2n5', stepId: 'c2n5_p2c', viewBg: null, viewSprite: null, viewSprite2: null } },
    };
    localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save));
    localStorage.setItem('mr-ch2-unlock', '1');
  });
  await page.goto('http://localhost:8899/index.html#/ch2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('== p2b 初始 ==');
  console.log((await page.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\n+/g, ' | '));
  await page.mouse.click(640, 300);
  await page.waitForTimeout(1500);
  console.log('== 点击一次后 ==');
  const t = (await page.evaluate(() => document.body.innerText)).slice(0, 400);
  console.log(t.replace(/\n+/g, ' | '));
  const btns = await page.locator('button:visible').allInnerTexts();
  console.log('== 按钮 ==', JSON.stringify(btns.slice(0, 8)));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
