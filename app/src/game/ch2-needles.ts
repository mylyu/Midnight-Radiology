import type { Evidence } from './dlc'
import type { GameState, Step } from './types'

/** Fictional adaptation, not the history of the real patient (aged 94).
 * Source: BMJ Case Reports 2018, doi:10.1136/bcr-2018-228056,
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC6301504/.
 * The retained-needle finding is borrowed; Luo's age, occupation, dialogue,
 * Friday assessment and family-record follow-up are original fiction.
 * All three images represent ONE external CT, never a new acquisition.
 */
const patient = 'ch2_pat_luo_v1'
const axial = 'ch2_needle_axial_v1'
const mpr = 'ch2_needle_mpr_v1'
const vr = 'ch2_needle_vr_v1'
const record = 'ch2_needle_record_v1'

export const CH2_NEEDLE_EVIDENCE: Record<string, Evidence> = {
  ch2_needle_axial: {
    title: '罗阿姨的外院CT · 横断面', image: axial, flag: 'c2_needle_axial',
    body: '周五带来的外院既往CT。这个胸部横断层面只切到背部软组织里的两处高密度小点，不能从这一层数出全部异物。',
  },
  ch2_needle_mpr: {
    title: '罗阿姨的外院CT · 换个方向', image: mpr, flag: 'c2_needle_mpr',
    body: '同次数据重组。连续查看后，小点连成了细长的金属样影；换观察方向没有增加一次扫描。',
  },
  ch2_needle_vr: {
    title: '罗阿姨的外院CT · 十五处细影', image: vr, flag: 'c2_needle_vr',
    body: '同次数据的三维显示，并回到原始序列逐一核对：颈背部共十五处细长金属样异物。周五已由医师完成当日评估和后续安排，来源另待旧资料核实。',
  },
  ch2_needle_record: {
    title: '罗阿姨家属找到的旧治疗记录', image: record, flag: 'c2_needle_record',
    body: '周末找到的旧记录提到，约三十年前曾接受罕见的永久留针疗法，用于当时的肩背痛。罗阿姨一直以为针已取走，并非有意隐瞒。医师已把这段补充病史与影像一并登记；这与治疗后取针的普通针灸不是同一回事。',
  },
}

