import type { Evidence } from './dlc'
import type { GameState, Step } from './types'

type TerminalState = Pick<GameState, 'flags'> & Partial<Pick<GameState, 'ap' | 'dlc'>>
const CLOSEUP = 'ch2_terminal_closeup_v1'
const ONLINE = 'ch2_terminal_online_v1'

/** These are local, one-shot presentation cues, not shared dialogue SFX. */
export const CH2_TERMINAL_CUES: Record<string, { kind: 'alarm' | 'receipt'; text: string }> = {
  c2n5_terminal_key: { kind: 'alarm', text: '短促的本机维护警报' },
  c2n5_terminal_pass_alarm: { kind: 'alarm', text: '短促的本机维护警报' },
  c2n5_terminal_receipt: { kind: 'receipt', text: '样本已接收。' },
}

export interface Ch2TerminalPanel {
  mode: 'online' | 'offline' | 'receipt'
  connection: string
  receiptTime?: string
  recipient?: string
}

/** No receipt metadata is exposed before the player actually looks at the screen. */
export const CH2_TERMINAL_PANELS: Record<string, Ch2TerminalPanel> = {
  ...Object.fromEntries(['c2n1_terminal_look', 'c2n1_terminal_explain', 'c2n1_terminal_leave',
    'c2n3_terminal_0', 'c2n3_terminal_look', 'c2n3_terminal_device_note', 'c2n3_terminal_reconnect']
    .map(id => [id, { mode: 'online' as const, connection: '厂家外网已连接' }])),
  ...Object.fromEntries(['c2n3_terminal_unplug', 'c2d4_terminal_stop',
    'c2n5_terminal_key', 'c2n5_terminal_receipt', 'c2n5_terminal_pass_alarm']
    .map(id => [id, { mode: 'offline' as const, connection: '有电 · 外网未连接' }])),
  ...Object.fromEntries(['c2n5_terminal_screen', 'c2n5_terminal_screen_time',
    'c2n5_terminal_screen_log', 'c2n5_terminal_screen_history', 'c2n5_terminal_screen_q', 'c2n5_terminal_save']
    .map(id => [id, { mode: 'receipt' as const, connection: '离线 · 本地维护页',
      receiptTime: '试运行记录 · 17:42', recipient: '接收端：代号待核实' }])),
}

/** Looking/hearing is not the same as saving a record, and none proves a recipient's identity. */
export const CH2_TERMINAL_EVIDENCE: Record<string, Evidence> = {
  terminal_device_note: {
    title: '厂家小盒子的设备编号', flag: 'c2_terminal_device_noted',
    body: '你在第三夜只看未拔，抄下外壳设备编号和网口位置，留在院内交班本。编号可用于后续核对；设备究竟传了哪些内容、接收者是谁，仍未核实。',
  },
  terminal_call_note: {
    title: '终端失联后的来电记录', flag: 'c2_terminal_call_noted',
    body: '本轮拔下厂家终端外网线后，一名自称值班售后的人来电，询问离线情况、当班人员，以及最近是否导出过质控样本。你记下了来电显示、时间和对方说法。对方身份尚未核实；这条记录不能证明匿名短信来自同一个人。',
  },
  terminal_local_receipt: {
    title: '终端本地旧回执', flag: 'c2_terminal_receipt_saved', image: CLOSEUP,
    body: '你将本地维护页的回执号和显示时间写入院内交班记录。这是试运行期间17:42留下的记录，日期在你首夜上岗之前，也早于第三夜拔线和周五停止外传。接收端只显示代号，实际接收者尚待核查。终端当时有电、外网未接；看到旧回执不等于此刻正在上传。',
  },
}

