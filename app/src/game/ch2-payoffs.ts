import type { Evidence } from './dlc'
import type { Choice, GameState, Step } from './types'
import { ch2ArchiveReturnStep } from './ch2-exploration'
import { ch2SideBadgeStep } from './ch2-side-badges'

type PayoffState = Pick<GameState, 'flags'> & Partial<Pick<GameState, 'items' | 'dlc'>>
const MODEL = 'ch2_slice_model_v1'
const BASE = 'ch2_model_base_v1'
const ASSEMBLED = 'ch2_slice_model_assembled_v1'
const HANDSHAKE = 'ch2_zhou_expert_handshake_v1'
const clear = { sprite: '', sprite2: '', image: '', imageLabel: '', phone: '', radio: '' }

export interface Ch2Keepsake {
  id: string
  title: string
  body: string
  flag: string
  icon: string
  image?: string
  use: string
}

/** Received objects are chapter-local memories, not shop stock or clinical kit. */
export const CH2_PAYOFF_KEEPSAKES: Ch2Keepsake[] = [
  { id: 'slice_model', title: '透明叠层教具', flag: 'c2_payoff_model', icon: '🧩', image: MODEL,
    body: '从封条柜借出的桌面教具。透明片上不同位置的红点，按顺序叠好，连出一条弯管。',
    use: '下周质控交流时可以拆开演示；仅作教学，不放进患者机架。' },
  { id: 'model_base', title: '手摇旋转底座', flag: 'c2_payoff_base', icon: '⚙️', image: BASE,
    body: '黄铜钥匙打开的小铁柜里，藏着叠层教具的配套底座。慢慢摇，整套模型会跟着转。',
    use: '迎检时可换个角度展示弯管；没有它也能拆层演示。' },
  { id: 'luo_pouch', title: '罗阿姨的光盘布袋', flag: 'c2_payoff_luo_gift', icon: '🪡', image: 'ch2_gift_luo_pouch_v1',
    body: '罗阿姨以前缝的布袋，由女儿托门卫捎来。分格可以装光盘盒和片袋标签。',
    use: '装好本章交接用的空光盘盒与标签，不用再往衣兜里硬塞。' },
  { id: 'lei_pouch', title: '小雷的线材收纳袋', flag: 'c2_payoff_lei_gift', icon: '🧰', image: 'ch2_gift_lei_pouch_v1',
    body: '小雷分给你一个多格小袋，线头和转接件终于不用滚在抽屉里。',
    use: '可收好教具底座的摇柄；没有底座时先装自己的转接头。' },
  { id: 'jiang_sleeve', title: '老蒋捎来的杯套', flag: 'c2_payoff_jiang_gift', icon: '🧶', image: 'ch2_gift_jiang_sleeve_v1',
    body: '老蒋记得去年换灯管时你搭过手，又捎来一个没用过的布杯套。',
    use: '天亮收到老周的新保温杯后，正好套上，不影响任何医学数值。' },
  { id: 'zhou_cup', title: '老周送的新保温杯', flag: 'c2_payoff_zhou_cup', icon: '🍵', image: 'ch2_gift_zhou_cup_v1',
    body: '第五夜交班后，老周递来的新杯子。旧的那个，他说还要自己用。',
    use: '属于你的夜班茶杯。下周交流放在自己的座位旁，杯底已写好名字。' },
  { id: 'tang_meal', title: '值班同事分的牛肉', flag: 'c2n5_b', icon: '🍱', image: 'item_beef',
    body: '第五夜，小唐带了一盒家里卤的牛肉，值班同事分着吃。老周来夹了两回，洗盒子的时候倒没人抢。',
    use: '这顿已经吃过了，留下的是同事交接饭的记忆；饭盒轮流洗净归还，不是可反复使用的补给。' },
]

export const CH2_PAYOFF_EVIDENCE: Record<string, Evidence> = Object.fromEntries(
  CH2_PAYOFF_KEEPSAKES.map(item => [`ch2_keepsake_${item.id}`, {
    title: item.title, body: `${item.body}\n${item.use}`, flag: item.flag, ...(item.image ? { image: item.image } : {}),
  }]),
)

export function ch2PayoffKeepsakes({ flags }: Pick<GameState, 'flags'>): Ch2Keepsake[] {
  return CH2_PAYOFF_KEEPSAKES.filter(item => Boolean(flags[item.flag]))
}

