import json
from playwright.sync_api import sync_playwright
URL='http://localhost:8980/'; KEY='midnight-radiology-save-v1'
def mk(stepId,night):
    return json.dumps({"gender":"m","night":night,"gold":500,"skill":3,"wealth":1,"heart":2,
      "durability":90,"ap":3,"items":[],"badges":[],"stamps":[],"flags":{},"stepId":stepId,
      "screenHint":"night","viewBg":"bg_control","viewSprite":None,"viewSprite2":None,"resumeKey":""},ensure_ascii=False)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800})
    pg.goto(URL); pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk('n5_case3',5))})")
    pg.reload(); pg.wait_for_timeout(600)
    bt=pg.locator('button:has-text("继续")')
    if bt.count(): bt.first.click(); pg.wait_for_timeout(500)
    b2=pg.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
    if b2.count(): b2.first.click(); pg.wait_for_timeout(700)
    pg.mouse.click(640,500); pg.wait_for_timeout(2500)
    print([s.split('/').pop() for s in pg.eval_on_selector_all('img','els=>els.map(e=>e.src)') if 'pat_' in s or 'char_' in s])
    pg.screenshot(path='/tmp/spr_case3.png'); b.close()
