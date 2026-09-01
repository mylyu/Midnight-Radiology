import json
from playwright.sync_api import sync_playwright
URL='http://localhost:8980/'; KEY='midnight-radiology-save-v1'
def mk(stepId,night,flags=None):
    return json.dumps({"gender":"m","night":night,"gold":500,"skill":3,"wealth":1,"heart":2,
      "durability":90,"ap":3,"items":[],"badges":[],"stamps":[],"flags":flags or {},"stepId":stepId,
      "screenHint":"night","viewBg":"bg_control","viewSprite":None,"viewSprite2":None,"resumeKey":""},ensure_ascii=False)

def boot(pg, save):
    pg.goto(URL); pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(save)})")
    pg.reload(); pg.wait_for_timeout(600)
    bt=pg.locator('button:has-text("继续")')
    if bt.count(): bt.first.click(); pg.wait_for_timeout(500)
    b2=pg.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
    if b2.count(): b2.first.click(); pg.wait_for_timeout(800)

with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))

    # --- A. 第4夜真实流程：从阿姨病例结尾走到鬼影病例 ---
    boot(pg, mk('n4_case7',4))
    seen=[]
    for step in range(10):
        pg.mouse.click(640,500); pg.wait_for_timeout(2600)
        sp=[s.split('/').pop() for s in pg.eval_on_selector_all('img','els=>els.map(e=>e.src)') if 'pat_' in s or 'char_' in s]
        txt=pg.locator('body').inner_text()
        seen.append((step,sp,txt[-120:].replace('\n','|')[:80]))
        if '残影' in txt and '怎么回事' in txt: break
        # 若出现选项则停下
        if pg.locator('button:has-text("沉着排查")').count(): break
    for s in seen: print('A',s[0],s[1])
    pg.screenshot(path='/tmp/flow_ghost.png')

    # --- B. 第5夜好友回响四连测 ---
    CASES=[('jiang_friend','老蒋在走廊换灯管','人心+1'),
           ('qian_helped','急诊有人给你留了东西','人心+1'),
           ('fan_friend','老范叫你去设备科','家业+1'),
           ('met_lei','小雷抱着笔记本','技术+1')]
    # 基线：无旗标 → 四个选项都不该出现
    boot(pg, mk('n5_hub',5))
    pg.wait_for_timeout(2500)
    body=pg.locator('body').inner_text()
    print('B-基线(应全False):', [lbl in body for _,lbl,_ in CASES])
    for flag,lbl,reward in CASES:
        boot(pg, mk('n5_hub',5,{flag:True}))
        pg.wait_for_timeout(2500)
        body=pg.locator('body').inner_text()
        appear = lbl in body
        btn = pg.locator(f'button:has-text("{lbl}")')
        played=reward_ok=gone=False
        if btn.count():
            btn.first.click(); pg.wait_for_timeout(2600); played=True
            for _ in range(4):
                pg.mouse.click(640,500); pg.wait_for_timeout(2600)
                t=pg.locator('body').inner_text()
                if reward in t: reward_ok=True
                if '自由行动' in t: break
            gone = lbl not in pg.locator('body').inner_text()
        print(f'B {flag:12s} 出现:{appear} 可点:{played} 奖励文案:{reward_ok} 一次性:{gone}')
    print('JS错误:', errs[:3] or '无')
    b.close()