export const CH2_TERMINAL_STEPS: Record<string, Record<string, Step>> = {
  c2n1: {
    c2n1_terminal_look: { speaker: 'me', sprite: 'char_kai', image: ONLINE,
      text: '小屏暗了又亮，边上还有个**维护键**。我伸出手：「这也归我们管？」',
      effect: { flag: 'c2_terminal_n1_seen' }, next: 'c2n1_terminal_explain' },
    c2n1_terminal_explain: { speaker: 'kai', sprite: 'char_kai', image: ONLINE,
      text: '看看状态就行。那个键会调本机回执，还带语音。别连着按，夜里响起来挺烦的。', next: 'c2n1_terminal_leave' },
    c2n1_terminal_leave: { speaker: 'sys', image: ONLINE,
      text: '小雷顺着标签看了一眼：「这根是它单独的外网，院内PACS另走一条。」小凯把翘起的标签按平，屏幕又暗下去。', next: 'c2n1_b4' },
  },
  c2n3: {
    c2n3_terminal_0: { bg: 'bg_ctcontrol', speaker: 'sys', image: ONLINE,
      text: '开诊前，你绕到机柜侧面，小盒子的灯一直闪。先给小雷确认线号，他回：「标着**厂家外网**的那根，只通这个盒子。院内PACS另走线路，别碰旁边的。」',
      effect: { ap: -1, flag: 'c2_terminal_n3_seen' }, choices: [
        { text: '先看小屏写着什么', next: 'c2n3_terminal_look' },
        { text: '试着拔下标着“厂家外网”的那根线', next: 'c2n3_terminal_unplug' },
        { text: '先不碰，回控制台', next: 'c2n3_terminal_done' },
      ] },
    c2n3_terminal_look: { speaker: 'me', image: ONLINE,
      text: '小屏上只有“在线”和几个计数，没有病人姓名。看它闪灯，也看不出到底传了什么。', choices: [
        { text: '拔下这根独立外网线看看', next: 'c2n3_terminal_unplug' },
        { text: '不动线，记下设备编号再回去', next: 'c2n3_terminal_device_note' },
      ] },
    c2n3_terminal_device_note: { speaker: 'me', image: ONLINE,
      text: '我把外壳上的设备编号抄进交班本，顺手记下网口位置。先不碰线。',
      effect: { flag: 'c2_terminal_device_noted' }, next: 'c2n3_terminal_done' },
    c2n3_terminal_unplug: { speaker: 'sys', image: CLOSEUP,
      text: '卡扣一松，外网口的灯灭了。电源灯还亮着。你回头看了眼控制台：CT待机正常，院内PACS也还在。',
      effect: { flag: 'c2_terminal_n3_unplugged' }, next: 'c2n3_terminal_wait' },
    c2n3_terminal_wait: { speaker: 'sys',
      text: '你把线头放在机柜边，回去补了一行交班记录。笔帽还没扣上，座机响了。', next: 'c2n3_terminal_call' },
    c2n3_terminal_call: { speaker: 'sys',
      text: '对方自称厂家值班售后：「你们那台终端刚离线。现场断电了吗？……今晚哪位老师在？」',
      effect: { flag: 'c2_terminal_call_received' }, choices: [
        { text: '「只是拔了网线。你怎么这么快就知道？」', next: 'c2n3_terminal_ask' },
        { text: '「CT没报警。具体情况，你找信息科。」', next: 'c2n3_terminal_quiet' },
      ] },
    c2n3_terminal_ask: { speaker: 'sys',
      text: '「我们这边能看到设备掉线。」他停了一下，又问谁在值班。你反问工单号，听筒里只剩了几秒底噪。',
      effect: { flag: 'c2_terminal_call_questioned' }, next: 'c2n3_terminal_probe' },
    c2n3_terminal_quiet: { speaker: 'sys',
      text: '「那先接回去吧，不影响你们扫描。」你没接这句，只说会记进交班。对方报了个姓，又压低了点声音。',
      effect: { flag: 'c2_terminal_call_guarded' }, next: 'c2n3_terminal_probe' },
    c2n3_terminal_probe: { speaker: 'sys',
      text: '「最近导过质控样本没有？」他忽然问。你问是哪一份，他换了话题：「先恢复连接，剩下的明天说。」', next: 'c2n3_terminal_connection_q' },
    c2n3_terminal_connection_q: { speaker: 'me', text: '电话还没挂。那截线头就放在机柜边。', choices: [
      { text: '保持断开，告诉小雷', next: 'c2n3_terminal_keep_offline' },
      { text: '按要求接回，留下通话记录', next: 'c2n3_terminal_reconnect' },
    ] },
    c2n3_terminal_keep_offline: { speaker: 'me',
      text: '我没答应，挂了电话。线先不接，在交班栏写下“终端外网已断，CT和PACS正常”，给小雷留了话。',
      effect: { flag: 'c2_terminal_n3_told_lei' }, next: 'c2n3_terminal_note_q' },
    c2n3_terminal_reconnect: { speaker: 'sys', image: ONLINE,
      text: '你把线插回原来的口，链路灯重新亮起。对方说了声「收到」，没再问你的名字。你挂断电话，盯着那粒灯看了一会儿。',
      effect: { flag: 'c2_terminal_n3_reconnected' }, next: 'c2n3_terminal_note' },
    c2n3_terminal_note_q: { speaker: 'me', text: '这通电话，要不要单独留一笔？', choices: [
      { text: '把来电显示、时间和说法记进交班记录', next: 'c2n3_terminal_note' },
      { text: '先记着，回去值班', next: 'c2n3_terminal_done' },
    ] },
    c2n3_terminal_note: { speaker: 'sys',
      text: '你按座机上的记录抄下号码和时间，在“身份”旁留了个问号。只听他自报，还不知道到底是谁。',
      effect: { flag: 'c2_terminal_call_noted' }, next: 'c2n3_terminal_done' },
    c2n3_terminal_done: { speaker: 'sys', text: '你没动盒子，回到控制台。那条厂家外网仍接着。',
      effect: { flag: 'c2_terminal_n3_done' }, next: 'c2n3_hub' },
  },
  c2d4: {
    c2d4_terminal_stop: { speaker: 'sys', image: CLOSEUP,
      text: '小雷把终端外网线拔下，收在一旁。盒子留着电，保留本地记录；院内PACS照常用。',
      effect: { flag: 'c2_terminal_stopped' }, next: 'c2d4_reg' },
  },
  c2n5: {
    c2n5_terminal_key: { speaker: 'sys', image: CLOSEUP,
      text: '你轻触**维护键**。小盒子短促地叫了一声，屏幕突然亮了。网口的灯仍然是黑的。',
      effect: { flag: 'c2_terminal_alarm_heard' }, next: 'c2n5_terminal_receipt' },
    c2n5_terminal_receipt: { speaker: 'sys', image: CLOSEUP,
      text: '一段平板的声音从盒子里响起来：「样本已接收。」你手还停在半空。线明明没接。',
      effect: { flag: 'c2_terminal_voice_heard' }, next: 'c2n5_terminal_screen' },
    c2n5_terminal_pass_alarm: { speaker: 'sys', image: CLOSEUP,
      text: '你没碰它，刚从机柜边走过，背后忽然响了一声短促的警报。小屏自己亮起来了。',
      effect: { flag: 'c2_terminal_alarm_heard' }, next: 'c2n5_terminal_turn_q' },
    c2n5_terminal_turn_q: { speaker: 'me', text: '我停了一下。', choices: [
      { text: '折回去看屏幕', next: 'c2n5_terminal_screen' },
      { text: '先不理它，继续巡检', next: 'c2n5_terminal_done' },
    ] },
    c2n5_terminal_screen: { speaker: 'sys', image: CLOSEUP,
      text: '屏幕顶上写着**离线**。下面那行亮着：“本地维护回执——样本已接收。”',
      effect: { flag: 'c2_terminal_receipt_seen' }, next: 'c2n5_terminal_screen_time' },
    c2n5_terminal_screen_time: { speaker: 'me', image: CLOSEUP,
      text: '试运行记录，17:42。日期还在我第一晚来上班之前。不是刚传的。', next: 'c2n5_terminal_screen_log' },
    c2n5_terminal_screen_log: { speaker: 'sys', image: CLOSEUP,
      text: '接收端是一串代号。备注只有四个字：**夜班确认**。没有人名。', next: 'c2n5_terminal_screen_q' },
    c2n5_terminal_screen_history: { speaker: 'me', image: CLOSEUP,
      text: '往后还有一条“维护中断”，才是我拔线那晚。前面那份东西，早就出去了。', next: 'c2n5_terminal_screen_q' },
    c2n5_terminal_screen_q: { speaker: 'me', image: CLOSEUP,
      text: '这是一条旧记录。可传给了谁，这个小屏没告诉我。', choices: [
        { text: '把回执号和时间留在院内交班记录里', next: 'c2n5_terminal_save' },
        { text: '先记住这几个字，不往下翻了', next: 'c2n5_terminal_done' },
      ] },
    c2n5_terminal_save: { speaker: 'sys', image: CLOSEUP,
      text: '你把回执号和显示时间记下来，接收端一栏照抄那个代号，没擅自填成厂家。明早让小雷拿留存日志核对。',
      effect: { flag: 'c2_terminal_receipt_saved' }, next: 'c2n5_terminal_done' },
    c2n5_terminal_done: { speaker: 'sys', text: '你收回手，继续巡检。盒子还有电，外网线没有接回去。',
      effect: { flag: 'c2_terminal_n5_done' }, next: 'c2n5_e2' },
  },
  c2am: {
    c2am_terminal_sms: { speaker: 'sys', bg: 'bg_office_day',
      text: '考核结束，你刚收起东西，手机亮了一下。陌生号码，只有一句：**「别把盒子还给他们。」**',
      effect: { flag: 'c2_terminal_end_sms_received' }, next: 'c2am_8' },
  },
}

