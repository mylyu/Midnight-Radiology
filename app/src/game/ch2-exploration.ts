import type { GameState, Step } from './types'

// Keep locations available after their one-time event, without repeating its
// reward, AP cost, departed visitor or evidence grant. Original nodes stay valid.
const visits: Record<string, { flag: string; id: string; bg: string; text: string; sprite?: string }> = {
 c2n1_ab1: {flag:'c2n1_a',id:'c2n1_visit_old',bg:'bg_corridor',text:'凹位里的旧读片器蒙上了防尘罩。老范把零件箱往里推了推，留出通道：「看归看，别把封条揭了。我还没点完数呢。」',sprite:'char_fan'},
 c2n1_an1: {flag:'c2n1_a',id:'c2n1_visit_old',bg:'bg_corridor',text:'凹位里的旧读片器蒙上了防尘罩。老范把零件箱往里推了推，留出通道：「看归看，别把封条揭了。我还没点完数呢。」',sprite:'char_fan'},
 c2n1_b1: {flag:'c2n1_b',id:'c2n1_visit_vendor',bg:'bg_ctcontrol',text:'工作台收拾干净了，厂家的值班电话贴在屏幕旁。你把翘起的胶带按实，小唐从背后探头：「这张可别丢，半夜出事就指着它。」',sprite:'char_tang'},
 c2n1_e1: {flag:'c2n1_e',id:'c2n1_visit_corridor',bg:'bg_corridor',text:'走廊安静下来，推车的轮声从电梯那头传来。你侧身让出通道，顺手把歪在墙边的候诊椅摆正。'},
 c2n1_c1: {flag:'c2n1_c',id:'c2n1_visit_tea',bg:'bg_breakroom',text:'茶水间的壶刚跳闸。你接了半杯热水，小唐在门口伸手：「等会儿，帮我那杯也续上。我不喝凉茶，今天已经够凉了。」',sprite:'char_tang'},
 c2n3_a1: {flag:'c2n3_a',id:'c2n3_visit_corridor',bg:'bg_corridor',text:'电梯门开了又关，雯雯的高跟鞋声已经听不见。你靠墙站了片刻，把脑子里的合同数字清出去，准备接下一班病人。'},
 c2n3_d1: {flag:'c2n3_d',id:'c2n3_visit_desk',bg:'bg_waiting',text:'小唐正把单据夹回板子，看你过来，抬了抬下巴：「这边我看着。你歇一口气，有人来我喊你。」',sprite:'char_tang'},
 c2n3_k1: {flag:'c2n3_k',id:'c2n3_visit_break',bg:'bg_breakroom',text:'休息室留着半张空椅子。小何的手机又响了，你替她扶住差点滑下桌沿的饭盒。她冲你点了下头，夹着电话往外走。'},
 c2n3_bk1: {flag:'c2n3_bk',id:'c2n3_visit_notes',bg:'bg_breakroom',text:'你靠在值班室椅背上，把刚才没记牢的几个词写在便签上。书架就在手边，门外的脚步声暂时没有停在这里。'},
 c2n5_a1: {flag:'c2n5_cabinet',id:'c2n5_visit_archive',bg:'bg_archive',text:'旧片和笔记已经按原来的顺序放好。你又看了一眼合影里抱本子的年轻人，轻轻带上柜门。钥匙交回去了，这回不用再猜柜子里是什么。'},
 c2n5_b1: {flag:'c2n5_b',id:'c2n5_visit_break',bg:'bg_breakroom',text:'保温盒旁边空出一小块桌面，正好搁你的杯子。小唐从门缝探头：「饭盒先放着，谁吃的谁洗，别拿值班当借口啊。」',sprite:'char_tang'},
 c2n5_e1: {flag:'c2n5_e',id:'c2n5_visit_equipment',bg:'bg_ctcontrol',text:'你从设备间门口再看了一眼，接线没有新变化。门旁的巡检表已经签过，回控制室时顺手试了试门锁。'},
}

export function explorationStep(id: string, step: Step, state: Pick<GameState,'flags'> & Partial<Pick<GameState,'ap'|'items'>>): Step {
 const revisit=Object.values(visits).find(v=>v.id===id)
 if (revisit && !state.flags[revisit.flag]) {
  // An AP/item-limited walk is not completion of the unseen event. Do not
  // mention a departed vendor, opened cabinet or a book the player never owned.
  const passing:Record<string,string>={
   bg_corridor:'你沿走廊走到电梯口，给推车让了个道。脚步声渐渐远了，控制室的电话又响起来。',
   bg_ctcontrol:'你在门口停了一会儿，里面的人还在忙。你没打断他们，转身回去等开诊。',
   bg_breakroom:'你进来倒了杯热水，在门边歇了一会儿。还没喝完，走廊就传来了推车声。',
   bg_waiting:'你绕着候诊区走了一圈，把挡路的椅子推回墙边。排号屏上的数字还没有动。',
  }
  return {...step,sprite:undefined,text:passing[revisit.bg] ?? '你在门口停了一会儿，又回到控制室。'}
 }
 if (!id.endsWith('_hub') || !step.choices) return step
 return {...step,choices:step.choices.map(choice=>{
  const visit=visits[choice.next]
  if (!visit) return choice
  const visited=!!state.flags[visit.flag]
  const unavailable=(choice.cond?.ap !== undefined && (state.ap ?? 3)<choice.cond.ap) || (choice.cond?.item && !(state.items ?? []).includes(choice.cond.item))
  if (!visited && !unavailable) return choice
  const cond={...choice.cond}
  delete cond.notFlag; delete cond.ap; delete cond.item
  // Item-locked snacks are not free food; the player may still visit the room.
  const names:Record<string,string>={c2n3_k1:'休息室 · 看看小何',c2n3_bk1:'值班室 · 整理笔记',c2n5_a1:'旧片库 · 再看一眼'}
  const label=names[choice.next] ?? choice.text.replace(/（⚡-1）/g,'').replace('厂家撤场前交底 · 小凯','控制室 · 厂家交接台')
  return {...choice,text:label+'（随便走走）',next:visit.id,cond}
 })}
}

export function revisitNodes(shiftId: string): Record<string,Step> {
 return Object.fromEntries(Object.values(visits).filter(v=>v.id.startsWith(shiftId+'_')).map(v=>[
  v.id,{bg:v.bg,speaker:'sys',text:v.text,sprite:v.sprite,next:shiftId+'_hub'},
 ]))
}

/** A new run resets only CT run-local flags; cross-chapter relationships,
 * historical cards/badges, possessions and first-chapter branches are retained. */
export function restartCh2(s: GameState): GameState {
 const local=new Set(['day_shift','queue_wait','data_audit','data_support','data_oppose','data_hook','audit_evidence','luzhou_formal','luzhou_wait','luzhou_gray','phantom_log','maintenance_draft','remote_proposal','ch2_registration_resolved','old_register','nameless_films','ai_hook','dose_explained','zhou_handover','term_checked'])
 return {...s,ap:0,flags:Object.fromEntries(Object.entries(s.flags).filter(([key])=>!/^c2|^heard2_/.test(key)&&!local.has(key))),
  dlc:{...(s.dlc??{}),ch2:{}}}
}
