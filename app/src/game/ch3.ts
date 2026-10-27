import type { GameState } from './types'
import type { TrilogyChapter, TrilogyStep } from './trilogy-types'
import { applyCh3Staging } from './ch3-staging'
import { installCh3PictureObservations } from './ch3-picture-observations'
import { installCh3Places } from './ch3-places'

/** Chapter-local graph. Clinical acquisition/reporting always belongs to Mei. */
const steps: Record<string, TrilogyStep> = {}
type Line = [speaker: string, text: string, detail?: Partial<TrilogyStep>]
const portraits: Record<string, string> = {
  mei: 'char_mei', cousin: 'pat_cousin', aunt: 'pat_aunt', xu: 'pat_mystery',
  han: 'char_han', wen: 'char_wen', lei: 'char_lei', zhou: 'char_zhou', he: 'ch2_pixel_char_he', tang: 'char_tang', wang: 'pat_wang_recovery', patient: 'pat_us_gallstone',
  fatty_patient: 'pat_c3_young_liver_v1',
}

function put(id: string, step: TrilogyStep) {
  if (steps[id]) throw new Error(`Duplicate chapter-three node: ${id}`)
  steps[id] = step
}

function scene(prefix: string, lines: Line[], next?: string, bg = 'bg_us_room_day') {
  lines.forEach(([speaker, text, detail = {}], index) => {
    const automatic = detail.end || detail.choices || detail.tool ? undefined :
      index + 1 < lines.length ? `${prefix}_${index + 1}` : next
    put(`${prefix}_${index}`, { speaker, text, bg, sprite: portraits[speaker], next: automatic, ...detail })
  })
  return `${prefix}_0`
}

function exploration(prefix: string, lines: Line[], hub: string, bg = 'bg_us_room_day') {
  const final = lines[lines.length - 1]
  const detail = final[2] ?? {}
  final[2] = { ...detail, effect: { ...detail.effect, flag: `${prefix}_done` } }
  return scene(prefix, lines, hub, bg)
}

function hub(id: string, text: string, places: [string, string][], clinical: string, bg = 'bg_us_room_day') {
  put(id, {
    speaker: 'sys', text, bg,
    choices: [
      ...places.map(([text, prefix]) => ({ text, next: `${prefix}_0`, cond: { ap: 1, notFlag: `${prefix}_done` }, effect: { ap: -1 } })),
      { text: '准备好了，去找梅姐', next: clinical },
    ],
  })
}

// A family phone call comes before the invitation and paid rotation. These
// pre-shift scenes only record what actually happened; they carry no wages/AP.
const cousinPhone: Partial<TrilogyStep> = { communication: 'call', sprite: '', phone: 'pat_cousin', voice: undefined }
const cousinSms: Partial<TrilogyStep> = { communication: 'sms', sprite: '', phone: 'pat_cousin', voice: undefined }
scene('c3_intro_call', [
  ['sys', '2026年10月30日傍晚，天还亮着。你刚从放射科出来，手机就响了。是表姐。她先问你下班没，又在那头翻起了纸。', cousinPhone],
  ['cousin', '帮姐姐个忙呗。下周该做**大排畸**了，二十四周。你们超声科有没有熟人？我一想到去医院就头大。', { ...cousinPhone, voice: 'vox_c3_cousin_v2', image: 'cg_c3_cousin_call_v3', imageLabel: '表姐从家里打来电话', closeup: true, cameraMotion: 'push' }],
  ['me', '包在我身上！单子发来，到时候我下楼接你。', cousinPhone],
  ['cousin', '哟，现在说话这么硬气了？行，我可指望你了。办好了，姐请你吃顿好的。', cousinPhone],
  ['me', '那我先想想吃什么。以前的检查单也拍来，别又只拍个右下角。', cousinPhone],
  ['sys', '电话一挂，你才想起来：超声科的梅姐是见过，可还没正经说上几句话。“包在我身上”已经说出去了。你存好表姐发来的单子，打算明早去碰碰运气。'],
], 'c3_intro_visit_0', 'bg_day')
scene('c3_intro_visit', [
  ['sys', '10月31日上午。你在超声科门口绕了两趟，想着等她不忙再开口。手机偏在这时亮了，表姐问：“怎么样啦？”梅姐送走一位患者，抬眼看见了你。', { bg: 'bg_waiting_day_v2' }],
  ['mei', '来啦？这边。你是放射科的吧？在门口转半天了，找我有事？', { voice: 'vox_c3_mei_v2' }],
  ['me', '梅姐，想请您帮个忙。我表姐下周做大排畸，我跟她说都安排好了，其实……还没来问您。', { image: 'cg_c3_us_visit_v3', imageLabel: '梅姐接过表姐的检查单', closeup: true, cameraMotion: 'settle' }],
  ['mei', '先答应了才来找我啊？单子给我看看。走咱们职工家属这边，我帮你安排。**下周三上午十点**带她来，到了直接找我。'],
  ['me', '太谢谢您了，我刚在门口还不敢进。……您这探头一动，图就跟着变，跟CT真不一样。'],
  ['mei', '想试试？下周**跨科跟班**还有个名额，来两周呗。先拿模体练，哪儿不会就问。'],
  ['me', '我来替表姐找您帮忙，怎么把自己也安排进来了。'],
  ['me', '来！不过我这点超声底子，您可别指望我一上手就会。', { next: 'c3_intro_accept' }],
], undefined)
put('c3_intro_accept', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '谁让你一上来就会了。跟你们主任说一声，班排开了周一过来，别两头找不到人。', effect: { flag: 'c3_rotation_invited' }, next: 'c3_intro_confirm_0' })
put('c3_intro_ask', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '不会才来学嘛。先跟着我看，有空就上教学台试，没人催你。班我去对，你记得跟主任说一声。', effect: { flag: 'c3_rotation_invited' }, next: 'c3_intro_confirm_0' })
scene('c3_intro_confirm', [
  ['sys', '走出科室，你立刻给表姐发消息：“安排好了，11月4日周三，上午十点。到了给我电话。”发完又补一句：“报告都带上，别只顾着带零食。”', { ...cousinSms, effect: { flag: 'c3_cousin_booking' } }],
  ['cousin', '我妈刚还说你在医院也不认识几个人。等会儿我就跟她显摆去。', cousinSms],
  ['me', '先别往家族群里嚷嚷。我周一也去那边跟班，周三你来了我接你。请饭的事可别忘了。', cousinSms],
  ['sys', '放射科和超声科随后对好了两周跟班表：四个白班，一个傍晚床旁班。你在日历上圈出11月2日，旁边写着：**早上八点，到超声科报到**。', { effect: { flag: 'c3_rotation_arranged' } }],
], 'c3_s1_start_0', 'bg_day')

// First paid shift: keep the original cursor and its check-in receipt valid.
scene('c3_s1_start', [
  ['sys', '2026年11月2日，早上八点。放射科的班已经交接好，你拿着两周培训表来到超声科。今天是正式跟班的第一天。'],
  ['mei', '来啦？这边，柜子给你留了一个。……别动，袖子夹门里了。', { voice: 'vox_c3_mei_v2' }],
  ['me', '难怪走不动。我还想着第一天来，不能显得太慌。'],
  ['mei', '第一天都这样。先坐我旁边看，等有空了，拿窗边那块模体练手。'],
  ['sys', '梅姐拿出培训表，让你签上到科时间。**教学台**在窗边，**临床机**在帘子里面；你刚把两处认清，窗口就送来了上午的预约单。'],
  ['mei', '八点半开诊，先转一圈。纸巾在右边第二格，省得待会儿全科帮你找。'],
], 'c3_s1_hub')
// Familiar colleagues still cross paths during a rotation, outside patient care.
steps.c3_s1_start_5.next = 'c3_tang_first_0'
scene('c3_tang_first', [
  ['sys', '你刚走到走廊，小唐抱着一叠申请单从电梯口过来，看见你，腾出一只手招了招。'],
  ['tang', '哎，你来啦。早上老周说把你借出去了，我还以为他开玩笑。', { voice: 'vox_ch2_natural_tang' }],
  ['me', '借两周。刚认完柜子，人还没认全。'],
  ['tang', '行，有事给我发消息。我常来送单子，找不到路也能问我。', { giftTo: 'tang' }],
  ['sys', '她把最上面一张单子夹正，去窗口交接。你往休息室那边走，隔着门已经闻到了茶味。'],
], 'c3_s1_hub', 'bg_waiting_day_v2')
hub('c3_s1_hub', '距开诊还有一会儿。你站在科室走廊，休息室飘来一点茶香。先去哪儿转转？', [
  ['看看教学台上的三支探头', 'c3_s1_probes'],
  ['去茶水间认杯子', 'c3_s1_tea'],
  ['到候诊区帮忙找预约号', 'c3_s1_wait'],
], 'c3_s1_aunt_5')
exploration('c3_s1_probes', [
  ['sys', '教学台上有三支探头。你拿起长条那支，看了看宽平的接触面，又把它放回软垫。'],
  ['mei', '这支**线阵**。旁边弧面的是**凸阵**，小的那支方便找肋间声窗。先说你要看浅还是深，再拿。'],
  ['me', '怪不得不是“大中小”。我先拿线阵看浅表模体，另外两支等您带着试。', { card: 'c3_probe' }],
], 'c3_s1_hub')
exploration('c3_s1_tea', [
  ['mei', '进来坐。要接水吗？这杯是我的，写着“梅”。那个写“梅”的也是我的，盖子坏了还没舍得扔。', { giftTo: 'mei' }],
  ['me', '我还以为超声科有两位梅姐。'],
  ['mei', '那个漏水。扔了吧，像还能用；留着吧，每天骗我一次。你先用自己的，别学我攒破杯子。'],
], 'c3_s1_hub', 'ch2_bg_breakroom_day')
exploration('c3_s1_wait', [
  ['sys', '候诊区一位阿姨把旧钼靶报告和今天的申请单夹在一起。她翻来翻去，只找到两年前的日期。'],
  ['me', '今天的号在后面这张。旧片也留着，医生要对照。'],
  ['aunt', '你给我夹在最上面吧。我闺女嫌我拿得多，我说少拿一张，到这儿又得回去找。'],
], 'c3_s1_hub', 'bg_waiting_day_v2')
scene('c3_s1_aunt', [
  ['sys', '开诊后，一位阿姨第一个进来。她先把旧片袋摊平，再把一袋买菜零钱塞回口袋。', { sprite: 'pat_aunt' }],
  ['aunt', '我按门诊医生说的来复查，钼靶报告也带着。你是这边新来的？'],
  ['mei', '放射科来的，今天第一天。您把两张单给我，衣服先放这把椅子上，省得袋子滑下去。'],
  ['aunt', '两年前那次早做完了。这回是新的预约，我怕又拿错单，干脆全带来。'],
  ['sys', '你替她归好衣物，梅姐核对资料、询问情况。真正开始检查时，你退到显示器旁边。'],
  ['mei', '开诊前先来教学台。看我这只手，探头贴住模体，别隔着胶悬着。你试一下，待会儿再看我给患者做。', { image: 'cg_c3_mei_probe_v2', imageLabel: '开诊前 · 梅姐示范探头接触与持握', closeup: true }],
  ['sys', '窗边的模体已经涂好耦合剂。你把三支探头放在手边，先找浅处那个小目标。', {
    tool: { kind: 'ultrasound', task: 'probe', title: '教学台 · 选择探头', prompt: '换一支探头，看看哪支更容易看清浅处的小目标。', help: '先看目标在哪儿，再看探头的频率和视野。高频通常能看细一些，但深处的回声也更弱；把三支探头放在同一位置比较。', next: 'c3_s1_aunt_7' },
  }],
  ['mei', '这块浅，线阵把边界分得更清楚。也别一味挑**高频**，到了深处，回声容易弱下去。', { card: 'c3_frequency', effect: { skill: 1, badge: 'c3_first_probe' } }],
  ['sys', '扫查结束，阿姨先到门外等。梅姐留在诊室工作站，对照旧片写好报告，再请她进来。你看着屏幕上保存的切面。', { image: 'us_breast', imageLabel: '乳腺超声 · 梅姐完成的检查切面', caseId: 'c3_aunt' }],
  ['aunt', '这个也做了，是不是以前那张就不用看了？'],
  ['me', '留着留着，今天这个跟上回拍片看的不一样。两份都带回门诊，别漏了。'],
  ['mei', '对，两份我都看了。新报告给您夹在前面，回门诊时连旧片一起递给医生。'],
  ['aunt', '那我把袋子留好。买菜可以少拎一只袋，这只可不能扔。'],
  ['sys', '阿姨带走检查资料，空布袋却落在椅子上。你写好她的姓名，把布袋交给窗口暂存。回来时，梅姐已经整理好台面，示意你喝口水。', { effect: { flag: 'c3_aunt_reviewed' }, card: 'c3_breast' }],
], 'c3_s1_stone_0')
scene('c3_s1_stone', [
  ['sys', '上午十点多，窗口来问能否接急诊的一位右上腹痛患者。梅姐核完申请，让前一位预约者先到候诊区等一会儿，你把门边的椅子挪开，给轮椅留出位置。'],
  ['patient', '这儿疼得厉害。路上车一拐弯，我把门把手都攥住了。', { voice: 'vox_c3_gallstone_v2' }],
  ['mei', '我会尽量轻一些。不舒服就告诉我，不用憋着。'],
  ['sys', '梅姐保存了这一帧，把显示器朝你转了转。你往前挪了一点，仔细看着画面。', { image: 'us_gallstone', imageLabel: '腹部超声 · 采集后的当前切面', caseId: 'c3_gallstone' }],
  ['mei', '先说你看见什么。病名不急着抢答。', { choices: [
    { text: '「亮点后面有暗影。换个方向，它还跟着吗？」', next: 'c3_s1_shadow_good' },
    { text: '「我分不清这道影，您带我看一遍。」', next: 'c3_s1_shadow_retry' },
  ] }],
], undefined)
put('c3_s1_shadow_good', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '嗯，我再换个角度。你帮我留着前一张，等下放在一起看。', next: 'c3_s1_shadow_0' })
put('c3_s1_shadow_retry', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '先盯着前面这个亮点，再看它后面。等我换个方向，你看看这道影是不是还接在它后头。', next: 'c3_s1_shadow_0' })
// Keep the acquired frame visible while the player decides or asks for help.
// A new scan direction is described afterwards; do not relabel this as a second image.
for (const id of ['c3_s1_stone_4', 'c3_s1_shadow_good', 'c3_s1_shadow_retry']) {
  Object.assign(steps[id], { image: 'us_gallstone', imageLabel: '腹部超声 · 刚才保存的切面', sprite: '', sprite2: '' })
}
scene('c3_s1_shadow', [
  ['sys', '梅姐换个方向核对，亮点和暗影仍在。扫查结束，急诊同事陪患者在门外等；她留在诊室工作站写好报告，起身交给他们。'],
  ['mei', '两张能对上，看着是胆囊结石，后面这道就是**声影**。片子和报告已经发给急诊，让他们接着看。', { card: 'c3_shadow', effect: { badge: 'c3_shadow_reader', flag: 'c3_gallstone_seen' } }],
  ['patient', '那我现在是不是就得开刀？'],
  ['mei', '现在还不能在这儿定。同事陪您回急诊，医生拿着报告跟您说下一步。'],
  ['sys', '急诊同事接走患者，你把刚才等候的预约患者请回来。忙完上午这阵，接班同事到位，你和梅姐才挪到窗边歇口气。你翻着刚才保存的图，还惦记着那道黑影。'],
  ['me', '以前总想着图越亮越清楚。今天反倒是黑下去的地方帮了忙。'],
  ['mei', '前面挡住了，后面的回声就少，不能把它全拧亮。到教学台看一条声线，先弄明白这些亮点从哪儿来。'],
  ['sys', '你回到窗边，把刚才那块模体摆正。梅姐搬了张凳子坐到旁边。'],
], 'c3_s1_gain_0')
scene('c3_s1_gain', [
  ['me', '**A型图**里是高高低低的峰，**B超图**里是亮点。它俩怎么对上？'],
  ['mei', '把这个目标往深处挪一点，看看它的回波往哪儿走。', {
    tool: { kind: 'ultrasound', task: 'echo', title: '教学台 · 回波什么时候回来', prompt: '点击发出脉冲，看看回波和亮点，再逐步补齐扫描线。', help: '先看同一条声线：回波晚到，亮点放得深；回波强，亮点就亮。不同位置的声线排在一起，就有了二维切面。挪动目标后再发一次，比较它们的变化。', next: 'c3_s1_gain_2' },
  }],
  ['mei', '看，**峰往后**，亮点就**往深处走**；峰高一点，点也亮一点。你刚扫过的这些线排在一起，就有了这张切面。', { card: 'c3_breast' }],
  ['sys', '下午交班，梅姐把你的培训表放回窗边。这回你没问人就找到了纸巾，擦完教学台，又顺手把空盒换掉。', { end: true, effect: { gold: 90, flag: 'c3_shift1_done' } }],
])

