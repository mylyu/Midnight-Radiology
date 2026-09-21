import type { GameState, Step } from './types'

// Optional conversations use the existing dialogue/choice UI. No new room,
// voice, minigame, timer or save format. Run-local memories all start with c2.
export const CH2_SOCIAL_STEPS: Record<string, Record<string, Step>> = {
  c2n1: {
    c2n1_chat0: { speaker: 'tang', sprite: 'char_tang', text: '（小唐把凳子勾过来）还坐会儿？下午主任和小雷在办公室吵了一架，门外都听见了。', next: 'c2n1_chat_photo' },
    c2n1_chat_photo: { speaker: 'sys', text: '她手机还亮着，是群里转的一张下周排班表。照片只拍了半页，老周的名字被划掉了。', next: 'c2n1_chat_q' },
    c2n1_chat_q: { speaker: 'sys', text: '水还没烧开，可以再聊两句。', choices: [
      { text: '「小雷还敢跟主任吵？」', next: 'c2n1_chat_sign1', cond: { notFlag: 'c2n1_chat_sign' } },
      { text: '「排班表怎么划掉了老周？」', next: 'c2n1_chat_roster1', cond: { notFlag: 'c2n1_chat_roster' } },
      { text: '「先回去，开诊了。」', next: 'c2n1_c5' },
    ] },
    c2n1_chat_sign1: { speaker: 'tang', sprite: 'char_tang', text: '主任催他签字。他说「网线是我接的，这张单子我不签」。主任说「那你自己去跟厂家说」。我端着杯子进去，俩人又都不说了。', effect: { flag: 'c2n1_chat_sign' }, next: 'c2n1_chat_sign2' },
    c2n1_chat_sign2: { speaker: 'me', sprite: 'char_tang', text: '然后呢？', next: 'c2n1_chat_sign3' },
    c2n1_chat_sign3: { speaker: 'tang', sprite: 'char_tang', text: '然后主任问我有没有事。我说接水。他说办公室没饮水机。……你笑小声点。', next: 'c2n1_chat_q' },
    c2n1_chat_roster1: { speaker: 'tang', sprite: 'char_tang', text: '你也看见啦？有人说换了新机就不用他值夜班了。可他下午还在往值班室塞茶叶，塞了两大包。', effect: { flag: 'c2n1_chat_roster' }, next: 'c2n1_chat_roster2' },
    c2n1_chat_roster2: { speaker: 'sys', text: '门外拖过一阵纸箱摩擦声。你俩一起住嘴，老周探进头：「聊我呢？聊完让让，我拿茶。」', sprite: 'char_zhou', next: 'c2n1_chat_q' },
  },
  c2d2: {
    c2d2_lunch0: { bg: 'bg_breakroom', speaker: 'sys', text: '中午轮到你歇一会儿。小雷守着微波炉，老范坐在旁边，把盒饭里的青椒一根根挑出来。', next: 'c2d2_lunch_q' },
    c2d2_lunch_q: { speaker: 'sys', text: '午饭还热着。', choices: [
      { text: '问小雷：「你跟主任怎么了？」', next: 'c2d2_chat_lei1', cond: { notFlag: 'c2d2_chat_lei' } },
      { text: '问老范：「老周以后不值夜班了？」', next: 'c2d2_chat_fan1', cond: { notFlag: 'c2d2_chat_fan' } },
      { text: '先吃饭，不打听了', next: 'c2d2_lunch_end' },
    ] },
    c2d2_chat_lei1: { speaker: 'lei', sprite: 'char_lei', text: '传这么快？我就没签一张单子。下午还问我能不能连上，晚上标题变成「数据服务确认」，签字的地方倒没变。', effect: { flag: 'c2_social_lei' }, next: 'c2d2_chat_lei2' },
    c2d2_chat_lei2: { speaker: 'me', sprite: 'char_lei', text: '主任不知道换过？', next: 'c2d2_chat_lei3' },
    c2d2_chat_lei3: { speaker: 'lei', sprite: 'char_lei', text: '我问他看过附件没有，他说先把机器用起来。你说这话我怎么接？现在连主任都嫌我慢，我还没来得及嫌这破微波炉慢呢。', effect: { flag: 'c2d2_chat_lei' }, next: 'c2d2_lunch_q' },
    c2d2_chat_fan1: { speaker: 'fan', sprite: 'char_fan', text: '那张拍一半的排班表？右边还有一栏呢。一个传一个，传到我这儿，说老周连柜子都清空了。', effect: { flag: 'c2d2_chat_fan' }, next: 'c2d2_chat_fan2' },
    c2d2_chat_fan2: { speaker: 'me', sprite: 'char_fan', text: '您怎么这么清楚？', next: 'c2d2_chat_fan3' },
    c2d2_chat_fan3: { speaker: 'fan', sprite: 'char_fan', text: '我去问那把椅子还要不要，他让我出去。你说清空没有。（他把青椒推过来）吃不吃？不吃我再找小唐。', next: 'c2d2_lunch_q' },
    c2d2_lunch_end: { speaker: 'sys', text: '微波炉终于停了。小雷掀开盒盖，又默默转了半圈，塞回去。你吃完这几口，起身回控制室。', next: 'c2d2_p1' },
  },
  c2n3: {
    c2n3_chat0: { bg: 'bg_ctcontrol', speaker: 'lei', sprite: 'char_lei', text: '找我？先说，不修打印机。我现在看见弹窗就想关机。', effect: { ap: -1 }, next: 'c2n3_chat_q' },
    c2n3_chat_q: { speaker: 'sys', sprite: 'char_lei', text: '小雷把椅子往旁边挪了挪。', choices: [
      { text: '「签字那事，后来呢？」', next: 'c2n3_chat_sign1', cond: { notFlag: 'c2n3_chat_sign' } },
      { text: '「你现在是茶水间红人了。」', next: 'c2n3_chat_joke', cond: { notFlag: 'c2n3_chat_joke' } },
      { text: '「去年那份夜间访问日志，还留着吗？」', next: 'c2n3_chat_log', cond: { flag: 'pacs_log', notFlag: 'c2n3_chat_log' } },
      { text: '「行，你忙。」', next: 'c2n3_chat_end' },
    ] },
    c2n3_chat_sign1: { speaker: 'lei', sprite: 'char_lei', text: '他们发来两版单子，签字栏长得一模一样。一个是接通测试，一个是数据服务。我能保证线通了，别的得让我先看吧？', effect: { flag: 'c2_social_lei' }, next: 'c2n3_chat_sign2' },
    c2n3_chat_sign2: { speaker: 'lei', sprite: 'char_lei', text: '主任刚还来问我。我让他坐下一起看，他接电话去了。行，等他打完，我再拉他回来。', effect: { flag: 'c2n3_chat_sign' }, next: 'c2n3_chat_q' },
    c2n3_chat_joke: { speaker: 'lei', sprite: 'char_lei', text: '又怎么编我了？午饭时候说我跟主任吵架，下午说我不干了。那明天谁修打印机，你吗？', effect: { flag: 'c2n3_chat_joke' }, next: 'c2n3_chat_q' },
    c2n3_chat_log: { speaker: 'lei', sprite: 'char_lei', text: '留着呢，没跟旧机器一块儿处理。那几条还对不上人。这次远程终端是另一份记录，我分开放的，别给我揉成一件事。', effect: { flag: 'c2n3_chat_log' }, next: 'c2n3_chat_q' },
    c2n3_chat_end: { speaker: 'sys', text: '隔壁打印机又响了。小雷抬头看一眼，装作没听见。你回到自己的工作位。', effect: { flag: 'c2n3_chat_done' }, next: 'c2n3_hub' },
    c2n3_chat_wen_q: { speaker: 'sys', sprite: 'char_wen', text: '电梯还停在楼上，雯雯腾出手按了下按钮。', choices: [
      { text: '「小雷不肯签的那张单子，你知道吗？」', next: 'c2n3_chat_wen1' },
      { text: '不多问了，等电梯', next: 'c2n3_a5' },
    ] },
    c2n3_chat_wen1: { speaker: 'wen', sprite: 'char_wen', text: '知道，两版都是我发的。第一版接通测试，后来补了数据服务。销售那边催我一起收，我就一起催你们了。小雷说我夹带东西。', effect: { flag: 'c2_social_wen' }, next: 'c2n3_chat_wen2' },
    c2n3_chat_wen2: { speaker: 'me', sprite: 'char_wen', text: '听着确实有点像。', next: 'c2n3_chat_wen3' },
    c2n3_chat_wen3: { speaker: 'wen', sprite: 'char_wen', text: '……行，这句你不用替他转达了。我明天分开交。可别一看见厂家就躲啊，我也不想追到你们茶水间。', next: 'c2n3_a5' },
  },
  c2d4: {
    c2d4_chat0: { bg: 'bg_office_day', speaker: 'sys', text: '散会了，主任还坐着没动，小雷在门口等他。桌上的饭盒一只都没打开。', next: 'c2d4_chat_q' },
    c2d4_chat_q: { speaker: 'sys', text: '要不要留下说两句？', choices: [
      { text: '问主任：「前几天您为什么催着签？」', next: 'c2d4_chat_director1', cond: { notFlag: 'c2d4_chat_director' } },
      { text: '招呼小雷：「饭都凉了，过来吃。」', next: 'c2d4_chat_food1', cond: { notFlag: 'c2d4_chat_food' } },
      { text: '不耽误他们，先下班', next: 'c2d4_e9' },
    ] },
    c2d4_chat_director1: { speaker: 'director', sprite: 'char_director', text: '新机器等了一年。厂家催收单子，我就催小雷……当时只翻了前面，后头那些没细看。', effect: { flag: 'c2d4_chat_director' }, next: 'c2d4_chat_director2' },
    c2d4_chat_director2: { speaker: 'lei', sprite: 'char_lei', text: '我喊您看了三回。', next: 'c2d4_chat_director3' },
    c2d4_chat_director3: { speaker: 'director', sprite: 'char_director', text: '我知道。单子拿来，今天不往后放了。……饭也拿来，边吃边看。', next: 'c2d4_chat_q' },
    c2d4_chat_food1: { speaker: 'lei', sprite: 'char_lei', text: '我不饿。（他刚说完，肚子响了一声。）……这是椅子。', effect: { flag: 'c2d4_chat_food' }, next: 'c2d4_chat_food2' },
    c2d4_chat_food2: { speaker: 'director', sprite: 'char_director', text: '你还站着呢。过来，菜还没动。', next: 'c2d4_chat_q' },
  },
  c2n5: {
    c2n5_chat0: { bg: 'bg_breakroom', speaker: 'sys', text: '小唐刚擦完桌子，小雷端着两杯热水挤进来。他把靠门的凳子留给你：「坐不坐？不坐我放包了。」', effect: { ap: -1 }, next: 'c2n5_chat_q' },
    c2n5_chat_q: { speaker: 'sys', sprite: 'char_lei', text: '开诊前，还有几分钟。', choices: [
      { text: '「雯雯那边我也问了，单子后来分开了吗？」', next: 'c2n5_chat_both1', cond: { notFlag: 'c2n5_chat_sign' } },
      { text: '「前几天吵的那件事，怎么样了？」', next: 'c2n5_chat_plain', cond: { notFlag: 'c2n5_chat_sign' } },
      { text: '问小唐：「老周的排班，这回看全没有？」', next: 'c2n5_chat_roster1', cond: { notFlag: 'c2n5_chat_roster' } },
      { text: '「得，我回去值班了。」', next: 'c2n5_chat_end' },
    ] },
    c2n5_chat_both1: { speaker: 'lei', sprite: 'char_lei', text: '分开了。接通测试的我签了，数据服务那份等信息科核查。雯雯还发消息问「这回没夹东西了吧」，我说你别光改封面。', effect: { flag: 'c2n5_chat_sign' }, next: 'c2n5_chat_both2' },
    c2n5_chat_both2: { speaker: 'tang', sprite: 'char_tang', text: '我看见主任在帮你热饭，还以为和好了。合着还没完啊？', next: 'c2n5_chat_both3' },
    c2n5_chat_both3: { speaker: 'lei', sprite: 'char_lei', text: '饭是饭，单子还得改啊。你要传，就传我还在上班，打印机另找人。', effect: { badge: 'c2_two_sides' }, next: 'c2n5_chat_q' },
    c2n5_chat_plain: { speaker: 'lei', sprite: 'char_lei', text: '签字单分开了，能确认的我签，数据服务那份等信息科核查。主任现在看见我，就主动把附件翻开。', effect: { flag: 'c2n5_chat_sign' }, next: 'c2n5_chat_q' },
    c2n5_chat_roster1: { speaker: 'tang', sprite: 'char_tang', text: '看全了！主值换你，老周在右边备班栏。难怪他还往值班室搬茶叶……老范也白高兴，那把椅子还是不让拿。', effect: { flag: 'c2n5_chat_roster' }, next: 'c2n5_chat_roster2' },
    c2n5_chat_roster2: { speaker: 'zhou', sprite: 'char_zhou', text: '（老周从门口探头）谁惦记我椅子？坐了三十年，刚坐顺手。', next: 'c2n5_chat_roster3' },
    c2n5_chat_roster3: { speaker: 'tang', sprite: 'char_tang', text: '没人惦记，您连茶都还没喝完呢。杯子给我，添点热的。', next: 'c2n5_chat_q' },
    c2n5_chat_end: { speaker: 'sys', text: '你把凳子推回桌底。小唐随手把剩下两个纸杯扣好，关了茶水间的灯。', effect: { flag: 'c2n5_chat_done', badge: 'c2_tea_regular' }, next: 'c2n5_hub' },
    c2n5_phone_break: { speaker: 'sys', text: '小何发来一句：「保暖毯找到了，给大爷盖上了。」过一会儿又补了一句：「你那边忙完也坐会儿。」你回了个好，把手机扣在桌上。', next: 'c2n5_g0' },
  },
}

