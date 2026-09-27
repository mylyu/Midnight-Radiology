import type { GameState } from './types'
import type { LdctChoice, LdctNode, LdctPerson } from './ldct-types'

export const LDCT_TITLE = '低剂量CT：噪声之外'
export const LDCT_START = 'dinner_0'
export const LDCT_BADGES = {
  ldct_first_comparison: { name: '第一份对照', icon: '🔍', desc: '把同源数据的两版结果一起留下，而不只存最好看的那张。' },
}
export const LDCT_MEDIA_IDS = [
  'ldct_bg_restaurant', 'bg_breakroom', 'ch2_bg_breakroom_day', 'bg_office',
  'ch2_pixel_char_luzhou_m', 'ch2_pixel_char_luzhou_f', 'ch2_pixel_char_lei',
  'ch2_pixel_char_he', 'ch2_pixel_char_director', 'item_coffee', 'item_milktea', 'item_snack',
] as const

const restaurant = 'ldct_bg_restaurant', room = 'bg_breakroom', day = 'ch2_bg_breakroom_day'
const lu = '@luzhou', lei = 'ch2_pixel_char_lei', he = 'ch2_pixel_char_he'
const steps: Record<string, LdctNode> = {}
type Line = [speaker: string | undefined, text: string]
function sequence(prefix: string, lines: Line[], bg: string, sprite: string | null, next: string,
  options: { giftPerson?: LdctPerson; complete?: string } = {}) {
  lines.forEach(([speaker, text], i) => {
    const id = `${prefix}_${i}`
    steps[id] = { id, bg, sprite, speaker, text, next: i + 1 < lines.length ? `${prefix}_${i + 1}` : next,
      giftPerson: options.giftPerson, complete: i === lines.length - 1 ? options.complete : undefined }
  })
}
function choice(id: string, text: string, next: string, extra: Partial<LdctChoice> = {}): LdctChoice {
  return { id, text, next, ...extra }
}
function node(id: string, data: Omit<LdctNode, 'id'>) { steps[id] = { id, ...data } }