// Second shift: family closeness cannot replace the physician's explanation.
scene('c3_s2_start', [
  ['sys', '11月4日，上午九点多。你刚摆好教学台，表姐发来一张堵在桥上的照片。车窗边的饼干袋已经空了，她说再不动，连袋子都想啃。'],
  ['cousin', '你先替我跟梅姐说一声啊，别以为我睡过头。你姐夫还非说这条路快，快半天了！', { communication: 'sms', sprite: undefined, phone: 'pat_cousin', voice: undefined }],
  ['me', '梅姐，我表姐堵桥上了。您给她留的时间……要不我先下去等她？'],
  ['mei', '别急，还没到呢。到了你去接进来，我看完手上这位给她做。'],
], 'c3_s2_hub', 'bg_us_room_day')
hub('c3_s2_hub', '表姐还在路上，上午的检查照常叫号。你把手机音量开大，趁准备的空当在科里走走。', [
  ['陪梅姐看一眼排班表', 'c3_s2_roster'],
  ['跟小何分半袋饼干', 'c3_s2_he'],
  ['整理教学机的图像标签', 'c3_s2_label'],
], 'c3_s2_arrive_0', 'bg_us_room_day')
exploration('c3_s2_roster', [
  ['mei', '这儿写“休”，不等于我能休。旁边那个小括号，写的是院里培训。', { giftTo: 'mei' }],
  ['me', '括号比正文还厉害。'],
  ['mei', '这个月我休了三回，三回都在开会。下回干脆写个“会”，我还不用高兴半天。'],
], 'c3_s2_hub', 'bg_c3_shared_office_day_v1')
exploration('c3_s2_he', [
  ['he', '正想找你呢，坐。我来送申请单，顺便看看叛逃人口伙食怎样。', { giftTo: 'he' }],
  ['me', '还没顾上吃。刚看见你这袋饼干，肚子就开始替我打招呼。'],
  ['he', '给你留两块。我从急诊一路带来，袋子都快被我捏空了，再聊下去就真没了。', { effect: { item: 'snack' } }],
], 'c3_s2_hub', 'ch2_bg_breakroom_day')
exploration('c3_s2_label', [
  ['sys', '梅姐在诊室工作站写完上一位的报告，趁下一位还没进来，让你找一组教学对照。打开文件夹，一张图只写了“最好的一张”。你盯着它，完全想不起好在哪里。'],
  ['me', '我把探头、目标和深度写上了。下回至少不用猜这是哪一块模体。'],
  ['mei', '调整前的也放进去。今天比频率和深部补偿，别拿两块不同模体说自己调清楚了。', { card: 'c3_compare' }],
], 'c3_s2_hub', 'bg_us_room_day')
scene('c3_s2_arrive', [
  ['sys', '你在楼梯口接到表姐，帮她拎过那个鼓鼓囊囊的包。她跟在你身后，压低声音问：这里是不是每栋楼都长一个样？', { bg: 'bg_waiting_day_v2' }],
  ['cousin', '我刚差点拐进住院部。还好看见你，不然又得打电话求救。', { bg: 'bg_waiting_day_v2' }],
  ['mei', '这就是你表姐？来，坐这儿歇口气。单子给我，人到了就好。'],
  ['cousin', '麻烦您了。电话里跟我说得可稳了，我还怕是吹牛呢。'],
  ['sys', '你咳了一声，把她的外套挂好。梅姐笑着接过产检本，一边翻，一边问她最近怎么样。'],
  ['cousin', '能不能顺便拍一张脸？家里人都问像谁，现在谁也没见过，已经吵起来了。'],
  ['mei', '行，我先把该看的看全。孩子肯转脸，就给你留一张。三维看着立体，不过前面这些**二维切面**还得一张张看。'],
  ['sys', '梅姐握着探头扫查，先前的笑话慢慢停了。她回到一个二维切面，重新调整位置、测量。', { image: 'us_fetal', imageLabel: '胎儿二维超声 · 侧脑室测量切面', caseId: 'c3_cousin' }],
  ['cousin', '怎么又看这儿？是不是有问题？'],
  ['mei', '**侧脑室**这里量着**十毫米左右**，有点增宽。我再换个切面量一遍，其他地方也得看仔细。'],
  ['cousin', '刚才不是还好好的？……你别光看屏幕，你跟我说句话。'],
  ['me', '我在呢。先听梅姐把话说完，我陪着你。'],
  ['mei', '这一个数还定不了后面的事。我再看看，等会儿咱们坐下说，你有什么想问的就问。', { card: 'c3_ventricle' }],
  ['sys', '扫查结束，表姐先到门外等。梅姐在诊室工作站核对测量、写好报告，你再去叫她进来坐下，把包放在脚边。', { next: 'c3_s2_listen' }],
])
put('c3_s2_listen', { speaker: 'cousin', sprite: 'pat_cousin', bg: 'bg_us_room_day', text: '我现在脑子里乱得很。你先别上网查啊，一会儿查出一堆吓人的，我更睡不着了。', effect: { flag: 'c3_cousin_listened' }, next: 'c3_s2_plan_0' })
put('c3_s2_promise', { speaker: 'me', bg: 'bg_us_room_day', text: '……等一下，我这句说快了。先让梅姐把今天能确定的讲完，我陪你记。', next: 'c3_s2_plan_0' })
scene('c3_s2_plan', [
  ['mei', '待会儿我给产科打个电话，把这里的测量跟他们说清楚。你拿着报告过去，有几项还得再细看。'],
  ['cousin', '磁共振也要做吗？我听人说那台机器很吓人。'],
  ['mei', '胎儿MRI有时能补充信息，要看详细超声和专科评估，不是看到这个数字就人人立刻做。'],
  ['sys', '你在报告袋上写好楼层和医师名字，带表姐走到电梯口。她又问了一遍往哪儿拐，你干脆给她画了个小箭头。', { effect: { badge: 'c3_stay_beside', flag: 'c3_cousin_plan' } }],
  ['cousin', '我先过去。你下班给我发消息，陪我吃点热的，别让我一个人瞎想。'],
  ['sys', '电梯门关上，表姐托你拿的外套还搭在胳膊上。你发消息问她找没找到产科，她回了张门牌照片：“找到了，衣服先放你那儿。”你回诊室挂好外套，总算坐了下来。'],
  ['mei', '我继续看其他切面，你在工作站调刚才存的这张。试试整体增益，再调深处，别把浅处弄得一片白。', {
    tool: { kind: 'ultrasound', task: 'tgc', variant: 'liver', image: 'us_c3_hepatorenal_v1', title: '肝肾图像 · 深处为什么更暗', prompt: '让深处的轮廓清楚些，同时保留浅处的层次。', help: '深处的回波走得更远，衰减更多。总增益会整幅一起亮；TGC按深度补偿，能单独照顾偏暗的深处。调的是收到的信号，不是让探头再发强一点。', next: 'c3_s2_finish_0' },
  }],
])
scene('c3_s2_finish', [
  ['mei', '浅处的层次也得留着。**深度和补偿设置**记一下，我把这张核好，咱们再认认肝和肾。', { card: 'c3_depth', effect: { skill: 1, badge: 'c3_depth_keeper' } }],
  ['me', '以前看一片暗就想加**整体增益**。原来得先问，是整张暗，还是走到深处才暗。'],
  ['mei', '对。下回深处又暗，先看看探头贴合没有，再检查频率，别一上来就拧亮度。'],
  ['sys', '下午交班后，表姐发来“我在楼下”，后面跟着一家粥店的位置。你回复“等我换衣服”，把培训表放回柜子。', { end: true, effect: { gold: 100, flag: 'c3_shift2_done' } }],
])

// The display lesson meets an actual examination, after a short pause. Older
// saves already at the handover keep their position rather than being rewound.
steps.c3_s2_finish_2.next = 'c3_liver_observe'
scene('c3_liver_arrive', [
  ['sys', '你刚喝了两口水，窗口叫到下一位：二十七岁的年轻人，背着电脑包，把一张折了四折的体检单摊在桌上。', { sprite: 'pat_c3_young_liver_v1' }],
  ['fatty_patient', '公司催第三遍了，我终于来了。再拖下去，明年的体检都能一起做了。'],
  ['mei', '先把包放椅子上。最近有没有哪儿不舒服？'],
  ['fatty_patient', '没什么感觉。就是天天坐着，外卖一到就算我下班了。'],
  ['mei', '躺这边，衣服往上挪一点。我先给你看看。'],
], 'c3_liver_scan')
scene('c3_liver_tgc_intro', [
  ['me', '刚存的图，底下黑了一截。把总增益拧大，能一起救回来吗？'],
  ['mei', '你试试。浅处要是先白了，就把它退回来，用**TGC**单独补深处。'],
], 'c3_s2_plan_6')
put('c3_liver_observe', { speaker: 'mei', sprite: '', bg: 'bg_us_room_day',
  text: '肝脏和右肾在这张里都看得见。先不改设置，你想怎么比较？',
  image: 'us_c3_hepatorenal_v1', imageLabel: '肝脏与右肾 · 同一切面', caseId: 'c3_young_liver',
  choices: [
    { text: '「找深度差不多的肝和肾，比较一下亮暗。」', next: 'c3_liver_compare' },
    { text: '「是不是整体增益开大了？先把整张调暗试试。」', next: 'c3_liver_gain' },
    { text: '「肾里也有很亮的地方，您指给我看看该比哪儿。」', next: 'c3_liver_help' },
  ],
})
const liverView = { bg: 'bg_us_room_day', sprite: '', image: 'us_c3_hepatorenal_v1', imageLabel: '肝脏与右肾 · 同一切面' }
put('c3_liver_compare', { speaker: 'mei', ...liverView,
  text: '嗯，别拿浅处和最深处硬比。看肾外圈这层，跟旁边深度接近的肝放一起看。', next: 'c3_liver_explain_0' })
put('c3_liver_gain', { speaker: 'mei', ...liverView,
  text: '整体增益会把两边一起调暗，差别还在。先保持设置，看肝和旁边深度接近的肾皮质。', next: 'c3_liver_explain_0' })
put('c3_liver_help', { speaker: 'mei', ...liverView,
  text: '看肾外圈这层，叫**肾皮质**。中间很亮的**肾窦**本来就不一样，不拿它来比。', next: 'c3_liver_explain_0' })
scene('c3_liver_explain', [
  ['mei', '这里**肝脏回声明显比右肾皮质亮**。比的是皮质，不是肾中央本来就亮的肾窦。', liverView],
  ['sys', '扫查结束，年轻人先到门外等。梅姐在诊室工作站核对完其他切面、写好报告，再叫他进来。', liverView],
  ['mei', '其他切面也核对过了，**超声提示脂肪肝**，不是凭一个亮点就定的。', { card: 'c3_liver_compare' }],
  ['fatty_patient', '啊？我才二十七，酒都不喝。每次聚餐拒酒，怎么还轮到我了？'],
  ['mei', '不喝酒也可能有，年轻也不例外。拿报告回体检门诊，跟血脂、血糖这些结果一起看，别光盯着一张图猜严重不严重。'],
  ['fatty_patient', '这回不拖了。您别给我折，我放电脑包外层，省得又塞包底下忘了。'],
  ['sys', '年轻人把报告夹进电脑包的外层，特意拉上拉链。你回到桌边，刚才那杯水已经凉了。', { effect: { flag: 'c3_liver_seen' } }],
], 'c3_tang_break_0')
scene('c3_tang_break', [
  ['sys', '小唐送来下午的交接单，见你对着杯子发呆，顺手把单子放到干燥的那一边。'],
  ['tang', '水凉了吧？我去接热的，给你捎半杯？', { giftTo: 'tang' }],
  ['me', '救急。想喝的时候烫，能喝的时候又忘了。'],
  ['tang', '你这杯子一早搬过来，我下班了它还这么满。先喝两口，别等我明天再来验收。'],
], 'c3_s2_finish_3')

