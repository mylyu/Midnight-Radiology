import json
from playwright.sync_api import sync_playwright
URL='http://localhost:8980/'; KEY='midnight-radiology-save-v1'
def mk(stepId,night):
    return json.dumps({"gender":"m","night":night,"gold":500,"skill":3,"wealth":1,"heart":2,"durability":90,"ap":3,
       "items":[],"badges":[],"stamps":[],"flags":{},"stepId":stepId,"screenHint":"night",
       "viewBg":"bg_control","viewSprite":None,"viewSprite2":None,"resumeKey":""},ensure_ascii=False)
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for name,(w,h) in [('portrait',(390,844)),('landscape',(844,390))]:
        pg=b.new_page(viewport={'width':w,'height':h})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        # 标题页
        pg.goto(URL); pg.wait_for_timeout(900)
        pg.screenshot(path=f'/tmp/m_{name}_title.png')
        apph=pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--apph')")
        print(name,'--apph =',apph.strip(),'期望',f'{h}px')
        # 夜班对话场景
        pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk('n2_gossip0',2))})")
        pg.reload(); pg.wait_for_timeout(600)
        bt=pg.locator('button:has-text("继续")')
        if bt.count(): bt.first.click(); pg.wait_for_timeout(500)
        b2=pg.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
        if b2.count(): b2.first.click(); pg.wait_for_timeout(800)
        pg.mouse.click(w//2, int(h*0.62)); pg.wait_for_timeout(2500)
        pg.screenshot(path=f'/tmp/m_{name}_night.png')
        print(name,'JS错误:', errs[:2] or '无')
        pg.close()
    # 横屏打卡页（用户截图的问题页）
    pg=b.new_page(viewport={'width':844,'height':390})
    pg.goto(URL)
    pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk('n1_hub',1))})")
    pg.reload(); pg.wait_for_timeout(600)
    bt=pg.locator('button:has-text("继续")')
    if bt.count(): bt.first.click(); pg.wait_for_timeout(1200)
    pg.screenshot(path='/tmp/m_landscape_checkin.png')
    btn=pg.locator('button:has-text("出发"), button:has-text("回到夜班现场")')
    if btn.count():
        bb=btn.first.bounding_box()
        print('横屏打卡按钮可见:', bb and bb['y']+bb['height']<=390, bb)
    b.close()