export const CH2_NEEDLE_STEPS: Record<string, Record<string, Step>> = {
  c2d4: {
    c2d4_needle0: { bg: 'bg_ctcontrol_day', speaker: 'sys', sprite: patient, sfx: 'vox_ch2_luo_entrance_20260925',
      text: '你刚把分机号贴好，门诊医生带来一位阿姨，说请值班医师再核一下外院的片子。她自己走进来，怀里夹着片袋：「大夫，帮我看看。」走到椅子前，又问：「这椅子能往前挪吗？我脚够不着地。」',
      effect: { flag: 'c2_needle_seen' }, next: 'c2d4_needle1' },
    c2d4_needle1: { speaker: 'sys', sprite: patient,
      text: '罗阿姨，六十八岁，退休前做缝纫。片袋边角被她用透明胶补过，封口整整齐齐。她坐稳以后，又把椅背上搭着的外套抻平了一点。', next: 'c2d4_needle2' },
    c2d4_needle2: { speaker: 'sys', sprite: patient,
      text: '「肩膀背上老是酸，也不是今天才有。闺女让我别碰缝纫机了，说退休就退休。我给她改裤脚的时候，她可不说这个。」', next: 'c2d4_needle3' },
    c2d4_needle3: { speaker: 'me', sprite: patient,
      text: '裤脚还是您改得好？', next: 'c2d4_needle4' },
    c2d4_needle4: { speaker: 'sys', sprite: patient,
      text: '「外头改一次二十，她舍不得。」罗阿姨把光盘推过来，又压住袋口：「片子都在里面。他们说有几个东西要核清，我听得一头雾水。」', next: 'c2d4_needle5' },
    c2d4_needle5: { speaker: 'zhou', sprite: 'char_zhou', sprite2: patient,
      text: '先看您带来的。门诊记录也在，稍后一起核。小唐，帮阿姨倒杯水。', next: 'c2d4_needle_axial' },
    c2d4_needle_axial: { speaker: 'sys', sprite: '', sprite2: '', image: axial, imageLabel: '外院既往CT',
      text: '工作站读入光盘。胸部横断图上，靠近背部的软组织里有两个很亮的小点。你来回挪了两层，小点还在，位置略有变化。',
      effect: { flag: 'c2_needle_axial' }, next: 'c2d4_needle_q' },
    c2d4_needle_q: { speaker: 'me', image: axial, imageLabel: '外院既往CT',
      text: '这几个点，不太像刚才见过的东西。先从哪儿看？', choices: [
        { text: '换个方向，用这份数据看看它有多长', next: 'c2d4_needle_turn' },
        { text: '先核对姓名、日期和影像序列', next: 'c2d4_needle_verify' },
        { text: '问问罗阿姨以前怎么治肩背疼', next: 'c2d4_needle_history' },
      ] },
    c2d4_needle_turn: { speaker: 'zhou', sprite: 'char_zhou',
      text: '行，把这一段连续调出来。别只盯着这一层。', next: 'c2d4_needle_mpr' },
    c2d4_needle_verify: { speaker: 'sys',
      text: '你和罗阿姨核对了姓名与检查日期，又对过门诊记录。这份影像确实是她的，颈背部序列也完整，没有串片。老周把鼠标往你这边推了推。', next: 'c2d4_needle_verify2' },
    c2d4_needle_verify2: { speaker: 'zhou', sprite: 'char_zhou',
      text: '对得上。再换个方向，看看这些点到底是什么形状。', next: 'c2d4_needle_mpr' },
    c2d4_needle_history: { speaker: 'sys', sprite: patient,
      text: '「贴过膏药，也揉过。年头多了，哪样没试过啊。」罗阿姨捏了捏肩头，「药吃完没留盒子，我闺女每回都说我。你让我想想。」', next: 'c2d4_needle_history2' },
    c2d4_needle_history2: { speaker: 'zhou', sprite: 'char_zhou', sprite2: patient,
      text: '不着急，想起哪年就说哪年。我们先把这几个点看全。', next: 'c2d4_needle_mpr' },
    c2d4_needle_mpr: { speaker: 'sys', sprite: '', sprite2: '', image: mpr, imageLabel: '同次数据重组',
      text: '同一份数据换了观察方向。刚才的小亮点连成了细细的长条；另几条斜着穿过相邻层面，露出的长短不一。机房安安静静，只有鼠标滚轮在响。',
      effect: { flag: 'c2_needle_mpr' }, next: 'c2d4_needle_long' },
    c2d4_needle_long: { speaker: 'me', image: mpr, imageLabel: '同次数据重组',
      text: '刚才还像几粒白芝麻……怎么这么长？', next: 'c2d4_needle_surgery' },
    c2d4_needle_surgery: { speaker: 'zhou', sprite: 'char_zhou', sprite2: patient,
      text: '罗阿姨，背上以前做过手术，或者受过什么伤吗？', next: 'c2d4_needle_denial' },
    c2d4_needle_denial: { speaker: 'sys', sprite: patient, sprite2: '',
      text: '她抬头看了看屏幕，手从片袋上慢慢收回来。「没开过刀。真没有。」', next: 'c2d4_needle_vr' },
    c2d4_needle_vr: { speaker: 'sys', sprite: '', sprite2: '', image: vr, imageLabel: '同次数据重组',
      text: '老周打开三维显示，又逐处回看原来的断层。颈背部这些细影分散在不同位置，合起来共有**十五处**。光看刚才那一层，根本数不全。',
      effect: { flag: 'c2_needle_vr' }, next: 'c2d4_needle_count' },
    c2d4_needle_count: { speaker: 'sys', sprite: patient,
      text: '「十五个？」罗阿姨把眼镜摘下来擦了擦，「你别嫌我问得多啊。这些是针？我怎么一点都不知道？」', next: 'c2d4_needle_doctor' },
    c2d4_needle_doctor: { speaker: 'sys', sprite: 'char_duty', sprite2: patient,
      text: '值班医师已到控制室。他结合门诊查体和完整影像，核对这些异物的位置，也重新问了她今天的情况。眼前的处理和后续安排先写好，旧治疗记录另记为待补。', next: 'c2d4_needle_care' },
    c2d4_needle_care: { speaker: 'duty', sprite: 'char_duty', sprite2: patient,
      text: '片上是细长的金属样异物。今天评估下来，暂时没有需要急诊处理的情况。后面怎么随访，我跟门诊医生交接。以前的治疗记录，家里找找，有就带来。', next: 'c2d4_needle_family' },
    c2d4_needle_family: { speaker: 'sys', sprite: patient, sprite2: '',
      text: '「那我打给闺女，让她周末找。旧病历都在老房子，她比我找得快。」罗阿姨把随访单塞进片袋，停了一下：「我不是故意不说，我是真想不起来。」', next: 'c2d4_needle_reassure' },
    c2d4_needle_reassure: { speaker: 'zhou', sprite: 'char_zhou', sprite2: patient,
      text: '知道。先按医师今天交代的办。资料找到了，打袋子上这个电话，不用为了递张纸再排一上午。', next: 'c2d4_needle_leave' },
    c2d4_needle_leave: { speaker: 'sys', sprite: patient,
      text: '罗阿姨起身，把椅子推回原处。走到门口又回来半步：「刚说改裤脚那句，别跟我闺女说。她还以为我没收过别人钱呢。」小唐绷了半天，还是笑出了声。',
      effect: { flag: 'c2_needle_assessed' }, next: 'c2d4_needle_echo_q' },
    c2d4_needle_echo_q: { speaker: 'sys', sprite: 'char_tang', sprite2: '',
      text: '门诊医生把后续安排接走了。你收好光盘盒，小唐把挪出来的椅子归位。', choices: [
        { text: '「十五根，会是什么时候留下的？」', next: 'c2d4_needle_echo1' },
        { text: '「阿姨都退休了，还瞒着闺女接活呢。」', next: 'c2d4_needle_joke' },
        { text: '把影像和当日交接记好，回办公室', next: 'c2d4_chat0' },
      ] },
    c2d4_needle_echo1: { speaker: 'zhou', sprite: 'char_zhou',
      text: '多久还不知道。等她家里找找，别替她编故事。她今天这边的事，已经交接好了。', next: 'c2d4_needle_echo2' },
    c2d4_needle_echo2: { speaker: 'tang', sprite: 'char_tang',
      text: '我把电话记在交班本上。你周日来，记得问一声，我也惦记着呢。', next: 'c2d4_chat0' },
    c2d4_needle_joke: { speaker: 'tang', sprite: 'char_tang',
      text: '跟老周有得一拼。一个缝裤脚，一个往值班室搬茶叶，谁也闲不住。', next: 'c2d4_chat0' },
  },
  c2n5: {
    c2n5_needle_reveal0: { bg: 'bg_breakroom', speaker: 'tang', sprite: 'char_tang',
      text: '正想跟你说。她闺女周末回老房子，在一叠旧病历里找到了记录。周五还说没印象，看到那张纸，阿姨一下想起来了。', next: 'c2n5_needle_record' },
    c2n5_needle_record: { speaker: 'sys', sprite: '', image: record,
      text: '你翻开值班医师收好的补充记录。里面记着约三十年前的一次治疗：为缓解肩背痛，采用了**留针**的方法。不是这两天落下的东西。',
      effect: { flag: 'c2_needle_record' }, next: 'c2n5_needle_explain' },
    c2n5_needle_explain: { speaker: 'zhou', sprite: 'char_zhou',
      text: '那是一种少见的做法，原本就打算把针留在里面。跟平时扎完就取出来的针灸，不是一回事。', next: 'c2n5_needle_me' },
    c2n5_needle_me: { speaker: 'me', sprite: 'char_zhou',
      text: '所以她说没开过刀，确实没说错。可她怎么连扎过针都忘了？', next: 'c2n5_needle_memory' },
    c2n5_needle_memory: { speaker: 'tang', sprite: 'char_tang',
      text: '她记得那阵子治过肩背疼，不记得哪回是什么做法。人趴着，完了就走了，她一直以为针全取掉了。谁天天在心里数自己背上有几根针啊。', next: 'c2n5_needle_reply' },
    c2n5_needle_reply: { speaker: 'sys', sprite: 'char_tang',
      text: '小唐把阿姨回电话时的话学给你听：「那会儿天天赶活，肩膀抬都抬不起来。治完能接着干，我就回去了。真没想到，还在里头陪我退休了。」', next: 'c2n5_needle_vr' },
    c2n5_needle_vr: { speaker: 'sys', sprite: '', image: vr, imageLabel: '同次数据重组',
      text: '你又打开周五留下的三维图。还是那十五处细影，没有多，也没有少。横断面上的小点、换个方向后的长条，现在终于跟她的旧经历对上了。', next: 'c2n5_needle_q' },
    c2n5_needle_q: { speaker: 'me', text: '你把图退回原始序列，关掉了多余的窗口。', choices: [
        { text: '「下次先问治过什么，不光问开没开刀。」', next: 'c2n5_needle_answer1' },
        { text: '「她闺女找病历，有我们翻文件那劲儿。」', next: 'c2n5_needle_answer2' },
      ] },
    c2n5_needle_answer1: { speaker: 'zhou', sprite: 'char_zhou',
      text: '对。人家说的是自己的经历，不会照着咱们的问法背一遍。她一开始记不清的，慢慢补上就行。', next: 'c2n5_needle_closed' },
    c2n5_needle_answer2: { speaker: 'tang', sprite: 'char_tang',
      text: '她说家里电器说明书都找出来了，最后才翻到。阿姨还嫌她把柜子弄乱，边说边帮她重新叠。', next: 'c2n5_needle_closed' },
    c2n5_needle_closed: { speaker: 'zhou', sprite: 'char_zhou',
      text: '值班医师已经补进病史了，后续随访也照常接着。来龙去脉这回对上了，你别再盯着那十五根发愣。水还喝不喝？',
      effect: { flag: 'c2_needle_resolved' }, next: 'c2n5_chat_q' },
    // This compact route runs BEFORE the child arrives, only for a player who
    // saw Friday's case but skipped its optional Sunday tea-room follow-up.
    c2n5_needle_short0: { bg: 'bg_ctcontrol', speaker: 'zhou', sprite: 'char_zhou',
      text: '趁这会儿还没来人，跟你补一句：周五那位罗阿姨，家里周末找到旧记录了。约三十年前，为肩背痛做过一次少见的留针治疗。', next: 'c2n5_needle_short1' },
    c2n5_needle_short1: { speaker: 'sys', sprite: '', image: record,
      text: '你看过补充记录。那次治疗原本就打算把针留下；阿姨一直以为已经取走，并非有意隐瞒。颈背部十五处细影的来源，这回有了交代。',
      effect: { flag: 'c2_needle_record' }, next: 'c2n5_needle_short2' },
    c2n5_needle_short2: { speaker: 'zhou', sprite: 'char_zhou',
      text: '跟平常扎完取针的针灸不是一回事。她周五的评估和后续安排都没耽误，新找到的病史，医师也已经补进去了。行，交班本放这儿，准备值守。',
      effect: { flag: 'c2_needle_resolved' }, next: 'c2n5_m0' },
  },
}

