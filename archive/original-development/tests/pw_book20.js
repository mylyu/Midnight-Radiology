const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');
const SAVE = { gender:'m', night:6, gold:500, skill:5, wealth:0, heart:3, durability:80, badges:[], stamps:[], flags:{}, lastCheckin:'', streak:0, finished:true, seed:1, items:[], ap:3, buyCount:0, dlc:{ch2:{shift:'c2n1',stepId:'c2n1_hub'}}, cards:[], events:[] };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript((save) => {
    if (!localStorage.getItem('mr-t2')) {
      localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save));
      localStorage.setItem('mr-ch2-unlock','1'); localStorage.setItem('mr-t2','1');
    }
  }, SAVE);
  await page.goto('http://localhost:8899/index.html#/ch2');
  await page.waitForTimeout(1800);
  await page.mouse.click(640, 300); await page.waitForTimeout(1100);
  await page.locator('button', { hasText: 'CT夜班二十页' }).first().click(); await page.waitForTimeout(600);
  await page.locator('button', { hasText: /^20$/ }).first().click(); await page.waitForTimeout(400);
  const t = await page.textContent('body');
  console.log('第20页:', t.includes('能谱CT') && t.includes('光子计数') ? '✓' : '✗');
  await page.screenshot({ path: '/tmp/t_book20.png' });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