// Third shift: a recovering heart, an optical-looking scare, and a name finally spoken.
scene('c3_s3_start', [
  ['sys', '11月7日，下午四点。这次跟傍晚床旁班：先做完门诊复查，再随梅姐去病区会诊。你刚把移动机推到门口，一只轮子就吱了一声。'],
  ['mei', '电量、探头、耗材。别到病区才发现，推了一台大号电视过去。'],
  ['me', '都核对了。就是这只轮子有意见。'],
  ['mei', '轮子的意见回来报修。路上慢点，别让它先到病区。'],
], 'c3_s3_hub', 'bg_us_room_day')
hub('c3_s3_hub', '王叔还在窗口报到，傍晚的床旁任务也已约好。你把推车靠边停稳，先准备这趟出科要用的东西。', [
  ['问问小唐，待会儿去病区怎么走', 'c3_s3_tang'],
  ['检查移动机的电源和线缆', 'c3_s3_cart'],
  ['去窗口看看寄存的布袋', 'c3_s3_bag'],
], 'c3_s3_wang_0', 'bg_us_room_day')
exploration('c3_s3_tang', [
  ['tang', '你负责推车？转弯留点地方。上回我被人用仪器车追了半层楼。', { giftTo: 'tang' }],
  ['me', '那我慢点推。你在前面带路，我跟着。'],
  ['tang', '我待会儿去病区交单，东边病床梯一起走。你别跟着我拐去库房，我上回就领错过一队人。'],
], 'c3_s3_hub', 'bg_waiting_day_v2')
exploration('c3_s3_cart', [
  ['sys', '你把电源线从轮子旁收起，检查外观和电量。备用线在侧袋，不在你想当然的抽屉里。'],
  ['mei', '这回好，少一个人蹲在床底下找插座。'],
  ['me', '这里贴个“备用线”，回去也收这格。我可不想推到半路再折回来。', { card: 'c3_bedside', effect: { badge: 'c3_cart_ready' } }],
], 'c3_s3_hub', 'bg_us_room_day')
exploration('c3_s3_bag', [
  ['aunt', '前几天走得急，外面这个空布袋落下了。窗口说你替我放好了，我过来拿一下。'],
  ['me', '给您。您当时把片子拿走了，我还松了口气，不然得让您多跑一趟。'],
  ['aunt', '我顺路带块擦镜布，自己缝的小边。给你擦眼镜用，你可别看它白，就拿去擦机器。', { image: 'item_reunion_gifts', effect: { item: 'c3_aunt_cloth', badge: 'c3_aunt_returns' } }],
], 'c3_s3_hub', 'bg_waiting_day_v2')
scene('c3_s3_wang', [
  ['sys', '出发前，梅姐先给一位复诊患者做心超。王叔把药袋放在椅子上，坐下又马上站起来。', { sprite: 'pat_wang_recovery' }],
  ['wang', '这回不抢救啦，是心内科约的复查。躺哪边？刚才差点把药袋交给窗口当申请单。', { voice: 'vox_c3_wang_v2' }],
  ['mei', '先躺这边，资料给我。我看看**心脏收缩**怎么样、**瓣膜**动得好不好，再给心内科看。'],
  ['wang', '我现在散步，走到菜场就往回拐。不是医生不让，是再走两步就忍不住买烧饼。'],
  ['me', '那摊烧饼确实香。我每次路过也想买。'],
  ['sys', '梅姐完成必要核对，持探头寻找心脏切面。屏幕里的瓣膜来回开合，你负责按指示留存图像。', { image: 'us_echo', imageLabel: '超声心动图 · 心脏结构与运动', caseId: 'c3_wang' }],
  ['wang', '这个能看见我支架里面通不通吗？'],
  ['mei', '支架里面靠这次心超看不清。这回看心脏收缩、瓣膜和血流。先用**B超**把各处回声排成切面，心腔、室壁和瓣膜就都能找到了。'],
  ['sys', '王叔检查完先到门外等。梅姐留在诊室工作站写好报告，你叫他回来取。他又问了一遍心内科的楼层，你便写在袋口。', { effect: { flag: 'c3_wang_reviewed' } }],
  ['wang', '谢谢。走了，这回我先去门诊，不去菜场。'],
], 'c3_s3_motion_0')
// One examination: grayscale structure, sampled motion, then Doppler flow.
// The patient leaves only after all three views have been reviewed together.
steps.c3_s3_wang_7.next = 'c3_s3_motion_0'
scene('c3_wang_color_intro', [
  ['me', '结构看过，运动也记下来了。接下来这个彩色，是看血往哪儿流？', { image: 'us_echo', imageLabel: '心脏结构与运动', sprite: '', sprite2: '' }],
  ['mei', '对，该**D超，也就是多普勒**了。流动的血细胞会让回声的频率发生变化，机器用这个看血流。先把取样框放在这里。', { image: 'us_echo', imageLabel: '心脏结构与运动', sprite: '', sprite2: '' }],
], 'c3_wang_color_0')
const cardiacColorView = { image: 'us_c3_cardiac_color_v1', imageLabel: '心脏彩色多普勒 · 结构与血流', sprite: '', sprite2: '' }
scene('c3_wang_color', [
  ['me', '原来不是整张换成彩色，是在刚才的结构上加了**血流信息**。这下知道您在看哪儿了。', cardiacColorView],
  ['mei', '嗯，位置还得靠黑白图。红蓝先对着**色标**看，再和瓣膜的运动一起核对。', cardiacColorView],
], 'c3_wang_color_question')
put('c3_wang_color_question', { speaker: 'sys', bg: 'bg_us_room_day', ...cardiacColorView,
  text: '你看着颜色随着心跳变化，又往屏幕前凑了凑。', choices: [
    { text: '「红的、蓝的，是动脉和静脉吗？」', next: 'c3_wang_color_direction' },
    { text: '「查脖子上的血管，也是这么看的？」', next: 'c3_wang_color_vessel' },
  ] })
put('c3_wang_color_direction', { speaker: 'mei', bg: 'bg_us_room_day', ...cardiacColorView,
  text: '不是按动静脉分的。这里主要表示血流**朝向还是离开探头**，要按这张图的色标认。下回跟血管检查，你试着换个角度就明白了。', next: 'c3_wang_spectrum_0' })
put('c3_wang_color_vessel', { speaker: 'mei', bg: 'bg_us_room_day', ...cardiacColorView,
  text: '也是用**多普勒**看血流，不过切面和设置得跟着检查对象换。下回正好有血管检查，你看看探头角度一变，信号会怎样。', next: 'c3_wang_spectrum_0' })
scene('c3_wang_spectrum', [
  ['sys', '梅姐换了一个切面，选好血流的取样位置。颜色下方展开一排波形，一阵阵跟着心跳起伏。', { ...cardiacColorView, echoSpectrum: true }],
  ['me', '也是横着看时间？不过这回起伏的不是瓣膜位置了？', { ...cardiacColorView, echoSpectrum: true }],
  ['mei', '对，这是**频谱多普勒**，看血流速度怎样随时间变化。彩色先帮我找血流，频谱再看它怎么流，都是D超。', { ...cardiacColorView, echoSpectrum: true }],
], 'c3_wang_finish_modes_0')
scene('c3_wang_finish_modes', [
  ['me', '**B超看结构，M超盯运动，D超看血流**。原来是同一次检查里换着看，不是做三遍。'],
  ['wang', '三种都看了？那我这回躺得挺值。能起来了吧，胳膊都压麻了。'],
  ['mei', '可以了，慢慢起。这几组图我放一起看，再把报告给您。'],
], 'c3_s3_wang_8')
scene('c3_s3_mirror', [
  ['sys', '六点多，电梯到了重症病区。接诊医师说明会诊问题，你把车侧身停好，让出床边，梅姐核对资料、拉好帘子。', { bg: 'bg_us_bedside' }],
  ['sys', '夜灯已经调暗。你保存好这一帧，刚准备抬头，又把目光移回了屏幕。', { bg: 'bg_us_bedside', image: 'us_mirror', imageLabel: '床旁超声 · 采集后的膈肌附近切面' }],
  ['me', '等一下，这张看着有点怪。', { bg: 'bg_us_bedside' }],
  ['mei', '看见了。先留这一帧，我换个声窗，你盯住它。', { bg: 'bg_us_bedside', next: 'c3_s3_mirror_end_0' }],
])
put('c3_s3_mirror_check', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_bedside', text: '对，先验证。你记下现象，我来换声窗，别只拿这一帧下结论。', next: 'c3_s3_mirror_end_0' })
put('c3_s3_mirror_wait', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_bedside', text: '先别写那个结论。把它描述为重复影像，我们换声窗再看。', next: 'c3_s3_mirror_end_0' })
scene('c3_s3_mirror_end', [
  ['sys', '梅姐调整角度，那份“多出来的肝脏”随之变化。她又从别的声窗核对，没有急着结束检查。'],
  ['mei', '**镜像伪影**。这里回声**多绕了一段路**，机器却还按直来直去算，就把位置画到另一边。别的声窗已经核过了。', { card: 'c3_mirror', effect: { badge: 'c3_second_angle' } }],
  ['me', '原来是回声绕路了。我还以为自己把解剖全忘了。'],
  ['mei', '报告交给当班医师了，咱们把车推回去。那只轮子还没修，转弯慢点。'],
], 'c3_s3_xu_9', 'bg_us_bedside')
scene('c3_s3_waiting', [
  ['sys', '五点前，你到候诊区叫下一位。穿旧夹克的男人已经把申请单拿在手里，听见叫号，立刻站了起来。'],
  ['me', '到您了。这边走，袋子也带上。'],
  ['xu', '医生，怎么又是你……消化内科开的腹部检查，约的今天下午。做完就能回去，不耽误你们出科吧？', { voice: 'vox_c3_xu_greeting_v3' }],
  ['me', '不耽误，还没到交班呢。慢点，您袋子拉链没拉好。'],
  ['xu', '哎，亏你提醒。出门前翻了好几遍，最后还是忘了拉。'],
  ['sys', '他把袋口拢好，抽出今天的申请单递给你，跟着走进诊室。'],
], 'c3_s3_xu_0', 'bg_waiting_day_v2')
scene('c3_s3_xu', [
  ['sys', '轮到男人时，梅姐核对申请单。姓名栏这回没有被挂号条挡住：**许建平**。'],
  ['xu', '退休了，以前开长途客车。今天消化内科让我来查腹部。还有件旧事，做完能不能问你们两句？'],
  ['mei', '不急，您先躺好。查完了坐这儿慢慢说。'],
  ['sys', '扫查结束，许建平先到门外等。梅姐在诊室工作站写好报告，再请他进来：仅见一个约三毫米的胆囊息肉样病变，回开单门诊评估、按医嘱随访。', { effect: { flag: 'c3_xu_third_visit' } }],
  ['xu', '我父亲叫**许守义**。**1998年**离开家，最后有人见到他，是在这家医院。'],
  ['me', '您一直在找他？'],
  ['xu', '先找记录吧。我那阵子跑车，一个月没几天在家，总拖着说下一趟。现在能问的人换了好几拨，问到后来，还得先解释自己是谁。'],
  ['me', '档案那边我帮您问问。下回来把能证明亲属关系的材料也带上，省得白跑。今天这份报告先拿回门诊。'],
  ['xu', '好，下回带。今天这份报告我先拿回门诊，老资料的事另外问。', { effect: { flag: 'c3_xu_identity', badge: 'c3_name_spoken' } }],
  ['sys', '傍晚班交接完，你把移动机接回电源，报修单贴在响轮子旁边。脱下工作服才发现口袋里还揣着耦合剂瓶盖，又折回去放好。', { end: true, effect: { gold: 110, flag: 'c3_shift3_done' } }],
], undefined, 'bg_us_room_day')

// Fourth shift: a blood-flow signal lesson, with optional ordinary office work.
scene('c3_s4_start', [
  ['sys', '11月10日，上午八点。梅姐翻到今天的血管检查申请：开单医师想了解血流情况。教学机上也放好了演示，黑白管道旁边有红蓝两色。'],
  ['mei', '今天跟我留意一下血流检查。先看黑白图找位置，切颜色时看看我还调了什么，忙完咱们再试。'],
  ['me', '上回王叔心超里的颜色一跳一跳的。这次看血管，能让我看看探头角度一变，信号会怎样吗？'],
  ['mei', '先看图例，再看探头朝哪儿。你把这位以前的检查调出来，我先看看。'],
], 'c3_s4_hub')
hub('c3_s4_hub', '诊室还在做开诊前的准备，几箱新用品靠墙放着。走廊那头有人喊借剪刀，休息室的门也开了。', [
  ['找小雷借标签机', 'c3_s4_lei'],
  ['和梅姐拆新包装', 'c3_s4_pack'],
  ['给老周回个电话', 'c3_s4_zhou'],
], 'c3_s4_clinic_0')
scene('c3_s4_clinic', [
  ['sys', '梅姐写好这位的报告，请患者回来取走。等他离开，她才把保存的**灰阶图和彩色血流图**并排调出来，示意你看同一条血管。'],
  ['me', '这回是一整段血管，不是心脏里的瓣膜了。不过还是先认位置，再对着色标看血流，对吧？'],
  ['mei', '这条是**颈总动脉**，可不是因为它是动脉才红。左边认位置，右边看血流；红蓝得对着**色条**看，表示相对探头的方向。交好班，咱们拿演示转一转。'],
], 'c3_s4_doppler_0')
for (const id of ['c3_s4_clinic_0', 'c3_s4_clinic_1', 'c3_s4_clinic_2']) {
  Object.assign(steps[id], { image: 'us_c3_color_doppler_v1',
    imageLabel: '颈总动脉 · 左灰阶 / 右彩色血流｜Cerevisae · CC BY-SA 4.0', sprite: '', sprite2: '' })
}
exploration('c3_s4_lei', [
  ['lei', '标签机借你，别像上次那个人，打一张“标签机”，然后把卷用完了。', { giftTo: 'lei' }],
  ['me', '只打“开封日期”和批次。我连卷芯都给你带回来，够意思吧？'],
  ['lei', '行，用完把卷芯带回来，我照着买。剩下的纸给梅姐用；别只贴个“开封日期”，却忘了写日期。', { effect: { item: 'c3_lei_label_roll' } }],
], 'c3_s4_hub', 'ch2_bg_breakroom_day')
exploration('c3_s4_pack', [
  ['mei', '这边**普通外用**，这边**无菌单包**，别因为外包装差不多，就塞进同一个格子。', { giftTo: 'mei' }],
  ['me', '我把适用范围和领用位置分开写，价格另放一栏。'],
  ['mei', '这格够了，下一箱先别拆。每回堆满，有效期短的反而拿不到，最后拆箱的人还挨财务问。', { card: 'c3_gel' }],
], 'c3_s4_hub')
exploration('c3_s4_zhou', [
  ['sys', '你走到安静的窗边，把电话回拨过去。响了两声，那边接了。', { communication: 'call', sprite: '', phone: 'char_zhou', next: 'c3_s4_zhou_connected' }],
  ['me', '找得到。就是他们那边的饭点，和饭点没什么关系。', { communication: 'call' }],
  ['zhou', '那就熟悉了。周末回来，给我讲讲那个轮子。后勤上回答应给我们修椅子，还欠着呢。', { communication: 'call', sprite: undefined, phone: 'char_zhou' }],
], 'c3_s4_hub', 'bg_waiting_day_v2')
put('c3_s4_zhou_connected', {
  speaker: 'zhou', text: '喂，在超声科怎么样？还找得到食堂吗？',
  bg: 'bg_waiting_day_v2', communication: 'call', phone: 'char_zhou', sprite: '', sprite2: '',
  voice: 'vox_c3_zhou_call_v1', next: 'c3_s4_zhou_1',
})
scene('c3_s4_cost', [
  ['sys', '你把三个月的数据摊开。总金额上去了，但门诊与床旁检查的人次也增加了。另有一批旧包装到了使用期限，报废单单独放着。'],
  ['mei', '财务把这两张加一起了。你看，报废那批还算在本月用量里，可不是我们一人多挤了半瓶。'],
  ['me', '那先把**采购量、实际领用、过期损耗**拆开？'],
  ['mei', '对。哪些真用掉了，哪些是过期报废，分开列。别一股脑算成检查用量。', { next: 'c3_s4_cost_right' }],
])
put('c3_s4_cost_right', { speaker: 'me', bg: 'bg_us_room_day', text: '拆开算了：按用途和人次估订货量，临期的单独列出来。财务再问，咱就给他看这两栏。', effect: { wealth: 2, flag: 'c3_gel_ledger' }, next: 'c3_s4_cost_end_0' })
put('c3_s4_cost_limit', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '有的地方得补，接触不好还怎么扫？先把订多的、放到最后才过期的找出来，别卡患者这一下。', next: 'c3_s4_cost_end_0' })
put('c3_s4_cost_mix', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '哎，别开。不能混装补灌，包装和用途还得按要求来。剩这几瓶先核该怎么处理，别为了少报废造个新麻烦。', next: 'c3_s4_cost_end_0' })
scene('c3_s4_cost_end', [
  ['sys', '你们重新分了货架，按预计用量调整订货。梅姐把加温设备的说明书也找出来，核对适用产品与清洁要求，不再凭“摸着不烫”判断。'],
  ['mei', '这张用量表我拿去。财务再问，你跟我一起解释，别算完就跑。', { effect: { badge: 'c3_gel_account' } }],
  ['sys', '敲门声响起。一个穿深色衬衫的男人在门口出示工作证，没有越过诊室门槛。'],
  ['han', '打扰，我姓韩，厂家数据项目这边的负责人。今天配合整改做设备清单核对，不碰临床机器。'],
  ['mei', '临床还在用，技术的事等这一位结束。你先去办公室找小雷，登记一下。'],
  ['han', '没问题。我们也希望把去年遗留的服务范围理清，免得大家反复解释。'],
  ['sys', '他把一份回收清单留在门边，页签贴得很整齐。其中一项写着“旧终端及相关留存件”。'],
], 'c3_s4_han_0')
scene('c3_s4_han', [
  ['sys', '检查间歇，你去大办公室递清单。小雷从一摞资料旁腾出半张桌面，开始核对编号；韩经理把笔盖扣上，又拔下来。', { bg: 'bg_c3_shared_office_day_v1' }],
  ['lei', '先对**试运行那批的编号**。相关留存件，具体列到哪一份？', { bg: 'bg_c3_shared_office_day_v1' }],
  ['han', '旧终端的配套存储、备件之类。统一回收，免得留在各科没人管。', { bg: 'bg_c3_shared_office_day_v1' }],
  ['me', '这张表现在是核对，还是签了就允许带走？', { bg: 'bg_c3_shared_office_day_v1' }],
  ['han', '今天先核对。处置当然还要走你们院里的流程。', { bg: 'bg_c3_shared_office_day_v1', choices: [
    { text: '把“仅核对，未交接”写清，请他补列每件编号', next: 'c3_s4_han_note', effect: { flag: 'c3_han_scope_recorded' } },
    { text: '先把模糊条目交给小雷确认，不代签交接', next: 'c3_s4_han_ask' },
  ] }],
])
put('c3_s4_han_note', { speaker: 'lei', sprite: 'char_lei', bg: 'bg_c3_shared_office_day_v1', text: '就这么写。我把编号补上再回给他，别让这几页附件都成了待回收设备。', card: 'c3_trace', effect: { badge: 'c3_keep_the_record' }, next: 'c3_s4_han_end_0' })
put('c3_s4_han_ask', { speaker: 'lei', sprite: 'char_lei', bg: 'bg_c3_shared_office_day_v1', text: '我来核对。你先别代签，有的附件院里还得继续查，不能让他这一栏全带走。', card: 'c3_trace', next: 'c3_s4_han_end_0' })
scene('c3_s4_han_end', [
  ['han', '那我重列一版，正式走院方确认。今天我就不带东西了。'],
  ['sys', '他收回未签的回收联，核对联留在桌上。两张纸的页脚编号相同，“留存件”三个字也还在。'],
  ['lei', '你继续轮转吧。需要你说明的现场情况我会找你，其他事我跟院里对。'],
  ['me', '他刚才都把回收联递出来了。我不问，是不是就拿这张给我签？'],
  ['lei', '可能。他这张只列了终端。我再问问，**最早那版项目附件**算不算在里面。', { effect: { flag: 'c3_han_met' } }],
  ['sys', '下午交班前，你把教学血流的方向、探测角度和颜色图例一起记好。梅姐翻到最上面，终于不用猜哪一张是朝向探头。', { bg: 'bg_us_room_day' }],
  ['sys', '第四班交接完，临床图像各归原报告，教学演示留在自己的文件夹。梅姐把预约单收起，你提着已经洗好的饭盒去换衣服。', { bg: 'bg_us_room_day', end: true, effect: { gold: 110, flag: 'c3_shift4_done' } }],
], undefined, 'bg_c3_shared_office_day_v1')

