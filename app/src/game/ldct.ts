import type { GameState } from './types'
import type { LdctChoice, LdctNode, LdctPerson } from './ldct-types'

export const LDCT_TITLE = '低剂量CT：噪声之外'
export const LDCT_START = 'dinner_0'
export const LDCT_BADGES = {
  ldct_first_comparison: { name: '第一份对照', icon: '🔍', desc: '留下结构与投影的对应记录，而不只存最后那张图。' },
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
  [undefined, '2025年冬。好不容易凑到一个都不用值夜班的晚上，陆舟把见面地点定在医院后门的小饭馆。\n你晚了十分钟。锅里的豆腐还在冒泡。'],
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
  ['luzhou', '所以想找个人一起折腾。先从最简单的影子玩起。我这套东西，可能光顾着自己看懂了。'],
], restaurant, lu, 'cooperate_q', { giftPerson: 'luzhou' })
node('cooperate_q', { bg: restaurant, sprite: lu, speaker: 'me', text: '陆舟把电脑包往脚边踢了踢，仍旧没打开。', giftPerson: 'luzhou', choices: [
  choice('small', '“先试一点，别一上来给我排三个月的活。”', 'cooperate_small_0', { decision: { key: 'pace', value: 'small' } }),
  choice('credit', '“我真参与的话，具体做什么，先说好。”', 'cooperate_credit_0', { decision: { key: 'pace', value: 'credit' } }),
] })
sequence('cooperate_small', [
  ['luzhou', '今晚先玩两下。后面的改天再说，不好玩就关。'],
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
  [undefined, '饭后，你们回医院取白天落下的充电器。交班已经结束，值班室暂时空着。陆舟按访客登记进来，把自己的电脑摆在靠墙的小桌上。'],
  ['luzhou', '我连自己的热点就行，今天也没有病人资料。实验离线能看。'],
  ['me', '先让我坐会儿。刚刚说补过觉，是补了，不是补够了。'],
  [undefined, '小雷来还充电器，看见电脑，脚步慢了下来。\n离你们约好的回家时间还有一会儿。聊聊、补点吃的，或者现在开始，都来得及。'],
], room, null, 'hub')
steps.arrival_1.sprite = lu
steps.arrival_2.sprite = lu
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
  ['luzhou', '先别急着选算法。认得**正弦图**吗？本科你还给我讲过。'],
  ['me', '认得名字。你让我指是哪张，我得缓缓。'],
  ['luzhou', '行，今天我给你补回来。先在**左图点一颗亮点**，再拖角度。右图每一列，就是那个方向收到的投影。'],
  [undefined, '陆舟把电脑转向你。旁边的小示意图标着球管和探测器，转到哪儿都能对得上。\n“先只盯一个点，别一口气全看。”'],
], room, lu, 'lab_first')
node('lab_first', { bg: room, sprite: null, text: '', enterLab: 1 })
sequence('after_first', [
  ['me', '点没动，影子倒是绕出一条弯。离中心远的，还跑得挺远。'],
  ['luzhou', '对。原图的位置，变成了这条轨迹。现在我把原图收起来，只剩影子呢？'],
  ['me', '只给我影子，让我倒着猜它原来在哪儿？'],
  ['luzhou', '先把每个方向收到的东西沿原路摊回去。多摊几个方向，看哪些地方会交在一起。'],
], room, lu, 'lab_second', { giftPerson: 'luzhou' })
node('lab_second', { bg: room, sprite: null, text: '', enterLab: 2 })
// A short interlude separates each operation; no screen exposes all five tools.
sequence('after_backproject', [
  ['me', '位置找回来了，但每颗点都自带一圈雾。再多加方向，也不见得就清楚。'],
  ['luzhou', '这就是**直接反投影**留下的模糊。今天先到这儿，明天换个做法。'],
  ['me', '你真的主动说收工了？我得记一下日期。'],
], room, lu, 'go_home_0', { giftPerson: 'luzhou' })
sequence('filter_intro', [
  [undefined, '午休还剩半小时。你收好饭盒，陆舟把昨天那份实验翻到下一页。几个点外面多了个外壳，还添了几根细条。'],
  ['luzhou', '先点**None**，就是昨晚不滤波、直接投回去。再换**Ram-Lak**。下面那条曲线也会变，看看图里有什么不同。'],
  ['me', '想起来了，**FBP**是先滤投影，再往回投。这回你慢点，我自己切着看。'],
], day, lu, 'lab_filter', { giftPerson: 'luzhou' })
node('lab_filter', { bg: day, sprite: null, text: '', enterLab: 3 })
sequence('after_filter', [
  ['me', '换成柔一点的，颗粒没那么扎眼了，最细那根也淡了，边缘钝了。'],
  ['luzhou', '别急着选冠军。你把两种都留着，等信号少了再看。'],
  [undefined, '陆舟的返程闹钟响了。你提醒他别漏拿充电器，他拍了拍电脑包。\n合上电脑，午休刚好到点。'],
], day, lu, 'noise_intro_0')
sequence('noise_intro', [
  [undefined, '两天后，下班。陆舟来取落在你这里的转接头，顺手把上次那份实验打开了。'],
  ['luzhou', '今天不换模体，也不减少角度。只把每个角度收到的光子数调低。先看正弦图，不急着看成片。'],
  ['me', '昨天还能追的弯线，今天像隔着雪花。再用刚才那个锐一点的滤波，会怎么样？'],
], room, lu, 'lab_noise', { giftPerson: 'luzhou' })
node('lab_noise', { bg: room, sprite: null, text: '', enterLab: 4 })
sequence('after_noise', [
  ['me', '原来不是出图以后才凭空长了颗粒。投影就开始抖了，重建还会把它带进去。'],
  ['luzhou', '对。软一点能压些噪声，可你刚才一直找的细条也得看着。'],
], room, lu, 'iteration_break', { giftPerson: 'luzhou' })
node('iteration_break', { bg: room, sprite: lu, speaker: 'luzhou', text: '还有个办法，不是一下投完。想试试吗？', choices: [
  choice('tea', '“等我倒杯水。你也别老盯着屏幕。”', 'iteration_tea_0'),
  choice('try', '“试一下，这回我来决定停在哪轮。”', 'iterate_intro_0'),
] })
sequence('iteration_tea', [
  [undefined, '你去接了两杯水。回来时陆舟正把一封催进度的邮件往下划。'],
  ['me', '先放下吧。咱俩现在给它发过去，也不能让这图自己变好。'],
  ['luzhou', '……也是。'],
], room, lu, 'iterate_intro_0')
sequence('iterate_intro', [
  ['luzhou', '接着用刚才那份**低信号投影**。先猜一张图，算算它会投出什么影子，跟测到的比一比，再改一轮。'],
  ['me', '不是把同一张图反复磨皮，是每轮都回去**对投影**。'],
  ['luzhou', '嗯。你一轮一轮往前走，也可以停住、倒回去看。别因为轮数大，就替它说好话。'],
], room, lu, 'lab_iterate')
node('lab_iterate', { bg: room, sprite: null, text: '', enterLab: 5 })
sequence('after_second', [
  [undefined, '你停下迭代，把前后的结果留在屏幕上。那几根细条和淡淡的小块，现在成了你反复回头看的地方。'],
  ['me', '再迭代，也不会凭空知道这块本来是什么。'],
  ['luzhou', '是啊。我之前老盯着图干不干净。你把前后两版一摆，我反倒不敢那么快说“好了”。'],
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
  ['luzhou', '可以。今天这一个模体，说明不了别的图都这样。拿不准的地方也先记着。'],
  ['me', '下次我睡醒了再看。现在连鼠标指针都快有重影了。'],
], room, lu, 'organize_q')
node('organize_q', { bg: room, sprite: lu, speaker: 'luzhou', text: '存个什么名字？“最终版”？', choices: [
  choice('organize', '把参数、两版结果和拿不准的地方一起整理好', 'organized_0', { complete: 'organized' }),
  choice('later', '先留草稿，明天吃完饭再整理', 'draft_0', { decision: { key: 'notes', value: 'draft' } }),
] })
sequence('organized', [
  ['me', '信号、滤波器、停在哪一轮，都写上。以后问起来，别回答“凭感觉调的”。'],
  ['luzhou', '好。你这份名字长得像小作文，但比“最终版改2”靠谱。'],
], room, lu, 'ending_0')
sequence('draft', [
  ['luzhou', '草稿和参数都自动留下了，明天补上备注。别把“不确定”那张漏了。'],
  ['me', '行。现在先救一下我的睡眠。'],
], room, lu, 'ending_0')
sequence('go_home', [
  [undefined, '你们收电脑时，窗外的小饭馆已经关了一半灯。陆舟把电源线绕了三次，又放开重新绕。'],
  ['me', '回去别又跑一宿。'],
  ['luzhou', '你也别刚躺下就开始担心履历。——算了，这句当我没说，我先管我自己。'],
  [undefined, '回家路上，陆舟发来一个文件夹。名字很长。\n你没打开，先回了两个字：“明天。”'],
], room, lu, 'nextday_0')
sequence('nextday', [
  [undefined, '次日午饭。你热饭热到一半，微波炉停了。小何把自己的饭盒往旁边让了让：“你的先。”'],
  ['he', '听小雷说，你跟同学弄了个新东西？'],
  ['me', '还没有“东西”。昨晚刚学会把几个影子拼回去，拼出来还糊。'],
  ['he', '你一边吃一边比划，我还以为汤里有东西。勺子拿稳。'],
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
  [undefined, '小何端着饭盒回去了。陆舟发来消息：“刚好来附近办事。你午休还有多久？”'],
  ['me', '你回了条消息：“还有半小时。来吧，昨天那圈雾还没散呢。”'],
  [undefined, '过了一会儿，陆舟登完记上楼，拉了张椅子坐下。\n“先吃完，不差这两口。”'],
], day, null, 'nextday_notes')
// Keep existing node IDs for mid-scene saves; only the in-person arrival has a portrait.
steps.nextday_lei_2.sprite = lu
steps.nextday_lei_2.giftPerson = 'luzhou'
node('nextday_notes', { bg: day, sprite: lu, speaker: 'me', text: '先吃完饭，再把手头这点事收个尾。', giftPerson: 'luzhou', choices: [
  choice('organize', '补齐第一份实验记录', 'notes_done_0', { unless: 'organized', complete: 'organized' }),
  choice('finish', '“都留着呢。吃完看下一组。”', 'filter_intro_0'),
] })
sequence('notes_done', [
  ['luzhou', '昨晚追的轨迹、反投影的过程，都在。下回打开不用先猜哪个文件是什么了。'],
  ['me', '今天的研究进度：终于敢关文件夹了。'],
], day, lu, 'filter_intro_0', { giftPerson: 'luzhou' })
sequence('ending', [
  [undefined, '陆舟收好转接头，这次没再落东西。走到门口，又回头说：“我想换几个模体再试，别急着下结论。”'],
  ['me', '“等排班出来再约。下次先吃饭，真的先吃。”'],
  [undefined, '桌上的水已经凉了。你关掉电脑，给文件夹补了今天的日期。\n下次不用从“哪张看着更漂亮”开始吵了。'],
], room, null, 'stage_end')
node('stage_end', { bg: room, sprite: null, text: '第一段 · 先吃饭', settle: true })

