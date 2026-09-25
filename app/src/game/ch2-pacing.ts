import type { GameState, Step } from './types'

// Chapter 2 only. These pauses happen after a handover and before the next
// arrival; they do not spend AP, alter patient priority, or grant stat rewards.
export const CH2_PATIENT_BRIDGES = [
  { from: 'c2n1_d4', entry: 'c2n1_gap_chair', to: 'c2n1_p0' },
  { from: 'c2d2_7', entry: 'c2d2_gap_shift', to: 'c2d2_8' },
  { from: 'c2d2_10', entry: 'c2d2_gap_food', to: 'c2d2_q0' },
  { from: 'c2d2_q0', entry: 'c2d2_gap_lift', to: 'c2d2_q1a', conditional: true },
  { from: 'c2d2_q1a/b/c', entry: 'c2d2_gap_phone', to: 'c2d2_t0' },
  { from: 'c2d2_t2', entry: 'c2d2_gap_pen', to: 'c2d2_11' },
  { from: 'c2n3_m13', entry: 'c2n3_gap_tea', to: 'c2n3_h0' },
  { from: 'c2n3_h6', entry: 'c2n3_gap_cups', to: 'c2n3_x0' },
  { from: 'c2d4_10', entry: 'c2d4_gap_thermos', to: 'c2d4_11a' },
] as const

