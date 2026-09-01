"""定向补测：用存档注入逐个渲染未覆盖分支，验证文本与条件选项，收集 JS 错误。"""
import json
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8980/'
KEY = 'midnight-radiology-save-v1'

# (stepId, night, extra_state, 期望文本片段, 期望选项片段或None)
CASES = [
    ('n1_walk3', 1, {}, '小雷', None),  # n1_walk 分支选择步（含追问/道谢）
    ('n1_kv_ok', 1, {}, '没挨骂就是表扬', None),
    ('n1_s12', 1, {'items': ['dosimeter']}, '半小时前吞的', None),
    ('n1_s17b', 1, {}, '双环征', None),
    ('n2_fan4b', 2, {}, '叠影', None),
    ('n2_walk3b', 2, {}, '平车消失在电梯口', None),
    ('n2_s7b', 2, {}, '正位看左右', None),
    ('n2_s20', 2, {'items': ['toolbox']}, None, '🔧 用自备工具箱检修'),
    ('n3_er3b', 3, {}, '床旁机没有滤线栅', None),
    ('n3_arc1', 3, {'items': ['key']}, '牛皮纸袋', '🗝️ 用黄铜钥匙开角落的小铁柜'),
    ('n3_cab1', 3, {}, '增感屏', None),
    ('n3_trauma5a', 3, {}, '康普顿散射', None),
    ('n4_lei2b', 4, {}, 'PACS', None),
    ('n4_lei2c', 4, {'items': ['snack']}, '谢谢', None),
    ('n4_wen3b', 4, {}, '名片', None),
    ('n4_case4b2', 4, {}, '钼靶门诊', None),
    ('n5_bai2', 5, {'flags': {'he_friend': True}}, None, '150卖不卖'),
    ('n5_night6b', 5, {}, '垃圾桶里多了一副用过的手套', None),
    ('n5_night6c', 5, {}, '先救人', None),
    ('n5_night11', 5, {}, '怎么回应', '您留个联系方式'),  # 无 archive 旗标时的兜底选项
    ('n5_night12c', 5, {}, '联系方式', None),
]

def mk_save(stepId, night, extra):
    s = {"gender": "m", "night": night, "gold": 500, "skill": 3, "wealth": 1, "heart": 2,
         "durability": 90, "ap": 3, "items": [], "badges": [], "stamps": [], "flags": {},
         "stepId": stepId, "screenHint": "night", "viewBg": "bg_control",
         "viewSprite": None, "viewSprite2": None, "resumeKey": ""}
    for k, v in extra.items():
        if k == 'flags': s['flags'].update(v)
        else: s[k] = v
    return json.dumps(s, ensure_ascii=False)

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    nf = []
    page.on('response', lambda r: nf.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    for stepId, night, extra, want_text, want_choice in CASES:
        page.goto(URL)
        page.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(mk_save(stepId, night, extra))})")
        page.reload(); page.wait_for_timeout(600)
        b = page.locator('button:has-text("继续")')
        if b.count(): b.first.click(); page.wait_for_timeout(600)
        b2 = page.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")')
        if b2.count(): b2.first.click(); page.wait_for_timeout(700)
        page.mouse.click(640, 500); page.wait_for_timeout(1800)  # 补全打字机+解锁
        body = page.locator('body').inner_text()
        ok_t = want_text is None or want_text in body
        ok_c = want_choice is None or want_choice in body
        status = 'OK' if (ok_t and ok_c) else f'FAIL text:{ok_t} choice:{ok_c}'
        print(f'{stepId:16s} {status}')
        if status != 'OK':
            print('   body 片段:', body[body.find('对话框') if '对话框' in body else -200:][:200])
    print('JS错误:', errors[:3] or '无')
    print('404:', nf[:5] or '无')
    browser.close()