function helpedLei(s: PayoffState): boolean {
  return Boolean(s.dlc?.ch2?.loop?.gifts.some(gift => gift.person === 'lei') ||
    s.flags.c2_terminal_device_noted || s.flags.c2_terminal_call_noted || s.flags.term_checked)
}

/** The gift entries are free, optional and disappear only after receipt. */
export function ch2PayoffGiftChoices(s: PayoffState): Choice[] {
  const progress = s.dlc?.ch2
  if (progress?.done || progress?.phase && progress.phase !== 'story') return []
  const f = s.flags
  const choices: Choice[] = []
  if (f.c2_needle_resolved && !f.c2_payoff_luo_gift) choices.push({
    text: '🪡 门卫捎来一只小布袋，说是罗阿姨给的', next: 'c2n5_payoff_luo0', cond: { notFlag: 'c2_payoff_luo_gift' },
  })
  if (helpedLei(s) && !f.c2_payoff_lei_gift) choices.push({
    text: '🧰 小雷在门口晃着一个收纳袋', next: 'c2n5_payoff_lei0', cond: { notFlag: 'c2_payoff_lei_gift' },
  })
  if (f.n5_jiang && !f.c2_payoff_jiang_gift) choices.push({
    text: '🧶 老蒋路过，给你留了点东西', next: 'c2n5_payoff_jiang0', cond: { notFlag: 'c2_payoff_jiang_gift' },
  })
  return choices
}

