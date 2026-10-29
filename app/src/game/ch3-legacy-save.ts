import type { GameState } from './types'
import type { TrilogyStep } from './trilogy-types'

/**
 * Read-only bridges for cursors and receipts created by earlier Chapter 3 revisions.
 * Active story callbacks stay in ch3.ts; this layer must never invent progress,
 * rewards, memories or new flags. Keep old node IDs until saved runs are retired.
 */
export function adaptCh3LegacySave(id: string, step: TrilogyStep, state: GameState): TrilogyStep | undefined {
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
    speaker: 'sys',
    text: '这张的深部补偿已经调好。梅姐把画面停住，让你先认一认里面的结构。', next: 'c3_liver_observe' }
  // Older saves may already have sent Wang back to cardiology before the
  // M-mode recap. Do not put him back on the bed or run his reporting twice.
  if (/^c3_s3_motion_[0-4]$/.test(id)) {
    const reviewed = !!state.flags.c3_wang_reviewed
    return { ...step,
      ...(reviewed ? { sprite: 'char_mei', sprite2: '', ...(id === 'c3_s3_motion_0'
        ? { text: '王叔已经回心内科了。梅姐把刚才存的图调出来，指着旁边沿时间展开的运动轨迹，让你再对一对。' } : {}) } : {}),
      ...(reviewed && id === 'c3_s3_motion_1'
        ? { speaker: 'me', text: '刚才黑白图明明已经在动了。这个**M超**，是专门盯着那一条线？' } : {}),
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
    || id === 'c3_s5_notice_desk' && state.flags.c3_xu_query_assisted) return { ...step, effect: undefined }
  return undefined
}
