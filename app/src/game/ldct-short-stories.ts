import type { LdctLabRound } from './ldct-experiments'
import type { LdctChoice, LdctNode, LdctPerson, LdctProgress } from './ldct-types'

/** Alternative short drafts: the player selects one, not three canonical episodes in a row. */
export type LdctStoryId = 'face' | 'dinner' | 'patient'
export const LDCT_STORIES: {
  id: LdctStoryId; title: string; subtitle: string; start: string; dataset: 'face' | 'nut' | 'phantom'
}[] = [
  { id: 'face', title: '模体里有张脸', subtitle: '下班后，一张越看越像人脸的图。', start: 'sf_start', dataset: 'face' },
  { id: 'dinner', title: '这顿饭谁请', subtitle: '一个号称很值钱的小盒子，赌的是今晚谁请客。', start: 'sd_start', dataset: 'nut' },
  { id: 'patient', title: '这张片子是不是糊弄我', subtitle: '家属的一句话，陆舟的一次插嘴。', start: 'sp_start', dataset: 'phantom' },
]

const room = 'bg_breakroom', day = 'ch2_bg_breakroom_day', corridor = 'bg_corridor'
const restaurant = 'ldct_bg_restaurant', waiting = 'bg_waiting'
const lu = '@luzhou', lei = 'ch2_pixel_char_lei', he = 'ch2_pixel_char_he', zhou = 'ch2_pixel_char_zhou'
const elder = 'ch2_patient_waiting_elder', relative = 'ch2_pixel_pat_kiddad'
export const LDCT_SHORT_MEDIA_IDS = [
  room, day, corridor, restaurant, waiting, 'bg_ctcontrol_day_ready',
  'ch2_pixel_char_luzhou_m', 'ch2_pixel_char_luzhou_f', lei, he, zhou, elder, relative,
  'item_coffee', 'item_milktea', 'item_snack',
] as const

const steps: Record<string, LdctNode> = {}
type Line = [speaker: string | undefined, text: string]
type Part = 1 | 2 | 3
function sequence(prefix: string, lines: Line[], bg: string, sprite: string | null, next: string,
  part: Part, options: { giftPerson?: LdctPerson; complete?: string } = {}) {
  lines.forEach(([speaker, text], index) => {
    const id = `${prefix}_${index}`
    steps[id] = { id, part, bg, sprite, speaker, text,
      next: index + 1 < lines.length ? `${prefix}_${index + 1}` : next,
      giftPerson: options.giftPerson, complete: index === lines.length - 1 ? options.complete : undefined }
  })
}
function node(id: string, data: Omit<LdctNode, 'id'>) { steps[id] = { id, ...data } }
function choice(id: string, text: string, next: string, extra: Partial<LdctChoice> = {}): LdctChoice {
  return { id, text, next, ...extra }
}
function lab(id: string, round: LdctLabRound, bg: string, part: Part, goal: string) {
  node(id, { bg, sprite: null, part, text: '', enterLab: round, goal })
}

// A — A harmless invented phantom, an unhelpful imagination, and a real colleague outside.
node('sf_start', { part: 1, bg: corridor, sprite: null,
  text: '2025年冬，交班后。\n陆舟按约来取你借走的转接头。你们走过已经安静下来的走廊，值班室门底漏着一点光。', next: 'sf_arrive_0' })
