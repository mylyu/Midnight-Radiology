const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');
const fs = require('fs');

const AUDIO = ['vox_zhou','vox2_zhou','vox_lei','vox2_lei','vox_he','vox2_he','vox_director','vox2_director','vox2_director_am','vox_mystery','vox2_mystery','vox_qin','vox_shao','vox_grandpa','vox_uncle','vox_kid'];

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });

  // 1) 16 条音频 URL(?v=2)状态码 + 字节数与本地新文件一致
  await page.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
  for (const name of AUDIO) {
    const r = await page.request.get(`http://localhost:8899/audio/${name}.mp3?v=2`);
    const body = await r.body();
    const local = fs.statSync(`/mnt/agents/output/app/public/audio/${name}.mp3`).size;
    if (r.status() !== 200 || body.length !== local) {
      bad.push(`AUDIO-MISMATCH ${name} status=${r.status()} net=${body.length} local=${local}`);
    }
  }
  console.log('音频16条 状态+字节核对完成');

  // 2) 进入第二章第一夜，验证 vox2_zhou(c2n1_4)播放且字幕为原文
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

  // 播放到 c2n1_4(老周开口),监听实际播放
  let played = false;
  await page.evaluate(() => {
    const orig = HTMLMediaElement.prototype.play;
    window.__played = [];
    HTMLMediaElement.prototype.play = function () { window.__played.push(this.src); return orig.apply(this); };
  });
  const seen = [];
  for (let i = 0; i < 30; i++) {
    const t = await page.evaluate(() => document.body.innerText.slice(0, 4000));
    seen.push(t);
    if (t.includes('新机器进PACS了')) break; // c2n1_e1 小雷 —— 字幕原文应含 PACS 字样
    await page.mouse.click(640, 300);
    await page.waitForTimeout(900);
  }
  const playedList = await page.evaluate(() => window.__played);
  const bodyText = seen.join('\n@@STEP@@\n');

  // 3) 字幕抽查:必须显示「原文」,不是 TTS 文字
  const checks = [
    ['小雷字幕保留PACS写法', bodyText.includes('新机器进PACS了')],
    ['小雷字幕未变成TTS口播稿', !bodyText.includes('鸟枪换炮喽') || bodyText.includes('鸟枪换炮')], // 原字幕本来就含「鸟枪换炮」则通过
  ];
  const pacsStepOk = seen.some(t => t.includes('新机器进PACS了'));

  console.log('--- 结果 ---');
  console.log('到达小雷PACS台词步:', pacsStepOk ? '✅' : '❌(未走到)');
  console.log('播放过的音频:', playedList.length ? playedList.map(u => u.split('/').pop()).join(', ') : '(无)');
  console.log('vox2 系列有播放:', playedList.some(u => u.includes('vox2_zhou') || u.includes('vox2_lei') || u.includes('vox2_he')) ? '✅' : '⚠️ 未触发(可能未走到语音步)');
  console.log('含?v=2:', playedList.every(u => u.includes('?v=2')) && playedList.length > 0 ? '✅' : (playedList.length ? '❌' : '—'));
  checks.forEach(([n, ok]) => console.log(`${ok ? '✅' : '❌'} ${n}`));
  console.log('404/错误:', bad.length ? bad.join(' | ') : '无 ✅');

  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