export const CH2_PAYOFF_STEPS: Record<string, Record<string, Step>> = {
  c2d2: {
    c2d2_payoff_notebook_q: { ...clear, bg: 'bg_ctcontrol_day', speaker: 'me',
      text: '工作站收到了数据。键盘旁还搁着小雷去年送的错题本，封皮已经翘了个角。', choices: [
        { text: '翻到那页“别只看一个方向”', next: 'c2d2_payoff_notebook_read' },
        { text: '先看这次的图', next: 'c2d2_payoff_notebook_pass' },
      ] },
    c2d2_payoff_notebook_read: { ...clear, speaker: 'me', image: 'item_notebook',
      text: '工人大叔那页，正位、侧位并排画着。小雷在边上写了句“别省另一张”。这回是CT，先看看同一组数据换个方向能看到什么。',
      effect: { flag: 'c2_payoff_notebook_read' }, next: 'c2d2_t1' },
    c2d2_payoff_notebook_pass: { ...clear, speaker: 'sys', text: '你把本子往旁边挪了挪，先把鼠标让给值班医师。',
      effect: { flag: 'c2_payoff_notebook_passed' }, next: 'c2d2_t1' },
  },
  c2n5: {
    c2n5_payoff_luo0: { ...clear, bg: 'bg_corridor', speaker: 'tang', sprite: 'char_tang',
      text: '罗阿姨女儿捎来的。旧记录交过去以后，阿姨从家里翻出以前缝的小布袋，说这个装光盘不容易掉。', next: 'c2n5_payoff_luo1' },
    c2n5_payoff_luo1: { ...clear, speaker: 'sys', image: 'ch2_gift_luo_pouch_v1',
      text: '里面分了两个兜，连装标签的小格都留好了。你把空光盘盒装进去试了试。小唐说：「她还让我转告，裤脚照常收费，别拿这个抵。」',
      effect: { flag: 'c2_payoff_luo_gift' }, next: 'c2n5_hub' },
    c2n5_payoff_lei0: { ...clear, bg: 'bg_corridor', speaker: 'lei', sprite: 'char_lei',
      text: '给你一个。我收抽屉收出三个，自己留一个，另一个谁也别问我哪儿去了。', next: 'c2n5_payoff_lei1' },
    c2n5_payoff_lei1: { ...clear, speaker: 'sys', sprite: 'char_lei', image: 'ch2_gift_lei_pouch_v1',
      text: '你拉开小袋，线头、转接头都有独立的小格。小雷指指你的口袋：「别老一掏手机，跟着掉一地。」',
      effect: { flag: 'c2_payoff_lei_gift' }, next: 'c2n5_hub' },
    c2n5_payoff_jiang0: { ...clear, bg: 'bg_corridor', speaker: 'jiang', sprite: 'char_jiang',
      text: '去年你帮我扶梯子那回，还记得吧？拿着，没用过的杯套。上回请你冰红茶，这天气可不敢再送冰的了。', next: 'c2n5_payoff_jiang1' },
    c2n5_payoff_jiang1: { ...clear, speaker: 'sys', sprite: 'char_jiang', image: 'ch2_gift_jiang_sleeve_v1',
      text: '老蒋把布杯套塞过来，量了量你手边的纸杯：「这个先别套，待会儿你连杯子一块儿扔了。」你笑着收进包里。',
      effect: { flag: 'c2_payoff_jiang_gift' }, next: 'c2n5_hub' },
  },
  c2am: {
    c2am_payoff_handshake: { ...clear, bg: 'bg_office_day', speaker: 'sys', image: HANDSHAKE,
      text: '专家快走两步，握住老周的手：「周老师！原来您还在这儿带人。」老周笑着回握：「先坐。一路过来，水都没喝吧？」',
      next: 'c2am_payoff_table' },
    c2am_payoff_table: { ...clear, bg: 'bg_office_day', speaker: 'sys', image: MODEL,
      text: '你把借来的叠层教具摆上桌。专家一看就笑了：「这个还在啊？」老周往旁边坐了坐：「今天让这孩子试试。」',
      next: 'c2am_payoff_q' },
    c2am_payoff_q: { ...clear, speaker: 'me', image: MODEL,
      text: '透明片上的红点一个接一个，叠起来正好拐了个弯。', choices: [
        { text: '抽出一层，再按原位叠回去', next: 'c2am_payoff_layers' },
        { text: '装上底座，慢慢摇给大家看', next: 'c2am_payoff_rotate', cond: { flag: 'c2_payoff_base' } },
      ] },
    c2am_payoff_layers: { ...clear, speaker: 'sys', image: MODEL,
      text: '单拿出来，只剩一个小圆点。你把那一片插回去，红点连出的弯又接上了。专家换到桌子侧面看了看：「嗯，这个角度也看得清。」',
      effect: { flag: 'c2_payoff_model_used' }, next: 'c2am_payoff_reply' },
    c2am_payoff_rotate: { ...clear, speaker: 'sys', image: ASSEMBLED,
      text: '你慢慢转动摇柄，刚才重叠的圆点错开了，弯的方向也看清了。小唐探过头：「哦，拐那边去了。你慢点，别给我转晕了。」',
      effect: { flag: 'c2_payoff_base_used' }, next: 'c2am_payoff_reply' },
    c2am_payoff_reply: { ...clear, speaker: 'zhou', sprite: 'char_zhou',
      text: '手先停一停，底下还压着今天的记录。那份也拿出来，咱们接着看。', next: 'c2am_payoff_end' },
    c2am_payoff_end: { ...clear, bg: 'bg_office_day', speaker: 'sys',
      text: '你把体模记录摊到桌上。小雷抬起头：「周老师？你们以前认识啊？」老周点点桌子：「先看记录。八卦等会儿。」',
      effect: { flag: 'c2_payoff_expert_done' }, next: 'c2am_lowdose_teaser0' },
    c2am_lowdose_teaser0: { ...clear, bg: 'ch2_bg_breakroom_day', speaker: 'sys',
      text: '【几天后 · 午休】你的手机亮了。来电显示：陆舟——本科时住一间宿舍的老同学。', next: 'c2am_lowdose_teaser1' },
    c2am_lowdose_teaser1: { ...clear, speaker: 'luzhou',
      text: '哪天歇？出来吃个饭。我那低剂量CT课题，见面跟你吐槽。', choices: [
        { text: '「行，我把排班发你。」', next: 'c2am_lowdose_meet' },
        { text: '「聊研究可以，你请饭。」', next: 'c2am_lowdose_dinner' },
      ] },
    c2am_lowdose_meet: { ...clear, speaker: 'luzhou',
      text: '行，挑你睡醒的时候。别对着菜单打哈欠啊。', next: 'c2am_lowdose_teaser2' },
    c2am_lowdose_dinner: { ...clear, speaker: 'luzhou',
      text: '我请。先吃饭，别一见面就查我进度。', next: 'c2am_lowdose_teaser2' },
    c2am_lowdose_teaser2: { ...clear, speaker: 'sys',
      text: '挂了电话，你把排班发过去，约好休息日再见。\n\n**DLC预告 · 低剂量CT**\n新的图像、新的取舍。尚未开放，故事留待后续。', end: true },
  },
}

/** Only presentation, chapter-local receipts, and explicit new continuations.
 * Original archive handover/economy effects remain on their original nodes. */