sequence('sf_arrive', [
  ['luzhou', '顺便看一张图？我自己做的数字模体，不是病人的。'],
  ['me', '你这个“顺便”，一般需要我重新热一次饭。'],
  [undefined, '陆舟掀开电脑。左边是模体原图，右边是还很糊的重建。灰色圆盘里几块亮影挤在一起。你刚坐下，又往后挪了半寸。'],
  ['me', '……它是不是在笑？'],
  ['luzhou', '你一说……是有点像。左边原物没动，右边糊一点，反而更像了。'],
], room, lu, 'sf_reaction', 1, { giftPerson: 'luzhou' })
node('sf_reaction', { part: 1, bg: room, sprite: lu, speaker: 'me', text: '走廊里响了一下，像是什么碰到了门框。', choices: [
  choice('door', '先把门开大点，看看外面', 'sf_door_0', { decision: { key: 'sf_nerves', value: 'door' } }),
  choice('stay', '“先看图。别告诉我你还配了音效。”', 'sf_stay_0', { decision: { key: 'sf_nerves', value: 'stay' } }),
] })
sequence('sf_door', [
  [undefined, '你把门推开。走廊空着，拐角还亮着灯。门后的外套晃了两下。'],
  ['me', '门开着。空气流通。'],
  ['luzhou', '我又没问原因。'],
], corridor, null, 'sf_trace_intro_0', 1)
steps.sf_door_2.sprite = lu
sequence('sf_stay', [
  ['luzhou', '没有。你刚才还嫌我电脑风扇响。'],
  ['me', '那你别突然全屏。'],
], room, lu, 'sf_trace_intro_0', 1)
sequence('sf_trace_intro', [
  ['luzhou', '先盯住一小块。我把它从各个方向的影子排在这张**正弦图**里。'],
  ['me', '这堆弯线，跟刚才那几块亮的有关？'],
  ['luzhou', '你点一块，再转一转方向。看它的影子落在哪儿。'],
], room, lu, 'sf_lab_1', 1)
lab('sf_lab_1', 1, room, 1, '认准一个结构，转动方向，追到它在正弦图里的轨迹。')
sequence('sf_after_1', [
  ['me', '亮块没跑，影子的位置一直在换。难怪连起来是弯的。'],
  ['luzhou', '现在反过来。只剩这些影子，把它们沿原方向摊回去。'],
  ['me', '我先不看左边对照，自己试着拼。'],
], room, lu, 'sf_lab_2', 1)
lab('sf_lab_2', 2, room, 1, '一个方向一个方向地铺回影子，看看轮廓何时开始出现。')
sequence('sf_after_2', [
  ['me', '位置是凑上了。可那圈糊的也一直跟着。'],
  ['luzhou', '嗯，直接反投影不是多铺几遍就能把这层糊全消掉。'],
  [undefined, '电脑风扇停了一瞬。门外又响了两下，这回离得更近。陆舟也抬起头。'],
  ['me', '这总不是你的投影吧。'],
], room, lu, 'sf_hub', 2)
node('sf_hub', { part: 2, bg: room, sprite: null, kind: 'hub',
  text: '图还在桌上，走廊灯也亮着。先歇一会儿，想查哪边就查哪边。', choices: [
    choice('hall', '去门口看看刚才的声音', 'sf_noise_source_0', { unless: 'sf_checked_hall' }),
    choice('lu', '问陆舟为什么非要半夜看这个', 'sf_chat_lu_0', { unless: 'sf_chat_lu' }),
    choice('filter', '回到图上，试试先滤波再反投影', 'sf_filter_intro_0'),
  ] })
sequence('sf_noise_source', [
  [undefined, '门口，小雷一只手夹着插线板，另一只手端着杯子。插头垂在下面，一走就碰到扶手。'],
  ['lei', '谁的转接头？我在这层绕了一圈。你俩门开这么大，怎么还不吱声？'],
  ['me', '在找你这个声音。'],
  ['lei', '……我还没说话呢。'],
], corridor, lei, 'sf_hub', 2, { giftPerson: 'lei', complete: 'sf_checked_hall' })
sequence('sf_chat_lu', [
  ['luzhou', '白天你上班，我开组会。刚才想着，把东西还了就走。'],
  ['me', '你转接头已经拿到了。'],
  ['luzhou', '是。但你那句“它在笑”，让我有点不想关电脑。'],
  ['me', '好奇可以。今晚不收“最终再试一次”。'],
], room, lu, 'sf_hub', 2, { giftPerson: 'luzhou', complete: 'sf_chat_lu' })
sequence('sf_filter_intro', [
  ['luzhou', '还是同一份影子，先换它的**滤波方式**。不用换一张原物。'],
  ['me', '那刚才看起来像嘴的地方，是本来就有，还是糊出来的？'],
  ['luzhou', '你挑两种并排看。别只看它像不像笑脸，看看边缘到底怎么变。'],
], room, lu, 'sf_lab_3', 2)
lab('sf_lab_3', 3, room, 2, '比较不滤波与不同FBP滤波，留意边缘和那块很淡的小结构。')
sequence('sf_after_3', [
  ['me', '硬一点、软一点，表情都不太一样了。这图还挺会看人下菜。'],
  ['luzhou', '它没变，是处理方式变了。接着把收到的信号调少，看看你还认不认得。'],
  ['me', '你没趁我出去的时候改原物吧？'],
  ['luzhou', '原物、方向都没动，只降低模拟的光子计数。'],
], room, lu, 'sf_lab_4', 2)
lab('sf_lab_4', 4, room, 2, '先看低信号怎样扰乱正弦图，再看不同滤波下的成片。')
sequence('sf_after_4', [
  ['me', '现在连它有没有鼻子，我都不敢痛快说。'],
  ['luzhou', '可以先记“不确定”。别替这几个颗粒安排五官。'],
  [undefined, '你伸了个懒腰，把屏幕上的两版都留下。走廊的声音终于到了门口。'],
], room, lu, 'sf_hall_reveal_0', 3)
sequence('sf_hall_reveal', [
  ['lei', '我来拿回我的插线板。刚才是插头撞扶手，不是什么机器自己开了。'],
  ['me', '知道了。下次把插头也带上，别让它自己走。'],
  [undefined, '小雷看了眼屏幕，愣了半秒：“你们就为了这个坐到现在？”\n他把线绕好，顺手替你们带上门。'],
], room, lei, 'sf_iterate_intro_0', 3, { giftPerson: 'lei' })
sequence('sf_iterate_intro', [
  ['luzhou', '最后换个办法。先猜一张图，算出它会留下哪些影子，再跟收到的对一对。'],
  ['me', '对不上就改一轮？'],
  ['luzhou', '嗯。你自己走几轮，再选停在哪儿。不是轮数大的就一定好。'],
], room, lu, 'sf_lab_5', 3)
lab('sf_lab_5', 5, room, 3, '逐轮改图，同时看预测投影与测得投影；自己挑一轮停下。')
sequence('sf_after_5', [
  [undefined, '你把结果和一直放在旁边的原物对上。圆盘里，两块亮的并不完全对称，下面那段弧也偏了一点。'],
  ['me', '它其实歪歪扭扭的。刚才越糊，我倒越觉得是张脸。'],
  ['luzhou', '两块亮的，一段弧，中间淡淡一小块。原来只想着放些好追踪的结构，你一叫鼻子，我也改不过来了。'],
  ['me', '我没有。门开着是为了散热。'],
], room, lu, 'sf_keep_q', 3)
node('sf_keep_q', { part: 3, bg: room, sprite: lu, speaker: 'luzhou', text: '怎么存？文件名还没起。', choices: [
  choice('pair', '“清楚的和拿不准的都留着，别下次又认成别的。”', 'sf_close_0', { decision: { key: 'sf_save', value: 'pair' } }),
  choice('name', '“就叫门开着是为了散热。参数也存上。”', 'sf_close_0', { decision: { key: 'sf_save', value: 'joke' } }),
] })
sequence('sf_close', [
  [undefined, '你给记录改好名字。那块看不准的地方也留在里面，没有被较好看的版本盖掉。'],
  ['luzhou', '走了。今晚真没有下一组。'],
  [undefined, '经过走廊拐角，你才发现小雷的杯子还放在窗台上。\n你拍照发过去。对面很快回了一句：“放着，别给它也做CT。”'],
], corridor, null, 'sf_end', 3)
steps.sf_close_1.sprite = lu
node('sf_end', { part: 3, bg: corridor, sprite: null, text: '门关好了，原图和不确定的那一版都留着。今晚到这里。', settle: true, storyEnd: true })

