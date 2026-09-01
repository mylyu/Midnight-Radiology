"""六个读取步骤的时序验证：文本先播完可见 → 动画再启动 → 完成后可推进；奶茶价格检查。"""
import json
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8980/'
KEY = 'midnight-radiology-save-v1'

# (读取步骤id, 夜, 步骤文本片段)
READOUT_STEPS = [
    ('n1_s13r', 1, '按下读取键'),
    ('n2_s8r', 2, '先读正位'),
    ('n2_s15r', 2, '送进隔壁扫描仪'),
    ('n3_s8r', 3, '容不得第二遍'),
    ('n4_ghost1r', 4, '一行行扫过板面'),
    ('n5_case3r', 5, '读取完成'),
]

def mk_save(stepId, night):
    s = {"gender": "m", "night": night, "gold": 500, "skill": 3, "wealth": 1, "heart": 2,
         "durability": 90, "ap": 3, "items": [], "badges": [], "stamps": [],
         "flags": {}, "stepId": stepId, "screenHint": "night", "viewBg": "bg_control",
         "viewSprite": None, "viewSprite2": None, "resumeKey": ""}
    return json.dumps(s, ensure_ascii=False)

def boot(page, save):
    page.goto(URL)
    page.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(save)})")
    page.reload(); page.wait_for_timeout(800)
    b = page.locator('button:has-text("继续")')
    if b.count(): b.first.click(); page.wait_for_timeout(800)
    b2 = page.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
    if b2.count(): b2.first.click(); page.wait_for_timeout(600)

def body(page):
    return page.locator('body').inner_text()

results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    for sid, night, frag in READOUT_STEPS:
        boot(page, mk_save(sid, night))
        # 立即看：动画不应在文本播出前就盖上来
        b0 = body(page)
        early_overlay = '激光逐行读取' in b0
        # 等文本播完（短文本 1s 内）+ 800ms 延迟前的窗口：文本应已可见
        page.wait_for_timeout(700)
        b1 = body(page)
        text_visible = frag in b1 and '激光逐行读取' not in b1
        # 再等动画启动
        page.wait_for_timeout(1200)
        b2 = body(page)
        anim_started = '激光逐行读取' in b2
        # 等动画播完（5s + 1.2s 停留）
        page.wait_for_timeout(6800)
        b3 = body(page)
        anim_done = '激光逐行读取' not in b3 and frag in b3
        # 推进到下一步
        page.mouse.click(640, 500); page.wait_for_timeout(1500)
        b4 = body(page)
        moved_on = frag not in b4
        ok = (not early_overlay) and text_visible and anim_started and anim_done and moved_on
        results.append((f'{sid} 时序(文先动后)', ok,
                        f'早盖:{early_overlay} 文可见:{text_visible} 动启:{anim_started} 动完:{anim_done} 推进:{moved_on}'))

    # 奶茶价格：白天商店应为 200
    s = {"gender": "m", "night": 2, "gold": 500, "skill": 3, "wealth": 1, "heart": 2,
         "durability": 90, "ap": 0, "items": [], "badges": [], "stamps": [],
         "flags": {}, "stepId": "n2_start", "screenHint": "day", "viewBg": "bg_day",
         "viewSprite": None, "viewSprite2": None, "resumeKey": ""}
    page.goto(URL)
    page.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(json.dumps(s, ensure_ascii=False))})")
    page.reload(); page.wait_for_timeout(900)
    b = page.locator('button:has-text("继续")')
    if b.count(): b.first.click(); page.wait_for_timeout(900)
    go = page.locator('button:has-text("出发，上夜班")')
    if go.count(): go.first.click(); page.wait_for_timeout(900)
    shop = page.locator('button:has-text("小卖部")')
    if shop.count(): shop.first.click(); page.wait_for_timeout(800)
    b = body(page)
    results.append(('奶茶 200💰', '全科室奶茶' in b and '200💰' in b, ''))

    for r in results:
        print(('OK ' if r[1] else 'FAIL ') + r[0] + ('' if r[1] else '  ' + r[2]))
    print('JS错误:', errors[:3] or '无')
    browser.close()
