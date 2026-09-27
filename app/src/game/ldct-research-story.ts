import type { LdctChoice, LdctNode, LdctPerson, LdctProgress } from './ldct-types'

/** Parts 2–4 stay separate from the approved projection opening and its node IDs. */
const room = 'bg_breakroom', day = 'ch2_bg_breakroom_day', office = 'bg_office'
const restaurant = 'ldct_bg_restaurant'
const lu = '@luzhou', lei = 'ch2_pixel_char_lei', he = 'ch2_pixel_char_he'
const director = 'ch2_pixel_char_director'
const steps: Record<string, LdctNode> = {}
type Line = [speaker: string | undefined, text: string]
type ResearchPart = 2 | 3 | 4

export function getLdctResearchPart(nodeId: string): ResearchPart {
  return nodeId.startsWith('r4_') ? 4 : nodeId.startsWith('r3_') ? 3 : 2
}

function sequence(prefix: string, lines: Line[], bg: string, sprite: string | null, next: string,
  options: { giftPerson?: LdctPerson; complete?: string } = {}) {
  lines.forEach(([speaker, text], i) => {
    const id = `${prefix}_${i}`
    steps[id] = { id, part: getLdctResearchPart(id), bg, sprite, speaker, text,
      next: i + 1 < lines.length ? `${prefix}_${i + 1}` : next,
      giftPerson: options.giftPerson, complete: i === lines.length - 1 ? options.complete : undefined }
  })
}
function choice(id: string, text: string, next: string, extra: Partial<LdctChoice> = {}): LdctChoice {
  return { id, text, next, ...extra }
}
function node(id: string, data: Omit<LdctNode, 'id' | 'part'>) {
  steps[id] = { id, part: getLdctResearchPart(id), ...data }
}

// PART TWO — The project becomes a calendar, a list of people, and an actual scope.
node('r2_start', { bg: day, sprite: null,
  text: '第二段 · 顺手帮个忙\n两周后，十二月。微波炉“叮”了第三次，你才想起来，里面一直是自己的饭。', next: 'r2_arrival_0' })