// B — A real sealed object is represented by precomputed geometric data, not an extra hospital scan.
node('sd_start', { part: 1, bg: restaurant, sprite: lu,
  text: '2025年冬，一个难得不用值班的晚上。\n你刚坐下，陆舟就把一个贴着胶带的小盒子推过来。菜还没点。', next: 'sd_arrive_0' })
sequence('sd_arrive', [
  ['me', '你终于准备把借我的钱折成实物了？'],
  ['luzhou', '这个很值钱。猜猜里面是什么，猜中了这顿我请。'],
  ['me', '那你包这么随便，胶带都翘了。'],
  ['luzhou', '里面稳着呢。不能晃盒子，允许改口。不想猜就开盒，咱俩照旧各付各的。'],
  ['me', '你带了什么危险东西？'],
  ['luzhou', '普通小物件。我照着它做了个**数字模体**，投影已经算好。没去医院开机器拍它。'],
], restaurant, lu, 'sd_bet', 1, { giftPerson: 'luzhou' })
node('sd_bet', { part: 1, bg: restaurant, sprite: lu, speaker: 'me', text: '陆舟把盒子放到盐罐旁边。', choices: [
  choice('confident', '“行，猜对了你别赖。”', 'sd_trace_intro_0', { decision: { key: 'sd_bet', value: 'confident' } }),
  choice('food', '“可以玩，菜来了必须先吃。”', 'sd_trace_intro_0', { decision: { key: 'sd_bet', value: 'food' } }),
] })
sequence('sd_trace_intro', [
  ['luzhou', '成交。先给你影子，原物盖住。右边这张就是**正弦图**，每列对应一个方向。'],
  ['me', '东西被你藏了，影子还得排着队看。'],
  ['luzhou', '转一转方向，认一条轨迹。它不是凭空拧出来的。'],
], restaurant, lu, 'sd_lab_1', 1)
lab('sd_lab_1', 1, restaurant, 1, '转动方向，对照机架位置与正弦图的当前列；先不用猜中盒内物件。')
sequence('sd_after_1', [
  ['me', '换个方向，影子还真不一样。光看一列很容易猜偏。'],
  ['luzhou', '那把它们投回去。你逐渐加方向，我不替你拼。'],
  ['me', '先说好，我说的第一种不算最终答案。'],
], restaurant, lu, 'sd_lab_2', 1)
lab('sd_lab_2', 2, restaurant, 1, '把不同方向的投影铺回去，先找大致轮廓，不急着报答案。')
sequence('sd_after_2', [
  ['me', '能看出有里有外。边上糊成这样，你让我猜食材都行。'],
  ['luzhou', '你先别夹它。菜来了。'],
  [undefined, '服务员放下砂锅。你把电脑挪到干燥的一边，陆舟赶紧收起充电线，给碗让出地方。'],
], restaurant, lu, 'sd_hub', 2)
node('sd_hub', { part: 2, bg: restaurant, sprite: null, kind: 'hub', text: '先吃几口。盒子还在盐罐旁边，陆舟暂时不催你猜。', choices: [
  choice('lu', '问问陆舟最近怎么过的', 'sd_chat_lu_0', { unless: 'sd_chat_lu' }),
  choice('guess', '先随口猜一个，允许反悔', 'sd_guess_q', { unless: 'sd_guessed' }),
  choice('filter', '擦干手，看看怎么把那层糊减下来', 'sd_filter_intro_0'),
] })
sequence('sd_chat_lu', [
  ['me', '这周还熬夜吗？'],
  ['luzhou', '少点了。上回对着一张图调半宿，早上发现打开的是前一天那个文件。'],
  ['me', '那晚最稳定的，就是旧版本。'],
  ['luzhou', '别提。我现在名字里连几点几分都写。'],
], restaurant, lu, 'sd_hub', 2, { giftPerson: 'luzhou', complete: 'sd_chat_lu' })
node('sd_guess_q', { part: 2, bg: restaurant, sprite: lu, speaker: 'me', text: '你看了看盒子，又看了看盐罐。陆舟把表情收得很严。', choices: [
  choice('coin', '“硬币？纪念币那类？”', 'sd_guess_reply_0', { decision: { key: 'sd_guess', value: 'coin' } }),
  choice('ring', '“戒指？你可别忽然掏个大的。”', 'sd_guess_reply_0', { decision: { key: 'sd_guess', value: 'ring' } }),
  choice('part', '“桌椅上掉下来的零件？”', 'sd_guess_reply_0', { decision: { key: 'sd_guess', value: 'part' } }),
  choice('wait', '“算了，等边缘清楚点再说。”', 'sd_guess_reply_0', { decision: { key: 'sd_guess', value: 'wait' } }),
] })
sequence('sd_guess_reply', [
  ['luzhou', '先记着。我现在点头摇头都算泄题。'],
  ['me', '行，你吃你的，别憋笑。'],
], restaurant, lu, 'sd_hub', 2, { giftPerson: 'luzhou', complete: 'sd_guessed' })
sequence('sd_filter_intro', [
  ['luzhou', '刚才直接往回铺，留了一层模糊。先把投影**滤波**，再铺回去，试试。'],
  ['me', '不滤、锐一点、柔一点……我自己并排看。你别抢着报名字。'],
], restaurant, lu, 'sd_lab_3', 2)
lab('sd_lab_3', 3, restaurant, 2, '比较不同滤波下的外缘、内缘和细小结构，想猜就先记在心里。')
sequence('sd_after_3', [
  ['me', '这回能分出一些边了。可软的看着舒服，细处又没那么利落。'],
  ['luzhou', '还有一份低信号的。原物和方向没换，收到的光子数少一些。'],
  ['me', '你这猜物游戏还有雾天模式。'],
  ['luzhou', '先看影子怎么变，再看重建。别只盯最后那张。'],
], restaurant, lu, 'sd_lab_4', 2)
lab('sd_lab_4', 4, restaurant, 2, '降低模拟计数，看同一个物件的投影和细处怎样变得难认。')
sequence('sd_after_4', [
  [undefined, '你把两种结果固定在一起，端起已经凉下来的茶。陆舟终于没催。'],
  ['me', '刚才挺像那么回事，现在又没把握了。'],
  ['luzhou', '可以不猜。盒子又不会因为你说错就换个东西。'],
], restaurant, lu, 'sd_pause_q', 3, { giftPerson: 'luzhou' })
node('sd_pause_q', { part: 3, bg: restaurant, sprite: lu, speaker: 'luzhou', text: '还试最后一个办法吗？不是再扫描，是用同一份影子慢慢改图。', choices: [
  choice('yes', '“试。最后停哪轮我说了算。”', 'sd_iterate_intro_0', { decision: { key: 'sd_pause', value: 'try' } }),
  choice('tea', '“等我把这口饭咽了。你也吃。”', 'sd_eat_0', { decision: { key: 'sd_pause', value: 'eat' } }),
] })
sequence('sd_eat', [
  [undefined, '你把碗往陆舟那边推了推。两个人安静吃了几口，谁也没提论文。'],
  ['luzhou', '这家米饭是真多。'],
  ['me', '嗯，比你给我的进度多。'],
], restaurant, lu, 'sd_iterate_intro_0', 3)
sequence('sd_iterate_intro', [
  ['luzhou', '先猜一张图，算出它的投影，对不上测到的就改。你一轮一轮往前走。'],
  ['me', '这回还能看它每次猜得差在哪儿。'],
  ['luzhou', '对。但它也可能追着噪声跑，不是改得久就一定认得准。'],
], restaurant, lu, 'sd_lab_5', 3)
lab('sd_lab_5', 5, restaurant, 3, '逐轮查看图与预测投影，选一版你愿意留着的结果。')
sequence('sd_after_5', [
  ['me', '行，差不多了。再不开，老板以为咱俩在验他的盐。'],
  ['luzhou', '最后报一个？可以改口，也可以现在开盒。'],
], restaurant, lu, 'sd_final_guess', 3)
node('sd_final_guess', { part: 3, bg: restaurant, sprite: lu, speaker: 'me', text: '盒子还封着，电脑上的几版图都能回看。', choices: [
  choice('coin', '“我押硬币。”', 'sd_open_0', { decision: { key: 'sd_final', value: 'coin' } }),
  choice('ring', '“戒指。不管贵不贵。”', 'sd_open_0', { decision: { key: 'sd_final', value: 'ring' } }),
  choice('part', '“有孔有棱的零件。螺母？”', 'sd_open_0', { decision: { key: 'sd_final', value: 'part' } }),
  choice('open', '“不押了，开盒吧。我去取打包袋。”', 'sd_open_0', { decision: { key: 'sd_final', value: 'open' } }),
] })
sequence('sd_open', [
  [undefined, '陆舟撕开胶带。盒子里是一颗**六角螺母**，旁边垫了纸。你把它举到灯下，边缘和中间的孔终于都对上了。'],
  ['me', '等会儿，这个很值钱？'],
  ['luzhou', '我为了把它算清楚，熬了几个晚上。主要贵在我。'],
  ['me', '那螺母挺冤的。'],
  ['luzhou', '图里是它横截面的几何模型。圆底座是实验架，不是盒子里的另一件东西。'],
], restaurant, lu, 'sd_reveal_reply_0', 3)
sequence('sd_reveal_reply', [
  ['luzhou', '愿赌服输，今晚按刚才说好的来。'],
  [undefined, '你们叫来服务员结账。陆舟把螺母塞回盒子，顺手接过打包袋。'],
  ['me', '下次约饭别带电脑。'],
  ['luzhou', '那你下次别把转接头又塞我包里。'],
], restaurant, lu, 'sd_end', 3)
node('sd_end', { part: 3, bg: restaurant, sprite: null, text: '盒子开了，饭也吃完了。猜物的输赢留在这顿饭里，实验仍能回来重看。', settle: true, storyEnd: true })

