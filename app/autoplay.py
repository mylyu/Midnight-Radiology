"""《深夜影像科》自动玩家：按策略从标题页打完全程，收集 JS 错误、404 与全台词记录。"""
import json, random, sys
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8980/'

def autoplay(pw, strategy='first', tag='A', seed=0, buys=None, maintain=False):
    rnd = random.Random(seed)
    page = pw.chromium.launch().new_page(viewport={'width': 1280, 'height': 800})
    import os
    if os.environ.get('AUDIO_SPY'):
        page.add_init_script("""
            window.__plays = [];
            const _p = HTMLMediaElement.prototype.play;
            HTMLMediaElement.prototype.play = function() { window.__plays.push(this.src); return _p.apply(this, arguments); };
        """)
    errors, notfound, transcript = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: notfound.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    page.goto(URL)
    page.wait_for_timeout(800)
    b = page.locator('button:has-text("新的开始"), button:has-text("开始")')
    if b.count(): b.first.click(); page.wait_for_timeout(500)
    g = page.locator('button:has-text("男"), button:has-text("陈一帆")')
    if g.count(): g.first.click(); page.wait_for_timeout(500)
    done = False
    bought = set()
    shopped_today = False
    for i in range(1200):
        body = page.locator('body').inner_text()
        # 小卖部弹窗
        if page.locator('div.z-40:has-text("小卖部")').count():
            # 有购买任务则买（能买几件买几件，剩下的下次开门再试），否则关闭
            if buys:
                for item in list(buys):
                    row = page.locator('div.flex.items-center.gap-3').filter(has_text=item)
                    bb = row.locator('button')
                    if bb.count() and bb.first.is_enabled():
                        bb.first.click(); bought.add(item); buys.remove(item)
                        transcript.append(f'BUY {item}')
                        page.wait_for_timeout(300)
                page.mouse.click(10, 10); page.wait_for_timeout(300); continue
            page.mouse.click(10, 10); page.wait_for_timeout(300); continue
        if '每日打卡' in body and ('回到夜班现场' in body or '出发，上夜班' in body):
            page.locator('button:has-text("回到夜班现场"), button:has-text("出发，上夜班")').first.click()
            page.wait_for_timeout(600); continue
        if '白天 · 科室经营' in body:
            if buys and not shopped_today:
                shopped_today = True
                sb = page.locator('button:has-text("🛒 小卖部")')
                if sb.count(): sb.first.click(); page.wait_for_timeout(400); continue
            if maintain:
                mb = page.locator('button:has-text("保养（-50金币）")')
                if mb.count() and mb.first.is_enabled():
                    mb.first.click(); transcript.append('MAINTAIN'); page.wait_for_timeout(300)
                maintain = False
                continue
            nb = page.locator('button:has-text("进入第")')
            if nb.count():
                nb.first.click(); shopped_today = False; page.wait_for_timeout(700); continue
        if '盖章发证' in body:
            page.locator('input[placeholder="姓名"]').fill(f'测试{tag}')
            page.locator('input[placeholder="学号"]').fill('001')
            page.locator('button:has-text("盖章发证")').click(); page.wait_for_timeout(500)
            done = True
            break
        if '开始答题' in body or '去领通关凭证' in body or '下一题' in body or '查看成绩' in body:
            st = page.locator('button:has-text("开始答题")')
            if st.count(): st.first.click(); page.wait_for_timeout(400); continue
            nxt = page.locator('button:has-text("下一题"), button:has-text("查看成绩")')
            if nxt.count() and nxt.first.is_enabled():
                nxt.first.click(); page.wait_for_timeout(350); continue
            nb = page.locator('button:has-text("去领通关凭证")')
            if nb.count(): nb.first.click(); page.wait_for_timeout(400); continue
            qopts = page.locator('div.flex.flex-col.gap-2 button')
            if qopts.count():
                n = qopts.count()
                idx = 0 if strategy == 'first' else (n - 1 if strategy == 'last' else rnd.randrange(n))
                try:
                    qopts.nth(idx).click(timeout=2500)
                except Exception:
                    pass
                page.wait_for_timeout(350); continue
            page.wait_for_timeout(400); continue
        ov = page.locator('button:has-text("合上书"), button:has-text("离开小卖部")')
        if ov.count():
            ov.first.click(); page.wait_for_timeout(400); continue
        ch = page.locator('.choice-in button')
        if ch.count():
            n = ch.count()
            texts = [ch.nth(k).inner_text() for k in range(n)]
            valid = [k for k in range(n) if '小卖部' not in texts[k] and '旧书' not in texts[k]]
            if not valid:
                page.mouse.click(640, 500); page.wait_for_timeout(300); continue
            transcript.append('CHOICES: ' + ' ‖ '.join(texts))
            idx = valid[0] if strategy == 'first' else (valid[-1] if strategy == 'last' else rnd.choice(valid))
            transcript.append(f'  -> pick: {texts[idx][:40]}')
            page.wait_for_timeout(900)  # 等过防误触窗口(选项要求距上次点击≥0.3s)
            try:
                ch.nth(idx).click(timeout=2500)
            except Exception:
                pass
            page.wait_for_timeout(400); continue
        p = page.locator('p.text-in')
        if p.count():
            t = p.inner_text()
            last = transcript[-1] if transcript else ''
            if t and not (last.startswith('SAY') and last[4:44] == t[:40]):
                transcript.append('SAY ' + t[:90])
        page.mouse.click(640, 500)
        page.wait_for_timeout(300)
    plays = page.evaluate('window.__plays || []') if os.environ.get('AUDIO_SPY') else []
    ctx = page.context
    page.close(); ctx.close()
    return {'done': done, 'iters': i, 'errors': errors, 'notfound': notfound, 'transcript': transcript, 'plays': plays}

if __name__ == '__main__':
    strategy, tag, seed = sys.argv[1], sys.argv[2], int(sys.argv[3])
    buys = sys.argv[4].split(',') if len(sys.argv) > 4 and sys.argv[4] else None
    maintain = len(sys.argv) > 5 and sys.argv[5] == 'm'
    with sync_playwright() as pw:
        r = autoplay(pw, strategy, tag, seed, buys, maintain)
    out = f'/mnt/agents/output/app/test_{tag}.json'
    json.dump(r, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"{tag}: done={r['done']} iters={r['iters']} lines={len(r['transcript'])} errors={len(r['errors'])} nf={len(r['notfound'])}")
    if r.get('plays'):
        import collections
        c = collections.Counter(p.split('/')[-1] for p in r['plays'])
        print('AUDIO:', json.dumps(dict(c), ensure_ascii=False))
    for e in r['errors'][:3]: print('JSERR:', e[:150])
    for e in r['notfound'][:5]: print('404:', e[:150])
