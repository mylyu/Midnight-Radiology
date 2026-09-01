"""mAs 教学问答 + 曝光/读取分离流程的定向测试。"""
import json
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8980/'
KEY = 'midnight-radiology-save-v1'
SETTLE = 4500

def mk_save(stepId, night=1):
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
    if b2.count(): b2.first.click(); page.wait_for_timeout(SETTLE)

def body(page):
    return page.locator('body').inner_text()

def step_once(page, wait=SETTLE):
    page.mouse.click(640, 500); page.wait_for_timeout(wait)

results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    # A. mAs 教学问答：n1_pos → 老周提问 → 答对 skill+1 → n1_kv
    boot(page, mk_save('n1_pos'))
    step_once(page)  # → n1_mas0
    results.append(('A1 老周提问mAs', '毫安秒（mAs），跟管电流' in body(page)))
    step_once(page)  # → n1_mas1
    b = body(page)
    results.append(('A2 三个选项可见', '总输出量' in b and '平方' in b and '两种写法' in b))
    page.locator('button:has-text("总输出量")').first.click(); page.wait_for_timeout(SETTLE)
    results.append(('A3 答对讲解含毫库仑', '毫库仑' in body(page)))
    sv = json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
    results.append(('A4 答对技术+1', sv['skill'] == 4))
    step_once(page)  # → n1_kv
    results.append(('A5 进入曝光参数选择', '曝光参数怎么选' in body(page)))

    # B. 答错分支也能走到讲解
    boot(page, mk_save('n1_mas1'))
    page.locator('button:has-text("平方")').first.click(); page.wait_for_timeout(SETTLE)
    b = body(page)
    results.append(('B1 答错也给讲解', '不对' in b and '毫库仑' in b))
    sv = json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
    results.append(('B2 答错不加分', sv['skill'] == 3))

    # C. 曝光/读取分离：n1_s13 只有曝光，advance 后 n1_s13r 才出扫描动画
    boot(page, mk_save('n1_s13'))
    b = body(page)
    results.append(('C1 曝光步无扫描动画', '激光逐行读取' not in b and '曝光完成' in b))
    step_once(page, 1200)  # → n1_s13r，动画开始（期间点击被屏蔽）
    page.wait_for_timeout(1500)
    results.append(('C2 送扫描仪后动画开始', '激光逐行读取' in body(page)))
    page.wait_for_timeout(6500)  # 5s 扫描 + 1.2s 停留
    results.append(('C3 动画完成', '读取完成' in body(page)))
    step_once(page)  # → n1_s15
    results.append(('C4 进入阅片步', '图像出来了' in body(page)))

    for name, ok in results:
        print(('OK ' if ok else 'FAIL ') + name)
    print('JS错误:', errors[:3] or '无')
    browser.close()
