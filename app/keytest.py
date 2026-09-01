"""钥匙改动定向测试：n3 一次访问做两件事 + n5 钥匙兜底 + 无钥匙时选项隐藏。"""
import json
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8980/'
KEY = 'midnight-radiology-save-v1'

def mk_save(stepId, night, items=None, flags=None):
    s = {"gender": "m", "night": night, "gold": 500, "skill": 3, "wealth": 1, "heart": 2,
         "durability": 90, "ap": 3, "items": items or [], "badges": [], "stamps": [],
         "flags": flags or {}, "stepId": stepId, "screenHint": "night", "viewBg": "bg_control",
         "viewSprite": None, "viewSprite2": None, "resumeKey": ""}
    return json.dumps(s, ensure_ascii=False)

def boot(page, save):
    page.goto(URL)
    page.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(save)})")
    page.reload(); page.wait_for_timeout(600)
    b = page.locator('button:has-text("继续")')
    if b.count(): b.first.click(); page.wait_for_timeout(600)
    b2 = page.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
    if b2.count(): b2.first.click(); page.wait_for_timeout(700)

def adv(page, n=1):
    """推进 n 步（每步：补全打字机 + 点击进入下一步）"""
    for _ in range(n * 2):
        page.mouse.click(640, 500); page.wait_for_timeout(1800)

def body(page):
    return page.locator('body').inner_text()

def click_choice(page, text):
    b = page.locator(f'button:has-text("{text}")')
    if not b.count(): return False
    b.first.click(); page.wait_for_timeout(1800)
    return True

results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    # 路径A：第3夜带钥匙 → 先开柜 → 应回到"四处看看"，片袋选项还在，钥匙选项消失
    boot(page, mk_save('n3_arc1', 3, items=['key']))
    adv(page, 0)  # 补全当前步打字
    page.mouse.click(640, 500); page.wait_for_timeout(1800)
    results.append(('A1 开柜前选项可见', click_choice(page, '用黄铜钥匙开角落的小铁柜')))
    adv(page, 3)  # cab0 → cab1 → cab2 → arc1
    b = body(page)
    results.append(('A2 开柜后回到片库', '四处看看' in b))
    results.append(('A3 片袋选项仍在', '翻看架子上的旧片袋' in b))
    results.append(('A4 钥匙选项已消失', '开角落的小铁柜' not in b))
    click_choice(page, '翻看架子上的旧片袋')
    adv(page, 3)  # arc2 → arc3 → arc4 → hub
    b = body(page)
    results.append(('A5 看完胶片回大厅', '自由行动' in b))
    sv = json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
    results.append(('A6 奖励到账(580金)', sv['gold'] == 620 and sv['flags'].get('archive_cab') and sv['flags'].get('archive_film')))

    # 路径B：第5夜带钥匙未开柜（第3夜只翻了片袋）→ 片库兜底
    boot(page, mk_save('n5_arc0', 5, items=['key'], flags={'archive_film': True}))
    page.mouse.click(640, 500); page.wait_for_timeout(1800)
    adv(page, 3)  # arc0 → arc1 → arc2 → arc3
    b = body(page)
    results.append(('B1 n5_arc3 选项步', '临走前' in b))
    results.append(('B2 兜底钥匙选项可见', '角落里那个小铁柜' in b))
    click_choice(page, '角落里那个小铁柜')
    adv(page, 3)  # cab0 → cab1 → cab2 → hub
    b = body(page)
    results.append(('B3 开完回第5夜大厅', '自由行动' in b))
    sv = json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
    results.append(('B4 奖励到账(580金)', sv['gold'] == 620 and sv['flags'].get('archive_cab')))

    # 路径C：第5夜无钥匙 → 只有"离开"
    boot(page, mk_save('n5_arc0', 5, flags={'archive_film': True}))
    page.mouse.click(640, 500); page.wait_for_timeout(1800)
    adv(page, 3)
    b = body(page)
    results.append(('C1 无钥匙时无开柜选项', '角落里那个小铁柜' not in b))
    results.append(('C2 离开选项在', '离开片库' in b))

    # 路径D：第3夜无钥匙 → 钥匙选项隐藏
    boot(page, mk_save('n3_arc1', 3))
    page.mouse.click(640, 500); page.wait_for_timeout(1800)
    b = body(page)
    results.append(('D1 无钥匙时钥匙选项隐藏', '开角落的小铁柜' not in b))

    for name, ok in results:
        print(('OK ' if ok else 'FAIL ') + name)
    print('JS错误:', errors[:3] or '无')
    browser.close()