type NeedleState = Pick<GameState, 'flags'>

/** Apply after social/pacing adapters so their existing choices stay intact. */
export function ch2NeedleStep(id: string, step: Step, { flags }: NeedleState): Step {
  if (id === 'c2d4_reg2' && !flags.c2_needle_seen) return { ...step, next: 'c2d4_needle0' }
  if (id === 'c2d4_chat0' && flags.c2_needle_assessed) return { ...step,
    text: '你回到办公室，主任还在跟小雷对那两版单子。桌上的饭盒一只都没打开，小雷朝你挪出一把凳子。' }
  if (id === 'c2n5_chat_q' && flags.c2_needle_seen && !flags.c2_needle_resolved) return { ...step, choices: [
    { text: '「罗阿姨那十五根针，后来有消息了吗？」', next: 'c2n5_needle_reveal0', cond: { flag: 'c2_needle_seen', notFlag: 'c2_needle_resolved' } },
    ...(step.choices ?? []).filter(choice => choice.next !== 'c2n5_needle_reveal0'),
  ] }
  if (id === 'c2n5_hub' && flags.c2_needle_seen && !flags.c2_needle_resolved) return { ...step,
    // Route a normal playthrough before entering m0, preserving that original
    // node's one-time arrival sound/effect identity. Its cabinet gate is kept.
    choices: step.choices?.map(choice => choice.next === 'c2n5_m0'
      ? { ...choice, next: 'c2n5_needle_short0' } : choice),
  }
  if (id === 'c2n5_m0' && flags.c2_needle_seen && !flags.c2_needle_resolved) {
    // A save already parked at m0 also receives closure before the arrival.
    // Returning after short2 restores the original node; later child nodes
    // are never intercepted.
    return { ...CH2_NEEDLE_STEPS.c2n5.c2n5_needle_short0 }
  }
  // Do not fabricate memories if an old/debug save points directly into the
  // new Sunday branch without ever having met this patient on Friday.
  if (id.startsWith('c2n5_needle_') && !flags.c2_needle_seen) return {
    speaker: 'sys', text: '你合上交班本。先接着眼前的事。',
    next: id.includes('_short') ? 'c2n5_m0' : 'c2n5_chat_q',
  }
  return step
}