sequence('r2_arrival', [
  ['me', '昨晚陆舟说“最后跑一组”。我回了个“好”，早上才发现发成了“号”。'],
  [undefined, '午休时，陆舟按约登了记，提着一袋橘子进来。电脑包的拉链差点夹住果皮。'],
  ['luzhou', '你先吃。我把后面要做的事列好了……比预想的多两页。'],
  ['me', '你先别翻。咱俩上回说的是“试一点”。'],
], day, null, 'r2_chief_0')
steps.r2_arrival_1.sprite = lu
steps.r2_arrival_2.sprite = lu
steps.r2_arrival_3.sprite = lu
sequence('r2_chief', [
  [undefined, '这次涉及借用研究时段，也可能要用院里的既往资料。你拿着方案去找主任。陆舟在外面等。'],
  ['director', '前阵子那个模体？这回具体要用什么，先摊开。'],
  ['me', '先把模拟那部分做完。真要用既往资料，我们另列范围、谁能看、在哪儿看。'],
  ['director', '排班我能协调的尽量协调。研究手续和资料权限按项目办，别拿我一句“可以试试”去领片子。'],
], office, director, 'r2_scope_q')
node('r2_scope_q', { bg: office, sprite: director, speaker: 'me', text: '方案最后一页还留着空白。', choices: [
  choice('apply', '把院内回顾性研究范围写清，申请所需审查与授权', 'r2_scope_authorized_0', { decision: { key: 'research_scope', value: 'authorized' } }),
  choice('defer', '这一轮先限定数字模体，临床资料暂不申请', 'r2_scope_defer_0', { decision: { key: 'research_scope', value: 'defer' } }),
] })
sequence('r2_scope_authorized', [
  [undefined, '申请没有当天办完。等到新年排班出来，限定范围的回顾性项目才完成所需伦理审查与机构授权，知情同意或豁免要求也按批准方案落实。'],
  [undefined, '研究资料由院内授权人员按范围整理成编码材料，留在批准环境里；已有临床检查不因研究重做。眼前电脑上的算法实验仍用数字模体。'],
  ['me', '这几页终于不夹着“待补”了。我连橘子都吃完两袋了。'],
], day, null, 'r2_before_hub_0')
sequence('r2_scope_defer', [
  ['director', '那就先别把资料那栏写成“已有”。模拟能回答的先回答。'],
  [undefined, '新年排班出来时，你们仍只用数字模体。回顾性临床验证留在“未开展”一栏，没有从科室顺手拿几例充数。'],
  ['me', '少领一摊活，终于有空把饭吃热。虽然只是终于。'],
], office, director, 'r2_before_hub_0')
steps.r2_scope_defer_1.sprite = null
steps.r2_scope_defer_2.sprite = null
sequence('r2_before_hub', [
  [undefined, '一天交班后，小雷来还插线板，小何顺路取饭盒。陆舟把计划打印了一份，四个人第一次围在同一张桌边。'],
  ['luzhou', '别急着建群。咱们先看看，谁真的有空。'],
], room, lu, 'r2_hub')
node('r2_hub', { bg: room, sprite: null, kind: 'hub', text: '饭盒盖还没收。聊完再排事情，不用抢着认领。', choices: [
  choice('lei', '小雷把椅子拖了过来', 'r2_lei_0', { unless: 'r2_lei_chat' }),
  choice('he', '问问小何愿意帮哪一段', 'r2_he_0', { unless: 'r2_he_chat' }),
  choice('work', '摊开日历，把工作和空当排一排', 'r2_roster_intro_0'),
] })
sequence('r2_lei', [
  ['lei', '说正事啊。你们以后真写文章，能不能也算我一个？'],
  ['me', '你打算帮哪块？'],
  ['lei', '版本、参数、复跑的记录。我能接。省得你俩每次都说“我那台电脑上挺好的”。'],
], room, lei, 'r2_credit_q', { giftPerson: 'lei' })
node('r2_credit_q', { bg: room, sprite: lei, speaker: 'me', text: '小雷已经把空白记录表翻了出来。', giftPerson: 'lei', choices: [
  choice('contribution', '“先把这块一起做起来，署名按实际贡献再确认。”', 'r2_credit_work_0', { decision: { key: 'credit', value: 'contribution' }, complete: 'r2_lei_chat' }),
  choice('promise', '“行，先写上你，具体做什么回头再说。”', 'r2_credit_promise_0', { decision: { key: 'credit', value: 'promise' }, complete: 'r2_lei_chat' }),
] })
sequence('r2_credit_work', [
  ['lei', '行。等我真干完了，别把我写成“感谢提供插线板”。'],
  ['me', '插线板单列。它确实挺重要。'],
], room, lei, 'r2_hub', { giftPerson: 'lei' })
sequence('r2_credit_promise', [
  ['lei', '先别填这么快。我现在连你们哪版能跑都不知道。表我拿回去，今晚先看。'],
  [undefined, '你在名字旁留了个问号。口头答应容易，后面的活还没消失。'],
], room, lei, 'r2_hub', { giftPerson: 'lei' })
sequence('r2_he', [
  ['he', '我能帮你们想想怎么比，也能抽空看几组。别拿我的午饭时间当整块空班啊。'],
  ['me', '看之前要不要先跟你介绍哪个是新方法？'],
  ['he', '先别。我知道是你们做的，张嘴就容易客气。名字遮了，拿不准的也让我记。'],
], room, he, 'r2_hub', { giftPerson: 'he', complete: 'r2_he_chat' })
sequence('r2_roster_intro', [
  ['luzhou', '我把周三夜里也填上了。你那天……'],
  ['me', '值班。那格不是空白，是你打印太淡了。'],
  ['luzhou', '好，先擦掉。咱们把临床班、休息和能接的活排清楚，再决定这周做多少。'],
], room, lu, 'r2_roster')
node('r2_roster', { bg: room, sprite: null, text: '', enterResearch: 'roster' })
sequence('r2_after_roster', [
  [undefined, '日历不再密密麻麻。你把已经约定的工作分给对应的人，没法塞进这周的留到后面。'],
  ['me', '删掉几个“今晚顺便”，居然比加进度轻松。'],
  ['luzhou', '我把回学校的车也订早一班。省得又拿“来都来了”拖着你。'],
], room, lu, 'r2_share_q')
node('r2_share_q', { bg: room, sprite: lu, speaker: 'luzhou', text: '“我明天要跟导师谈。你手上那份，能先发到群里吗？”', choices: [
  choice('local', '约院内共同查看，只把获准对外的进度说明带走', 'r2_share_local_0', { requires: 'decision:research_scope:authorized', decision: { key: 'sharing', value: 'local' } }),
  choice('attempt', '赶时间，先试着把研究附件发进普通聊天群', 'r2_share_attempt_0', { requires: 'decision:research_scope:authorized', decision: { key: 'sharing', value: 'attempt' } }),
  choice('phantom', '把自制模体记录发给他；“别把临床验证写成已经做了。”', 'r2_share_phantom_0', { requires: 'decision:research_scope:defer', decision: { key: 'sharing', value: 'local' } }),
] })
sequence('r2_share_local', [
  ['luzhou', '行。我刚才说顺嘴了，这份不是我俩自己的模体。明天先讲模拟结果。'],
  [undefined, '你们改约了院内查看的时间。陆舟带走的是允许带走的进度说明，不是那份研究资料。'],
], room, lu, 'r2_close_0')
sequence('r2_share_attempt', [
  [undefined, '附件没有发出去。授权环境提示：当前目的地不在共享范围内。你停下操作，联系管理员核对；这次尝试留下了记录。'],
  ['luzhou', '别再试了。我等一等。你明天还得解释这个，怪我刚才催。'],
  ['me', '我自己点的。先把为什么退回记上，研究资料继续留在院内。'],
], room, lu, 'r2_close_0')
sequence('r2_share_phantom', [
  ['luzhou', '收到。写“数字模体”，不往后面偷偷加“临床验证”。'],
  ['me', '我可不想下次一开会，才知道自己做过一项没做过的研究。'],
], room, lu, 'r2_close_0')
sequence('r2_close', [
  [undefined, '你把没吃完的橘子分了几颗，收起那张日历。工作还在，但今晚不再临时加一格。'],
], room, null, 'r2_end')
node('r2_end', { bg: room, sprite: null, text: '第二段 · 顺手帮个忙', settle: true })