export const LDCT_STEPS: Readonly<Record<string, LdctNode>> = steps

export function getLdctNode(state: GameState): LdctNode {
  const p = state.dlc?.ldct?.ldct
  const original = LDCT_STEPS[p?.nodeId ?? LDCT_START] ?? LDCT_STEPS[LDCT_START]
  let text = original.text
  if (original.id === 'after_second_2' && p?.records[5]?.verdict === 'uncertain') {
    text = '拿不准也留着。下次换位置、换模体再试，不能光靠这一张给方法下结论。'
  }
  if (original.id === 'go_home_0' && p && p.fatigue < 2) {
    text = '刚才靠着歇了一会儿，总算没再把消息发错人。你们收好电脑。窗外的小饭馆已经关了一半灯。'
  }
  if (original.id === 'after_first_0' && p?.records[1]?.helped) {
    text = '刚才跟着你转了半圈，总算没丢。是点的位置决定了轨迹怎么弯，不是它真的在里面跑。'
  }
  if (original.id === 'nextday_lei_2' && p?.completed.includes('organized')) {
    text = '过了一会儿，陆舟登完记上楼，拉了张椅子坐下。\n“昨天的记录看到了，名字挺长，倒是不用猜了。你先把饭吃完。”'
  }
  if (original.id === 'ending_1' && p?.decisions.chief === 'told') {
    text = '“先把要做什么列出来，排班出来再跟主任说。下次先吃饭，真的先吃。”'
  }
  return { ...original, text, sprite: original.sprite === '@luzhou' ? `ch2_pixel_char_luzhou_${state.gender}` : original.sprite }
}