// The known caller and the old anonymous number are not identified as the same
// person here. Chapter five must verify the sender independently.
steps.c3_s4_han_end_4.next = 'c3_s4_wen_0'
scene('c3_s4_wen', [
  ['sys', '刚把清单放回桌上，手机亮了。来电显示是雯雯；走廊另一头，还能听见韩经理等电梯的声音。', { communication: 'call' }],
  ['wen', '方便说话吗？韩经理说去过了。我想对一下回收单，有没有写**包括备份**？', { communication: 'call', sprite: undefined, phone: 'char_wen' }],
  ['me', '核对联留下了，回收联没签。到底要收什么，还得重列。', { communication: 'call' }],
  ['wen', '行，那先别把原件装进去。我这边留着新版附件，院里要核我就交。……现在有个电话进来，你先忙，有消息我再找你。', { communication: 'call', sprite: undefined, phone: 'char_wen' }],
  ['sys', '电话断了。你在核对联旁记下时间和她提的“新版附件”，又发去一句“请按正式渠道交”。雯雯回复“好”，你才收起手机回诊室。', { effect: { flag: 'c3_wen_copy_kept' } }],
], 'c3_s4_han_end_5', 'bg_c3_shared_office_day_v1')

// Fifth shift and the post-quiz ending are deliberately separated by the settlement page.
scene('c3_s5_start', [
  ['sys', '11月13日，最后一个跟班日，上午八点。你已经会先把备用纸和模体摆好。梅姐拿来培训表，把今天的**教学考核**圈上，下午再完成**轮转交接**。'],
  ['mei', '今天换你来，从拿探头开始。我坐这儿看，不插嘴。'],
  ['me', '正式考核？'],
  ['mei', '表都拿来了，还能逗你？先把模体摆好，别紧张。'],
], 'c3_s5_hub', 'bg_us_room_day')
steps.c3_s5_start_0.next = 'c3_s5_cousin_check_0'
scene('c3_s5_cousin_check', [
  ['mei', '对了，你表姐这几天怎么样？上回出去的时候，话都少了。'],
  ['me', '还惦记着那个十毫米。嘴上说不查，半夜给我转了五六个网页，看得我也睡不着。'],
  ['mei', '别被网上那些吓着了。**轻度侧脑室增宽**的宝宝，很多后来都好好的，照样上学、到处跑。咱们再看看有没有别的问题。'],
  ['me', '那**MRI**，就是把超声没看清的地方再看看？'],
  ['mei', '对，**脑部结构**再看细一点。你陪她去，有个人搭话，总比她自己坐那儿胡思乱想强。'],
  ['me', '行，我陪着。她要知道您还记着这事，肯定也高兴。'],
], 'c3_s5_start_1', 'bg_us_room_day')
hub('c3_s5_hub', '考核还没开始。走廊还是那些门，你这回已经知道哪间能找着热水，哪间的椅子坐下会响。', [
  ['跟老周聊聊这两周', 'c3_s5_zhou'],
  ['把标签机还给小雷', 'c3_s5_lei'],
  ['陪梅姐收拾教学台', 'c3_s5_mei'],
], 'c3_s5_assess_0', 'bg_us_room_day')
exploration('c3_s5_zhou', [
  ['zhou', '我来送会诊资料。还行，没瘦。梅姐没让你天天搬最重那台吧？', { giftTo: 'zhou' }],
  ['me', '天天推车，那只轮子比我还认路。梅姐倒是真舍得教，我问她就停下来讲。'],
  ['zhou', '那就好。回来给我讲讲，都拿模体折腾什么了。对了，下周饭堂换窗口，别还往旧门那边走。'],
], 'c3_s5_hub', 'bg_c3_shared_office_day_v1')
exploration('c3_s5_lei', [
  ['lei', '标签机还得这么准时，我都有点不习惯。', { giftTo: 'lei' }],
  ['me', '里面还剩一截。没给机子起名，也没给你打奖状。'],
  ['lei', '少一张奖状，省半卷纸。机器放这儿，卷芯上的型号我记一下，省得下回又买错。'],
], 'c3_s5_hub', 'ch2_bg_breakroom_day')
exploration('c3_s5_mei', [
  ['mei', '这块模体又被擦得亮晶晶的。你不会以为擦得干净能加考核分吧？', { giftTo: 'mei' }],
  ['me', '本来只想少扣一点。'],
  ['mei', '这张拿着，我平时**选探头用的小抄**。别嫌字乱，拿不准就翻翻，找我也行。', { effect: { item: 'c3_mei_probe_card', badge: 'c3_mei_pocket_card' } }],
], 'c3_s5_hub', 'bg_us_room_day')
scene('c3_s5_assess', [
  ['sys', '你摆正模体，在记录表上写下探头和设置。梅姐坐到旁边，等着看你怎么调。'],
  ['mei', '把扫描线排密一点，再看看每秒还能出多少帧。别光顾着让线挤得满满的。', {
    tool: { kind: 'ultrasound', task: 'resolution', title: '教学台 · 扫描线与帧率', prompt: '增加扫描线，看看帧率怎样变化；再试着改变显示深度。', help: '每条声线都要等回波。线更多、看得更深，一帧就要等更久。线排密能增加横向采样，但不会把声束变窄；选择时也要看能不能跟上目标的运动。', next: 'c3_s5_assess_2' },
  }],
  ['me', '线排密了，这两个点怎么还是挤在一起？一个在前，一个在后，旁边还有一对并排的。'],
  ['mei', '这次别动线数。试试短一点的脉冲，再把声束收窄，看哪一对先分开。', {
    tool: { kind: 'ultrasound', task: 'spatial_resolution', title: '教学台 · 把两个回声分开', prompt: '先缩短脉冲，再收窄声束，观察前后与并排的两对目标。', help: '目标位置始终不变。沿声束前后排的是轴向，短脉冲减少回波重叠；横着并排的是侧向，窄声束更容易把它们分开。两项都不是把画面放大或扫描线排密。', next: 'c3_s5_assess_4' },
  }],
  ['sys', '你保留调整前后的画面，注明设置。梅姐从头核对一遍，在培训记录上签下名字。', { card: 'c3_gain', effect: { skill: 2, badge: 'c3_echo_apprentice', flag: 'c3_practice_passed' } }],
  ['mei', '过了。探头放回软垫，别激动得往桌上一搁。以后调图拿不准，这两张就是你的参考。'],
  ['me', '我知道。纸巾的位置倒是可以独立回答了。'],
  ['mei', '这项满分。把**B超的切面**、**M超的时间线**、血流演示各放回文件夹，别全叫“最好看的一张”。'],
], 'c3_s5_notice_end_4', 'bg_us_room_day')
steps.c3_s5_assess_7.next = 'c3_s5_mei_farewell_0'
scene('c3_s5_mei_farewell', [
  ['mei', '其实你**悟性挺高**的。刚来还不敢碰探头，现在会自己找原因了。以后肯定能干出点名堂。', {
    image: 'cg_c3_mei_farewell_v1', imageLabel: '梅姐收好培训表，笑着看向你', closeup: true, cameraMotion: 'push', sprite: '', sprite2: '' }],
  ['me', '这话我可记住了。回去先跟老周显摆一下。'],
  ['mei', '行，就说我夸的。以后碰到看不明白的图，拿来一起琢磨，别跟我客气。'],
], 'c3_s5_notice_end_4', 'bg_us_room_day')
scene('c3_s5_notice', [
  ['sys', '许建平从文件袋里取出一张旧寻人启事。边角磨得发白，新贴的透明胶压住一道裂口。', { image: 'item_missing_notice' }],
  ['xu', '这是许守义，我父亲。1998年那张原件太薄了，这张是后来照着重印的，名字和事情没改。'],
  ['me', '最后出现的地点写着县医院。您以前找到过哪个部门？'],
  ['xu', '找过门诊，也问过住院处。那阵子我跑长途，他说不舒服，我还嫌他老念叨。出门前吵了一架，后来就没回来。'],
  ['sys', '他把要留下的复印件分好，向你确认窗口位置。你指了指旁边的门，陪他把申请递过去。', { next: 'c3_s5_notice_desk' }],
], undefined, 'bg_waiting_day_v2')
put('c3_s5_notice_desk', { speaker: 'sys', bg: 'bg_c3_shared_office_day_v1', text: '工作人员核对身份与授权材料，登记了查询请求，将原件还给他。你帮他把受理号码抄在文件袋外面。', effect: { heart: 1, flag: 'c3_xu_query_assisted' }, next: 'c3_s5_notice_end_0' })
put('c3_s5_notice_route', { speaker: 'sys', bg: 'bg_waiting_day_v2', text: '你把材料清单和窗口位置写清，许建平自己打电话确认了受理时间。他把纸折好，这次没有塞进旧报告中间。', next: 'c3_s5_notice_end_0' })
scene('c3_s5_notice_end', [
  ['xu', '这份复印件你可以留下，只用于帮我对这件事。查不到也告诉我，别因为怕我难受就一直拖着。', { image: 'item_missing_notice', effect: { item: 'c3_missing_copy', flag: 'c3_missing_notice' } }],
  ['me', '好。有消息先跟您核对，我们不拿一张像的照片就下结论。'],
  ['xu', '那会儿他总说不舒服，我嫌他念叨。找那张片，也是想知道那天到底怎么了。现在想跟他道个歉，连人在哪儿都不知道。'],
  ['sys', '许建平把原件收好，向窗口确认了下次补材料的日期。你等他走到电梯口，回来把受理号码抄进联系人栏。'],
  ['mei', '培训表给我，下午交接签一下。**下周一晨会**再问你五道题，就这些成像原理。今天先吃饭，别一听考核就不饿了。', { bg: 'bg_us_room_day' }],
  ['sys', '两周跟班结束，梅姐收好交接表，把晨会时间写给你。眼下总算能歇一会儿，你拉开柜门，收拾这几天攒下的小东西。', { end: true, effect: { gold: 120, flag: 'c3_shift5_done' } }],
], undefined, 'bg_waiting_day_v2')