// PART THREE — A useful learned method meets a case that the showcase did not include.
node('r3_start', { bg: day, sprite: null, text: '第三段 · 最干净的那张\n又过了一周。陆舟提前十分钟到了。这回电脑没开，先问你饭热了没。', next: 'r3_arrival_0' })
sequence('r3_arrival', [
  ['luzhou', '训练终于跑通了。有几张你肯定想看。'],
  ['me', '你这个表情，跟本科把作业跑通的时候一模一样。'],
  ['luzhou', '先声明，这版是**FBP之后的学习型去噪**，不是从投影直接重建。别替我把名字吹大。'],
  ['me', '那你也别先挑最好看的给我。小何说，把方法名字挡上。'],
], day, lu, 'r3_hub', { giftPerson: 'luzhou' })
node('r3_hub', { bg: day, sprite: null, kind: 'hub', text: '饭还热着。你们等约好的同事过来，把演示先停在封面。', choices: [
  choice('lei', '小雷拖着椅子过来，问起这周进展', 'r3_lei_0', { unless: 'r3_lei_chat' }),
  choice('frontier', '看看陆舟手机上那台新设备', 'r3_frontier_0', { unless: 'r3_frontier_chat' }),
  choice('compare', '收好饭盒，把几组结果遮名摆开', 'r3_blind_intro_0'),
] })
sequence('r3_lei', [
  ['lei', '我照记录重跑了一回。你们有一版文件名只差一个空格，我差点以为电脑又耍我。'],
  ['me', '最后对上了吗？'],
  ['lei', '对上了，参数和编号都在。这一块我接着管。名单的事，也按咱们实际干的来吧。'],
], day, lei, 'r3_hub', { giftPerson: 'lei', complete: 'r3_lei_chat' })
sequence('r3_frontier', [
  ['me', '这宣传图还挺漂亮。**能谱、光子计数**……咱们这个算法装上，也能变成那种机器？'],
  ['luzhou', '不能。光子计数得靠那类探测器，能按能量留信息。光换我们这个去噪程序，硬件不会跟着换。'],
  ['me', '不同能量的信息，能拿来分分材料？'],
  ['luzhou', '嗯，能做的事更多，但还得看具体实现。咱们这台先老实做好眼前的比较。新机器的价格，我还没敢往下滑。'],
], day, lu, 'r3_hub', { giftPerson: 'luzhou', complete: 'r3_frontier_chat' })
sequence('r3_blind_intro', [
  [undefined, '小何按约进来，先看了一眼钟。你把图的编号核对好，临床工作已经交接，这一小段时间只做约好的研究比较。'],
  ['he', '先看，再揭名字。有些地方看不准，别替我自动填成“没有”。'],
  ['luzhou', '这几组是**没参与训练的数字模体**。我们知道里面原来有什么，先不把设计图打开。'],
], day, he, 'r3_blind')
steps.r3_blind_intro_2.sprite = lu
node('r3_blind', { bg: day, sprite: null, text: '', enterResearch: 'blind' })
sequence('r3_after_blind', [
  [undefined, '你把刚才几组的记录并排摆开。陆舟先盯着图，又把训练记录往前翻了几页。'],
  ['luzhou', '对着设计图看，最淡那块有一层确实浅了，别的位置倒不都这样。我之前老拿那组大圆做演示。'],
  ['me', '不是说它全都不行。可你给我看的第一页，根本看不出后面还有这种情况。'],
  ['luzhou', '……明天要讲进度。我本来想把这组换掉，先放那张干净的。'],
], day, lu, 'r3_example_q')
node('r3_example_q', { bg: day, sprite: lu, speaker: 'me', text: '鼠标停在“移出展示”的菜单上。', choices: [
  choice('all', '“好看的也留，但这组得跟它放在一起。”', 'r3_keep_0', { decision: { key: 'research_example', value: 'all' } }),
  choice('pretty', '“明天先讲顺利的，这组暂时不放上去。”', 'r3_pretty_0', { decision: { key: 'research_example', value: 'pretty' } }),
] })
sequence('r3_keep', [
  ['luzhou', '都放上去，标题就不能还写“细节完整保留”了。'],
  ['me', '那就改。先写哪组保住了、哪组变淡了，别一句话包圆。'],
  ['luzhou', '行，别用“效果不佳”四个字糊过去。具体在哪种情况下，咱们一起写。'],
], day, lu, 'r3_interruption_0')
sequence('r3_pretty', [
  ['luzhou', '原始记录先别删。我把它移到未展示列表，明天可能还是会问到。'],
  [undefined, '主页面清爽了。你看见旁边还有一个未展示编号，鼠标移开后，它并没有跟着消失。'],
], day, lu, 'r3_interruption_0')
sequence('r3_interruption', [
  [undefined, '小何起身去接交班电话。她回来拿饭盒时，屏幕上已经换过了几张图。'],
  ['he', '我今天能说的是，模拟里哪些细节不稳。别把我看过几张图，写成临床已经能用了啊。'],
  ['me', '记着。今天不再开新一组了，等你下次有空。'],
], day, he, 'r3_rest_q', { giftPerson: 'he' })
node('r3_rest_q', { bg: day, sprite: lu, speaker: 'luzhou', text: '“要不今晚我再跑一宿，把那组补一补？”', choices: [
  choice('rest', '“先睡。明天按记录重来，别改到自己都记不清。”', 'r3_rest_0', { decision: { key: 'research_pace', value: 'rest' } }),
  choice('push', '“你要跑就跑，但别催我半夜回消息。”', 'r3_push_0', { decision: { key: 'research_pace', value: 'push' } }),
] })
sequence('r3_rest', [
  ['luzhou', '行。你不盯着，我可能真会从“再一组”跑到天亮。'],
  [undefined, '你们约好第二天下午再核对，不在凌晨互发半截截图。'],
], day, lu, 'r3_end')
sequence('r3_push', [
  ['luzhou', '好，我把新尝试另存，不盖掉今天的。你先别等。'],
  [undefined, '夜里手机亮过两次，你没回。第二天陆舟只发来一句：“参数有一处没记完整，先别用昨晚那版。”'],
], room, null, 'r3_end')
steps.r3_push_0.bg = day
steps.r3_push_0.sprite = lu
node('r3_end', { bg: day, sprite: null, text: '第三段 · 最干净的那张', settle: true })