// C — Care continues with the physician; the five experiments happen later, away from the family.
node('sp_start', { part: 1, bg: waiting, sprite: relative,
  text: '2025年冬，一个白班快结束的时候。\n陆舟按约来接你吃饭，在门外等。你刚走到候诊区，一位家属就拿着父亲的复查片迎上来。', next: 'sp_complaint_0' })
sequence('sp_complaint', [
  ['家属', '上回看着挺干净，这次怎么全是小点？你们是不是少拍了？'],
  ['me', '您说的是这些颗粒？先别急，我把老周叫过来，一起核对。'],
  ['luzhou', '这不是看着越光滑越好。你光盯着颗粒，也判断不了——'],
  ['家属', '我判断不了才来问！你上来就说我不懂，那这张片子是不是糊弄我？'],
], waiting, relative, 'sp_reply_q', 1)
steps.sp_complaint_2.sprite = lu
node('sp_reply_q', { part: 1, bg: waiting, sprite: relative, speaker: 'me', text: '他手指压着片袋边，指节都白了。', choices: [
  choice('mediate', '把陆舟拉住：“先别抢着解释，让人家说完。”', 'sp_mediate_0', { decision: { key: 'sp_reply', value: 'mediate' } }),
  choice('listen', '接过片袋：“您最担心什么？我先听您说。”', 'sp_listen_0', { decision: { key: 'sp_reply', value: 'listen' } }),
  choice('hard', '“我们没有糊弄您，但这样吵也解决不了。”', 'sp_hard_0', { decision: { key: 'sp_reply', value: 'hard' } }),
] })
sequence('sp_mediate', [
  ['luzhou', '……好。您说。'],
  [undefined, '你轻轻碰了下陆舟的胳膊。他退到旁边，家属把举着的片袋放低了一点。'],
], waiting, lu, 'sp_worry_0', 1)
sequence('sp_listen', [
  ['家属', '我就想知道，父亲这次检查到底看清楚没有。'],
  [undefined, '你拉过一张椅子，让他坐着说。陆舟张了张嘴，没再接话。'],
], waiting, relative, 'sp_worry_0', 1)
sequence('sp_hard', [
  ['家属', '行，那我就等能跟我说清楚的人。'],
  [undefined, '他把片袋抱回胸前。你意识到这句又把话顶了回去，放缓声音：“我叫医生来一起看，也听听您之前遇到什么。”'],
], waiting, relative, 'sp_worry_0', 1)
sequence('sp_worry', [
  ['家属', '上回让我们拿片子去找医生，去哪儿、找谁，都没说清。跑了几处，回去我爸还一晚上没睡。'],
  ['家属', '今天我看见这些点，就怕又拿个说不明白的结果回家。我不是非得挑张好看的。'],
  ['me', '明白了。这回不让您只抱着片子到处找，医生就在里面。'],
], waiting, relative, 'sp_doctor_0', 1)
sequence('sp_doctor', [
  [undefined, '老周从阅片室出来，听完家属的话，把申请单与既往资料放在一起。'],
  ['zhou', '片子颗粒多一点，原因得看具体检查。您先带父亲跟我进来，我把完整图像调出来。'],
  ['me', '我核对这次的采集、重建记录。要不要追加检查，您看完再定。'],
  [undefined, '家属陪父亲进了阅片室。你按工作流程交接记录，没有为把印片变漂亮就把患者叫回去重扫。'],
], waiting, zhou, 'sp_break_0', 1)
steps.sp_doctor_3.sprite = null
sequence('sp_break', [
  [undefined, '交班后，陆舟按约来找你吃饭。你坐进值班室，饭盒还没打开，先把刚才那句话学了一遍。\n临床复核由老周继续，家属不用陪你们做实验。'],
  ['luzhou', '我刚才急着纠正那句话，连人家为什么生气都没问。'],
  ['me', '你不是来接我吃饭的吗？差点先接了个投诉。'],
  ['luzhou', '嗯……先拿我的**数字模体**试试？不碰病人资料。也让我把刚才没说明白的，重新理一遍。'],
  ['me', '可以。别先告诉我哪张最好。'],
], room, lu, 'sp_trace_intro_0', 1, { giftPerson: 'luzhou' })
sequence('sp_trace_intro', [
  ['luzhou', '在图里点一个结构，再转方向。这张**正弦图**把每个方向的投影排成一列。'],
  ['me', '先弄明白收到的是什么，才知道后面怎么成图。'],
], room, lu, 'sp_lab_1', 1)
lab('sp_lab_1', 1, room, 1, '点一个结构，跟着角度变化，看它怎样写进正弦图。')
sequence('sp_after_1', [
  ['me', '一块结构，对应的不是正弦图上孤零零一个点。'],
  ['luzhou', '对，它在不同方向都留下影子。现在把这些影子沿原方向铺回去。'],
], room, lu, 'sp_lab_2', 1)
lab('sp_lab_2', 2, room, 1, '逐渐增加投回来的方向，看位置和模糊怎样同时出现。')
sequence('sp_after_2', [
  ['me', '形状回来了，但像隔了层雾。这还没开始调低信号呢。'],
  ['luzhou', '所以糊和颗粒，不能一句“机器不好”全包了。先把这两版留着。'],
  [undefined, '小何来取饭盒，见你的饭还盖着，抬了一下眉。陆舟先合上半边电脑。'],
], room, lu, 'sp_hub', 2)
node('sp_hub', { part: 2, bg: room, sprite: null, kind: 'hub', text: '没有患者在等你们这组实验。把饭吃了，想聊两句也来得及。', choices: [
  choice('he', '和小何说说刚才的事', 'sp_chat_he_0', { unless: 'sp_chat_he' }),
  choice('lu', '问陆舟是不是也常被一句话问住', 'sp_chat_lu_0', { unless: 'sp_chat_lu' }),
  choice('filter', '继续：同样的投影，换个滤波方式', 'sp_filter_intro_0'),
] })
sequence('sp_chat_he', [
  ['he', '我有时候解释半天，人家就问：“所以我爸今晚能睡着吗？”'],
  ['me', '那你怎么答？'],
  ['he', '先听他到底怕什么。能回答的回答，拿不准的就找人一起看。'],
  ['me', '我刚才脑子里装了一排算法，嘴上一个也没说利索。'],
  ['he', '先吃饭吧。你饿得连筷子都没掰开。'],
], room, he, 'sp_hub', 2, { giftPerson: 'he', complete: 'sp_chat_he' })
sequence('sp_chat_lu', [
  ['luzhou', '会。导师问“为什么挑这张”，我有一回差点说，因为它好看。'],
  ['me', '你说了吗？'],
  ['luzhou', '没。但沉默了太久，他自己猜到了。'],
  ['me', '那咱今天至少别只留好看的。'],
], room, lu, 'sp_hub', 2, { giftPerson: 'luzhou', complete: 'sp_chat_lu' })
sequence('sp_filter_intro', [
  ['luzhou', '现在先滤投影，再反投影。几种滤波器都给你，先比两种。'],
  ['me', '我盯那个很淡的小结构。不光看底子干不干净。'],
], room, lu, 'sp_lab_3', 2)
lab('sp_lab_3', 3, room, 2, '固定同一结构，比较不同滤波后的边缘与淡小细节。')
sequence('sp_after_3', [
  ['me', '柔一点看着平顺，但淡的那块也更难分了。'],
  ['luzhou', '接着降低模拟光子计数。物体和方向不动，先看正弦图。'],
  ['me', '看看颗粒从哪一步开始跟进来。'],
], room, lu, 'sp_lab_4', 2)
lab('sp_lab_4', 4, room, 2, '把信号调低，比较投影的波动与成片中能留下的细节。')
sequence('sp_after_4', [
  ['me', '有颗粒不等于什么都看不了，没颗粒也不保证细节在。这话刚才光背出来，其实也没底。'],
  ['luzhou', '这只是模体。患者的检查能不能回答问题，还得医师看完整资料。'],
  ['me', '嗯，不能拿这组小圆点给大爷下结论。'],
], room, lu, 'sp_choice', 3)
node('sp_choice', { part: 3, bg: room, sprite: lu, speaker: 'luzhou', text: '还剩一种改图的办法。先猜，再拿预测投影和测到的比。', choices: [
  choice('watch', '“这回我盯它每一轮改了哪里。”', 'sp_iterate_intro_0', { decision: { key: 'sp_watch', value: 'detail' } }),
  choice('compare', '“我想留着前一轮，别改完就找不回了。”', 'sp_iterate_intro_0', { decision: { key: 'sp_watch', value: 'compare' } }),
] })
sequence('sp_iterate_intro', [
  ['luzhou', '可以前后切。每改一轮，都再算一次它会留下什么影子。'],
  ['me', '要是越来越像带噪声的投影呢？'],
  ['luzhou', '所以别只看差异变小。你刚才盯的结构，也得一起看。'],
], room, lu, 'sp_lab_5', 3)
lab('sp_lab_5', 5, room, 3, '逐轮核对预测投影与图像，保留你觉得值得继续比较的版本。')
sequence('sp_after_5', [
  [undefined, '你们关掉实验界面，去归还借来的杯子。老周恰好送那对父子到候诊区，临床复核已完成。'],
  ['zhou', '完整图像和既往的核过了，报告也向他们解释过。后面按接诊医师交代的安排走。'],
  ['me', '他们最担心的地方，您也一起看了？'],
  ['zhou', '嗯。你核对的重建记录我也看了。'],
], waiting, zhou, 'sp_apologies_0', 3)
sequence('sp_apologies', [
  ['luzhou', '刚才我插嘴了，对不起。您还没说完，我就急着纠正。'],
  [undefined, '家属摆摆手，声音低下来：“我那句糊弄人也说重了。主要怕跟上回一样，问一圈还不明白。”'],
  ['me', '这次医生把完整图像看过，也解释清楚了。还有没问明白的，趁现在一起问。'],
], waiting, lu, 'sp_family_0', 3)
steps.sp_apologies_1.sprite = null
sequence('sp_family', [
  ['大爷', '我儿子一着急，说话就冲。刚才让你们费心了。'],
  ['me', '他是担心您。问题问清楚，回去也踏实些。'],
  [undefined, '家属在旁边小声说：“刚才我只盯着那堆点了。”\n你没有把刚做完的五组实验重讲一遍，只把报告领取和后续安排指给他。'],
  ['大爷', '走吧。你也吃饭去，别等会儿又凉了。'],
], waiting, elder, 'sp_close_0', 3)
sequence('sp_close', [
  [undefined, '回到门口，陆舟已经背好电脑。你的饭盒收在袋里，几版不一样的结果留在记录里。'],
  ['luzhou', '还去那家？'],
  ['me', '去。这次不带电脑上桌。'],
], corridor, lu, 'sp_end', 3)
node('sp_end', { part: 3, bg: restaurant, sprite: null, text: '医生完成了复核，你也给自己的疑问留了几份对照。下班，吃饭。', settle: true, storyEnd: true })