// Course spine: short observations stay attached to the relevant examination.
steps.c3_s1_aunt_5.next = 'c3_s1_signal_0'
scene('c3_s1_signal', [
  ['me', '探头既发又收？我以为里面至少得分成喇叭和麦克风。'],
  ['mei', '这块**压电材料**能两头干活。给电脉冲，它振动发声；回声回来，又变回电信号。'],
  ['me', '所以得一发一等，不能光顾着喊。'],
  ['mei', '对。前面**匹配层**帮声音进出，后面**背衬**让它快点停。胶里别留气泡，你贴上试试。'],
], 'c3_s1_aunt_6')
steps.c3_s1_aunt_7.next = 'c3_s1_aunt_0'

steps.c3_s2_plan_5.next = 'c3_s2_pause_0'
steps.c3_s2_arrive_10.next = 'c3_s2_arrive_11'
steps.c3_s2_arrive_7.card = undefined
steps.c3_s2_plan_0.next = 'c3_s2_plan_3'
// Retired display-depth exercise: saved cursors keep one short continuation,
// without reopening the task or granting anything for the removed activity.
for (let index = 0; index < 4; index++) put(`c3_s2_depth_${index}`, {
  speaker: 'sys', bg: 'bg_us_room_day',
  text: '模体的显示范围已经放好。梅姐指指深处偏暗的部分，把补偿旋钮转到你手边。',
  next: 'c3_s2_plan_6',
})

scene('c3_s3_motion', [
  ['sys', '梅姐换好切面，在B超图上放下一条取样线。旁边多出一条长图，沿着时间留下室壁运动的轨迹。'],
  ['me', '黑白图明明已经在动了。这个**M超**，是专门盯着那一条线？'],
  ['mei', '对，我把运动画简单点，你来对一下：时间拖到哪儿，两边就对应哪一刻。', {
    tool: { kind: 'ultrasound', task: 'm_mode', title: '心超工作站 · 沿一条线看运动', prompt: '拖动时间线，对照B超里的界面与M超里的轨迹。', help: 'B超里先找准位置，M超反复看选中的同一条声线。竖着仍是深度，横着改为时间；界面一动，就留下位置变化的轨迹。', next: 'c3_s3_motion_3' },
  }],
  ['me', '原来**横轴是时间**，不是身体的左右。界面一动，这条轨迹也跟着起伏。'],
  ['mei', '就是这个意思。**B超先定位，M超把运动展开**，收缩、舒张时的位置变化就好对照了。再接着看血流。', { card: 'c3_echo' }],
], 'c3_wang_color_intro_0')
steps.c3_s3_xu_5.next = 'c3_s3_xu_6'
steps.c3_s3_xu_8.next = 'c3_s3_mirror_0'
steps.c3_s3_xu_9.bg = 'bg_us_room'

scene('c3_s4_doppler', [
  ['sys', '午后轮休，接班同事守着临床机。你交好上午的图像，和梅姐回到窗边，打开血流演示。这回可以盯着同一段，慢慢换方向。'],
  ['me', '看形状还是B超，红蓝这块又多看到了什么？'],
  ['mei', '血流在动，反回来的**声波频率**就会变。来，把方向掉个头，看看颜色跟不跟着换。'],
  ['mei', '一次先改探测角度，盯住同一条流动通道。', {
    tool: { kind: 'ultrasound', task: 'doppler', title: '教学台 · 血流往哪儿走', prompt: '转动声束方向，看看频移怎么变，再切换血流方向。', help: '按这里的图例，朝向探头是红色，远离是蓝色，不表示动脉和静脉。血流越接近与声束垂直，能测到的频移越小，但管道里的流动并没有停止。', next: 'c3_s4_doppler_4' },
  }],
  ['me', '形状还在，**频移却小了**。光看这一张，我还以为里面突然不流了。'],
  ['mei', '所以**方向、角度和图例**一起留。B超看位置，D型看运动带回的频率变化，别把两块当同一张图染个色。', { card: 'c3_trace' }],
], 'c3_s4_han_end_5')

// Workaday detours remain available, but never replace the fourth-shift lesson.
steps.c3_s4_hub.choices!.splice(-1, 0,
  { text: '陪梅姐核一眼耦合剂用量账', next: 'c3_s4_cost_0', cond: { ap: 1, notFlag: 'c3_gel_account_done' }, effect: { ap: -1 } },
  { text: '去办公室递回收核对单', next: 'c3_s4_han_0', cond: { ap: 1, notFlag: 'c3_han_met' }, effect: { ap: -1 } },
)
steps.c3_s4_cost_end_1.effect = { ...steps.c3_s4_cost_end_1.effect, flag: 'c3_gel_account_done' }
steps.c3_s4_cost_end_1.next = 'c3_s4_hub'
steps.c3_s4_han_0.text = '小雷在诊室门口递给你一份核对单：“厂家韩经理来核试运行设备。麻烦带到办公室，我拿编号表就过来。”你送到桌边，发现其中一栏只写了“**相关留存件**”。'
steps.c3_s4_han_0.next = 'c3_s4_han_3'
steps.c3_s4_han_4.text = '今天只核对，不带走。我重新列编号，交院方确认。'
steps.c3_s4_han_note.card = undefined
steps.c3_s4_han_ask.card = undefined
steps.c3_s4_han_note.next = 'c3_s4_han_end_4'
steps.c3_s4_han_ask.next = 'c3_s4_han_end_4'
steps.c3_s4_han_end_4.text = '我再核**最早那版附件**，别把它跟终端一起回收。你去跟梅姐，剩下这几项我交院里对。'
steps.c3_s4_wen_0.next = 'c3_s4_wen_1'
steps.c3_s4_wen_1.text = '喂，听得见吗？**核对联**留在院里吧？**新版附件**我这儿也有，院里要核，我按正式渠道交。'
steps.c3_s4_wen_1.voice = 'vox_trilogy_wen_v2'
steps.c3_s4_wen_1.next = 'c3_s4_wen_4'
steps.c3_s4_wen_4.text = '你把雯雯说的附件名称记在核对单旁，发给小雷，收起手机回诊室。梅姐正在找你。'
steps.c3_s4_wen_4.next = 'c3_s4_hub'

// A few optional lines receive the old paper; the capstone stays on imaging.
steps.c3_s5_hub.choices!.splice(-1, 0,
  { text: '到窗口帮许建平递查询资料', next: 'c3_s5_notice_0', cond: { ap: 1, notFlag: 'c3_missing_notice' }, effect: { ap: -1 } },
)
steps.c3_s5_notice_0.next = 'c3_s5_notice_3'
steps.c3_s5_notice_3.text = '那阵子跑长途，老说等下一趟。后来想问他哪儿不舒服，已经找不着人了。今天把能补的材料补齐吧。'
steps.c3_s5_notice_end_0.text = '这份副本留给受理人员，只用来核我父亲这件事。今天你们还有培训，我去窗口等。'
steps.c3_s5_notice_end_0.next = 'c3_s5_notice_end_3'
steps.c3_s5_notice_route.text = '你写清窗口位置，许建平自己过去递交。工作人员核过材料，留下副本，将原件还给他。'
steps.c3_s5_notice_end_3.text = '窗口登记好请求，许建平收起原件。你陪他确认联系人，又看了一眼时间，该回梅姐那边了。'
steps.c3_s5_notice_end_3.effect = { flag: 'c3_xu_query_started' }
steps.c3_s5_notice_end_3.next = 'c3_s5_hub'
steps.c3_s5_notice_end_5.bg = 'bg_us_room_day'
steps.c3_s5_notice_end_5.text = '你答应一声，回诊室放好培训表。梅姐收起交接材料，把晨会时间写给你。你拉开柜门，拿上自己的东西，去找他们吃饭。'
steps.c3_s5_notice_end_4.next = 'c3_tang_return_0'
scene('c3_tang_return', [
  ['sys', '你收好培训表，出去接水。小唐刚交完单子，正靠着走廊的窗台拆一包饼干。'],
  ['tang', '两周这么快就完了？明天回去上班？', { giftTo: 'tang' }],
  ['me', '先过晨会这关。梅姐说考成像原理，我现在看什么都像会出题。'],
  ['tang', '那先别看我。走，吃饭去，老周还等着听你这两周的事呢。'],
], 'c3_s5_notice_end_5', 'bg_waiting_day_v2')
steps.c3_s2_finish_1.card = 'c3_compare'

// Every real examination acquires before revealing its result. These nodes carry
// no clinical judgement or reward; leaving a completed acquisition reveals next.
const acquisitions: [string, string, string, string, string, string][] = [
  ['c3_s1_aunt_4', 'c3_s1_aunt_scan', 'c3_s1_aunt_8', 'bg_us_room_day', '乳腺超声 · 梅姐持探头扫查', '梅姐拉好帘子，在临床机上开始扫查。你站在显示器侧，等她确定要保存的切面。'],
  ['c3_s1_stone_2', 'c3_s1_stone_scan', 'c3_s1_stone_3', 'bg_us_room_day', '腹部超声 · 梅姐持探头扫查', '梅姐换好腹部探头，先问清疼痛位置，再沿着声窗扫查。你按她的示意记录切面，患者不舒服时她就停下来调整。'],
  ['c3_s2_arrive_6', 'c3_s2_cousin_scan', 'c3_s2_arrive_7', 'bg_us_room_day', '产科超声 · 梅姐持探头扫查', '表姐躺稳，梅姐开始检查，按顺序寻找需要观察的结构。你收好手机，留在工作站旁，等她保存测量切面。'],
  ['c3_liver_arrive_4', 'c3_liver_scan', 'c3_liver_tgc_intro_0', 'bg_us_room_day', '腹部超声 · 梅姐采集肝肾切面', '梅姐在右上腹换了几个角度，找到同时显示肝脏与右肾的切面。你在工作站旁等她保存图像。'],
  ['c3_s3_wang_4', 'c3_s3_wang_scan', 'c3_s3_wang_5', 'bg_us_room_day', '超声心动图 · 梅姐采集心脏切面', '王叔按梅姐的指示躺好。她从声窗寻找心脏切面，你帮忙标记、留存她选定的图像。'],
  ['c3_s3_mirror_0', 'c3_s3_bedside_scan', 'c3_s3_mirror_1', 'bg_us_bedside', '床旁超声 · 梅姐持探头采集', '床旁团队让出位置，梅姐在患者身边扫查。你看着移动机上的采集状态，保存她选定的膈肌附近切面。'],
  ['c3_s3_xu_2', 'c3_s3_xu_scan', 'c3_s3_xu_3', 'bg_us_room_day', '腹部超声 · 许建平本次检查', '许建平收好外套，梅姐核对开单问题后开始腹部扫查。你按她的指示留存切面，旧病历的话题等检查完成再接着谈。'],
]
for (const [from, id, next, bg, label, text] of acquisitions) {
  steps[from].next = id
  put(id, { speaker: 'sys', text, bg, next,
    scan: { kind: 'ultrasound', label, durationMs: 3000, sound: 'trilogy_us_scan_v2' } })
}

// Lunch gives the first shift time to breathe before its final handover.
steps.c3_s1_gain_2.next = 'c3_s1_lunch_0'
scene('c3_s1_lunch', [
  ['sys', '午后轮休，接班同事守着诊室，你和梅姐才到休息室打开饭盒。小何来送补签的申请单，手里还捏着一根没拆的勺子。', { image: 'cg_c3_shared_lunch_v2', imageLabel: '轮休时一起吃几口饭', closeup: true }],
  ['he', '你们这边有多的筷子吗？我早上记得带了，刚才发现带的是两根吸管。'],
  ['mei', '最下面那格。拿两双，免得等下又回来拿我的。'],
  ['me', '您每个柜子都知道，我第一天就能认出纸巾那格。'],
  ['mei', '吃完去看。抽屉有字，你别把找柜子当今天唯一学会的。'],
  ['he', '我先接个电话。等下回来拿勺子，别给我收了，我可就这一根。', { voice: 'vox_trilogy_he_v2' }],
], 'c3_s1_gain_3', 'ch2_bg_breakroom_day')

