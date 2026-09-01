"""意外分支与新剧情定向测试：纯等待打字机自然播完，一次点击=精确推进一步。"""
import json
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8980/'
KEY = 'midnight-radiology-save-v1'
SETTLE = 4500  # 打字机自然播完 + 选项解锁

def mk_save(stepId, night, items=None, flags=None, ap=3):
    s = {"gender": "m", "night": night, "gold": 500, "skill": 3, "wealth": 1, "heart": 2,
         "durability": 90, "ap": ap, "items": items or [], "badges": [], "stamps": [],
         "flags": flags or {}, "stepId": stepId, "screenHint": "night", "viewBg": "bg_control",
         "viewSprite": None, "viewSprite2": None, "resumeKey": ""}
    return json.dumps(s, ensure_ascii=False)

def boot(page, save, rand=None):
    page.goto(URL)
    if rand is not None:
        page.add_init_script(f"Math.random = () => {rand}")
    page.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(save)})")
    page.reload(); page.wait_for_timeout(800)
    b = page.locator('button:has-text("继续")')
    if b.count(): b.first.click(); page.wait_for_timeout(800)
    b2 = page.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
    if b2.count(): b2.first.click(); page.wait_for_timeout(SETTLE)

def body(page):
    return page.locator('body').inner_text()

def step_once(page):
    """精确推进一步（文本已自然播完，单击即翻页）"""
    page.mouse.click(640, 500); page.wait_for_timeout(SETTLE)

def click_choice(page, text):
    b = page.locator(f'button:has-text("{text}")')
    if not b.count(): return False
    b.first.click(); page.wait_for_timeout(SETTLE)
    return True

results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    # 1. 强制触发意外（rand=0.1 < 0.3）：推平车 → 意外步 → 正常道谢
    boot(page, mk_save('n2_walk2', 2), rand=0.1)
    results.append(('1a 推车意外触发', click_choice(page, '搭把手，帮她把平车推到电梯口') and '会不会推车啊' in body(page)))
    step_once(page)
    results.append(('1b 意外后回到道谢', '我罩着你' in body(page)))

    # 2. 强制规避意外（rand=0.9）：直接到道谢
    boot(page, mk_save('n2_walk2', 2), rand=0.9)
    click_choice(page, '搭把手，帮她把平车推到电梯口')
    b = body(page)
    results.append(('2a 无意外直达道谢', '我罩着你' in b and '意外' not in b))

    # 3. 过度安抚分支
    boot(page, mk_save('n1_kind', 1))
    results.append(('3a 过度安抚选项可见', click_choice(page, '肯定没事，放心吧')))
    results.append(('3b 小唐纠正', '结论不能抢在检查前面' in body(page)))
    step_once(page)
    results.append(('3c 妈妈更慌', '到底是有事还是没事' in body(page)))
    sv = json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
    results.append(('3d 技术扣到2', sv['skill'] == 2))

    # 4. 骨折打包票 → 老周纠偏
    boot(page, mk_save('n2_s11', 2))
    click_choice(page, '三个月后照样搬砖')
    results.append(('4a 老周纠偏', '好心，也要有分寸' in body(page)))
    step_once(page)
    results.append(('4b 回到主线', '咳嗽声' in body(page)))

    # 5. 第5夜四回响
    boot(page, mk_save('n5_hub', 5, flags={'jiang_friend': True, 'qian_helped': True, 'fan_friend': True, 'met_lei': True, 'archive_film': True}))
    b = body(page)
    for t, name in [('老蒋在走廊换灯管', '5a 老蒋入口'), ('有人给你留了东西', '5b 钱大叔入口'), ('老范叫你去设备科', '5c 老范入口'), ('小雷抱着笔记本', '5d 小雷入口')]:
        results.append((name, t in b))
    click_choice(page, '老蒋在走廊换灯管')
    step_once(page); step_once(page)
    results.append(('5e 老蒋回响回大厅', '自由行动' in body(page)))
    sv = json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))
    results.append(('5f 人心+1且一次性', sv['heart'] == 3 and sv['flags'].get('n5_jiang')))

    # 6. AP=0 时体力帮忙选项消失
    boot(page, mk_save('n2_fan3', 2, ap=0))
    b = body(page)
    results.append(('6a AP=0 搬耗材隐藏', '搬进库房' not in b))
    results.append(('6b AP=0 追问仍在', '擦不干净会怎么样' in b))

    # 7. 意外步直接渲染
    for sid, night, want in [('n2_rest3r', 2, '家业-1'), ('n3_rest2r', 3, '金币-25'), ('n5_night6r', 5, '报备流程')]:
        boot(page, mk_save(sid, night))
        results.append((f'7 {sid} 渲染', want in body(page)))

    for name, ok in results:
        print(('OK ' if ok else 'FAIL ') + name)
    print('JS错误:', errors[:3] or '无')
    browser.close()
