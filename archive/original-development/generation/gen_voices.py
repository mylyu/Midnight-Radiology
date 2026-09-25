# coding=utf-8
"""深夜影像科配音批量生成脚本（key 从环境变量读，不写入仓库）。
用法:
  DASHSCOPE_KEY=sk-xxx MIMO_KEY=sk-yyy python3 gen_voices.py flash17 mimo
输出: /mnt/agents/output/app/public/preview/{flash17,mimo}/<name>.mp3
"""
import os, sys, re, json, time, base64, subprocess, concurrent.futures
import requests

DASH = os.environ.get("DASHSCOPE_KEY", "")
MIMO = os.environ.get("MIMO_KEY", "")
DASH_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
MIMO_URL = "https://api.xiaomimimo.com/v1/chat/completions"
BASE = "/mnt/agents/output/app/public/preview"

M, F = "longanlufeng", "longanlingxin"
CAST3 = [
 ('vox_tang',F,'小唐（放射技师）','我小唐，欢迎你呀！','25岁女性，声音清脆活泼，语速偏快，热情开朗，像师姐带新人一样亲切。'),
 ('vox_zhou',M,'老周（资深技师）','[sighing]我老周。机器比我工龄大。[laughing]','60岁左右男性，嗓音低沉略带沙哑，语气豁达幽默、玩世不恭，说牢骚话也像在讲笑话，语速不紧不慢，带轻微北方口音。'),
 ('vox_lei',M,'小雷（急诊护工）','我小雷，搭把手嘛！','25岁男性，急诊护工，气息急促，语速很快，嗓门大，着急但热心。'),
 ('vox_mom',F,'患儿母亲','[panicked]医生！他吞了东西呀！','30岁左右女性，年轻母亲，极度惊慌，带哭腔，语速很快，声音发紧。'),
 ('vox_fan',M,'老范（设备科长）','叫我老范就行啦。','50岁男性，设备科长，嗓音宽厚，语气随意热络，带点老江湖的自嘲。'),
 ('vox_he',F,'老何（急诊护士）','我老何，麻烦你们啦！','40岁女性，急诊资深护士，语速快，声音亮，急促但热络。'),
 ('vox_worker',M,'工人患者','[gasp]哎哟……轻点轻点……','40岁男性，受伤的建筑工人，声音粗哑，疼得直抽气，带轻微地方口音。'),
 ('vox_qian',F,'钱姐（医保办）','我钱姐，例行问两句。','40岁女性，医保办职员，语调平稳清晰，公事公办，不带感情色彩。'),
 ('vox_mystery',M,'神秘病人','[whispers]浑身就是……不得劲。','50岁男性，声音低而飘忽，语速缓慢，欲言又止，让人捉摸不透。'),
 ('vox_kai',M,'小凯（设备工程师）','我小凯。灯丝，到寿就换。','28岁男性，设备工程师，声音干净，语气轻松专业，像聊家常一样讲技术。'),
 ('vox_jiang',M,'老蒋（患者）','会漏射线呀！','60岁男性，上了岁数的患者，紧张担忧，声音发颤，语速偏快。'),
 ('vox_thin',M,'消瘦男患者','[tired]疼……像针扎一样……','30岁男性，消瘦虚弱，声音轻，有气无力，断断续续。'),
 ('vox_wen',F,'雯雯（医药销售）','我雯雯，就两分钟哈！','30岁女性，医药销售，热情又难缠，语速快，带轻微东北口音。'),
 ('vox_aunt',F,'大姨（患者）','凑合拍一张行不？','55岁女性，大姨，讪讪地试探着商量，有点不好意思。'),
 ('vox_bai',M,'老白（器械商）','我老白，好件半价！','45岁男性，精明的器械贩子，压低声音招揽生意，带轻微粤语口音。'),
 ('vox_dad',M,'患儿父亲','[panicked]他吞了个圆的呀！','30岁男性，年轻父亲，惊慌失措，声音发颤，语速很快。'),
 ('vox_director',M,'主任（放射科）','嗯，干得不错。','55岁男性，放射科主任，嗓音浑厚，沉稳威严，语气和缓但有分量。'),
 ('vox_shao',F,'邵姐（急诊医生）','我邵云，喊我邵姐。','35岁女性，急诊医生，干练爽朗，语速快，做事风风火火。'),
 ('vox_du',F,'小杜（信息科）','我小杜，真开不出嘛。','26岁女性，信息科职员，有点委屈又无奈，语速偏慢。'),
 ('vox_liao',F,'廖老师（带教）','我廖老师。三件套，不能少。','50岁女性，严厉的带教老师，一字一顿，不容置疑。'),
 ('vox_qin',M,'秦主任（急诊科）','我秦主任，听我口令。','50岁男性，急诊科主任，指挥若定，语气果断沉稳，声音有力。'),
 ('vox_luzhou_m',M,'陆舟·男','[amazed]真的是你？！','28岁男性，年轻医生，又惊又喜，声音一下子亮起来。'),
 ('vox_luzhou_f',F,'陆舟·女','[amazed]真的是你？！','28岁女性，年轻医生，又惊又喜，声音一下子亮起来。'),
 ('vox_uncle',M,'大爷（患者）','敢情是没看着啊。','65岁男性，老大爷，带着调侃，有点耳背所以嗓门大，带轻微地方口音。'),
 ('vox_guy',M,'青年男患者','[tired]哎哟……疼死我了……','25岁男性，青年患者，疼得龇牙咧嘴地呻吟。'),
 ('vox_grandpa',M,'老爷子（患者）','这医院，真较真！','70岁男性，倔强的老爷子，嗓门大，有点不服气又有点佩服。'),
 ('vox_enh',F,'增强大姐（患者）','[laughing]像喝了口白酒么！','45岁女性，爽朗的中年大姐，笑着调侃，带轻微中原口音。'),
 ('vox_kiddad',M,'孩子父亲','[angry]再扫一次！谁负责？！','35岁男性，愤怒焦急的父亲，厉声质问，声音发紧。'),
 ('vox_kidmom',F,'孩子母亲','三天前刚照过啊！','33岁女性，心疼孩子的母亲，着急地辩解，语速快。'),
 ('vox_kid',M,'小男孩','[curious]有棒棒糖吗？','7岁小男孩，声音稚嫩，怯生生又天真地问。'),
 ('vox_duty',M,'总值班','我总值班。这不算指征。','50岁男性，医院总值班，深夜电话里的声音，沉稳严肃，不容商量。'),
 ('vox2_tang',F,'小唐（第二章）','我可什么都没说！','25岁女性，声音清脆活泼，语气轻快俏皮，带着点小得意。'),
 ('vox2_zhou',M,'老周（第二章）','今晚你拍，我看着。','60岁左右男性，嗓音低沉略带沙哑，豁达中多了点信任和托付，语速不紧不慢，带轻微北方口音。'),
 ('vox2_fan_a',M,'老范（第二章·A线）','[sighing]半价管子嘛，烧了。','50岁男性，设备科长，无奈中带着懊恼，嗓音宽厚。'),
 ('vox2_fan_b',M,'老范（第二章·B线）','原厂货，撑到底了。','50岁男性，设备科长，语气庆幸又感慨，嗓音宽厚。'),
 ('vox2_kai',M,'小凯（第二章）','日检、预热、热容量！','28岁男性，设备工程师，语气认真，一条一条叮嘱，像查清单。'),
 ('vox2_lei',M,'小雷（第二章）','[excited]总算进PACS啦！','25岁男性，急诊护工，长舒一口气，语速快，如释重负。'),
 ('vox2_he',F,'老何（第二章）','老爷子坠床，急啊！','40岁女性，急诊护士，心急火燎，语速很快，声音发紧。'),
 ('vox2_director',M,'主任（第二章）','快，就是医德。','55岁男性，放射科主任，语重心长，一字一句有分量。'),
 ('vox2_director_am',M,'主任（第二章·晨会）','零投诉，零差错。','55岁男性，放射科主任，晨会上沉稳总结，语气满意。'),
 ('vox2_wen',F,'雯雯（第二章）','加班到十点，见过没？','30岁女性，医药销售，半开玩笑地倒苦水，带轻微东北口音。'),
 ('vox2_mystery',M,'神秘病人（第二章）','[whispers]医生，又是我。','50岁男性，声音低缓，意味深长，欲言又止。'),
]