export function getLdctChoices(state: GameState): LdctChoice[] {
  const p = state.dlc?.ldct?.ldct
  return (getLdctNode(state).choices ?? []).filter(c => !c.unless || !p?.completed.includes(c.unless))
}

export const LDCT_MANUAL = [
  { title: '影子怎么变成正弦图', text: '从一个方向测得一列投影。把不同角度的列排在一起，就是正弦图：横轴是投影角度，纵轴是探测器位置。一个偏离中心的小结构，会留下弯曲的轨迹；它并没有在物体里移动。开头暂时隐去外壳，方便看清几个结构各自的贡献。' },
  { title: '投回去以后为什么还糊', text: '直接反投影把各方向的信息沿原路摊回去、叠加。方向多了，位置逐渐显现，但仍有模糊。None不滤波，对应平直的矩形响应、直接反投影；Ram-Lak的响应是斜坡。其他选项用Shepp–Logan、Cosine、Hamming或Hann抑制高频，显示的是与斜坡相乘后的完整滤波响应。FBP先对投影滤波，再反投影，不是给最终断层贴一层美颜滤镜。曲线中间对应缓慢变化，两端对应细小、快速变化，正负频率对称；不是病灶大小刻度，也不代表某个滤波器永远最好。' },
  { title: '低信号先改变了什么', text: '这里固定角度数和物体，用光子计数的泊松波动模拟不同信号水平，再取对数得到投影。信号少，投影更不稳定，重建也会受到影响。它是简化的平行束数字模体实验，不是完整临床低剂量模型，档位不对应临床剂量建议。' },
  { title: '多改几轮，不是反复磨皮', text: '本例迭代重建每轮把当前图像正投影，与已测投影比较，再调整图像。屏幕展示实际计算出的中间结果、预测投影和差异，并不是对成片反复套滤镜。轮数越多不等于临床表现越好：既要看数据相符程度，也要看细节和噪声。本例不是任何厂商算法，深度学习方案尚未开放。' },
  { title: '记录，不是考试', text: '每次留下你实际试过的过程或请陆舟一起看，不以选“最漂亮”的图打分。每个场景只做一件事；参数、结果和求助都会保存。重新尝试不重复发奖励。' },
  { title: '如果以后要用真实资料', text: '向主任说明合作、取得机构数据授权、伦理审查与知情同意或相应豁免要求，是不同的问题。具体按项目与机构要求处理。此开场没有患者资料，不把“暂时没告诉主任”当成违规结论。' },
]
export const LDCT_PARTS = [
  { title: '一 · 先吃饭', status: '本轮开场体验' },
  { title: '二 · 顺手帮个忙', status: '后续待制作' },
  { title: '三 · 最干净的那张', status: '后续待制作' },
  { title: '四 · 这版还投吗', status: '后续待制作' },
]
