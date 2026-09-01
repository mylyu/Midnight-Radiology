import json
from playwright.sync_api import sync_playwright
URL='http://localhost:8980/'; KEY='midnight-radiology-save-v1'
def mk(stepId,night):
    return json.dumps({"gender":"m","night":night,"gold":500,"skill":3,"wealth":1,"heart":2,"durability":90,"ap":3,
       "items":[],"badges":[],"stamps":[],"flags":{},"stepId":stepId,"screenHint":"night",
       "viewBg":"bg_control","viewSprite":None,"viewSprite2":None,"resumeKey":""},ensure_ascii=False)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    nf=[]; pg.on('response',lambda r:nf.append(r.url) if r.status>=400 else None)
    pg.goto(URL); pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk('n1_s13r',1))})")
    pg.reload(); pg.wait_for_timeout(600)
    bt=pg.locator('button:has-text("继续")')
    if bt.count(): bt.first.click(); pg.wait_for_timeout(500)
    b2=pg.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
    if b2.count(): b2.first.click(); pg.wait_for_timeout(800)
    before = pg.locator('body').inner_text()
    # 全程不点击，等打字机+800ms延迟+5s扫描+1.2s停留+自动推进
    pg.wait_for_timeout(14000)
    after = pg.locator('body').inner_text()
    print('推进前含「扫描仪」:', '扫描仪' in before[-200:])
    print('已自动离开读取步:', '图像出来了' in after or '仔细看' in after or '双环' in after)
    print('扫描遮罩已消失:', '读取中' not in after and '扫描中' not in after)
    print('JS错误:', errs[:3] or '无'); print('404:', nf[:3] or '无')
    pg.screenshot(path='/tmp/autoadv.png')
    b.close()