F17 = {
 'vox_tang':'Cherry','vox_zhou':'Arthur','vox_lei':'Ethan','vox_mom':'Serena','vox_fan':'Kai',
 'vox_he':'Maia','vox_worker':'Vincent','vox_qian':'Bellona','vox_mystery':'Moon','vox_kai':'Mochi',
 'vox_jiang':'Eldric Sage','vox_thin':'Pip','vox_wen':'Vivian','vox_aunt':'Mia','vox_bai':'Kai',
 'vox_dad':'Ethan','vox_director':'Neil','vox_shao':'Vivian','vox_du':'Nofish','vox_liao':'Elias',
 'vox_qin':'Vincent','vox_luzhou_m':'Mochi','vox_luzhou_f':'Cherry','vox_uncle':'Vincent','vox_guy':'Moon',
 'vox_grandpa':'Eldric Sage','vox_enh':'Serena','vox_kiddad':'Neil','vox_kidmom':'Maia','vox_kid':'Pip',
 'vox_duty':'Eldric Sage','vox2_tang':'Cherry','vox2_zhou':'Arthur','vox2_fan_a':'Kai','vox2_fan_b':'Kai',
 'vox2_kai':'Mochi','vox2_lei':'Ethan','vox2_he':'Maia','vox2_director':'Neil','vox2_director_am':'Neil',
 'vox2_wen':'Vivian','vox2_mystery':'Moon'}
