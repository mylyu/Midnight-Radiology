"""三 bug 修复验证：1) 换步无残影闪帧 2) 快点击时图像不早于扫描出现 3) n2 胸片有图。"""
import json
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8980/'
KEY = 'midnight-radiology-save-v1'

def mk_save(stepId, night, flags=None):
    s = {"gender": "m", "night": night, "gold": 500, "skill": 3, "wealth": 1, "heart": 2,
         "durability": 90, "ap": 3, "items": [], "badges": [], "stamps": [],
         "flags": flags or {}, "stepId": stepId, "screenHint": "night", "viewBg": "bg_control",
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

results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    # Bug1：从长文本步(n1_mas2a ~150字)换到短文本步(n1_kv)后，首帧不应出现大段文本
    boot(page, mk_save('n1_mas2a', 1))
    page.wait_for_timeout(4500)  # 等长文本播完
    page.mouse.click(640, 500)   # 换步
    page.wait_for_timeout(80)    # 首帧采样
    txt = page.locator('p.text-in').inner_text()
    results.append(('1 换步首帧无大段残影', len(txt) < 15))

    # Bug2：n5_case3r 带图读取步——动画播完前中央大图不可见
    boot(page, mk_save('n5_case3r', 5))
    # 疯狂连点
    for _ in range(6):
        page.mouse.click(640, 500); page.wait_for_timeout(200)
    page.wait_for_timeout(1000)
    img_cnt = page.locator('img[alt="影像"]').count()
    scanning = '激光逐行读取' in page.locator('body').inner_text()
    results.append(('2a 快点击后仍在扫描', scanning))
    results.append(('2b 扫描期间无中央大图', img_cnt == 0))
    page.wait_for_timeout(6500)  # 等动画播完
    img_cnt = page.locator('img[alt="影像"]').count()
    results.append(('2c 扫描播完后图像亮出', img_cnt == 1))

    # Bug3：n2_s15r 现在有真实胸片图像参与扫描和显示
    boot(page, mk_save('n2_s15r', 2))
    page.wait_for_timeout(2500)
    results.append(('3a 胸片扫描动画启动', '激光逐行读取' in page.locator('body').inner_text()))
    has_film = page.locator('img[alt="读取中的影像"]').count() == 1
    results.append(('3b 扫描中有胶片元素', has_film))
    page.wait_for_timeout(6500)
    img_cnt = page.locator('img[alt="影像"]').count()
    results.append(('3c 播完后正常胸片亮出', img_cnt == 1))

    for name, ok in results:
        print(('OK ' if ok else 'FAIL ') + name)
    print('JS错误:', errors[:3] or '无')
    browser.close()