/** Historical actions are separate from the current connection state. */
export function ch2TerminalAfterNight3(state: TerminalState): 'untouched' | 'offline' | 'reconnected' {
  const f = state.flags
  return f.c2_terminal_n3_unplugged
    ? f.c2_terminal_n3_reconnected ? 'reconnected' : 'offline'
    : 'untouched'
}

/** Run AFTER the chapter's social/pacing transforms, which also adapt the SMS. */
export function ch2TerminalStep(id: string, step: Step, state: TerminalState): Step {
  const f = state.flags, connection = ch2TerminalAfterNight3(state)
  if (id === 'c2n1_b4' && !f.c2_terminal_n1_seen && !step.choices?.some(c => c.next === 'c2n1_terminal_look')) {
    return { ...step, choices: [...(step.choices ?? []),
      { text: '凑近看看小盒子的屏幕', next: 'c2n1_terminal_look', cond: { notFlag: 'c2_terminal_n1_seen' } }] }
  }
  if (id === 'c2n3_hub' && !f.c2_terminal_n3_done && !step.choices?.some(c => c.next === 'c2n3_terminal_0')) {
    const choices = [...(step.choices ?? [])]
    const opening = choices.findIndex(c => c.next === 'c2n3_m0')
    choices.splice(opening < 0 ? choices.length : opening, 0, {
      text: '机柜旁 · 看看厂家小盒子（⚡-1）', next: 'c2n3_terminal_0',
      cond: { notFlag: 'c2_terminal_n3_done', ap: 1 },
    })
    return { ...step, choices }
  }
  if (id === 'c2n3_terminal_0' && f.c2_terminal_n3_done) {
    return { speaker: 'sys', text: '刚才已经看过了，先回去值班。', next: 'c2n3_hub' }
  }
  if (id === 'c2n3_terminal_done') return { ...step, text: connection === 'offline'
    ? `你回到控制台。终端外网保持断开。${f.c2_terminal_n3_told_lei ? '小雷那边已经留了话。' : ''}`
    : connection === 'reconnected' ? '你回到控制台。终端外网已经接回，刚才那通电话却没让人踏实多少。' : step.text }
  if (id === 'c2d4_e1' && connection !== 'untouched') return { ...step, text: connection === 'offline'
    ? '你前一班拔下的外网线还没接回去。厂家又来催「远程质控服务」，说不加钱。先把之前已经传了什么弄清楚。'
    : '前一班，你接过一通自称售后的电话，又把终端外网接了回去。厂家现在来催「远程质控服务」。先核清之前已经传了什么。' }
  if (id === 'c2d4_e2' && f.c2_terminal_call_noted) return { ...step,
    text: `${step.text ?? ''}你把那晚的来电记录放到桌上，身份那一栏还是问号。` }
  if (id === 'c2d4_e3' && connection !== 'untouched') return { ...step,
    text: `${step.text ?? ''}${connection === 'offline'
      ? '我查的是你断网前留下的样本，不是拔线后还在传。'
      : '你说对方催着复线，那通电话的时间也记进核查单，一起对日志。'}` }
  if (id === 'c2d4_e7c' && connection === 'offline') return { ...step,
    text: (step.text ?? '').replace('先断外网', '外网继续断开') }
  if (id === 'c2d4_e8') return { ...step, next: 'c2d4_terminal_stop' }
  if (id === 'c2d4_terminal_stop') return { ...step, text: connection === 'offline'
    ? '小雷检查了你先前拔下的外网线，收好，没有接回。盒子留着电，保留本地记录；院内PACS照常用。'
    : connection === 'reconnected'
      ? '小雷把你接回过的终端外网线重新拔下，收好。盒子留着电，保留本地记录；院内PACS照常用。'
      : step.text }
  if (id === 'c2n5_e1') {
    if (f.c2_terminal_n5_done) return { ...step, effect: undefined, choices: undefined,
      text: '终端还留着电，外网线收在一旁。继续把剩下的巡检做完。', next: 'c2n5_e2' }
    return { ...step, choices: [
      { text: '轻触盒子上的“维护”键', next: 'c2n5_terminal_key', effect: { flag: 'c2_terminal_key_pressed' } },
      { text: '不碰按键，只看小屏', next: 'c2n5_terminal_screen' },
      { text: '不碰它，从机柜旁走过去', next: 'c2n5_terminal_pass_alarm', effect: { flag: 'c2_terminal_walked_past' } },
    ] }
  }
  // Old saves parked at these original nodes still get a truthful, offline continuation.
  if ((id === 'c2n5_e1x' || id === 'c2n5_e1y') && !f.c2_terminal_n5_done) return { ...step, next: 'c2n5_terminal_screen' }
  if (id === 'c2n5_terminal_screen_time' && f.c2_terminal_voice_heard) return { ...step,
    text: `${step.text ?? ''}刚才播的是旧记录。` }
  if (id === 'c2n5_terminal_screen_log') return { ...step,
    text: `${step.text ?? ''}${f.c2_terminal_walked_past ? '页脚还留着一行：定时提醒。' : ''}`,
    next: f.c2_terminal_n3_unplugged ? 'c2n5_terminal_screen_history' : step.next }
  // Do not fabricate the unplugging memory if an old/debug save enters this node directly.
  if (id === 'c2n5_terminal_screen_history' && !f.c2_terminal_n3_unplugged) return { ...step,
    text: '往后的维护记录还有几页。我没有再翻，先留住眼前这条。' }
  if (id === 'c2n5_n6') {
    const recall = f.c2_terminal_receipt_saved ? '你摸到口袋里的交班纸。那条旧回执还没查清是谁收的。'
      : f.c2_terminal_receipt_seen ? '你想起盒子里那条旧回执。接收端还是一串代号。'
        : f.c2_terminal_voice_heard ? '刚才盒子里的那句“样本已接收”，又在你脑子里响了一遍。'
          : f.c2_terminal_call_received ? '你想起拔线后那通电话。还不能确定，是不是同一拨人。' : ''
    return { ...step, text: `${step.text ?? ''}${recall}`, effect: { ...step.effect, flag: 'c2_terminal_sms_seen' } }
  }
  if (id === 'c2am_6' && !f.c2_terminal_end_sms_received) return { ...step, next: 'c2am_terminal_sms' }
  if (id === 'c2am_terminal_sms' && (f.c2_terminal_sms_seen || f.c2_sms_saved || f.c2_sms_replied)) return { ...step,
    text: '考核结束，你刚收起东西，手机又亮了一下。还是凌晨那个陌生号码：**「别把盒子还给他们。」**' }
  return step
}