// Chapter shop finds use the ordinary choices and visit-local return paths.
// Buying alone does not grant a badge; the completed scene consumes the item.
for (let shift = 1; shift <= 5; shift++) {
  const hubId = `c3_s${shift}_hub`
  const towel = `c3_s${shift}_towel_use`
  const stickers = `c3_s${shift}_stickers_use`
  steps[hubId].choices!.splice(-1, 0,
    { text: '拿口袋小毛巾，收拾窗边教学台', next: `${towel}_0`, cond: { item: 'c3_pocket_towel', notFlag: 'c3_towel_used' } },
    { text: '拿杯子姓名贴，跟梅姐认一认杯子', next: `${stickers}_0`, cond: { item: 'c3_cup_stickers', notFlag: 'c3_stickers_used' } },
  )
  scene(towel, [
    ['sys', '你把新毛巾留在窗边教学台，擦掉桌沿的耦合剂。掀起台垫时，下面露出一个旧相片角。'],
    ['me', '底下还压着张照片。您抱的这个，是以前的超声机？'],
    ['mei', '教学模体。那年培训合照，别人都抱花，我出来得晚，只抓住这块。你往后翻，还印着大家的名字。'],
    ['me', '这边这位笑得这么厉害，是不是拍照的人一直让您换个东西抱？'],
    ['mei', '是主任。他自己抱着一箱打印纸，也没好到哪儿去。照片收回台垫底下，毛巾就放教学台这格吧。', { effect: { loseItem: 'c3_pocket_towel', flag: 'c3_towel_used', badge: 'c3_training_photo' } }],
  ], hubId, 'bg_us_room_day')
  scene(stickers, [
    ['sys', '你把一包姓名贴放在休息室桌上。梅姐端来两只都写着“梅”的杯子，决定先给那只漏水的贴上“别倒水”。'],
    ['me', '还发现第三只。杯底怎么写着“奖品，不喝”？'],
    ['mei', '培训答题赢的，盖子拧不开。小何修了半天，最后说当笔筒挺好。'],
    ['me', '我给它贴“笔筒”，这回名副其实。'],
    ['mei', '行，剩下这张我拿去贴小何的勺子。她老把勺子落这儿，下回来了让她自己认领。', { effect: { loseItem: 'c3_cup_stickers', flag: 'c3_stickers_used', badge: 'c3_cup_detective' } }],
  ], hubId, 'ch2_bg_breakroom_day')
}

// The quiz returns here, rather than skipping directly to a certificate.
scene('c3_epilogue', [
  ['sys', '晨会散场，你把笔放回口袋。梅姐没有问你得了几分，先问：“早饭吃了没？”', { bg: 'bg_us_room_day' }],
  ['me', '考前吃了半个包子，另一半一直在等考后。', { bg: 'bg_us_room_day' }],
  ['mei', '那它比你有耐心。拿走吧，别把最后一天过成胃痛会诊。', { bg: 'bg_us_room_day' }],
  ['sys', '梅姐把你的设置记录和第一天选探头那页夹在一起。“带回去，别只拿走盖章那页。”你把它们一起收好。', { bg: 'bg_us_room_day', image: 'item_notebook', effect: { flag: 'c3_mei_feedback' } }],
  ['mei', '以后有图拿不准就来，最好提前打电话。我正在扫人的时候，可不能边握探头边替你找文件。', { bg: 'bg_us_room_day' }],
  ['sys', '几天后，专科医生结合表姐的详细检查和咨询，安排她到市里补充胎儿MRI。你调好休息，陪她坐早班车。', { bg: 'bg_day' }],
  ['cousin', '这次我提前两个小时出门。你别笑，我已经把堵车的钱都算进车票了。', { bg: 'bg_day' }],
  ['me', '我没笑。我在想早餐是不是也算进去了。', { bg: 'bg_day' }],
  ['sys', '到了市里，表姐把检查单往你手里一塞，自己先去找厕所。你抱着包和外套坐下来，刚拿出手机，她又探头问你带没带纸。', { bg: 'bg_waiting_day_v2' }],
  ['cousin', '手机替我拿着。要是家里问，就说我在按计划检查，别帮他们直播每一分钟。', { bg: 'bg_waiting_day_v2' }],
  ['sys', '你把手机静音。墙上的钟走得很慢，叫号屏换了好几次名字。', { bg: 'bg_waiting_day_v2' }],
  ['sys', '检查做完，表姐坐回你身边。报告还没出来，她把产检本翻开又合上，连上面翘起来的贴纸都捋平了。', { bg: 'bg_waiting_day_v2' }],
  ['cousin', '是不是还得等会儿？我现在也不知道饿不饿。', { bg: 'bg_waiting_day_v2' }],
  ['me', '等会儿一起去吃。先喝口水，我在这儿呢。', { bg: 'bg_waiting_day_v2' }],
  ['sys', '几周后，产科结合复核情况安排了**胎儿MRI**，你陪表姐到了市医院。检查已经做完，**报告还没出来**。她把产检本翻开又合上，你抱着两个人的外套，坐在她旁边。', { bg: 'bg_waiting_day_v2', effect: { flag: 'c3_cousin_mri_pending' } }],
  ['sys', '那周回放射科，老周的桌上多了几本MRI设备资料。你刚放下饭盒，他就把一张需求表推过来。', { bg: 'bg_c3_shared_office_day_v1' }],
  ['zhou', '还没定哪台呢。主任让你先跟设备科聊聊，咱们常做什么、病人最不方便的是什么，先弄清楚。', { bg: 'bg_c3_shared_office_day_v1' }],
  ['me', '还没选机器，先选中我干活了。我去找老范借清单，别等看中一台，才发现搬不进来。', { bg: 'bg_c3_shared_office_day_v1' }],
  ['sys', '你把B超切面、M超时间记录和血流演示分好，装进包里。梅姐将反馈页塞回夹层，指指桌上：你的半个包子还没拿。', { bg: 'bg_us_room_day' }],
  ['me', '收到。包子带走，纸巾留在右边第二格，下个学生不用满屋找了。', { bg: 'bg_us_room_day' }],
  ['sys', '诊室的门开了，里面叫到表姐的名字。她攥住你的袖口，声音很轻：“你跟我一起。”你抱紧报告袋，陪她站了起来。第三章「回声」结束。', { bg: 'bg_waiting_day_v2', end: true, effect: { flag: 'c3_completed' } }],
])

// Finish the ultrasound farewell/next-year teaser before the family's MRI wait.
// Earlier travel cursors remain compatible, without revealing the old result.
steps.c3_epilogue_4.next = 'c3_epilogue_18'
steps.c3_epilogue_18.next = 'c3_epilogue_19'
steps.c3_epilogue_19.next = 'c3_epilogue_15'
steps.c3_epilogue_15.next = 'c3_mri_selection_2'
steps.c3_epilogue_17.next = 'c3_mri_selection_2'
scene('c3_mri_selection', [
  ['zhou', '先把需求问全。宣传册上的数字我也会圈，可圈完还是得问，咱们每天做的检查能不能接住。'],
  ['me', '那我带着问题去问。候诊座位也记上，表姐这回等了一上午，片袋都快被我抱热了。'],
  ['zhou', '**明年想上MRI**，主任让你跟设备科**先问需求**。哪台还没定，别急着圈最贵的，先吃饭，下午再看。', { effect: { flag: 'c3_mri_selection_task' } }],
], 'c3_epilogue_14', 'bg_c3_shared_office_day_v1')
steps.c3_epilogue_14.next = 'c3_cousin_mri_wait_0'
scene('c3_cousin_mri_wait', [
  ['cousin', '里面怎么响成那样，我躺着都不敢动。……片子还没好吗？'],
  ['me', '还没。你刚才躺着，我在外面看钟，也没好到哪儿去。包给我，先别来回翻了。'],
], 'c3_epilogue_20', 'bg_waiting_day_v2')

// Small handovers keep examinations, teaching and breaks in their actual order.
// These are ordinary dialogue nodes: no extra choices, AP cost or rewards.
steps.c3_s1_aunt_13.next = 'c3_s1_between_patients_0'
scene('c3_s1_between_patients', [
  ['me', '刚才她那几个袋子，我生怕收错一个，把旧片给落下了。'],
  ['mei', '片子都在她手里，我看着呢。你先喝口水，笔还夹在耳朵上，不用找了。'],
], 'c3_s1_stone_0')

for (const id of ['c3_s2_plan_3', 'c3_s2_plan_4']) steps[id].bg = 'bg_waiting_day_v2'
scene('c3_s2_pause', [
  ['mei', '到了产科就好。水在桌上，先喝两口。'],
  ['me', '那天在电话里什么都敢答应。真陪她坐到这儿，我倒不知道说什么了。'],
  ['sys', '梅姐没催你。你坐了一会儿，回完表姐的消息。窗口那边叫了下一位，她把空椅子往你这边挪了挪。'],
], 'c3_liver_arrive_0')

steps.c3_s3_wang_9.next = 'c3_s3_after_wang_0'
scene('c3_s3_after_wang', [
  ['me', '他一说烧饼，我现在也有点饿了。'],
  ['mei', '抽屉里有饼干，垫两口。下一位还没到号，先把资料收好，我也喝口水。'],
], 'c3_s3_waiting_0')

steps.c3_s3_xu_8.next = 'c3_s3_leave_clinic_0'
scene('c3_s3_leave_clinic', [
  ['sys', '许建平收好报告，道了声谢，往门诊去了。你回诊室整理台面。墙上的钟快到六点，梅姐接到病区确认电话，招呼你推车出发。'],
  ['me', '这轮子不响的时候，我都不习惯了。刚才还想是不是忘了推车。'],
  ['mei', '省得我回头找你。慢点，电梯门口有道坎。'],
], 'c3_s3_mirror_0', 'bg_waiting_day_v2')

steps.c3_s4_hub.choices!.at(-1)!.next = 'c3_s4_open_clinic_0'
scene('c3_s4_open_clinic', [
  ['sys', '回到诊室，你把之前的检查调到工作站，帮梅姐叫进今天的血管检查患者。她核对申请、开始扫查，你在旁边留意灰阶和血流模式怎样切换。'],
  ['sys', '一上午跟着叫号、留图、递报告，桌上的申请单终于薄下来。最后一位检查结束，在门外等报告；梅姐坐回工作站，你才发现自己的笔帽不见了。'],
  ['mei', '在键盘旁边。你今天捡了三次，别又拿走笔，把帽留给我。'],
], 'c3_s4_clinic_0')

const cards: TrilogyChapter['cards'] = {
  c3_liver_compare: { title: '肝和肾，放一起看', body: '同一画面、相近深度比较肝实质与右肾皮质的回声亮度。肝明显偏亮可支持脂肪肝的判断；不与肾中央本来就亮的肾窦相比。增益、深度和肾脏本身的情况都会影响对照，医师还要核对其他切面和检查结果，不能单凭亮度定诊断或严重程度。', image: 'us_c3_hepatorenal_v1' },
  c3_probe: { title: '探头发，也收', body: '压电材料把电脉冲变成机械振动发声，再把返回振动变成电信号。探头里的保护/匹配层、吸声材料和阵元各有作用；外形要适合目标深度和声窗。' },
  c3_frequency: { title: '细一点，还是深一点', body: '同一介质中频率越高、波长越短。高频有利于细节，却通常衰减更快；选择探头时同时看目标深度、声窗和所需分辨能力。', image: 'us_breast' },
  c3_breast: { title: '一份回波，两种显示', body: 'A型把回波显示为峰，峰的位置对应深度、高度对应强度。B超将回波强度转为亮度，并组合不同位置的声线形成切面。它与X光提供的信息不同，旧片仍要一起对照。', image: 'us_breast' },
  c3_shadow: { title: '黑影与后方增强', body: '前方强反射或强衰减，后方回声减少，可出现声影。低衰减结构后面则可能比同深度周围更亮。先比较位置与其他切面，不把所有黑区或亮区直接叫病。', image: 'us_gallstone' },
  c3_compare: { title: '只补深处这一段', body: '回波往返距离增大，衰减更明显。TGC按到达时间/深度改变接收增益，整体增益则影响整幅显示。比较时用同一目标、同一频率，观察调节前后的变化。补偿没有创造未收到的信息。' },
  c3_ventricle: { title: '二维切面与三维脸照', body: '三维超声由不同位置的二维信息或容积采集经处理形成；动态三维再随时间更新。表姐的结构评估仍需要二维切面，面部显示没有替代测量与医师随访。', image: 'us_fetal' },
  c3_depth: { title: '看得更深，等得更久', body: '系统用回波往返时间估计深度。显示过浅会截掉目标，过深会让目标缩小、等待更多；增加显示深度不是增加声波穿透能力，也可能影响帧频。' },
  c3_bedside: { title: '能跟上运动的画面', body: '超声可以快速动态观察。每帧的声线数、显示深度和往返等待共同影响更新速度；床旁仍需电量、连接、患者及任务的真实交接，不能只有屏幕亮着。' },
  c3_echo: { title: 'M超的横轴是时间', body: 'M超反复检测同一条声线，纵轴深度、横轴慢时间，亮度代表回波强度。B超先定位，M超再观察该线上的界面运动；心超不是直接证明冠脉支架通畅。', image: 'us_echo' },
  c3_mirror: { title: '回声绕路以后', body: '系统按直线传播和近似一致的声速估计位置。回声多走了一段路，机器却按直线推算，就可能画出重复的结构。换声窗、换角度，再与其他切面对照。', image: 'us_mirror' },
  c3_gel: { title: '胶为什么接得上', body: '探头与皮肤间的空气层会造成很强的反射，耦合剂减少这一影响。不能为了用量账削弱接触；库存损耗与产品、院感要求另行核对，不混装补灌。' },
  c3_trace: { title: '红蓝相对探头', body: 'D型利用运动产生的回波频移。按本演示图例，红朝向探头、蓝远离，不是动静脉标签；频移与声束方向的运动分量有关，接近垂直时变小不代表停流。' },
  c3_gain: { title: '两个目标，怎样分开', body: '沿声束前后排列的目标，短脉冲使回波更不容易重叠，体现轴向分辨；横着并排的目标，窄声束更容易区分，体现侧向分辨。增加线数是采样更密，不是自动缩短脉冲或收窄声束；还要比较帧率。' },
}