sequence('dinner', [
  [undefined, '2025年冬。好不容易凑到同一个休息日，陆舟把见面地点定在医院后门的小饭馆。\n你晚了十分钟。锅里的豆腐还在冒泡。'],
  ['luzhou', '来，坐里面。你刚才发我“请患者稍候”是什么意思？'],
  ['me', '回错人了。我本来想说，别等我，先吃。'],
  ['luzhou', '那我这位患者，可以先加一碗饭吗？'],
  [undefined, '你把手机扣在桌上，脱下外套。陆舟看了看你的黑眼圈，默默把辣椒碟挪远了一点。'],
  ['me', '别这么看我，昨天补过觉了。你才是，约饭还背电脑？'],
  ['luzhou', '下午组会刚结束，没处放。放心，不给你看PPT。'],
  [undefined, '菜还差一道。你们客气地问完近况，几乎同时开口：“你最近——”'],
], restaurant, lu, 'dinner_q', { giftPerson: 'luzhou' })
node('dinner_q', { bg: restaurant, sprite: lu, speaker: 'me', text: '行，你先说。', giftPerson: 'luzhou', choices: [
  choice('progress', '“论文怎么样了？”——话出口就后悔。', 'dinner_progress_0'),
  choice('food', '“那道菜还没上，先别问进度。”', 'dinner_food_0'),
] })
sequence('dinner_progress', [
  ['luzhou', '好家伙，导师刚问完，你接着问。饭钱能不能抵进度？'],
  ['me', '我撤回。你就当我问的是红烧肉。'],
], restaurant, lu, 'cv_0', { giftPerson: 'luzhou' })
sequence('dinner_food', [
  ['luzhou', '太好了，我正想问你最近有没有做研究。'],
  ['me', '你俩是同一道菜吗？怎么一起上。'],
], restaurant, lu, 'cv_0', { giftPerson: 'luzhou' })
sequence('cv', [
  ['me', '科里整理材料，我看见别人的科研那栏，页码都有两位数。我那栏一张纸，还没写满。'],
  ['luzhou', '你不是才工作一年多？'],
  ['me', '现在倒没轮到我评什么高级。就是一想到以后要用，今天又只想睡觉，有点烦。'],
  ['luzhou', '我也差不多。白天跟导师说“快了”，晚上打开文件夹，发现还是昨天。'],
  ['me', '你那低剂量CT，卡哪儿了？'],
  ['luzhou', '图上那些沙沙的噪声，想压下去。可有时候压得太狠，看什么都挺顺眼……又觉得少了点东西。'],
  ['me', '你这个说法，很像修自拍。'],
  ['luzhou', '所以想找个人一起看。你每天跟图像打交道，可能能发现我盯久了看不见的东西。'],
], restaurant, lu, 'cooperate_q', { giftPerson: 'luzhou' })
node('cooperate_q', { bg: restaurant, sprite: lu, speaker: 'me', text: '陆舟把电脑包往脚边踢了踢，仍旧没打开。', giftPerson: 'luzhou', choices: [
  choice('small', '“先试一点，别一上来给我排三个月的活。”', 'cooperate_small_0', { decision: { key: 'pace', value: 'small' } }),
  choice('credit', '“我真参与的话，具体做什么，先说好。”', 'cooperate_credit_0', { decision: { key: 'pace', value: 'credit' } }),
] })
sequence('cooperate_small', [
  ['luzhou', '今晚最多试一组。不好玩就关，我也不想下次约你只收到“请患者稍候”。'],
  ['me', '还有，别拿“就五分钟”骗我。你本科那五分钟，最后搞到早上。'],
], restaurant, lu, 'dinner_end_0')
sequence('cooperate_credit', [
  ['luzhou', '你帮着设计怎么比、哪些地方要留意，我们一起记。不是发你十张图，挑一张说“挺好”。'],
  ['me', '行。别到最后我只负责给文件改名。'],
], restaurant, lu, 'dinner_end_0')
sequence('dinner_end', [
  ['luzhou', '先用我自己做的**数字模体**。一堆形状和已知的小结构，不是病人。'],
  ['me', '那今晚不用开机器？'],
  ['luzhou', '不用，投影和结果都算好了。就拿我的电脑看。你先吃，肉都凉了。'],
  [undefined, '你夹起一块肉，手机又亮了。是普通排班通知。你看了一眼，把屏幕按灭。\n这回，饭总算吃完了。'],
], restaurant, lu, 'arrival_0')
sequence('arrival', [
  [undefined, '饭后，你们回医院取外套。交班已经结束，值班室暂时空着。陆舟按访客登记进来，把自己的电脑摆在靠墙的小桌上。'],
  ['luzhou', '我连自己的热点就行，今天也没有病人资料。实验离线能看。'],
  ['me', '先让我坐会儿。刚刚说补过觉，是补了，不是补够了。'],
  [undefined, '小雷来还充电器，看见电脑，脚步慢了下来。\n离你们约好的回家时间还有一会儿。聊聊、补点吃的，或者现在开始，都来得及。'],
], room, null, 'hub')
node('hub', { bg: room, sprite: null, kind: 'hub', text: '电脑放在小桌上。今晚没有临床任务，不用赶。', choices: [
  choice('lu', '跟陆舟聊聊他的课题', 'chat_lu_0', { unless: 'chat_lu' }),
  choice('lei', '问小雷怎么还没走', 'chat_lei_0', { unless: 'chat_lei' }),
  choice('chief', '要不要先跟主任提一句？', 'chief_q', { unless: 'chief_choice' }),
  choice('experiment', '把电脑转过来，开始试一组', 'lab_intro_0'),
] })
sequence('chat_lu', [
  ['me', '你导师知道今天找我吗？'],
  ['luzhou', '知道我来找个做图像的老同学聊聊。具体怎么合作，还得把事情写下来。'],
  ['me', '你们实验室，晚上都这么忙？'],
  ['luzhou', '忙的时候忙，没结果的时候也忙。有时候最怕别人问，忙出什么了。'],
  ['me', '那这桌电脑，先不算“建立联合实验室”。'],
  ['luzhou', '放心，桌子都不是咱俩的。'],
], room, lu, 'hub', { giftPerson: 'luzhou', complete: 'chat_lu' })
sequence('chat_lei', [
  ['lei', '本来走了，充电器落这儿。你俩电脑一摆，看着比上班还认真。'],
  ['me', '试试算法，今天只看数字模体。'],
  ['lei', '那我能看两眼吗？先声明，我不修你们的代码。'],
  ['me', '哪敢，修好了你下次还得来。'],
  ['lei', '我可以帮你们留一下版本和参数。别最后存八个“最终版”，谁也说不清哪个是哪天的。'],
  ['me', '被你猜中了，我已经建了一个“新建文件夹”。'],
], room, lei, 'hub', { giftPerson: 'lei', complete: 'chat_lei' })
node('chief_q', { bg: room, sprite: null, speaker: 'me', text: '主任办公室还亮着灯。只是试一组模体，要不要先说？', choices: [
  choice('tell', '敲门说一声，免得以后说不清', 'chief_tell_0', { complete: 'chief_choice', decision: { key: 'chief', value: 'told' } }),
  choice('later', '先试出个具体问题，再找他谈', 'chief_later_0', { complete: 'chief_choice', decision: { key: 'chief', value: 'later' } }),
] })
sequence('chief_tell', [
  ['me', '主任，我跟本科同学试点重建的东西。今天只有自己做的模体，没动医院机器和病人资料。'],
  ['director', '现在就你俩？别弄到太晚。下周要是还做，先把时间跟我说。'],
  ['me', '后面如果真做研究呢？'],
  ['director', '先把用什么、做什么列出来，我看排班能不能腾一腾。真要用院里的资料，还得找相应部门走手续，别只记住我点了头。'],
  [undefined, '你关门时，主任又抬了下手：“灯给我留着。我这张表还没填完。”'],
], 'bg_office', 'ch2_pixel_char_director', 'hub')
sequence('chief_later', [
  ['me', '先试一组吧。现在去说，估计只能说出“我们准备研究一下”。'],
  ['luzhou', '那先把问题写清楚。到要排时间、用院里东西的时候，再一起把事情讲明白。'],
], room, lu, 'hub')
sequence('lab_intro', [
  ['luzhou', '这组里面有什么，我先不告诉你。你自己拖着看，也可以往前后翻两层。'],
  ['me', '真不考试？'],
  ['luzhou', '不考试。看不准就圈出来，或者喊我。咱俩先留住一版，再改另一版，不然眨眼就忘了刚才长什么样。'],
  ['me', '这几个选项呢？'],
  ['luzhou', '**信号水平**，还有出断层用的算法。先试FBP，再试这组迭代方法。那个深度学习的还没训练好，今天先不吹它。'],
  [undefined, '屏幕亮起。你把椅子往前挪了一点。\n先找那些容易辨认的形状，存下两版，让它们留在同一张桌上。'],
], room, lu, 'lab_first')
node('lab_first', { bg: room, sprite: null, text: '', enterLab: 1 })
sequence('after_first', [
  ['luzhou', '两版都留下了。你刚才有哪处拿不准？'],
  ['me', '换完之后确实没那么沙了。不过我得来回看，不能只凭第一眼。'],
  ['luzhou', '嗯。这里面的大轮廓本来就比较明显。再找一组更淡的小东西，看看还顺不顺利。'],
  ['me', '你终于开始加难度了。'],
  ['luzhou', '我没加，刚才也在。就是我自己第一遍没太留意。'],
], room, lu, 'lab_second', { giftPerson: 'luzhou' })
node('lab_second', { bg: room, sprite: null, text: '', enterLab: 2 })
sequence('after_second', [
  [undefined, '两版结果并排停住。刚才追着鼠标走的那点灰影，现在终于有了一个可以回头看的位置。'],
  ['luzhou', '我把模体的原始布局打开。现在可以对着看看了。'],
  ['me', '所以它本来就在那儿，不是我盯久了看花眼？'],
  ['luzhou', '对。但换了信号和处理强度，有时候不太好认。看着干净的那版，也得把这里留下来比。'],
], room, lu, 'result_q', { giftPerson: 'luzhou' })
node('result_q', { bg: room, sprite: lu, speaker: 'me', text: '鼠标停在两版结果之间。', giftPerson: 'luzhou', choices: [
  choice('keep_both', '“别删，这两张一起留。”', 'record_keep_0', { decision: { key: 'comparison', value: 'both' } }),
  choice('uncertain', '“我还是拿不准，下次换几个位置再试。”', 'record_uncertain_0', { decision: { key: 'comparison', value: 'uncertain' } }),
] })
sequence('record_keep', [
  ['luzhou', '行。刚才差点只存右边那张，省得文件夹太乱。'],
  ['me', '乱可以收拾。删了再想起来，可别让我凭记忆画。'],
], room, lu, 'organize_q')
sequence('record_uncertain', [
  ['luzhou', '可以。今天这一个模体，说明不了别的图都这样。你圈的地方也先存着。'],
  ['me', '下次我睡醒了再看。现在连鼠标指针都快有重影了。'],
], room, lu, 'organize_q')
node('organize_q', { bg: room, sprite: lu, speaker: 'luzhou', text: '存个什么名字？“最终版”？', choices: [
  choice('organize', '把参数、两版结果和拿不准的地方一起整理好', 'organized_0', { complete: 'organized' }),
  choice('later', '先留草稿，明天吃完饭再整理', 'draft_0', { decision: { key: 'notes', value: 'draft' } }),
] })
sequence('organized', [
  ['me', '信号、算法、强度都写上。以后问起来，别回答“凭感觉调的”。'],
  ['luzhou', '好。你这份名字长得像小作文，但比“最终版改2”靠谱。'],
], room, lu, 'go_home_0')
sequence('draft', [
  ['luzhou', '草稿和参数都自动留下了，明天补上备注。别把“不确定”那张漏了。'],
  ['me', '行。现在先救一下我的睡眠。'],
], room, lu, 'go_home_0')
sequence('go_home', [
  [undefined, '你们收电脑时，窗外的小饭馆已经关了一半灯。陆舟把电源线绕了三次，又放开重新绕。'],
  ['me', '回去别又跑一宿。'],
  ['luzhou', '你也别刚躺下就开始担心履历。——算了，这句当我没说，我先管我自己。'],
  [undefined, '回家路上，陆舟发来一个文件夹。名字很长。\n你没打开，先回了两个字：“明天。”'],
], room, lu, 'nextday_0')
sequence('nextday', [
  [undefined, '次日午饭。你热饭热到一半，微波炉停了。小何把自己的饭盒往旁边让了让：“你的先。”'],
  ['he', '听小雷说，你跟同学弄了个新东西？'],
  ['me', '还没有“东西”。就是两张图，把一个小地方来回看了半天。'],
  ['he', '那挺费饭的。你看你这盒，又凉了。'],
], day, he, 'nextday_q', { giftPerson: 'he' })
node('nextday_q', { bg: day, sprite: he, speaker: 'he', text: '“真要往下做，哪天给我看看。电脑里的活我帮不上，图在急诊怎么用，我倒可以说两句。”', giftPerson: 'he', choices: [
  choice('invite', '“行，你先挑我们的毛病，别光夸。”', 'nextday_invite_0', { decision: { key: 'colleague', value: 'invite' } }),
  choice('wait', '“等我们把这组看明白，别耽误你吃饭。”', 'nextday_wait_0', { decision: { key: 'colleague', value: 'later' } }),
] })
sequence('nextday_invite', [
  ['he', '那我可不客气。先挑一个：你把勺子泡汤里了，汤已经洒出来了。'],
  ['me', '……这个问题现在就修。'],
], day, he, 'nextday_lei_0', { giftPerson: 'he' })
sequence('nextday_wait', [
  ['he', '行。真需要我看具体问题再叫，别把我往一个群里一拉，就算干过活了。'],
  ['me', '放心，我连群名都还没想好。'],
], day, he, 'nextday_lei_0', { giftPerson: 'he' })
sequence('nextday_lei', [
  ['lei', '群名简单：“不改最终版”。'],
  ['me', '你从哪儿冒出来的？'],
  ['lei', '门口。我来拿饭。昨天那份参数记好了吗？'],
], day, lei, 'nextday_notes', { giftPerson: 'lei' })
node('nextday_notes', { bg: day, sprite: lei, speaker: 'me', text: '先吃完饭，再把手头这点事收个尾。', giftPerson: 'lei', choices: [
  choice('organize', '补齐第一份实验记录', 'notes_done_0', { unless: 'organized', complete: 'organized' }),
  choice('finish', '“都留着呢。吃饭，下午还有班。”', 'ending_0'),
] })
sequence('notes_done', [
  ['lei', '两版、参数、你圈的地方，都在。下回打开不用先猜哪个文件是什么了。'],
  ['me', '今天的研究进度：终于敢关文件夹了。'],
], day, lei, 'ending_0', { giftPerson: 'lei' })
sequence('ending', [
  [undefined, '手机轻轻亮了一下。陆舟发来普通消息：“我想再试几组，别急着把这组当结论。”'],
  ['me', '我回：“等排班出来再约。下次先吃饭，真的先吃。”'],
  [undefined, '第一份对照已经留下。它还不够写进任何临床报告，也不够撑起一篇论文。\n但下次见面，终于有个具体的东西可以接着谈。'],
], day, null, 'stage_end')
node('stage_end', { bg: day, sprite: null, text: '第一段 · 先吃饭', settle: true })

