import json
from playwright.sync_api import sync_playwright
URL='http://localhost:8980/'; KEY='midnight-radiology-save-v1'
def mk(stepId,night):
    return json.dumps({"gender":"m","night":night,"gold":500,"skill":3,"wealth":1,"heart":2,"durability":90,"ap":3,
       "items":[],"badges":[],"stamps":[],"flags":{},"stepId":stepId,"screenHint":"night",
       "viewBg":"bg_control","viewSprite":None,"viewSprite2":None,"resumeKey":""},ensure_ascii=False)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800})
    pg.goto(URL); pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk('n5_epi0',5))})")
    pg.reload(); pg.wait_for_timeout(600)
    bt=pg.locator('button:has-text("继续")')
    if bt.count(): bt.first.click(); pg.wait_for_timeout(500)
    b2=pg.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
    if b2.count(): b2.first.click(); pg.wait_for_timeout(800)
    for step in range(13):
        pg.mouse.click(640,500); pg.wait_for_timeout(2300)
        if step==5: pg.screenshot(path='/tmp/t_dir2.png')   # epi6 主任CT批文
        if step==11: pg.screenshot(path='/tmp/t_teaser2.png') # epi11 预告字幕
        t=pg.locator('body').inner_text()
        if '敬请期待' in t: break
    b.close()
