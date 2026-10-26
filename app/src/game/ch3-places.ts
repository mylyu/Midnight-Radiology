import type { Choice, GameState } from './types'
import type { TrilogyStep } from './trilogy-types'
import { condOk } from './store'

type Place = { label: string; bg: string; text: string }
const places: Record<string, Place> = {
  teaching: { label: '🔎 窗边教学台', bg: 'bg_us_room_day', text: '窗边的软垫上摆着模体，纸巾盒就贴在手边。临床机隔着一道帘子，这边暂时没人用。' },
  rest: { label: '☕ 休息室', bg: 'ch2_bg_breakroom_day', text: '热水壶刚跳了闸，桌边还空着一把椅子。几只写着名字的杯子挤在一起，谁的饭盒又忘了拿。' },
  waiting: { label: '🪑 候诊区', bg: 'bg_waiting_day_v2', text: '窗口边腾出一点空地方，资料和片袋都放在柜台内侧。你绕开等候的队伍，走过去看看。' },
  office: { label: '🗂️ 办公室', bg: 'bg_office_day', text: '办公室门开着，桌上一半是资料，另一半也快放满了。你把门边的椅子拉出来。' },
  reading: { label: '🖥️ 阅片资料区', bg: 'bg_office_day', text: '工作站旁放着旧教学片盒，屏幕上的文件夹却只叫“新建文件夹”。梅姐说过，需要的图都在这里——至于哪一张，得找找。' },
  corridor: { label: '🚪 科室走廊', bg: 'bg_waiting_day_v2', text: '走廊里有推车经过，电梯的到站声响了一下。你往边上让了让，没挡在门口。' },
  parking: { label: '🔌 设备停放处', bg: 'bg_us_room_day', text: '移动机停在诊室门边，电源线收在侧袋。那只响轮子安静下来，倒像刚才什么也没发生。' },
  supplies: { label: '📦 备物区', bg: 'bg_us_room_day', text: '诊室边的柜子刚打开，新箱子压着几张领用单。梅姐把纸从箱底抽出来，拍掉上面的灰。' },
}

// Existing events keep their IDs, costs and completion receipts. A location is
// not itself a completed event: unfinished independent uses must stay reachable.
const destinations: Record<string, [string, string]> = {
  c3_s1_probes_0: ['teaching', '🔎 看看软垫上的三支探头'],
  c3_s1_tea_0: ['rest', '☕ 接杯热水，认认桌上的杯子'],
  c3_s1_wait_0: ['waiting', '📋 帮忙理一理柜台上的旧片和申请单'],
  c3_s2_roster_0: ['office', '📅 看看墙上的排班表'],
  c3_s2_he_0: ['rest', '🍪 坐下来歇会儿'],
  c3_s2_label_0: ['reading', '🖥️ 找找“最好的一张”教学图'],
  c3_s3_tang_0: ['corridor', '🚪 看看去病区的路怎么走'],
  c3_s3_cart_0: ['parking', '🔌 收好移动机的电源和备用线'],
  c3_s3_bag_0: ['waiting', '👜 看看寄存的布袋'],
  c3_s4_lei_0: ['rest', '🏷️ 借桌上那台标签机'],
  c3_s4_pack_0: ['supplies', '📦 拆开新送来的耗材'],
  c3_s4_cost_0: ['supplies', '🧾 核一核柜门上的用量单'],
  c3_s4_zhou_0: ['corridor', '📞 在安静处给老周回个电话'],
  c3_s4_han_0: ['office', '📄 把设备核对单递进去'],
  c3_s5_zhou_0: ['office', '🍵 歇会儿，聊聊这两周'],
  c3_s5_lei_0: ['rest', '🏷️ 把借来的标签机放回桌上'],
  c3_s5_mei_0: ['teaching', '🧽 收拾用过的教学台'],
  c3_s5_notice_0: ['waiting', '📄 帮忙递一份旧资料'],
}

export function installCh3Places(steps: Record<string, TrilogyStep>) {
  const hubs = new Map<string, { rooms: string[]; clinical: Choice }>()
  const rooms = new Map<string, { place: Place; hub: string; actions: Choice[] }>()
  for (let shift = 1; shift <= 5; shift++) {
    const hub = `c3_s${shift}_hub`, choices = steps[hub].choices!
    const grouped = new Map<string, Choice[]>()
    for (const choice of choices.slice(0, -1)) {
      const target = destinations[choice.next] ?? (choice.next.includes('_towel_use_')
        ? ['teaching', '🧽 用小毛巾收拾教学台']
        : choice.next.includes('_stickers_use_') ? ['rest', '🏷️ 给桌上的杯子贴姓名'] : undefined)
      if (!target) throw new Error(`CH3 exploration has no location: ${choice.next}`)
      const [key, text] = target
      grouped.set(key, [...(grouped.get(key) ?? []), { ...choice, text }])
    }
    const roomIds: string[] = []
    for (const [key, actions] of grouped) {
      const id = `c3_s${shift}_place_${key}`, place = places[key]
      rooms.set(id, { place, hub, actions }); roomIds.push(id)
      steps[id] = { speaker: 'sys', text: place.text, bg: place.bg, sprite: '', sprite2: '',
        choices: [...actions, { text: '🚪 回走廊', next: hub }] }
    }
    const clinical = { ...choices.at(-1)!, text: shift === 5 ? '🩺 回教学台，开始考核' : '🩺 回诊室，准备接诊' }
    hubs.set(hub, { rooms: roomIds, clinical })
    // Static graph keeps every branch discoverable to the asset/graph tools.
    steps[hub] = { ...steps[hub], bg: 'bg_waiting_day_v2', sprite: '', sprite2: '',
      choices: [...roomIds.map(id => ({ text: rooms.get(id)!.place.label, next: id })),
        { text: '🛒 小卖部', next: '@shop' }, clinical] }
  }
  const available = (actions: Choice[], state: GameState) => actions
    .filter(c => condOk(state, c.cond ? { ...c.cond, ap: undefined } : undefined))
    .map(c => c.next === 'c3_s5_lei_0' && !state.flags.c3_s4_lei_done ? { ...c, text: '☕ 坐下来歇会儿' } : c)
  return (id: string, step: TrilogyStep, state: GameState): TrilogyStep | undefined => {
    const hub = hubs.get(id)
    if (hub) return { ...step, choices: [
      ...hub.rooms.flatMap(roomId => {
        const room = rooms.get(roomId)!, actions = available(room.actions, state)
        // A single event starts as soon as the player enters, just as in CH1.
        // More than one event needs a small room-local menu, without entry cost.
        return !actions.length ? [] : actions.length === 1 ? [{ ...actions[0], text: room.place.label }]
          : [{ text: room.place.label, next: roomId }]
      }), { text: '🛒 小卖部', next: '@shop' }, hub.clinical,
    ] }
    const room = rooms.get(id)
    if (room) return { ...step, choices: [...available(room.actions, state), { text: '🚪 回走廊', next: room.hub }] }
  }
}