export const LDCT_STEPS: Readonly<Record<string, LdctNode>> = steps

export function getLdctNode(state: GameState): LdctNode {
  const p = state.dlc?.ldct?.ldct
  const original = LDCT_STEPS[p?.nodeId ?? LDCT_START] ?? LDCT_STEPS[LDCT_START]
  let text = original.text
  if (original.id === 'after_second_2' && p?.records[2]?.verdict === 'uncertain') {
    text = '我刚才圈的地方，得对着原始布局才能放心。只看一张，真不敢说。'
  }
  if (original.id === 'go_home_0' && p && p.fatigue < 2) {
    text = '刚才靠着歇了一会儿，总算没再把消息发错人。你们收好电脑。窗外的小饭馆已经关了一半灯。'
  }
  if (original.id === 'after_first_0' && p?.records[1]?.helped) {
    text = '刚才一起看的地方也记下了。还有别的拿不准吗？别急着把圈擦掉。'
  }
  if (original.id === 'nextday_lei_2' && p?.completed.includes('organized')) {
    text = '门口。我来拿饭。昨天那份记录看到了，名字虽然长，倒是不用猜了。'
  }
  if (original.id === 'ending_1' && p?.decisions.chief === 'told') {
    text = '我回：“先把要做什么列出来，排班出来再跟主任说。下次先吃饭，真的先吃。”'
  }
  return { ...original, text, sprite: original.sprite === '@luzhou' ? `ch2_pixel_char_luzhou_${state.gender}` : original.sprite }
}