function payoffStep(id: string, step: Step, s: PayoffState): Step {
  const f = s.flags
  if (id === 'c2d2_trauma_scan' && f.n5_lei && !f.c2_payoff_notebook_read && !f.c2_payoff_notebook_passed) {
    return { ...step, next: 'c2d2_payoff_notebook_q' }
  }
  if (id.startsWith('c2d2_payoff_notebook_') && !f.n5_lei) return {
    ...clear, speaker: 'sys', text: '工作站的数据齐了，先看这次的完整序列。', next: 'c2d2_t1',
  }
  if (id === 'c2n5_a4') return { ...step, image: '',
    text: '柜里还留着教学片、手写笔记、1997年的合影和旧设备照片。老周年轻时抱着本子站在照片最边上。你正想凑近，他先从下面搬出一只落灰的木盒。' }
  if (id === 'c2n5_a5') return { ...step, image: MODEL,
    text: '盒里是一排可抽出的透明片，每片上都有一个红点。老周掸掉灰：「这个借你玩。按顺序放，别给我拼成麻花。」',
    effect: { ...step.effect, flag: 'c2_payoff_model' } }
  if (id === 'c2n5_a6') return { ...step, image: MODEL,
    text: '你抽出一片：只是一个小圆点。按槽插回去，整排红点竟连成一条弯管。盒盖内还画着一个配套的圆底座。', choices: [
      { text: '「原来这一片片能拼起来。底座呢？」', next: 'c2n5_a7' },
      { text: '用黄铜钥匙试试旁边的小铁柜', next: 'c2n5_k1', cond: { item: 'key', notFlag: 'c2_payoff_base' } },
    ] }
  if (id === 'c2n5_k1') {
    if (!s.items?.includes('key')) return { ...clear, speaker: 'sys',
      text: '小铁柜还锁着。老周先把木盒抱出来：「没底座也能看，咱们拿这个。」', next: 'c2n5_a7' }
    return { ...step, image: BASE,
      text: '黄铜钥匙转了两圈，小铁柜开了。一个带小摇柄的**旋转底座**横在最里头，尺寸刚好能卡住木框。',
      effect: { flag: 'c2_payoff_base' } }
  }
  if (id === 'c2n5_k2' && !f.c2_payoff_base) return { ...step, image: '',
    text: '你把小铁柜重新关好，回到老周旁边。', next: 'c2n5_a7' }
  if (id === 'c2n5_k2') return { ...step, image: ASSEMBLED,
    text: `你试着摇了一下，红色弯管随着整个木框转过来。老周扶住底边：「慢点。我这是教具，不是爆米花机。」${f.c2_payoff_lei_gift ? '拆下的小摇柄，正好收进小雷给的袋格里。' : ''}` }
  if (id === 'c2n5_a7') return { ...step, image: MODEL,
    text: f.archive_film || f.mystery_told
      ? '先说好，这一柜是教学用的，跟你找的那只无名片袋不是一回事。这个摆桌上演示，别往机架里塞。'
      : '这是以前带新人用的。摆桌上拆着看，别往机架里塞。用完透明片按号放，不然下一班得先玩拼图。' }
  if (id === 'c2n5_a8') return { ...step, image: f.c2_payoff_model ? MODEL : '',
    text: f.c2_payoff_model
      ? '老周抱着木盒往外走：「下周市里来做质控，你先讲体模记录。顺便把这个带上，遇到说不清的就摆给人看，我在旁边。」'
      : '老周把资料收好：「下周市里来做质控，体模记录你理。你先讲，我在旁边补。」' }
  if (id === 'c2n5_a9') return { ...step, image: f.c2_payoff_model ? MODEL : '',
    text: f.c2_payoff_model
      ? '你给借出的教具记了号，教学片和笔记也登记好，合影仍放回原处。老周捏着盒盖试了试：「这回别拿饭盒给它当盖子。」'
      : '你把教学片和笔记的编号记好，合影仍放回原处。老周把柜里空出来的地方重新理了理。' }
  if (id === 'c2n5_a10') return { ...step, image: '',
    text: `你把两半铜片装回纸袋，和老周签了钥匙归还记录。${f.c2_payoff_model
      ? f.c2_payoff_base ? '底座和木盒一起抱回控制室。' : '木盒抱回控制室，放在旁边的空桌上。'
      : '收好资料，你和老周一起回控制室。'}` }
  if (id === 'c2n5_hub') {
    const additions = ch2PayoffGiftChoices(s)
    const targets = new Set(additions.map(choice => choice.next))
    return { ...step, choices: [...additions, ...(step.choices ?? []).filter(choice => !targets.has(choice.next))] }
  }
  if (id.startsWith('c2n5_payoff_luo') && !f.c2_needle_resolved) return {
    ...clear, speaker: 'sys', text: '这边还没有新消息，先回控制室。', next: 'c2n5_hub',
  }
  if (id.startsWith('c2n5_payoff_lei') && !helpedLei(s)) return {
    ...clear, speaker: 'sys', text: '小雷还在忙，你先回控制室。', next: 'c2n5_hub',
  }
  if (id.startsWith('c2n5_payoff_jiang') && !f.n5_jiang) return {
    ...clear, speaker: 'sys', text: '走廊里暂时没人，先回控制室。', next: 'c2n5_hub',
  }
  if (id === 'c2n5_payoff_lei0') return { ...step, text: s.dlc?.ch2?.loop?.gifts.some(gift => gift.person === 'lei')
    ? '前几天净吃你的了。这个给你，我多一个。转接头别再往兜里塞，上回你蹲下，掉出来三个。'
    : '前几天那几条记录，多亏你帮着留。这个给你，我多一个。线头、转接件分开放，省得下回一块儿扯出来。' }
  if (id === 'c2n5_payoff_lei1' && f.c2_payoff_base) return { ...step,
    text: '你把教具底座的小摇柄收进窄格，正合适。小雷看了一眼：「挺好，别跟转接头放一块儿，下次我真会装错。」' }
  if (id === 'c2n5_b1' && f.c2_apples_shared) return { ...step,
    text: '（把保温盒摆到桌上）上回大家吃了你的苹果，这回尝尝我家卤的牛肉。筷子自己拿，老周已经来过两趟了。' }
  if (id === 'c2n5_b1' && f.c2_dawn_done) return { ...step,
    text: '（把保温盒摆到桌上）上回看完日出，包子果然只剩素的。这回家里卤了牛肉，给值班的都带点。' }
  if (id === 'c2n5_b2') return { ...step, image: 'item_beef',
    text: f.c2_apples_shared ? '你和同事分着吃了几块牛肉。老周拿筷子拨了拨盘底，小唐把盒盖递给他：「苹果不用洗盒子，这个可躲不过去。」' : step.text }
  if (id === 'c2n5_g1') return { ...step, image: 'ch2_gift_zhou_cup_v1',
    effect: { ...step.effect, flag: 'c2_payoff_zhou_cup' },
    text: `${step.text ?? ''}${f.c2_payoff_jiang_gift ? '你试着套上老蒋捎来的布杯套，松紧正好。老周看看：「配得还挺齐。」' : ''}` }
  if (id === 'c2am_9' && !f.c2_payoff_expert_done) return { ...step, ...clear, bg: 'bg_office_day',
    text: '【2025年11月 · 值守后的下一周】市里的质控专家到科里，先把包放在门边。老周刚站起来，对方就停住了。',
    next: 'c2am_payoff_handshake', end: false }
  if (id === 'c2am_payoff_table' && !f.c2_payoff_model) return { ...step, image: '',
    text: '你把这周的体模记录摆好。老周让出桌边的位置：「今天先听年轻人讲，我在旁边补。」', next: 'c2am_payoff_reply' }
  if (['c2am_payoff_q', 'c2am_payoff_layers', 'c2am_payoff_rotate'].includes(id) && !f.c2_payoff_model) return {
    ...clear, bg: 'bg_office_day', speaker: 'sys', text: '你翻到自己做过标记的那页，准备说明这周的体模记录。', next: 'c2am_payoff_reply',
  }
  if (id === 'c2am_payoff_q') return { ...step,
    choices: step.choices?.filter(choice => choice.next !== 'c2am_payoff_rotate' || Boolean(f.c2_payoff_base)) }
  if (id === 'c2am_payoff_rotate' && !f.c2_payoff_base) return { ...CH2_PAYOFF_STEPS.c2am.c2am_payoff_layers }
  if (id === 'c2am_payoff_reply') return { ...step, speaker: 'sys', sprite: '',
    text: `${f.n5_fan
      ? '窗缝吹得资料翻了页，你拿来去年老范送的报废铅眼镜压住。小唐掂掂它：「这个镇纸，谁都顺不走。」'
      : '小唐拿订书机压住资料一角，替你翻到做过标记的那页。'}${f.c2_payoff_zhou_cup ? '你把写好名字的新茶杯放到椅子旁。' : ''}` }
  return step
}

export function ch2PayoffStep(id: string, step: Step, s: PayoffState): Step {
  return ch2SideBadgeStep(ch2ArchiveReturnStep(id, payoffStep(id, step, s), s))
}
