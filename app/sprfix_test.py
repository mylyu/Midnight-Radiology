import json
from playwright.sync_api import sync_playwright
URL='http://localhost:8980/'; KEY='midnight-radiology-save-v1'
def mk(stepId,night):
    return json.dumps({"gender":"m","night":night,"gold":500,"skill":3,"wealth":1,"heart":2,"durability":90,"ap":3,
       "items":[],"badges":[],"stamps":[],"flags":{},"stepId":stepId,"screenHint":"night",
       "viewBg":"bg_corridor","viewSprite":None,"viewSprite2":None,"resumeKey":""},ensure_ascii=False)
with sync_playwright() as pw:
    b=pw.chromium.launch()
    pg=b.new_page(viewport={'width':884,'height':407})  # 模拟截图机型横屏 CSS 视口
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    # 小雷单立绘场景（用户截图同款）
    pg.goto(URL); pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk('n1_walk3',1))})")
    pg.reload(); pg.wait_for_timeout(600)
    bt=pg.locator('button:has-text("继续")')
    if bt.count(): bt.first.click(); pg.wait_for_timeout(500)
    b2=pg.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
    if b2.count(): b2.first.click(); pg.wait_for_timeout(800)
    pg.mouse.click(442,250); pg.wait_for_timeout(2500)
    pg.screenshot(path='/tmp/fix_lei.png')
    sp=pg.locator('img.sprite-l').first
    if sp.count():
        bb=sp.bounding_box()
        print('立绘框:', bb, '完整在视口内:', bb['y']>=0 and bb['y']+bb['height']<=407)
    # 双人立绘场景
    pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk('n5_night2',5))})")
    pg.reload(); pg.wait_for_timeout(600)
    bt=pg.locator('button:has-text("继续")')
    if bt.count(): bt.first.click(); pg.wait_for_timeout(500)
    b2=pg.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
    if b2.count(): b2.first.click(); pg.wait_for_timeout(800)
    pg.mouse.click(442,250); pg.wait_for_timeout(2500)
    pg.screenshot(path='/tmp/fix_duo.png')
    print('JS错误:', errs[:2] or '无')
    b.close()