const book: TrilogyChapter['book'] = [
  { title: '01 · 一块晶片，两次转换', body: '给压电材料施加电场，它产生机械振动；回声施加机械作用，它又产生电信号。一次发射后留出接收时间，是脉冲回波成像的起点。探头不是把摄像机伸进身体。' },
  { title: '02 · 回来晚，就放得深', body: '回波到达时间对应声波的往返路程。系统按约定声速估计距离，往返时间乘声速后要分成去、回两程。同一声速下，回波越晚到，目标就被显示得越深。' },
  { title: '03 · 界面不只是一条外轮廓', body: '声阻抗与介质密度、声速有关。不同声学性质的界面产生反射，组织非均匀性还产生散射；回波的位置、强弱和其他信息共同形成画面。空气层会强烈影响声耦合。' },
  { title: '04 · A型到B超', body: 'A型以峰的位置和高度表示深度及回波强度。B超把强度变成亮度，再排列不同位置的声线，形成二维切面。同一份回波，可以看峰，也可以看亮点。' },
  { title: '05 · 高频不是更大的音量', body: '声速一定时，高频对应短波长，有利于分辨细节，但通常衰减更明显。深部目标与浅表目标不能只凭“数字更高”选探头。频率、接收增益与发射输出是不同事情。' },
  { title: '06 · 深度与等待', body: '显示深度限定保留的距离范围。截掉目标当然不合适，留过多深部空白也会改变目标在屏幕上的比例。更远的回波需要更长往返等待，深度还参与帧频取舍。' },
  { title: '07 · 整体增益和TGC', body: '整体增益一起改变显示信号的强弱；TGC按回波到达时间、也就是估计深度分段补偿。深部衰减明显时，不能只把整幅推白。两者都没有增加发射功率或补回未接收到的信息。' },
  { title: '08 · 两个目标分不开', body: '沿声束方向看轴向分辨，脉冲越短，邻近界面的回波越不容易重叠。与声束横着并排看横向分辨，声束宽度是重要因素。显示得大、线排得密，不等于这些物理限制自动消失。' },
  { title: '09 · M超只跟一条线', body: '反复检测同一条声线，将深度方向的回波亮点沿慢时间展开，就得到M超。横轴是时间，不是另一个空间方向；运动界面形成随时间起伏的轨迹。' },
  { title: '10 · 先用B超定位，再用M超观察', body: 'B超帮助找到结构与合适的观察线，M超记录这条线上界面的位置和运动。对照同一时刻，B超图里的界面深度应能在M超图上找到；一段时间排开，就能看出它的运动轨迹。' },
  { title: '11 · 同样是后面，一黑一亮', body: '强反射或强衰减物后面回声减少，可出现声影；低衰减结构后方回声可能强于同深度周围。胆石切面与教学液体目标用于观察这种差别，不用单个亮暗征象独立定性。' },
  { title: '12 · 机器用了哪些近似', body: '系统估计位置时，通常把声束当作直线传播，并采用统一的声速；补偿也借助对衰减的估计。回声实际走的路不符合这些假定，就可能画错位置，例如镜像伪影。换声窗复核，能帮助判断这种重复影像。' },
  { title: '13 · D型多出的是频移', body: '探头和运动散射体之间的相对运动使接收频率与发射频率不同。D型利用这项频移信息观察血流等运动。它与显示回波强度的B超回答不同问题，不是给灰阶结构随便上色。' },
  { title: '14 · 颜色先看图例', body: '本章演示使用红朝向探头、蓝远离的方向图例。红蓝不对应动脉和静脉，也不自动表示疾病；检查时应先核实当前颜色图例、探头方向与位置。' },
  { title: '15 · 角度改变，频移改变', body: '运动在声束方向的分量决定可检测频移。接近垂直时频移变小，不能把这一帧读成没有血流。要由频移估计速度，还需要知道发射频率、声速与探测角度。' },
  { title: '16 · 密一点，慢一点', body: '同一简单逐线采集模型中，每帧扫描线更多、显示更深，会增加累计往返等待并限制帧频。线数影响横向采样密度，帧频影响跟上运动的能力；先看任务，再选择取舍。' },
  { title: '17 · 每次只改一个条件', body: '比较频率时保留目标和其他条件；比较TGC时保留探头和频率；比较扫描线与深度时同时查看更新速度。将改变前后的图像和设置放在一起，才能分清差别来自哪里。' },
  { title: '18 · 声束也有宽度', body: '阵元产生的声场由各部分贡献叠加。近场可有明显起伏，远场声束逐渐扩散。声压是相对平衡压强的变化，声强描述单位面积上的平均声能流；同种介质中声强与声压幅值平方相关。分贝用于比较相对强弱，声阻抗与密度和声速有关。' },
  { title: '19 · 三维再加一个时间', body: '三维显示可以由多位置二维信息或容积采集经处理形成；动态三维加入随时间的更新。立体脸照不能替代二维结构检查。其他应用还有：用微泡增强回波的超声造影、观察组织受力响应的弹性成像，以及用于治疗的聚焦超声。' },
  { title: '20 · 为什么在床旁好用', body: '超声便于动态和重复观察，不使用X射线；气体和骨骼会限制深部观察，结果受声窗、操作和参数影响。声学输出仍有热与机械效应，不能因为“没有X光”就无限增大输出。' },
]

const quiz: TrilogyChapter['quiz'] = [
  { q: '医学诊断用超声的频率范围一般是：', options: ['20 Hz～20 kHz', '1 MHz～20 MHz', '20 kHz～1 MHz', '大于 100 MHz'], answer: 1, explain: '医学诊断用超声通常使用兆赫兹频段，一般为1 MHz～20 MHz。' },
  { q: '医学超声成像中，超声波主要以纵波形式传播。下列关于纵波的说法正确的是：', options: ['质点的振动方向与波的传播方向垂直', '质点的振动方向与波的传播方向平行', '只能在固体中传播，不能在液体中传播', '传播过程中介质质点随波一起向前迁移'], answer: 1, explain: '纵波中，介质质点沿着与波传播平行的方向来回振动。' },
  { q: '超声波的声阻抗（特性阻抗）定义为：', options: ['声压与声强之比', '声强与声压之比', '介质密度与声速的乘积', '介质密度与频率的乘积'], answer: 2, explain: '声阻抗等于介质密度与声速的乘积。' },
  { q: '按声阻抗大小，人体组织可分为三类，超声检测主要适用于其中的：', options: ['低声阻的气体或充气组织（如肺）', '中等声阻的液体和软组织（如肌肉）', '高声阻的矿物组织（如骨骼）', '三类组织均同样适用'], answer: 1, explain: '液体和软组织适合超声观察，气体与骨骼会明显限制声波进入深部。' },
  { q: '如果交界面两侧声阻抗相差悬殊，声波会：', options: ['全反射', '全透射', '不发生反射', '半反射半透射'], answer: 0, explain: '声阻抗差异极大时，绝大部分声能在界面反射，透过去的很少。' },
  { q: '关于压电效应，下列说法正确的是：', options: ['正压电效应是机械能转化为电场能，用于超声波的接收', '正压电效应是电场能转化为机械能，用于超声波的发射', '逆压电效应是机械能转化为电场能，用于超声波的接收', '压电效应只存在于电磁场中，与机械振动无关'], answer: 0, explain: '接收用正压电效应，把机械振动转成电信号；发射用逆压电效应。' },
  { q: '通过什么方法可以得到较长的近场区：', options: ['使用高频探头', '减小阻尼', '减小探头直径', '增大阻尼'], answer: 0, explain: '探头直径不变时，频率越高、波长越短，近场区越长。' },
  { q: '关于超声回波携带的信息，下列说法正确的是：', options: ['反射回波主要携带组织细微结构信息，散射回波主要携带位置信息', '反射回波主要携带位置信息，散射回波主要携带组织细微结构信息', '反射回波与散射回波均只携带位置信息', '反射回波与散射回波均只携带血流速度信息'], answer: 1, explain: '界面反射帮助确定位置，组织内部散射提供细微结构信息。' },
]

// Physical equipment stays distinct from clinical images and calculation canvases.
const showObject = (ids: string[], image: string, imageLabel: string) => {
  for (const id of ids) Object.assign(steps[id], { image, imageLabel, imageKind: 'object' })
}
showObject(['c3_s1_probes_0', 'c3_s1_probes_1', 'c3_s1_probes_2', 'c3_s1_signal_0', 'c3_s1_aunt_7'], 'item_c3_probes_v1', '线阵 · 凸阵 · 相控阵探头')
showObject(['c3_s1_signal_3', 'c3_s4_pack_0', 'c3_s4_pack_1', 'c3_s4_pack_2', 'c3_s4_cost_1', 'c3_s4_cost_limit', 'c3_s4_cost_mix', 'c3_s4_cost_end_0'], 'item_c3_gel_supplies_v1', '耦合剂 · 独立包装 · 加温设备')
showObject(['c3_s2_depth_0', 'c3_s5_mei_0', 'c3_s5_mei_1', 'c3_s5_assess_0'], 'item_c3_us_phantom_v1', '教学用超声模体')
showObject(['c3_s4_lei_0', 'c3_s4_lei_1', 'c3_s4_lei_2', 'c3_s5_lei_0', 'c3_s5_lei_1', 'c3_s5_lei_2'], 'item_c3_label_printer_v1', '标签机与卷纸')
showObject(['c3_s5_mei_2'], 'item_c3_probe_card_v1', '梅姐的探头小卡')
showObject(['c3_s3_bag_2'], 'item_c3_towel_v2', '阿姨缝的擦镜布')
for (let shift = 1; shift <= 5; shift++) {
  showObject([1, 2, 3, 4].map(index => `c3_s${shift}_towel_use_${index}`), 'item_c3_training_photo_v1', '梅姐留在教学台下的培训合照')
}
steps.c3_s1_aunt_6.tool!.objectImages = {
  '线阵': 'item_c3_probe_linear_v1', '凸阵': 'item_c3_probe_convex_v1', '相控阵': 'item_c3_probe_phased_v1',
}
cards.c3_probe.image = 'item_c3_probes_v1'
cards.c3_gel.image = 'item_c3_gel_supplies_v1'
cards.c3_compare.image = 'item_c3_us_phantom_v1'
cards.c3_trace.image = 'us_c3_color_doppler_v1'

// A phone counterpart is explicit for the whole call, even on the protagonist's reply.
for (const id of ['c3_s4_zhou_0', 'c3_s4_zhou_1', 'c3_s4_zhou_2']) {
  Object.assign(steps[id], { phone: 'char_zhou', sprite: '', sprite2: '' })
}
for (const id of ['c3_s4_wen_0', 'c3_s4_wen_1', 'c3_s4_wen_2', 'c3_s4_wen_3']) {
  Object.assign(steps[id], { phone: 'char_wen', sprite: '', sprite2: '' })
}
installCh3PictureObservations(steps)
applyCh3Staging(steps)
const adaptPlaces = installCh3Places(steps)