F17_ZHOU = {
 'vox_zhou':'六十岁左右的放射科技师，嗓音低沉略带沙哑，语气豁达幽默、玩世不恭，说牢骚话也像在讲笑话，语速不紧不慢，带轻微北方口音的普通话。',
 'vox2_zhou':'六十岁左右的放射科技师，嗓音低沉略带沙哑，豁达幽默中多了点信任和托付，语速不紧不慢，带轻微北方口音的普通话。'}

MIMO_V = {
 'vox_tang':'冰糖','vox_zhou':'白桦','vox_lei':'Milo','vox_mom':'茉莉','vox_fan':'Dean',
 'vox_he':'苏打','vox_worker':'mimo_default','vox_qian':'Mia','vox_mystery':'Dean','vox_kai':'Milo',
 'vox_jiang':'白桦','vox_thin':'Milo','vox_wen':'Chloe','vox_aunt':'Mia','vox_bai':'mimo_default',
 'vox_dad':'Dean','vox_director':'白桦','vox_shao':'苏打','vox_du':'冰糖','vox_liao':'茉莉',
 'vox_qin':'mimo_default','vox_luzhou_m':'Milo','vox_luzhou_f':'Chloe','vox_uncle':'白桦','vox_guy':'Milo',
 'vox_grandpa':'Dean','vox_enh':'苏打','vox_kiddad':'mimo_default','vox_kidmom':'冰糖','vox_kid':'苏打',
 'vox_duty':'白桦','vox2_tang':'冰糖','vox2_zhou':'白桦','vox2_fan_a':'Dean','vox2_fan_b':'Dean',
 'vox2_kai':'Milo','vox2_lei':'Milo','vox2_he':'苏打','vox2_director':'白桦','vox2_director_am':'白桦',
 'vox2_wen':'Chloe','vox2_mystery':'Dean'}

def clean(t):
    return re.sub(r'\[[a-z ]+\]', '', t).strip()

def gen_flash17(entry, attempts=4):
    name, base, role, text, instr = entry
    instr2 = F17_ZHOU.get(name, instr)
    for a in range(attempts):
        try:
            r = requests.post(DASH_URL, headers={"Authorization": f"Bearer {DASH}", "Content-Type": "application/json"},
                json={"model": "qwen3-tts-instruct-flash",
                      "input": {"text": clean(text), "voice": F17[name], "instructions": instr2}}, timeout=90)
            au = r.json()["output"]["audio"]["url"]
            wav = requests.get(au, timeout=90).content
            outdir = f"{BASE}/flash17"; os.makedirs(outdir, exist_ok=True)
            open(f"/tmp/{name}.wav", "wb").write(wav)
            subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f"/tmp/{name}.wav","-codec:a","libmp3lame","-b:a","128k",f"{outdir}/{name}.mp3"], check=True)
            return name, "ok"
        except Exception as e:
            err = str(e)[:120]; time.sleep(3*(a+1))
    return name, err

def gen_mimo(entry, attempts=4):
    name, base, role, text, instr = entry
    for a in range(attempts):
        try:
            rr = requests.post(MIMO_URL, headers={"Authorization": f"Bearer {MIMO}", "Content-Type": "application/json"},
                json={"model": "mimo-v2.5-tts",
                      "messages": [{"role": "user", "content": "请用以下人设朗读：" + instr},
                                   {"role": "assistant", "content": clean(text)}],
                      "modalities": ["text", "audio"], "audio": {"voice": MIMO_V[name], "format": "mp3"}}, timeout=60)
            data = rr.json()["choices"][0]["message"]["audio"]["data"]
            outdir = f"{BASE}/mimo"; os.makedirs(outdir, exist_ok=True)
            open(f"{outdir}/{name}.mp3", "wb").write(base64.b64decode(data))
            return name, "ok"
        except Exception as e:
            err = str(e)[:120]; time.sleep(2*(a+1))
    return name, err

if __name__ == "__main__":
    which = sys.argv[1:] or ["flash17", "mimo"]
    for w in which:
        fn = {"flash17": gen_flash17, "mimo": gen_mimo}[w]
        with concurrent.futures.ThreadPoolExecutor(2) as ex:
            res = list(ex.map(fn, CAST3))
        fails = [r for r in res if r[1] != "ok"]
        print(w, "ok:", len(CAST3)-len(fails), "fails:", fails)
