
import json
from playwright.sync_api import sync_playwright

def mk_state():
    return {
        'gender': 'm', 'night': 2, 'gold': 500, 'skill': 2, 'wealth': 1, 'heart': 1,
        'durability': 80, 'badges': [], 'stamps': [1], 'flags': {},
        'lastCheckin': '2099-01-01', 'streak': 1, 'finished': False, 'seed': 42,
        'items': [], 'ap': 3, 'buyCount': 0,
        'screenHint': 'night', 'stepId': 'n2_fan3', 'resumeKey': 'probe',
    }

bad = 0; good = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for i in range(30):
        page = b.new_page(viewport={'width': 1280, 'height': 800})
        page.goto('http://localhost:8980/')
        page.evaluate("(s) => localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s))", mk_state())
        page.reload()
        page.wait_for_timeout(600)
        page.click('text=继续夜班')
        page.wait_for_timeout(500)
        rb = page.locator('button:has-text("回到夜班现场")')
        if rb.count(): rb.click()
        page.wait_for_timeout(2200)
        page.locator('.dialog-box button').first.click()
        page.wait_for_timeout(700)
        t = page.locator('.dialog-box p').inner_text()
        if '意外' in t:
            bad += 1
        else:
            good += 1
        page.close()
    b.close()
print(f'30次抽样: 不良结果 {bad} 次, 正常 {good} 次, 不良率 {bad/30:.0%}')