// PART FOUR — The player decides what the evidence can actually support.
node('r4_start', { bg: day, sprite: null, text: '第四段 · 这版还投吗\n一周后，院内研究交流前。陆舟带来新的汇报稿，第一页被改得只剩一行。', next: 'r4_arrival_0' })
sequence('r4_arrival', [
  ['me', '你那“显著提升”呢？'],
  ['luzhou', '还没决定往哪儿放。先别笑，我也知道它不能满页乱跑。'],
  [undefined, '交流还有一会儿。小雷、小何各自留了一点核对时间，主任也叫你等会儿把排班表带过去。'],
], day, lu, 'r4_hub')
node('r4_hub', { bg: day, sprite: null, kind: 'hub', text: '这回先核对要说的话，再打开演示。', choices: [
  choice('he', '跟小何核对上回留下的观察记录', 'r4_he_0', { unless: 'r4_he_chat' }),
  choice('director', '带排班表去主任办公室', 'r4_chief_0', { unless: 'r4_chief_chat' }),
  choice('report', '把证据、范围和结论摆到一起', 'r4_report_intro_0'),
] })
sequence('r4_he', [
  ['he', '这一处我写的“不确定”，你没改掉吧？'],
  ['me', '留着呢。旁边还写着，要对照已知结构。'],
  ['he', '那就好。我回头愿意继续帮，但时间得提前约。别一到要交东西，就问“十分钟行不行”。'],
], day, he, 'r4_hub', { giftPerson: 'he', complete: 'r4_he_chat' })
sequence('r4_chief', [
  ['director', '这段时间，夜里还熬吗？'],
  ['me', '比刚开始少了。排不下的就没硬塞。'],
  ['director', '这版先讲清楚做过什么。真要继续，安排和责任一起谈，别等你们都累趴了才来调班。'],
], office, director, 'r4_hub', { complete: 'r4_chief_chat' })
sequence('r4_report_intro', [
  ['luzhou', '咱们今天交的到底是哪一版？我不想再替你猜了。'],
  ['me', '把做过的、没做过的，还有不稳的地方放一块儿。我来排，你盯着，别让我漏。'],
], day, lu, 'r4_report')
node('r4_report', { bg: day, sprite: null, text: '', enterResearch: 'report' })
sequence('r4_after_report', [
  [undefined, '你们把这一版固定下来，连同对照和参数一起留档。交流开始后，第一位提问的人翻到了样例编号那页。'],
  ['luzhou', '就按刚才一起定的说。要改，也别等散场后悄悄换文件。'],
], office, lu, 'r4_ending_question')
node('r4_ending_question', { bg: office, sprite: lu, speaker: 'me', text: '对方问：“这些结果，能支持你们现在写的范围吗？”', choices: [
  choice('limited', '说明已观察到的取舍和适用范围，不把模拟结论扩成临床承诺', 'r4_limited_0', { requires: 'decision:report:limited', decision: { key: 'ending', value: 'limited' } }),
  choice('delay', '撤下本轮正式结论，把缺失验证列为下一步工作', 'r4_delay_0', { requires: 'decision:report:delay', decision: { key: 'ending', value: 'delay' } }),
  choice('rework', '承认证据撑不起结论，撤回这版汇报，核对完整记录后重做', 'r4_rework_0', { requires: 'decision:report:cherry', decision: { key: 'ending', value: 'rework' } }),
  choice('paused', '仍坚持这些漂亮样例足够代表总体，不收窄结论', 'r4_paused_0', { requires: 'decision:report:cherry', decision: { key: 'ending', value: 'paused' } }),
] })
sequence('r4_limited', [
  [undefined, '你把顺利和不顺利的例子放在一起，说明模拟与临床验证的边界。交流记录接收了这份阶段报告，没有把它当作算法获准临床使用。'],
  ['luzhou', '标题短了，问题倒不少。'],
  ['me', '至少下次打开，不用先猜上次把哪张藏起来了。'],
  [undefined, '会后，你们确认每个人做过的工作，修改名单和后续分工。合作继续，但不再拿同事的“看过一眼”充作者贡献。'],
], office, lu, 'r4_supper_0')
sequence('r4_delay', [
  [undefined, '你们没有按原计划提交效果结论，只交了进展和缺口。少了一次赶截止日期的机会，也不用拿还没完成的验证来填那张表。'],
  ['luzhou', '我得回去跟导师解释延期。烦，是真的烦。'],
  ['me', '你把我也拉上。安排是一起定的，别变成你一个人扛。'],
  [undefined, '两人把下一轮缩到能做完的范围，重新约了同事的时间。那张日历上，周末终于留出半天空白。'],
], office, lu, 'r4_supper_0')
sequence('r4_rework', [
  [undefined, '编号对不上。你当场承认有一组不理想的结果被移出了展示，撤回当前结论。对方要求补齐记录后再谈；这轮提交停了。'],
  ['luzhou', '刚才那句，我也该先说的。'],
  ['me', '先补齐吧。回头还得跟小雷、小何说明，不能让他们从别处听见。'],
  [undefined, '原始记录还在，返工有路可走。重新核对占掉了原本准备休息的一个下午；这次你们把原因写在版本说明里，没有用“排版调整”带过。'],
], office, lu, 'r4_supper_0')
sequence('r4_paused', [
  [undefined, '提问没有停在这一张图。复核要求查看完整样例和编号，你们的概括无法成立。这版报告未通过，相关研究使用与共享按项目要求暂停核查。'],
  ['luzhou', '你刚才说“其他都差不多”，我……没接上。'],
  ['me', '现在接上也晚了。先把完整记录交清楚，别再用一张好图解释。'],
  [undefined, '没有患者因此换扫描方案，临床工作照常。代价落在你们自己：重排进度、解释遗漏、暂停原定投稿；同事也暂时不愿再口头认领新的工作。'],
], office, lu, 'r4_supper_0')
sequence('r4_supper', [
  [undefined, '当天晚上，还是医院后门的小饭馆。陆舟把电脑留在包里，这回没有放到桌上。'],
  ['luzhou', '饭来了。今天能不能不边吃边看图？'],
  ['me', '能。充电器先拿走，省得你又找个理由回来。'],
  [undefined, '你把这几周的记录归进同一个目录。问题有了具体的样子，该停的停、该补的列清了。今晚的消息，没有再用“就五分钟”开头。'],
], restaurant, lu, 'r4_end')
node('r4_end', { bg: restaurant, sprite: null, text: '低剂量CT：噪声之外 · 完', settle: true, finale: true })

