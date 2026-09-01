import json
from playwright.sync_api import sync_playwright
URL='http://localhost:8980/'; KEY='midnight-radiology-save-v1'
def mk(stepId,night,flags=None,**kw):
    s={"gender":"m","night":night,"gold":500,"skill":3,"wealth":1,"heart":2,"durability":90,"ap":3,
       "items":[],"badges":[],"stamps":[],"flags":flags or {},"stepId":stepId,"screenHint":"night",
       "viewBg":"bg_control","viewSprite":None,"viewSprite2":None,"resumeKey":""}
    s.update(kw); return json.dumps(s,ensure_ascii=False)
def boot(pg,save):
    pg.goto(URL); pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(save)})")
    pg.reload(); pg.wait_for_timeout(600)
    bt=pg.locator('button:has-text("继续")')
    if bt.count(): bt.first.click(); pg.wait_for_timeout(500)
    b2=pg.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
    if b2.count(): b2.first.click(); pg.wait_for_timeout(800)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))

    # 八卦链：各段首步渲染 + 衔接正确
    for sid,night,want in [('n2_s12',2,'盒饭'),('n3_gossip1',3,'耦合剂'),('n4_gossip1',4,'旧片库'),('n5_gossip1',5,'小凯')]:
        boot(pg, mk(sid,night)); pg.mouse.click(640,500); pg.wait_for_timeout(2500)
        print('八卦', sid, want in pg.locator('body').inner_text())

    # 真实衔接：n2_s12 点到底应进入 gossip 再回主线 n2_s13
    boot(pg, mk('n2_s12',2)); flow=[]
    for _ in range(8):
        pg.mouse.click(640,500); pg.wait_for_timeout(2400)
        t=pg.locator('body').inner_text()
        flow.append('gossip' if '八卦' in t or '盒饭' in t or '皮包' in t or 'DR机房' in t else ('mystery' if '不得劲' in t or '麻烦您' in t else '?'))
        if 'mystery' in flow: break
    print('N2衔接:', flow)

    # 回响插图：钱大叔苹果
    boot(pg, mk('n5_hub',5,{'qian_helped':True})); pg.wait_for_timeout(2500)
    pg.locator('button:has-text("急诊有人给你留了东西")').first.click(); pg.wait_for_timeout(2600)
    pg.mouse.click(640,500); pg.wait_for_timeout(2600)
    imgs=[s.split('/').pop() for s in pg.eval_on_selector_all('img','els=>els.map(e=>e.src)')]
    print('回响插图 item_apple:', 'item_apple.png' in imgs)
    pg.screenshot(path='/tmp/t_apple.png')

    # 尾声：从 n5_epi0 注入，走完全程
    boot(pg, mk('n5_epi0',5)); seen=set()
    for step in range(16):
        pg.mouse.click(640,500); pg.wait_for_timeout(2400)
        imgs=[s.split('/').pop() for s in pg.eval_on_selector_all('img','els=>els.map(e=>e.src)')]
        for im in imgs:
            if im.startswith(('char_','bg_','img_','phone')): seen.add(im)
        t=pg.locator('body').inner_text()
        if '科主任' in t and 'director' not in seen: seen.add('主任对话')
        if '第二章' in t and '敬请期待' in t: seen.add('预告字幕')
        if '领取你的通关凭证' in t or '盖章发证' in t: seen.add('发证页'); break
        if step==6: pg.screenshot(path='/tmp/t_director.png')
        if step==12: pg.screenshot(path='/tmp/t_teaser.png')
    print('尾声元素:', sorted(seen))
    # 配乐资源是否被加载
    res = pg.evaluate("performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('bgm'))")
    print('BGM加载:', sorted(set(x.split('/').pop() for x in res)))
    print('JS错误:', errs[:3] or '无')
    b.close()
