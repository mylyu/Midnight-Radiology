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
  await page.locator('button:visible', { hasText: '体模数据记得带上' }).first().click();
  await page.waitForTimeout(1500);
  const t1 = await page.evaluate(() => document.body.innerText);
  console.log('点选项后:', t1.includes('抱拳的表情') ? '✅ p2d（抱拳表情）' : '❌ ' + t1.slice(150, 350).replace(/\n+/g, ' | '));
  await page.mouse.click(640, 300);
  await page.waitForTimeout(1600);
  const t2 = await page.evaluate(() => document.body.innerText);
  console.log('再推进:', t2.includes('早上六点，天边泛白') ? '✅ 清晨告别 g0' : '❌ ' + t2.slice(150, 350).replace(/\n+/g, ' | '));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