export function getLdctChoices(state: GameState): LdctChoice[] {
  const p = state.dlc?.ldct?.ldct
  return (getLdctNode(state).choices ?? []).filter(c => !c.unless || !p?.completed.includes(c.unless))
}

export const LDCT_MANUAL = [
  { title: '今晚在做什么', text: '这是原创数字模体的离线比较，不是患者影像，也没有新扫描。几何、显示窗固定，低／中／高通过同源投影上的计数噪声模拟信号水平。游戏中的档位不是临床剂量建议。' },
  { title: '两种重建，先放在同一张桌上', text: 'FBP从投影得到断层；本样段的迭代示例反复比较计算投影与测量投影，并带有限度的平滑约束。它不是给FBP图像套滤镜，也不代表任何厂商的临床算法。减少颗粒感与保住弱小结构需要一起观察。' },
  { title: '不确定的地方可以留下', text: '固定一版，再调另一版；沿相邻层核对，圈出拿不准的位置。保存的是比较过程，不按图像是否漂亮评分。求助不会扣分。深度学习方案尚未开放，后三段才继续这场讨论。' },
  { title: '如果以后要用真实资料', text: '向主任说明合作、取得机构数据授权、伦理审查与知情同意或相应豁免要求，是不同的问题。具体按项目与机构要求处理。此开场没有患者资料，不把“暂时没告诉主任”当成违规结论。' },
]
export const LDCT_PARTS = [
  { title: '一 · 先吃饭', status: '本轮开场体验' },
  { title: '二 · 顺手帮个忙', status: '后续待制作' },
  { title: '三 · 最干净的那张', status: '后续待制作' },
  { title: '四 · 这版还投吗', status: '后续待制作' },
]
