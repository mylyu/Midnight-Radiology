const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const SAVE = { v:1, gender:'m', night:6, gold:9999, skill:5, wealth:3, heart:5, ap:3,
    items:[], flags:{}, badges:[], heard:{}, heard2:{},
    dlc:{ ch2:{ shift:'c2d4', stepId:'c2d4_0', viewBg:null, viewSprite:null, viewSprite2:null } }, finished:true };
  await page.addInitScript((s) => {
    localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s));
    localStorage.setItem('mr-ch2-unlock','1');
  }, SAVE);
  await page.goto('http://localhost:8899/#/ch2');
  await page.waitForTimeout(2500);
  const text = () => page.evaluate(() => document.body.innerText);
  const stepId = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('midnight-radiology-save-v1')); return s.dlc?.ch2?.stepId; });
  for (let i = 0; i < 120; i++) {
    const t = await text();
    const sid = await stepId();
    if (t.includes('本日结算')) { console.log('DONE', sid); break; }
    if (t.includes('窗宽 · 窗位')) { console.log('WINDOW?', sid); break; }
    if (t.includes('增强前核对清单')) {
      console.log(`[${i}] CHECKLIST at ${sid}`);
      for (let r = 0; r < 10; r++) {
        const todo = await page.$$('button:has-text("待核对")');
        for (const b of todo) { await b.click().catch(()=>{}); await page.waitForTimeout(150); }
        const doneBtn = await page.$$('button:has-text("核对完毕")');
        if (doneBtn.length) { await doneBtn[0].click().catch(()=>{}); await page.waitForTimeout(600); }
        if (!(await text()).includes('增强前核对清单')) break;
        await page.waitForTimeout(400);
      }
      continue;
    }
    if (t.includes('哪一期') && t.includes('边缘')) { console.log(`[${i}] PHASE1 at ${sid}`); await page.click('text=动脉期——药刚进动脉'); await page.waitForTimeout(500); continue; }
    if (t.includes('哪一期')) { console.log(`[${i}] PHASE2 at ${sid}`); await page.click('text=门脉期——药经门静脉'); await page.waitForTimeout(500); continue; }
    if (t.includes('期相过关')) { console.log(`[${i}] PHASE BADGE at ${sid}`); await page.mouse.click(640,300); await page.waitForTimeout(400); continue; }
    if (t.includes('请假')) { console.log(`[${i}] CHOICE-CONTRA at ${sid}`); await page.click('text=暂停增强'); await page.waitForTimeout(500); continue; }
    if (t.includes('应急处置')) { console.log(`[${i}] ALLERGY at ${sid}`); await page.click('text=立即停药'); await page.waitForTimeout(500); continue; }
    if (t.includes('你的表态')) { console.log(`[${i}] DATA at ${sid}`); await page.click('text=折中'); await page.waitForTimeout(500); continue; }
    if (i % 5 === 0) console.log(`[${i}] step=${sid} | ${t.split('\n').filter(l=>l.trim()).slice(-2).join(' | ').slice(0,70)}`);
    await page.mouse.click(640, 300);
    await page.waitForTimeout(400);
  }
  await browser.close();
})();