export const CH2_PACING_STEPS: Record<string, Record<string, Step>> = {
  c2n1: {
    c2n1_gap_chair: { speaker: 'sys', text: '交接完，控制室空了下来。你刚往椅子上一坐，扶手就往下一歪。老周伸手托住：「慢点，这位也上岁数了。」', next: 'c2n1_gap_chair_q' },
    c2n1_gap_chair_q: { speaker: 'me', sprite: 'char_zhou', text: '机器换了，椅子还留任啊？', choices: [
      { text: '把椅子翻过来看看', next: 'c2n1_gap_chair_check' },
      { text: '「您这椅子，工龄比我还长。」', next: 'c2n1_gap_chair_joke' },
    ] },
    c2n1_gap_chair_check: { speaker: 'sys', text: '扶手底下松了一颗螺丝。你把椅子靠墙放稳，贴了张纸提醒。老周换来另一把：「明天找后勤，别拿医用剪刀拧。」', next: 'c2n1_gap_chair_done' },
    c2n1_gap_chair_fix: { speaker: 'sys', text: '你从**元件盒**里拿出螺丝刀，拧紧扶手螺丝。老周试了试：「这回不晃了。盒子收好，明天别又满地找。」', effect: { flag: 'c2_chair_fixed' }, next: 'c2n1_gap_chair_done' },
    c2n1_gap_chair_joke: { speaker: 'zhou', sprite: 'char_zhou', text: '可不是。主任刚来的时候，也坐它。……别往后仰，我怕它今天退休。', next: 'c2n1_gap_chair_done' },
    c2n1_gap_chair_done: { speaker: 'sys', text: '忙完手边这点事，你起身接了半杯水。歇了片刻，走廊才又传来脚步声。', effect: { flag: 'c2_chair_passed' }, next: 'c2n1_p0' },
  },
  c2d2: {
    c2d2_gap_shift: { speaker: 'sys', text: '大爷收好片袋走了。小唐擦着扶手，你把看了一半的排班表折回口袋。', next: 'c2d2_gap_shift_q' },
    c2d2_gap_shift_q: { speaker: 'me', sprite: 'char_tang', text: '夜班刚倒明白，又让我来白班。我的闹钟都不知道该信谁。', choices: [
      { text: '「你怎么不困？」', next: 'c2d2_gap_shift_a' },
      { text: '「等会儿帮我盯着，别把日期写成昨天。」', next: 'c2d2_gap_shift_b' },
    ] },
    c2d2_gap_shift_a: { speaker: 'tang', sprite: 'char_tang', text: '困啊。我现在睁着眼，全靠这杯咖啡有点烫。', next: 'c2d2_8' },
    c2d2_gap_shift_b: { speaker: 'tang', sprite: 'char_tang', text: '行。你也盯着我，刚才差点跟大爷说晚安。', next: 'c2d2_8' },
    c2d2_gap_food: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: '腹痛小伙回急诊了。下一张单还没递进来，小唐从袋子里摸出一个饭团，包装刚拆开，又停住。', next: 'c2d2_gap_food_q' },
    c2d2_gap_food_q: { speaker: 'tang', sprite: 'char_tang', text: '买的时候还是热的。现在能拿来镇纸。', choices: [
      { text: '「去热一下，我在这儿接电话。」', next: 'c2d2_gap_food_a' },
      { text: '「我的包子也凉了，凑一桌？」', next: 'c2d2_gap_food_b' },
    ] },
    c2d2_gap_food_a: { speaker: 'tang', sprite: 'char_tang', text: '够义气。我去去就回，微波炉今天最好别有人热鱼。', next: 'c2d2_q0' },
    c2d2_gap_food_b: { speaker: 'tang', sprite: 'char_tang', text: '先收着。等轮休一起热，我盯微波炉，你别让老范拿错盒。', next: 'c2d2_q0' },
    c2d2_gap_lift: { speaker: 'sys', text: '你把先后顺序跟大爷解释清楚。住院部还在电话里问走哪部电梯，小唐捂住话筒看你。', next: 'c2d2_gap_lift_q' },
    c2d2_gap_lift_q: { speaker: 'tang', sprite: 'char_tang', text: '他们又准备走职工梯。上回绕了两圈。', choices: [
      { text: '「你说路线，我腾出轮椅的位置。」', next: 'c2d2_gap_lift_a' },
      { text: '「我去门口接，你别挂电话。」', next: 'c2d2_gap_lift_b' },
    ] },
    c2d2_gap_lift_a: { speaker: 'tang', sprite: 'char_tang', text: '行。（她放开话筒）还是东边病床梯，出门右拐。对，我知道门口两盆树长得一样。', next: 'c2d2_q1a' },
    c2d2_gap_lift_b: { speaker: 'tang', sprite: 'char_tang', text: '快去，我告诉他认你。别挥单子，上回有人以为咱在发传单。', next: 'c2d2_q1a' },
    c2d2_gap_phone: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: '机房已经腾好。救护车还在路上，小唐把登记夹摊开，顺手把一直打滑的电话座推回去。', next: 'c2d2_gap_phone_q' },
    c2d2_gap_phone_q: { speaker: 'tang', sprite: 'char_tang', text: '电话线怎么又绕到我袖子上了。帮我一下。', choices: [
      { text: '替她解开电话线', next: 'c2d2_gap_phone_a' },
      { text: '把电话座挪近一点', next: 'c2d2_gap_phone_b' },
    ] },
    c2d2_gap_phone_a: { speaker: 'me', sprite: 'char_tang', text: '好了。你再转两圈，咱们就得连人带电话一起交班。', next: 'c2d2_t0' },
    c2d2_gap_phone_b: { speaker: 'tang', sprite: 'char_tang', text: '对，就放这儿。说了半年换无绳的，连根长点的线都没换。', next: 'c2d2_t0' },
    c2d2_gap_pen: { speaker: 'sys', text: '腰胯撞伤的患者由急诊团队接回。机房整理的空当，主任伸手去胸前口袋摸了两遍。', next: 'c2d2_gap_pen_q' },
    c2d2_gap_pen_q: { speaker: 'director', sprite: 'char_director', text: '谁看见我的笔了？刚才还在。', choices: [
      { text: '把自己这支递过去', next: 'c2d2_gap_pen_a' },
      { text: '「您耳朵上那支，是不是？」', next: 'c2d2_gap_pen_b' },
    ] },
    c2d2_gap_pen_a: { speaker: 'director', sprite: 'char_director', text: '借一下。（他一低头，耳后的笔掉在桌上。）……你这支先收着。', next: 'c2d2_11' },
    c2d2_gap_pen_b: { speaker: 'director', sprite: 'char_director', text: '哦。（他摘下来，假装试了试笔尖。）我找的是另一支。', next: 'c2d2_11' },
    c2d2_lunch_apples: { speaker: 'sys', text: '你洗了几个**今年新送来的苹果**，摆在饭盒旁。小雷拿起一个：「这个好，不用排微波炉。」老范也伸手，青椒盘终于没人往你面前推了。', effect: { flag: 'c2_apples_shared' }, next: 'c2d2_lunch_q' },
  },
  c2n3: {
    c2n3_gap_tea: { speaker: 'sys', text: '卒中患者已经交接出去，科里暂时安静下来。你在键盘后面找到了老周的杯子，底下压着半张排班表。', next: 'c2n3_gap_tea_q' },
    c2n3_gap_tea_q: { speaker: 'me', sprite: 'char_zhou', text: '找到了。您这杯子还兼职压纸？', choices: [
      { text: '「我给您换个东西压着。」', next: 'c2n3_gap_tea_a' },
      { text: '「茶凉了，先别喝。」', next: 'c2n3_gap_tea_b' },
    ] },
    c2n3_gap_tea_a: { speaker: 'zhou', sprite: 'char_zhou', text: '拿那只订书机就行。主任老来翻这张表，一翻就找不着。', next: 'c2n3_h0' },
    c2n3_gap_tea_b: { speaker: 'zhou', sprite: 'char_zhou', text: '不用尝，我拿着就知道。帮我倒点热的，半杯就行。', next: 'c2n3_h0' },
    c2n3_coronary_slices: { speaker: 'sys', text: '工作站先铺开**连续断层图像**。心脏一层层掠过，亮起来的小血管在不同位置露出截面。', image: 'ch2_ct_coronary_slices', next: 'c2n3_coronary_where' },
    c2n3_coronary_where: { speaker: 'me', text: '一层一个小亮点，跟两下就丢了。它到底往哪儿拐的？', image: 'ch2_ct_coronary_slices', next: 'c2n3_coronary_volume' },
    c2n3_coronary_volume: { speaker: 'sys', text: '老周在工作站上调出**同一次采集的三维重建**。心脏转过半圈，贴着表面绕行的冠脉连成了完整的走向。', image: 'ct_coronary_cta', next: 'c2n3_coronary_clear' },
    c2n3_coronary_clear: { speaker: 'me', text: '哦，原来绕到后面去了！这么一转，终于跟得上了。', image: 'ct_coronary_cta', next: 'c2n3_h4' },
    c2n3_gap_cups: { speaker: 'sys', text: '心内的交接电话挂了。小唐把空纸杯叠起来，发现老周那只保温杯又被推到了你手边。', next: 'c2n3_gap_cups_q' },
    c2n3_gap_cups_q: { speaker: 'tang', sprite: 'char_tang', text: '这杯谁的？别又端错了。', choices: [
      { text: '「有茶垢那个是周师傅的。」', next: 'c2n3_gap_cups_a' },
      { text: '找张便签，写个“周”贴上', next: 'c2n3_gap_cups_b' },
    ] },
    c2n3_gap_cups_a: { speaker: 'zhou', sprite: 'char_zhou', text: '小点声。我明天就刷，先搁那儿吧。', next: 'c2n3_x0' },
    c2n3_gap_cups_b: { speaker: 'tang', sprite: 'char_tang', text: '贴杯底，不然一会儿周师傅喝水，像在举名牌。', next: 'c2n3_x0' },
  },
  c2d4: {
    c2d4_aorta_resist: { speaker: 'sys', text: '病人摇头，攥着衣服往下拽：「我就是胃疼，给我开点药行不行？别推来推去的。」妻子伸手扶他，他又把手缩了回去。', next: 'c2d4_aorta_wife' },
    c2d4_aorta_wife: { speaker: 'sys', text: '妻子急了：「在家你说忍一忍，刚才在车上连话都说不出了。人都到这儿了！」他闭着眼，没接话。', next: 'c2d4_aorta_doctor' },
    c2d4_aorta_doctor: { speaker: 'he', sprite: 'char_he', text: '您刚才说，**突然疼起来，还往后背串**。我担心不只是胃的问题。先躺稳，我在旁边，不会把您一个人留这儿。', next: 'c2d4_aorta_consent' },
    c2d4_aorta_consent: { speaker: 'sys', text: '医生解释了检查原因和风险。病人缓了一口气，终于点头：「那你跟我说着点，别突然就动。」小何把床栏扶好，示意团队继续准备。', next: 'c2d4_4' },
    c2d4_gap_thermos: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: '急诊那边确认已经接上专科。午后轮休，你们才有空把饭盒收起来；老周拧开保温杯，盖子里躺着一颗泡开的枸杞。', next: 'c2d4_gap_thermos_q' },
    c2d4_gap_thermos_q: { speaker: 'me', sprite: 'char_zhou', text: '您什么时候开始养生了？', choices: [
      { text: '「我也加两颗？」', next: 'c2d4_gap_thermos_a' },
      { text: '「谁给您放的？」', next: 'c2d4_gap_thermos_b' },
    ] },
    c2d4_gap_thermos_a: { speaker: 'zhou', sprite: 'char_zhou', text: '找小唐。她刚才路过，一人杯里扔了两颗，跟撒鱼食似的。', next: 'c2d4_11a' },
    c2d4_gap_thermos_b: { speaker: 'zhou', sprite: 'char_zhou', text: '还能有谁。小唐说我一天光喝茶，把她的枸杞都喝过期了。', next: 'c2d4_11a' },
  },
  c2n5: {
    c2n5_sms_save: { speaker: 'sys', text: '你保存了号码和短信截图，给小雷发去：「这谁？他怎么知道终端断了？」对面很快显示正在输入。', effect: { flag: 'c2_sms_saved' }, next: 'c2n5_sms_lei_pending' },
    c2n5_sms_lei_pending: { speaker: 'lei', text: '号码不认识。先留着，别点陌生链接。明早把这条也交信息科，跟留存日志一起查。终端别接回去。', next: 'c2n5_g0' },
    c2n5_sms_reply: { speaker: 'sys', text: '你打下「你是谁？」发过去。等了半分钟，没有回音。屏幕暗下去，玻璃里的倒影反而清楚了。', effect: { flag: 'c2_sms_replied' }, next: 'c2n5_sms_after' },
    c2n5_sms_after: { speaker: 'sys', text: '你把手机翻扣在桌上，又翻回来。没有新消息。周五那张核查单，到底还有谁看过？你还是没把屏幕按灭。', next: 'c2n5_g0' },
  },
}