export const LDCT_SHORT_STEPS = steps
export const LDCT_STORY_LAB_RETURNS: Record<LdctStoryId, Record<LdctLabRound, string>> = {
  face: { 1: 'sf_after_1_0', 2: 'sf_after_2_0', 3: 'sf_after_3_0', 4: 'sf_after_4_0', 5: 'sf_after_5_0' },
  dinner: { 1: 'sd_after_1_0', 2: 'sd_after_2_0', 3: 'sd_after_3_0', 4: 'sd_after_4_0', 5: 'sd_after_5_0' },
  patient: { 1: 'sp_after_1_0', 2: 'sp_after_2_0', 3: 'sp_after_3_0', 4: 'sp_after_4_0', 5: 'sp_after_5_0' },
}

/** Only actual choices/explorations produce callbacks; resolve without mutating saved records. */
export function resolveLdctShortNode(value: LdctNode, progress: LdctProgress): LdctNode {
  const { decisions: d, completed } = progress
  let text = value.text
  switch (value.id) {
    case 'sf_after_3_3':
      text = d.sf_nerves === 'door'
        ? '没有。你刚才出门那会儿，我只顾着给电脑插电。原物、方向都没动，只降低模拟的光子计数。'
        : '没有。你一直坐旁边呢。原物、方向都没动，只降低模拟的光子计数。'
      break
    case 'sf_hall_reveal_0':
      text = completed.includes('sf_checked_hall')
        ? '插线板还我吧。我把线绕起来，这回保证不一路敲过来。'
        : '我来拿回我的插线板。刚才是插头撞扶手，不是什么机器自己开了。'
      break
    case 'sf_close_0':
      text = d.sf_save === 'joke'
        ? '你把记录起名“门开着是为了散热”。陆舟笑了一下，把参数和那块看不准的地方也存好，没有只留较好看的版本。'
        : '你把清楚的和拿不准的版本并排存好。那块看不准的地方也留在里面，没有被较好看的版本盖掉。'
      break
    case 'sd_trace_intro_0':
      text = d.sd_bet === 'food'
        ? '成交，菜来了就停。先给你影子，原物盖住。右边这张是正弦图，每列对应一个方向。'
        : '不赖。先给你影子，原物盖住。右边这张是正弦图，每列对应一个方向。'
      break
    case 'sd_reveal_reply_0':
      text = d.sd_final === 'part'
        ? d.sd_guess === 'coin' || d.sd_guess === 'ring'
          ? '刚才还猜别的，最后让你改对了。行，我请，改口也算数。'
          : '猜中了，我请。不装了，我的手机就在这儿。'
        : d.sd_final === 'open'
          ? '行，各付各的。你去取袋子，我把剩的菜装好。'
          : d.sd_final === 'coin'
            ? '硬币差一点，多了个孔还有几条边。这顿你请，我去拿袋子。'
            : '不是戒指，我可不敢拿这个求婚。这顿你请，我负责把菜打包好。'
      break
    case 'sd_reveal_reply_1':
      text = d.sd_final === 'part'
        ? '陆舟把手机递向收银台，没赖账。你接过打包袋，顺手把桌上的碗摞在一起。'
        : d.sd_final === 'open'
          ? '你们各付了自己的那份。你去柜台取袋子，回来时陆舟已经把螺母和菜分开，生怕装错。'
          : '你付了这顿饭钱。陆舟主动去拿打包袋，又认真问你下次什么时候有空，像是怕再也约不动了。'
      break
    case 'sp_family_2':
      text = d.sp_reply === 'listen'
        ? '家属在旁边小声说：“谢谢您刚才肯先听我说。”\n你没有把刚做完的五组实验重讲一遍，只把报告领取和后续安排指给他。'
        : d.sp_reply === 'hard'
          ? '临走前，家属还是有点拘谨。你把后续安排指给他，他点头收好；这回没人再抢着说下一句。'
          : '家属把片袋收好，向你和陆舟都点了点头。你没有把刚做完的五组实验重讲一遍，只把报告领取和后续安排指给他。'
      break
    case 'sp_apologies_2':
      text = d.sp_reply === 'hard'
        ? '我刚才说“这样吵也解决不了”，也顶人了，对不起。还有没问明白的，我们趁医生在一起问。'
        : '这次医生把完整图像看过，也解释清楚了。还有没问明白的，趁现在一起问。'
      break
    case 'sp_iterate_intro_0':
      text = d.sp_watch === 'compare'
        ? '前后都留着，随时能切回去。每改一轮，都再算一次它会留下什么影子。'
        : '那就一轮一轮看。每次改完，都再算一次它会留下什么影子。'
      break
  }
  return text === value.text ? value : { ...value, text }
}