function adapt(id: string, step: TrilogyStep, state: GameState): TrilogyStep {
  const place = adaptPlaces(id, step, state)
  if (place) return place
  const progress = state.dlc?.ch3?.chapter
  const tools = progress?.tools
  const liverAcquired = !!progress?.scans?.c3_liver_scan?.completed
    || !!progress?.visited.includes('c3_liver_observe')
  // Keep the old exercise receipt/slider values. An old cursor before this
  // patient still finishes its original phantom, then meets the patient once.
  if (id === 'c3_s2_plan_6') {
    if (tools?.c3_s2_plan_6?.completed) return { ...step, tool: undefined,
      text: '深部补偿已经调过了。梅姐叫你把前后两张放在一起，再看看浅处的层次。', next: 'c3_s2_finish_0' }
    if (!liverAcquired) return { ...step,
      text: '模体深处还有些暗。先试试整体增益，再用深部补偿，看看浅处会不会一块儿变白。',
      tool: { ...step.tool!, variant: undefined, image: undefined, title: '教学台 · 深处为什么更暗' } }
  }
  if (/^c3_s2_finish_[012]$/.test(id)) return { ...step,
    ...(liverAcquired ? { image: 'us_c3_hepatorenal_v1', imageLabel: '肝脏与右肾 · 同一切面', sprite: '', sprite2: '' }
      : id === 'c3_s2_finish_0' ? { text: '把调整前后的图放一起，看看深处，再看看浅处。**深度和补偿设置**也记上，下次才知道改了什么。' } : {}),
    next: id === 'c3_s2_finish_2' ? liverAcquired ? 'c3_liver_observe' : 'c3_liver_arrive_0' : step.next }
  if (/^c3_liver_tgc_intro_[01]$/.test(id) && tools?.c3_s2_plan_6?.completed) return { ...step,
    text: '这张的深部补偿已经调好。梅姐把画面停住，让你先认一认里面的结构。', next: 'c3_liver_observe' }
  // Older saves may already have sent Wang back to cardiology before the
  // M-mode recap. Do not put him back on the bed or run his reporting twice.
  if (/^c3_s3_motion_[0-4]$/.test(id)) {
    const reviewed = !!state.flags.c3_wang_reviewed
    return { ...step,
      ...(reviewed ? { sprite: 'char_mei', sprite2: '', ...(id === 'c3_s3_motion_0'
        ? { text: '王叔已经回心内科了。梅姐把刚才存的图调出来，指着旁边沿时间展开的运动轨迹，让你再对一对。' } : {}) } : {}),
      ...(id === 'c3_s3_motion_2' && tools?.c3_s3_motion_2?.completed
        ? { tool: undefined, text: '时间线已经对过了。梅姐指指刚才的取样线，等你说说看出来的变化。', next: 'c3_s3_motion_3' } : {}),
      ...(id === 'c3_s3_motion_4' && reviewed
        ? { text: '对，B超先找位置，M超再沿时间看。图收好了，下一位到号了。', next: 'c3_s3_waiting_0' } : {}),
    }
  }
  if (id === 'c3_s5_cousin_check_1' && state.flags.c3_cousin_followup_stable) return { ...step,
    text: '她按安排复查，最近踏实多了。不过有时候刷到网上的消息，还是会发过来问我。' }
  // Old saves inside the removed city-trip sequence resume with one bridge,
  // then join the current follow-up; no new visit or reward is fabricated.
  if (/^c3_epilogue_(?:[5-9]|1[0-3])$/.test(id)) return { ...step,
    speaker: 'sys', sprite: '', sprite2: '', phone: undefined, image: undefined, imageLabel: undefined,
    voice: undefined, effect: undefined, card: undefined, choices: undefined, closeup: false,
    text: state.flags.c3_cousin_followup_stable
      ? '你翻到表姐之前发来的消息，又把下次复查的时间标进日历。这次谁也没忘。'
      : '表姐的补充检查安排在两周跟班结束之后。你把陪她去市里的那天圈出来，提前换好了休息。',
    next: 'c3_epilogue_14' }
  // The practice moved before the patient. Older in-patient cursors finish the
  // same task then go straight to acquisition, never re-introducing the aunt.
  const auntArrived = progress?.visited.includes('c3_s1_aunt_0') ?? false
  if (id === 'c3_s1_aunt_5' && tools?.c3_s1_aunt_6?.completed) {
    return { ...step, text: '教学探头已经放回软垫。梅姐核过上午的申请单，招呼你回临床机旁。', image: undefined, imageLabel: undefined, closeup: false,
      next: auntArrived ? 'c3_s1_aunt_scan' : 'c3_s1_aunt_0' }
  }
  if (id === 'c3_s1_aunt_5' && auntArrived) {
    return { ...step, text: '梅姐示范了一下探头贴合的手势。你在旁边的教学模体上试过后，就回到工作站看她检查。', imageLabel: '教学模体 · 探头接触与持握' }
  }
  if (id === 'c3_s1_aunt_7') {
    const choice = tools?.c3_s1_aunt_6?.choice?.replace(/^assisted:/, '')
    return { ...step, next: auntArrived ? 'c3_s1_aunt_scan' : 'c3_s1_aunt_0', text: choice && choice !== '线阵'
      ? '你刚才那支看得更深，不代表它更差。这块目标浅，换这支**高频线阵**，边界会更容易分开。来，跟我对照一下。'
      : step.text }
  }
  // Preserve receipts from former choices; optional assistance still pays
  // once, while the mandatory cousin conversation now only records its flag.
  if (id === 'c3_s2_listen' && state.flags.c3_cousin_listened
    || id === 'c3_s4_cost_right' && state.flags.c3_gel_ledger
    || id === 'c3_s5_notice_desk' && state.flags.c3_xu_query_assisted) return { ...step, effect: undefined }
  if (id === 'c3_s1_start_1' && state.flags.c3_rotation_invited) {
    return { ...step, text: '来啦？这边。还真准点，柜子给你留好了。……别动，袖子夹门里了。' }
  }
  if (id === 'c3_s2_start_0' && state.flags.c3_cousin_booking) {
    return { ...step, text: '11月4日，上午九点多。梅姐给表姐留了今天十点的时间，她却发来堵在桥上的照片，说饼干都吃完了，车还没挪几米。' }
  }
  if (id === 'c3_s1_aunt_0' && state.flags.c3_s1_wait_done) return { ...step,
    text: '开诊后，刚才在窗口整理单子的阿姨第一个进来。这回她直接翻到最上面，把你替她夹好的申请单递过来。' }
  if (id === 'c3_s1_aunt_1' && state.flags.c3_s1_wait_done) return { ...step,
    text: '刚才多亏你把单子夹好了。原来你也在这屋啊？' }
  if (id === 'c3_s1_aunt_1' && state.flags.n4_kind) {
    return { ...step, text: '哎，是你！两年前帮我讲清楚检查、写预约便签的那个。这次门诊让我复查，我就把旧钼靶也带来了。' }
  }
  if (id === 'c3_s1_aunt_3' && state.flags.n4_kind) {
    return { ...step, text: state.flags.n4_wrong
      ? '那回幸好你们重新核对了一遍，我后来按预约做完了。今天门诊又让我来复查，就把旧片一起带来了。'
      : '你那张便签我夹过好久。上回按预约做完了，这次门诊让我复查，我就把旧片一起带来了。' }
  }
  if (id === 'c3_s3_wang_1' && state.dlc?.dsa?.done) {
    return { ...step, text: '这回不抢救啦。是你啊！上回导管室见过，这次按心内科约的来复查。药袋我都带着，先给你们看哪张？' }
  }
  if (id === 'c3_s3_xu_0' && (state.flags.mystery_told || state.dlc?.ch2?.done)) {
    return { ...step, text: '那个熟悉的男人又坐进诊室。梅姐核对申请单，你终于完整看到他的姓名：**许建平**。今天，他没有把挂号条压在名字上。' }
  }
  if (id === 'c3_s3_leave_clinic_0' && state.flags.c3_s3_tang_done) return { ...step,
    text: `${step.text}小唐正好来交单，在东边病床梯等着，招手让你们跟上。`, sprite2: 'char_tang' }
  if (/^c3_s3_leave_clinic_[12]$/.test(id) && state.flags.c3_s3_tang_done) return { ...step, sprite2: 'char_tang' }
  if (id === 'c3_s4_cost_1' && state.finished && state.stamps.includes(3)) {
    return { ...step, text: '你们两年前是不是就传“超声科耦合剂用量第一”？这回别光听八卦，帮我把人次和损耗算明白。' }
  }
  if (!state.flags.c3_s4_lei_done && id === 'c3_s5_lei_0') return { ...step, text: '最后一天了？坐会儿。你刚来还问纸巾，现在梅姐直接喊你找文件了。' }
  if (id === 'c3_s5_lei_1') return { ...step,
    text: state.flags.c3_s4_lei_done ? step.text : '文件找得着，就是她那个“最好的一张”，到底是哪张还得再问。',
    effect: state.flags.c3_han_met ? { flag: 'c3_han_paper_followup' } : step.effect }
  if (id === 'c3_s5_lei_2') {
    const borrowed = !!state.flags.c3_s4_lei_done
    if (state.flags.c3_han_met) return { ...step,
      text: `${borrowed ? '卷芯也还了，省得我找。' : '我也被文件名坑过，改天给她设个模板。'}韩经理补的清单收到了，东西还在院里；**核对联**我也留着。` }
    if (!borrowed) return { ...step, text: '我也被文件名坑过。改天给她设个模板，不然下次轮转的又得猜两周。' }
  }
  if (id === 'c3_epilogue_19' && state.flags.c3_cousin_followup_stable) return { ...step, next: 'c3_epilogue_20' }
  if (id === 'c3_epilogue_14' && state.flags.c3_cousin_followup_stable) return { ...step,
    sprite: '', sprite2: '',
    text: '你把表姐之前发来的复查时间重新标进日历，又给她回了条消息：“这次我记着呢。”',
    effect: undefined, next: 'c3_epilogue_20' }
  if (id === 'c3_epilogue_20' && state.flags.c3_cousin_followup_stable) return { ...step,
    sprite: '', sprite2: '',
    text: '你把梅姐的小卡和自己的记录放在一起，收好饭盒，回放射科上班。表姐的复查日期已经标进日历，下回再陪她来。第三章「回声」结束。', bg: 'bg_day' }
  return step
}

export const CH3: TrilogyChapter = {
  id: 'ch3', title: '回声', subtitle: '第三章 · 超声', icon: '◉', year: 2026,
  equipment: '超声设备与教学模体', background: 'bg_us_room_day',
  shifts: [
    { id: 'c3s1', title: '第一班 · 回声先回来', subtitle: '替表姐找人帮忙，顺道成了跟班 · 探头收发 / A型到B超 / 声影', date: '2026-10-30来电 → 11-02白班', start: 'c3_intro_call_0', checkinAt: 'c3_s1_start_0', background: 'bg_day' },
    { id: 'c3s2', title: '第二班 · 看多深，补哪里', subtitle: '白班 · 频率 / 深度 / TGC / 表姐', date: '2026-11-04 · 白班', start: 'c3_s2_start_0', background: 'bg_us_room_day' },
    { id: 'c3s3', title: '第三班 · 跟着这一条线', subtitle: '下午至傍晚 · 心超的结构、运动与血流 / 床旁', date: '2026-11-07 · 下午至晚间床旁班', start: 'c3_s3_start_0', background: 'bg_us_room_day' },
    { id: 'c3s4', title: '第四班 · 颜色跟谁比', subtitle: '白班 · 血流方向 / 多普勒频移', date: '2026-11-10 · 白班', start: 'c3_s4_start_0', background: 'bg_us_room_day' },
    { id: 'c3s5', title: '第五班 · 分得开，跟得上', subtitle: '白班 · 轴向与侧向 / 采样与帧率 / 晨会', date: '2026-11-13 · 白班', start: 'c3_s5_start_0', background: 'bg_us_room_day' },
  ],
  steps, afterQuiz: 'c3_epilogue_0', cards, book, quiz, adapt,
  shopItems: [
    { id: 'c3_pocket_towel', name: '口袋小毛巾', price: 25, desc: '留在窗边教学台收拾桌面。台垫底下好像压着一张旧照片。', image: 'item_c3_towel_v2', use: 'c3_towel_used' },
    { id: 'c3_cup_stickers', name: '杯子姓名贴', price: 20, desc: '给休息室的杯子认主人。两只“梅”之外，也许还有第三只。', image: 'item_c3_stickers_v2', use: 'c3_stickers_used' },
  ],
  characters: {
    sys: { name: '', color: '#c4cedb' }, me: { name: '你', color: '#94c9f0' },
    mei: { name: '梅姐', color: '#efc58b', sprite: 'char_mei' },
    aunt: { name: '阿姨', color: '#deb99c', sprite: 'pat_aunt' },
    cousin: { name: '表姐', color: '#eab8c9', sprite: 'pat_cousin' },
    xu: { name: '许建平', color: '#bac8c0', sprite: 'pat_mystery' },
    wang: { name: '王叔', color: '#d1bf99', sprite: 'pat_wang_recovery' }, patient: { name: '腹痛患者', color: '#c4cedb' },
    fatty_patient: { name: '体检青年', color: '#c4cedb', sprite: 'pat_c3_young_liver_v1' },
    han: { name: '韩经理', color: '#a9c5d0', sprite: 'char_han' },
    wen: { name: '雯雯', color: '#d7b9dc', sprite: 'char_wen' },
    lei: { name: '小雷', color: '#a9c7e0', sprite: 'char_lei' },
    zhou: { name: '老周', color: '#dfbb83', sprite: 'char_zhou' },
    he: { name: '小何', color: '#dfbcde', sprite: 'ch2_pixel_char_he' },
    tang: { name: '小唐', color: '#b3d2cb', sprite: 'char_tang' },
  },
  badges: {
    c3_first_probe: { name: '先选对探头', icon: '◉', desc: '完成第一次教学探头选择。' },
    c3_shadow_reader: { name: '读懂那道影', icon: '◐', desc: '观察胆囊结石与后方声影的关系。' },
    c3_stay_beside: { name: '陪她听完', icon: '♡', desc: '陪表姐听完评估与随访安排。' },
    c3_depth_keeper: { name: '留一点余地', icon: '↕', desc: '在模体上完成深部补偿练习。' },
    c3_cart_ready: { name: '车推走之前', icon: '▣', desc: '完成床旁车设备准备探索。' },
    c3_aunt_returns: { name: '这只袋子留好', icon: '▱', desc: '把布袋交还阿姨，收到她的擦镜布。' },
    c3_second_angle: { name: '再换个角度', icon: '↻', desc: '跟随梅姐复核镜像伪影。' },
    c3_name_spoken: { name: '名字说完整', icon: '✉', desc: '听许建平说出父亲的全名。' },
    c3_gel_account: { name: '账算在这里', icon: '▤', desc: '完成耦合剂损耗与库存方案。' },
    c3_keep_the_record: { name: '核对不是交接', icon: '⌁', desc: '在回收清单上澄清范围与编号。' },
    c3_mei_pocket_card: { name: '梅姐的小卡', icon: '▧', desc: '在最后一班收到梅姐的探头小卡。' },
    c3_echo_apprentice: { name: '回声学徒', icon: '◎', desc: '完成教学模体上的跟班考核。' },
    c3_training_photo: { name: '抱模体的人', icon: '▧', desc: '使用口袋小毛巾整理教学台，找到梅姐的培训合照。' },
    c3_cup_detective: { name: '第三只梅杯', icon: '☕', desc: '使用姓名贴，认出梅姐那只只能当笔筒的奖品杯。' },
  },
  itemImages: {
    c3_lei_label_roll: 'item_c3_label_roll_v1', c3_mei_probe_card: 'item_c3_probe_card_v1',
    c3_pocket_towel: 'item_c3_towel_v2', c3_cup_stickers: 'item_c3_stickers_v2', c3_aunt_cloth: 'item_c3_towel_v2',
  },
  assets: [
    'cg_c3_mei_farewell_v1',
    'bg_us_room', 'bg_us_room_day', 'bg_us_bedside', 'bg_us_bedside_day_v2', 'ch2_bg_breakroom_day', 'bg_waiting_day_v2', 'bg_c3_shared_office_day_v1', 'bg_day',
    'char_mei', 'pat_cousin', 'char_han', 'pat_aunt', 'pat_mystery', 'pat_wang_recovery', 'char_lei', 'char_zhou', 'ch2_pixel_char_he', 'char_tang',
    'us_gallstone', 'us_breast', 'us_c3_breast_cyst_compare_v1', 'us_fetal', 'us_echo', 'us_c3_cardiac_color_v1', 'us_mirror', 'us_c3_color_doppler_v1', 'item_missing_notice', 'item_reunion_gifts', 'item_notebook',
    'pat_c3_young_liver_v1', 'us_c3_hepatorenal_v1',
    'cg_c3_mei_probe_v2', 'cg_c3_shared_lunch_v2', 'item_c3_towel_v2', 'item_c3_stickers_v2',
    'cg_c3_cousin_call_v3', 'cg_c3_us_visit_v3',
    'item_c3_probes_v1', 'item_c3_probe_linear_v1', 'item_c3_probe_convex_v1', 'item_c3_probe_phased_v1',
    'item_c3_gel_supplies_v1', 'item_c3_label_printer_v1', 'item_c3_label_roll_v1', 'item_c3_us_phantom_v1', 'item_c3_probe_card_v1', 'item_c3_training_photo_v1',
  ],
}