type SocialState = Pick<GameState, 'flags'>

/** Count shifts, not clicks: skipped chats and repeat questions never count. */
export function ch2SocialShifts({ flags: f }: SocialState): number {
  return [
    f.c2n1_chat_sign || f.c2n1_chat_roster,
    f.c2d2_chat_lei || f.c2d2_chat_fan,
    f.c2n3_chat_sign || f.c2n3_chat_joke || f.c2n3_chat_log || f.c2_social_wen,
    f.c2d4_chat_director || f.c2d4_chat_food,
    f.c2n5_chat_sign || f.c2n5_chat_roster,
  ].filter(Boolean).length
}

export function ch2SocialStep(id: string, step: Step, state: SocialState): Step {
  const f = state.flags
  const both = Boolean(f.c2_social_lei && f.c2_social_wen)
  if (id === 'c2n5_chat_q') return { ...step, choices: step.choices?.filter(c =>
    c.next === 'c2n5_chat_both1' ? both : c.next === 'c2n5_chat_plain' ? !both : true)
    .map(c => c.next === 'c2n5_chat_roster1' && !f.c2n1_chat_roster && !f.c2d2_chat_fan
      ? { ...c, text: '问小唐：「老周改备班，你知道啦？」' } : c) }
  // Guard direct old/debug saves as well as normally gated dialogue choices.
  if (id === 'c2n5_chat_both3' && !both) return { ...step, effect: undefined }
  if (id === 'c2n5_chat_end' && (ch2SocialShifts(state) < 3 || !(f.c2n5_chat_sign || f.c2n5_chat_roster))) {
    return { ...step, effect: { flag: 'c2n5_chat_done' } }
  }
  if (id === 'c2d2_chat_lei1' && f.c2n1_chat_sign) return { ...step, text: '小唐说的吧？我就没签一张单子。下午还问我能不能连上，晚上标题变成「数据服务确认」，签字的地方倒没变。' }
  if (id === 'c2n3_chat_sign1' && f.c2d2_chat_lei) return { ...step, text: '你中午听我说的那两版单子，我都找着了。接通测试那份我签，数据服务这份得另看。雯雯还在楼下，你有空也问问她，别光听我发牢骚。' }
  if (id === 'c2n5_chat_roster1' && !f.c2d2_chat_fan) return { ...step, text: '看全了！主值换你，老周在右边备班栏。难怪茶叶都没搬走。我刚问了他一句，他说再传下去，是不是得给他办欢送会了。' }
  return step
}