type PacingState = Pick<GameState, 'flags'> & Partial<Pick<GameState, 'items'>>

export function ch2PacingStep(id: string, step: Step, { flags: f, items = [] }: PacingState): Step {
  if (id === 'c2n5_n3') return { ...step,
    text: '申请单到了。我先调出既往影像，把申请单交给值班医师确认方案，再把机房腾好。' }
  if (id === 'c2n5_n4') return { ...step,
    text: '等医师回话的空当，急诊又打来电话：「有个病人投诉你们CT室空调太冷！」' }
  if (id === 'c2am_6') return { ...step,
    text: '晨会散了。你把椅子推回桌下，同事们陆续出了门。' }
  if (id === 'c2n1_gap_chair_q' && items.includes('toolbox') && !f.c2_chair_fixed) {
    return { ...step, choices: step.choices?.map(c => c.next === 'c2n1_gap_chair_check'
      ? { ...c, text: '用元件盒里的螺丝刀看看', next: 'c2n1_gap_chair_fix' } : c) }
  }
  // Old/debug saves cannot apply the repair without the tool, or award it twice.
  if (id === 'c2n1_gap_chair_fix' && !items.includes('toolbox')) {
    return { ...CH2_PACING_STEPS.c2n1.c2n1_gap_chair_check }
  }
  if (id === 'c2n1_gap_chair_fix' && f.c2_chair_fixed) return { ...step, effect: undefined }
  if (id === 'c2d2_lunch0' && f.n5_qian) return { ...step, text: '门卫送来一袋苹果：「去年那位工地大叔托人带的，今年家里新收的。」你把袋子搁到饭桌边。小雷守着微波炉，老范还在挑青椒。' }
  if (id === 'c2d2_lunch_q' && f.n5_qian && !f.c2_apples_shared) return { ...step, choices: [
    { text: '洗几个新送来的苹果，给大家分分', next: 'c2d2_lunch_apples' }, ...(step.choices ?? []),
  ] }
  if (id === 'c2n3_gap_tea_a' && f.n5_fan) return { ...step, text: '你把去年老范送的那副**报废眼镜**拿过来压住排班表。老周掂了掂：「还留着啊？这分量，压纸倒合适。」' }
  if (id === 'c2n5_chat_roster2' && f.c2_chair_fixed) return { ...step, text: '（老周从门口探头）谁惦记我椅子？前两天这孩子刚把扶手拧好，坐着正合适。' }
  if (id === 'c2n5_n6' && f.c2n5_e) return { ...step, text: '凌晨两点多，手机在口袋里震了一下。陌生号码发来一条短信：**「终端断了，已经出去的那份还在。」**你想起刚巡查过的设备间，那根网线确实收在一旁。谁知道得这么清楚？' }
  if (id === 'c2n5_sms_save' && f.data_audit) return { ...step, next: 'c2n5_p2a' }
  if (id === 'c2n5_sms_after') return {
    ...step,
    text: f.c2n5_e ? '你把手机翻扣在桌上，又翻回来。没有新消息。你想起刚巡查时那根拔掉的网线，还是没把屏幕按灭。' : step.text,
    next: f.data_audit ? 'c2n5_p2a' : step.next,
  }
  return step
}
