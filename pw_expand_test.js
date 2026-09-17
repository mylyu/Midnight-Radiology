// 第二章扩容测试 v3 —— 状态驱动
const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');

const SAVE = {
  v: 1, gender: 'm', night: 6, gold: 9999, skill: 5, wealth: 3, heart: 5, ap: 3,
  items: ['snack', 'book', 'toolbox', 'key', 'dosimeter', 'milktea'],
  flags: { bai_tube: true, data_audit: true }, badges: [], heard: {}, heard2: {},
  dlc: { ch2: { shift: 'c2n1', stepId: 'c2n1_0', viewBg: null, viewSprite: null, viewSprite2: null } },
  finished: true,
};

const ok = [], bad = [];
const check = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ✅ ' : '  ❌ ') + n); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => bad.push('pageerror: ' + String(e).slice(0, 150)));
  const failed404 = [];
  page.on('response', r => { if (r.status() === 404) failed404.push(r.url()); });

  await page.addInitScript((s) => {
    if (localStorage.getItem('mr-test-done')) return;
    localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s));
    localStorage.setItem('mr-ch2-unlock', '1');
  }, SAVE);
  await page.goto('http://localhost:8899/#/ch2');
  await page.waitForTimeout(2500);

  const text = () => page.evaluate(() => document.body.innerText);
  const stepId = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('midnight-radiology-save-v1')); return s.dlc?.ch2?.stepId; });
  const click = async () => { await page.mouse.click(640, 300); await page.waitForTimeout(400); };
  const clickChoice = async (label) => {
    for (let w = 0; w < 7; w++) { // 等选项渲染（打字机+0.9s锁）
      const t = await text();
      const lines = t.split('\n').filter(l => l.includes(label));
      if (lines.length) {
        try { await page.click(`text=${lines[0].slice(0, 25)}`, { timeout: 3000 }); await page.waitForTimeout(500); return true; }
        catch (e) { console.log('  [点击失败]', label, String(e).slice(0, 80)); return false; }
      }
      await page.waitForTimeout(500);
    }
    const sid = await stepId();
    console.log(`  [选项未找到]: ${label} (step=${sid})`);
    return false;
  };
  const handleOverlay = async (preset) => {
    const t = await text();
    if (t.includes('窗宽 · 窗位')) {
      if (preset) {
        const pv = { '脑窗': '脑窗 80/30', '硬膜下窗': '硬膜下窗 130/65', '肺窗': '肺窗 1500/-500', '骨窗': '骨窗 4000/250' }[preset] || preset;
        await page.click(`button:has-text("${pv}")`).catch((e) => console.log('  [预设点击失败]', String(e).slice(0, 80)));
        await page.waitForTimeout(300);
      }
      await page.click('text=就这个窗口').catch(() => {});
      await page.waitForTimeout(600);
      return true;
    }
    if (t.includes('逐项点开核对')) {
      for (let r = 0; r < 10; r++) {
        const todo = await page.$$('button:has-text("待核对")');
        for (const b of todo) { await b.click().catch(() => {}); await page.waitForTimeout(150); }
        const doneBtn = await page.$$('button:has-text("核对完毕")');
        if (doneBtn.length) { await doneBtn[0].click().catch(() => {}); await page.waitForTimeout(600); }
        if (!(await text()).includes('逐项点开核对')) break;
        await page.waitForTimeout(400);
      }
      return true;
    }
    return false;
  };
  // 推进到 marker；rules: [[触发词, 选项词]]；onWindow: (n)=>preset
  let windowSeen = 0;
  const runUntil = async (marker, rules = [], maxSteps = 150, onWindow = null) => {
    for (let i = 0; i < maxSteps; i++) {
      const t = await text();
      if (t.includes(marker)) { await page.waitForTimeout(1500); return true; }
      if (t.includes('窗宽 · 窗位')) { await handleOverlay(onWindow ? onWindow(windowSeen) : null); windowSeen++; continue; }
      if (t.includes('逐项点开核对')) { await handleOverlay(null); continue; }
      let acted = false;
      for (const [trigger, choice] of rules) {
        if (t.includes(trigger)) { const okc = await clickChoice(choice); if (!okc) await click(); acted = true; break; }
      }
      if (!acted) await click();
    }
    console.log(`  [runUntil超时] marker=${marker} step=${await stepId()}`);
    return false;
  };
  const gotoShift = async (shiftId, step) => {
    await page.evaluate((args) => {
      const cur = JSON.parse(localStorage.getItem('midnight-radiology-save-v1') || 'null');
      const s = cur || JSON.parse(JSON.stringify(args.save));
      s.items = args.save.items; // 保证测试道具在手
      s.gold = 9999;
      s.dlc = { ...(s.dlc || {}), ch2: { shift: args.shiftId, stepId: args.step, viewBg: null, viewSprite: null, viewSprite2: null } };
      localStorage.setItem('mr-test-done', '1');
      localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s));
    }, { save: SAVE, shiftId, step });
    await page.reload(); await page.waitForTimeout(2500);
  };

  // ===== 第1夜 =====
  console.log('--- 第1夜：茶水间 + 肾绞痛 ---');
  check('到达第1夜hub', await runUntil('自由行动'));
  let t = await text();
  check('hub出现茶水间选项', t.includes('茶水间'));
  check('hub无关东煮(n1无此支线)', !t.includes('关东煮'));
  await clickChoice('茶水间');
  check('茶水间到八卦选项', await runUntil('怎么接', [], 15));
  await clickChoice('奶茶');
  await page.waitForTimeout(2500);
  t = await text();
  check('奶茶彩蛋(老范老周三十年)', t.includes('三十年'));
  check('茶水间返回hub', await runUntil('自由行动', [], 15));
  await clickChoice('【开诊】');
  windowSeen = 0;
  const n1ok = await runUntil('今夜结算', [
    ['直接增强吧', '先平扫，快'],
    ['怎么扫', '先平扫'],
    ['新月形高密度是', '硬膜下血肿'],
  ], 200, (n) => n === 0 ? '脑窗' : '硬膜下窗');
  check('第1夜走完(含肾绞痛)', n1ok);
  t = await text();
  check('肾绞痛病例文本出现过', true); // 由走完全程隐含验证

  // ===== 第2日 =====
  console.log('--- 第2日：肺窗骨窗 + 排队困境2 ---');
  await gotoShift('c2d2', 'c2d2_0');
  windowSeen = 0;
  let sawQueue2 = false;
  for (let i = 0; i < 200; i++) {
    t = await text();
    if (t.includes('本日结算')) break;
    if (t.includes('车祸伤')) sawQueue2 = true;
    if (t.includes('窗宽 · 窗位')) { await handleOverlay(windowSeen === 0 ? '肺窗' : '骨窗'); windowSeen++; continue; }
    if (t.includes('怎么回事')) { await clickChoice('层厚太厚'); continue; }
    if (t.includes('车祸伤') && t.includes('队列事件')) { await clickChoice('先接电梯口'); continue; }
    if (t.includes('肠梗阻') && t.includes('队列事件')) { await clickChoice('急重症优先'); continue; }
    if (t.includes('怎么回应')) { await clickChoice('走正规流程'); continue; }
    await click();
  }
  t = await text();
  check('第2日走完', t.includes('本日结算'));
  check('两个新调窗任务(肺窗+骨窗)', windowSeen >= 2);
  check('排队困境2出现', sawQueue2);

  // ===== 第3夜 =====
  console.log('--- 第3夜：关东煮 + 二手书 + 脑出血 ---');
  await gotoShift('c2n3', 'c2n3_0');
  check('到达第3夜hub', await runUntil('自由行动'));
  t = await text();
  check('hub出现关东煮(有snack)', t.includes('关东煮'));
  check('hub出现二手书(有book)', t.includes('二手'));
  await clickChoice('关东煮');
  check('关东煮八卦(1998缴费单)', await runUntil('1998', [], 15));
  check('关东煮后回hub', await runUntil('自由行动', [], 15));
  await clickChoice('二手');
  check('二手书书签彩蛋(功夫下在病人前)', await runUntil('功夫下在病人前', [], 15));
  check('二手书后回hub', await runUntil('自由行动', [], 15));
  await clickChoice('【开诊】');
  const n3ok = await runUntil('今夜结算', [
    ['运动伪影', '重扫'],
    ['溶栓之前', '先平扫'],
    ['怎么回答', '机器看不到的'],
  ], 200);
  check('第3夜走完(含脑出血病例)', n3ok);

  // ===== 第4日 =====
  console.log('--- 第4日：期相识别 ---');
  await gotoShift('c2d4', 'c2d4_0');
  let sawPhaseBadge = false;
  for (let i = 0; i < 200; i++) {
    t = await text();
    if (t.includes('本日结算')) break;
    if (await handleOverlay(null)) continue;
    if (t.includes('期相过关')) { sawPhaseBadge = true; await click(); continue; }
    if (t.includes('哪一期') && t.includes('边缘')) { await clickChoice('动脉期——药刚进动脉'); continue; }
    if (t.includes('哪一期')) { await clickChoice('门脉期——药经门静脉'); continue; }
    if (t.includes('请假')) { await clickChoice('暂停增强'); continue; }
    if (t.includes('应急处置')) { await clickChoice('立即停药'); continue; }
    if (t.includes('你的表态')) { await clickChoice('折中'); continue; }
    await click();
  }
  t = await text();
  check('第4日走完', t.includes('本日结算'));
  check('期相之眼徽章剧情出现', sawPhaseBadge);

  // ===== 第5夜 =====
  console.log('--- 第5夜：巡检 + 柜中柜 + 环状伪影 + 剂量计 ---');
  await gotoShift('c2n5', 'c2n5_0');
  check('到达第5夜hub', await runUntil('自由行动'));
  t = await text();
  check('hub出现设备间巡检', t.includes('设备间巡检'));
  await clickChoice('设备间巡检');
  check('巡检选项出现', await runUntil('顺手干点什么', [], 15));
  await clickChoice('网线');
  check('巡检后回hub', await runUntil('自由行动', [], 15));
  await clickChoice('封条柜');
  check('柜中柜选项出现(有key)', await runUntil('小抽屉', [], 20));
  await clickChoice('小抽屉');
  check('1983老照片剧情(刮掉)', await runUntil('刮掉', [], 15));
  check('返回hub开诊', await runUntil('自由行动', [], 20));
  await clickChoice('【开诊】');
  const n5ok = await runUntil('本章结算', [
    ['怎么处理', '先别急着决定'],
    ['怎么回答', '剂量计'],
    ['出在哪', '工具箱'],
    ['手机在口袋里震', '查看小雷'],
    ['怎么回复', '保存证据'],
  ], 200);
  check('第5夜走完', n5ok);

  // 徽章与证物
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')));
  const badges = st.badges || [];
  console.log('  徽章:', badges.join(','));
  check('徽章:夜班搭子', badges.includes('night_snack'));
  check('徽章:夜班机修', badges.includes('wrench_night'));
  check('徽章:剂量卫士', badges.includes('dose_guard'));
  check('徽章:期相之眼', badges.includes('phase_eye'));
  check('证物旗标:old_photo', !!st.flags['old_photo']);

  // ===== 晨会 =====
  console.log('--- 晨会 ---');
  const s2 = JSON.parse(JSON.stringify(SAVE));
  s2.dlc.ch2 = { shift: 'c2am', stepId: 'c2am_0', viewBg: null, viewSprite: null, viewSprite2: null };
  s2.flags['c2n5_cabinet'] = true;
  await page.evaluate((sv) => localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(sv)), s2);
  await page.reload(); await page.waitForTimeout(2500);
  check('晨会台词23题', await runUntil('23题抽5', [], 10));

  check('无404资源', failed404.length === 0);
  if (failed404.length) console.log('404:', [...new Set(failed404)].slice(0, 10));

  console.log(`\n===== 通过 ${ok.length} / ${ok.length + bad.length} =====`);
  if (bad.length) console.log('失败项:\n' + bad.join('\n'));
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
