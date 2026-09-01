
import json, os
from playwright.sync_api import sync_playwright

URL='http://localhost:8980/'; KEY='midnight-radiology-save-v1'
OUT='/mnt/agents/output/audit_shots'

def mk(stepId=None, night=1, hint='night', finished=False):
    return json.dumps({"gender":"m","night":night,"gold":500,"skill":3,"wealth":1,"heart":2,"durability":90,"ap":3,
       "items":[],"badges":[],"stamps":[],"flags":{},"stepId":stepId,"screenHint":hint,"finished":finished,
       "viewBg":"bg_control","viewSprite":None,"viewSprite2":None,"resumeKey":""},ensure_ascii=False)

RES = [
  ('desktop_hd', 1920,1080,False),
  ('laptop',     1366, 768,False),
  ('tablet_p',    768,1024,True),
  ('phone_p',     390, 844,True),
  ('phone_p_s',   360, 640,True),
  ('phone_l',     844, 390,True),
  ('phone_l_s',   667, 375,True),
]

def shot(pg, folder, name):
    pg.screenshot(path=f'{OUT}/{folder}/{name}.png')

def go_night(pg, stepId, night):
    pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk(stepId, night))})")
    pg.reload(wait_until='networkidle'); pg.wait_for_timeout(400)
    bt=pg.locator('button:has-text("继续")')
    if bt.count(): bt.first.click(); pg.wait_for_timeout(700)
    b2=pg.locator('button:has-text("回到夜班现场")')
    if b2.count(): b2.first.click(); pg.wait_for_timeout(900)

with sync_playwright() as pw:
    b=pw.chromium.launch()
    for name,w,h,touch in RES:
        os.makedirs(f'{OUT}/{name}', exist_ok=True)
        ctx=b.new_context(viewport={'width':w,'height':h}, is_mobile=touch, has_touch=touch)
        pg=ctx.new_page()
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.add_init_script(f"sessionStorage.setItem('mr-rotate-dismissed','1')")

        # 1 标题
        pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(1000)
        shot(pg,name,'01_title')
        # 2 选人
        pg.locator('button:has-text("开始游戏"), button:has-text("重新开始")').first.click(); pg.wait_for_timeout(700)
        shot(pg,name,'02_select')
        # 3 打卡
        pg.locator('button:has-text("陈一帆")').first.click(); pg.wait_for_timeout(900)
        shot(pg,name,'03_checkin')
        # 4 单立绘对话
        go_night(pg,'n1_s2',1); shot(pg,name,'04_night_single')
        # 5 双立绘
        go_night(pg,'n1_s5',1); shot(pg,name,'05_night_dual')
        # 6 选项
        go_night(pg,'n1_walk3',1); shot(pg,name,'06_choice')
        # 7 扫描动画(进行中)
        go_night(pg,'n1_s13r',1); pg.wait_for_timeout(400); shot(pg,name,'07_readout')
        # 8 中央插图
        go_night(pg,'n3_arc3',3); shot(pg,name,'08_image')
        # 9 手机消息
        go_night(pg,'n2_qian0',2); pg.wait_for_timeout(600); shot(pg,name,'09_phone')
        # 10 白天 hub
        pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk(None,2,'day'))})")
        pg.reload(wait_until='networkidle'); pg.wait_for_timeout(400)
        bt=pg.locator('button:has-text("继续")')
        if bt.count(): bt.first.click(); pg.wait_for_timeout(700)
        b2=pg.locator('button:has-text("出发，上夜班")')
        if b2.count(): b2.first.click(); pg.wait_for_timeout(900)
        shot(pg,name,'10_hub')
        # 11 小卖部
        shop=pg.locator('button:has-text("小卖部")')
        if shop.count(): shop.first.click(); pg.wait_for_timeout(700); shot(pg,name,'11_shop')
        # 12 考试
        pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk(None,5,'quiz',True))})")
        pg.reload(wait_until='networkidle'); pg.wait_for_timeout(400)
        bt=pg.locator('button:has-text("继续")')
        if bt.count(): bt.first.click(); pg.wait_for_timeout(1200)
        shot(pg,name,'12_quiz')
        # 13 勋章墙
        pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(600)
        bd=pg.locator('button:has-text("勋章墙")')
        if bd.count(): bd.first.click(); pg.wait_for_timeout(700); shot(pg,name,'13_badges')

        print(name, 'done, JS错误:', errs[:2] or '无', flush=True)
        ctx.close()
    b.close()
print('ALL DONE')