export const LDCT_RESEARCH_STEPS: Readonly<Record<string, LdctNode>> = steps
export const LDCT_RESEARCH_MEDIA_IDS = [
  room, day, office, restaurant, 'ch2_pixel_char_luzhou_m', 'ch2_pixel_char_luzhou_f', lei, he, director,
] as const

/** Only experiences actually present in the save can become a callback. */
export function getLdctResearchText(nodeId: string, p: LdctProgress): string | undefined {
  const assignments = p.researchRecords?.roster?.assignments
  const observations = p.researchRecords?.blind?.observations
  const report = p.researchRecords?.report
  const allIncluded = report?.included.length === 3
  if (nodeId === 'r2_chief_1') {
    return p.decisions.chief === 'told'
      ? '上回说的模体，我记着呢。这回需要占哪段时间、用什么资料，摊开说。'
      : '怎么现在才说？——先别解释空话，把已经做过的、接下来想做的分开列。之前只是模体，我知道；以后涉及院里的时间和资料，得提前谈。'
  }
  if (nodeId === 'r3_arrival_3' && !p.completed.includes('r2_he_chat')) {
    return '那你也别先挑最好看的给我。先把方法名字挡上，咱们看完再揭。'
  }
  if (nodeId === 'r3_lei_0') {
    if (assignments?.code === 'lei') return '分给我的复算跑了一回。有一版文件名只差一个空格，我差点以为电脑又耍我。'
    if (assignments?.versions === 'lei') return '分给我的记录核了一遍。有一版文件名只差一个空格，我先标出来了，别拿串了。'
    if (assignments?.reading === 'lei') return '我那份看片记录写好了。先不说偏哪一张，等你们自己看，省得我带偏。'
    return '这周没给我排具体任务，我就没乱动文件。你们现在卡在哪儿？'
  }
  if (nodeId === 'r3_lei_1') {
    return assignments && Object.values(assignments).includes('lei') ? '记录还留着吧？一会儿放一起核。' : '先一起看看。要加新活，咱们再约时间。'
  }
  if (nodeId === 'r3_lei_2') {
    const worked = assignments && Object.values(assignments).includes('lei')
    if (!worked) return p.decisions.credit === 'promise'
      ? '行。上回说先写我名字，这轮我还没做具体工作，先别往上填。能接什么，咱们重新商量。'
      : '行。没做的我不认领，也别因为我坐这儿聊了两句，就替我算一项贡献。'
    return p.decisions.credit === 'promise'
      ? '留着。上回先答应挂名字，我还是有点别扭。这回按我实际做的那项写，行吧？'
      : '留着呢。哪项是我做的就记哪项，没做的别替我揽。我可经不起突然被问代码。'
  }
  if (nodeId === 'r2_after_roster_0' && p.decisions.workload === 'overloaded') {
    return '表格装得下，事情却没变少。你看看自己名下那一长列，又看看下周的临床班。陆舟把打印纸拉近了一点。'
  }
  if (nodeId === 'r2_after_roster_1' && p.decisions.workload === 'overloaded') {
    return '我怎么又认了这么多。先说好，临床班和睡觉不能拿来补这个窟窿，做不完得往后排。'
  }
  if (nodeId === 'r2_after_roster_2' && p.decisions.workload === 'overloaded') {
    return '先把这版留着，看看实际要花多久。你忙不过来就告诉我，别一边说没事，一边半夜补。'
  }
  if (nodeId === 'r2_close_0' && p.decisions.roster_rest === 'no') {
    return '你收起排得很紧的日历，饭盒还是凉的。临走前陆舟指了指空着的休息栏：“这格也得算时间，下次咱俩重新排。”'
  }
  if (nodeId === 'r3_arrival_1' && p.decisions.workload === 'overloaded') {
    return '我上周那一列还没弄完呢。先看这一组，今天别顺手再给我加活。'
  }
  if (nodeId === 'r3_after_blind_2' && p.decisions.blind_note === 'uncertain') {
    return '我刚才确实拿不准，得对着设计图才敢说。可你要是只给我第一页，我连该回头找哪里都不知道。'
  }
  if (nodeId === 'r4_he_0') {
    return observations && Object.values(observations).includes('uncertain')
      ? '上回记的“不确定”还留着吧？别一整理，就全变成有把握了。'
      : '上回怎么看的，原话还留着吧？别看了设计图，又把当时的记录改了。'
  }
  if (nodeId === 'r4_he_1') {
    return '原话留着。揭开设计图后再看出来的，另记在后面，没覆盖。'
  }
  if (nodeId === 'r4_chief_1' && p.decisions.research_pace === 'push') {
    return '有一晚还是熬过头，参数没记完整，那版没用。现在临时加的活先撤掉了。'
  }
  if (nodeId === 'r4_chief_2' && p.decisions.sharing === 'attempt') {
    return '附件那次退回，已经跟管理员说明了吧？使用范围先核对完。你们真想继续，就把时间、权限和责任说清楚，别一着急又跳步。'
  }
  if (nodeId === 'r4_after_report_0' && report) {
    if (!allIncluded) return '你们把选入的样例和这版结论固定留档，没选入的仍在原始记录里，并没有自动补进汇报。交流开始，对方先问：还有哪些结果没在这一页上？'
    return p.decisions.research_example === 'pretty'
      ? '此前挪走的那组，这回被你重新选进了汇报。三组都有编号，旧的未展示记录也保留着。交流开始，对方先问这些例子能支持多大的结论。'
      : '三组结果和各自编号都放进了汇报，参数另页留档。交流开始，对方先核对研究范围，再问结论有没有超出这些例子。'
  }
  if (nodeId === 'r4_limited_0') {
    const boundary = p.decisions.research_scope === 'defer'
      ? '临床验证尚未开展'
      : '这一轮展示仍是数字模体，院内项目授权不等于临床性能已经验证'
    return allIncluded
      ? `你对照三组结果说明取舍，也明确${boundary}。交流记录收下这份限定范围的阶段报告，没有把它当作获准临床使用。`
      : `你说明这一页只选了部分样例，结论也只限于展示范围，未展示记录留待后续一起核对；${boundary}。这份进展被记下，但不能代表完整比较已经交代清楚。`
  }
  if (nodeId === 'r4_limited_2' && !allIncluded) {
    return '下回先核没放上去的几组。别把“这页没讲”拖成以后都不讲。'
  }
  if (nodeId === 'r4_rework_0') {
    return allIncluded
      ? '编号齐了，概括却超过了这些结果。你当场承认不能把有限模体的表现写成普遍保证，撤回当前结论。对方要求缩小表述、补上必要验证后再谈；这轮提交停了。'
      : '你当场承认这次只挑了部分样例，结论却往总体上写，撤回当前汇报。对方要求连同未展示记录一起核对，再谈能说到哪一步；这轮提交停了。'
  }
  if (nodeId === 'r4_paused_0' && p.decisions.research_scope === 'defer') {
    return '提问没有停在这一张图。完整编号和记录无法支持你们的概括，当前报告未通过，原定投稿暂停，先做内部复核。你们本来就没有临床资料授权，这次也不能拿“再找几例”去补。'
  }
  if (nodeId === 'r4_supper_1' && p.decisions.ending === 'paused') {
    return '刚才在会上，我也没拦住。今天先吃饭，名单和合作的事，改天把大家叫齐了再谈。'
  }
  if (nodeId === 'r4_supper_2' && p.decisions.ending === 'paused') {
    return '好。把没说清的事写下来。别再靠一句“差不多”过。'
  }
  return undefined
}

export const LDCT_RESEARCH_MANUAL = [
  { title: '这一版学习了什么', text: '本次学习型方案是在FBP结果上做去噪的研究演示，不是直接从投影重建的临床产品。学习型去噪、FBP与迭代示例的输入和处理步骤不同，记录里要写清。训练未见过的测试模体用于观察表现，不参与本轮调参训练；不以一张漂亮图证明总体性能。' },
  { title: '范围、权限与署名', text: '排班支持、机构数据授权、所需伦理审查以及知情同意或豁免要求分别落实，主任点头不代替这些环节。角色的真实研究资料仅在批准范围与环境中使用；玩家操作的图像仍是原创数字模体。署名按实际贡献、稿件参与和责任共同确认，不靠赠礼或口头许诺兑换。' },
  { title: '留下不顺眼的那组', text: '比较时记录方法、参数、输入范围和未展示的样例。模拟、回顾性评价和临床应用不是同一层证据；平滑不等于保留全部细节，失败样例也不证明一个方法处处失效。结局回应的是本轮如何处理证据和合作，不宣称所有延期、投稿或算法都有统一答案。' },
]
