import { readFileSync, existsSync } from 'fs'
import vm from 'vm'

const root = '/mnt/agents/output/app'
let src = readFileSync(`${root}/src/game/data.ts`, 'utf8')

src = src
  .replace(/^import[^\n]*$/gm, '')
  .replace(/^export interface[^\n]*$/gm, '')
  .replace(/:\s*Record<string,\s*\{[^=]*?\}>/g, '')
  .replace(/:\s*ShopItem\[\]/g, '')
  .replace(/:\s*Night\[\]/g, '')
  .replace(/:\s*QuizQuestion\[\]/g, '')
  .replace(/:\s*\{ title: string; body: string; note: string \}\[\]/g, '')
  .replace(/export const/g, 'const')

const ctx = {}
vm.createContext(ctx)
vm.runInContext(src + '\nthis.NIGHTS = NIGHTS; this.QUIZ = QUIZ; this.BADGES = BADGES;', ctx)

const NIGHTS = ctx.NIGHTS
let errors = []
let stepCount = 0, choiceCount = 0

for (const night of NIGHTS) {
  const steps = night.steps
  const ids = Object.keys(steps)
  stepCount += ids.length
  const seen = new Set()
  const queue = [night.start]
  if (night.id === 5) queue.push('n5_epi0') // 考后尾声：由考试结束路由进入，不在剧情图内
  while (queue.length) {
    const id = queue.shift()
    if (!steps[id]) { errors.push(`${night.id}: 引用了不存在的步骤 ${id}`); continue }
    if (seen.has(id)) continue
    seen.add(id)
    const st = steps[id]
    if (st.next && st.next !== '@shop' && st.next !== '@book') queue.push(st.next)
    for (const c of st.choices ?? []) {
      choiceCount++
      if (c.next !== '@shop' && c.next !== '@book') queue.push(c.next)
      if (c.risk?.next) queue.push(c.risk.next)
    }
  }
  for (const id of ids) if (!seen.has(id)) errors.push(`${night.id}: 步骤 ${id} 不可达`)
  for (const [id, st] of Object.entries(steps)) {
    for (const key of [st.bg, st.sprite, st.sprite2, st.image]) {
      if (!key || key === 'me') continue
      if (!existsSync(`${root}/public/assets/${key}.png`)) errors.push(`${night.id}/${id}: 缺少资源 ${key}.png`)
    }
  }
}

if (ctx.QUIZ) {
  ctx.QUIZ.forEach((q, i) => {
    if (!q.options || q.answer >= q.options.length) errors.push(`QUIZ第${i + 1}题配置错误`)
  })
  console.log(`考题 ${ctx.QUIZ.length} 道`)
}

console.log(`共 ${NIGHTS.length} 夜，${stepCount} 步，${choiceCount} 个选项`)

/* ================= DLC 番外篇剧本校验 ================= */
{
  let dsrc = readFileSync(`${root}/src/game/dlc.ts`, 'utf8')
  dsrc = dsrc
    .replace(/^import[^\n]*$/gm, '')
    .replace(/^export interface[^\n]*\}\s*$/gm, '')   // 单行 interface
    .replace(/^export interface[\s\S]*?^\}/gm, '')    // 多行 interface
    .replace(/:\s*Record<string,\s*[^=]*?>/g, '')
    .replace(/:\s*QueuePatient\[\]/g, '')
    .replace(/:\s*DlcDef\[\]/g, '')
    .replace(/:\s*DlcDef/g, '')
    .replace(/:\s*Record<string,\s*number>/g, '')
    .replace(/Object\.assign\(CARDS[^\n]*\n?/g, '')   // CH2 注册表合并在 ch2 校验段单独覆盖
    .replace(/Object\.assign\(EVENTS[^\n]*\n?/g, '')
    .replace(/Object\.assign\(EVIDENCE[^\n]*\n?/g, '')
    .replace(/export const/g, 'const')
    .replace(/^export function[\s\S]*?^\}/gm, '')
  const dctx = {}
  vm.createContext(dctx)
  try {
    vm.runInContext(dsrc + '\nthis.DLCS = DLCS; this.DR_QUEUE = DR_QUEUE; this.DLC_BADGES = DLC_BADGES; this.CARDS = CARDS; this.EVENTS = EVENTS;', dctx)
  } catch (e) {
    errors.push(`dlc.ts 解析失败: ${e.message}`)
  }

  /* ================= 第二章 ch2.ts 解析 ================= */
  let csrc = readFileSync(`${root}/src/game/ch2.ts`, 'utf8')
  csrc = csrc
    .replace(/^import[^\n]*$/gm, '')
    .replace(/^export interface[^\n]*\}\s*$/gm, '')
    .replace(/^export interface[\s\S]*?^\}/gm, '')
    .replace(/:\s*Record<string,\s*[^=]*?>/g, '')
    .replace(/:\s*Quiz2Q\[\]/g, '')
    .replace(/:\s*Ch2Shift\[\]/g, '')
    .replace(/:\s*\[number, number\]\[\]/g, '')
    .replace(/:\s*\{ title: string; body: string; note: string \}\[\]/g, '')
    .replace(/export const/g, 'const')
    .replace(/^export function[\s\S]*?^\}/gm, '')
  const cctx = {}
  vm.createContext(cctx)
  try {
    vm.runInContext(csrc + '\nthis.CH2_SHIFTS = CH2_SHIFTS; this.CH2_BADGES = CH2_BADGES; this.CH2_CARDS = CH2_CARDS; this.CH2_EVENTS = CH2_EVENTS; this.CH2_EVIDENCE = CH2_EVIDENCE; this.QUIZ2 = QUIZ2;', cctx)
  } catch (e) {
    errors.push(`ch2.ts 解析失败: ${e.message}`)
  }

  if (dctx.DLCS) {
    for (const dlc of dctx.DLCS) {
      const steps = dlc.steps
      const ids = Object.keys(steps)
      stepCount += ids.length
      const seen = new Set()
      const queue = [dlc.start]
      while (queue.length) {
        const id = queue.shift()
        if (!steps[id]) { errors.push(`DLC[${dlc.id}]: 引用了不存在的步骤 ${id}`); continue }
        if (seen.has(id)) continue
        seen.add(id)
        const st = steps[id]
        // '@queue' 是 DR 队列玩法入口，队列结束后进入 dr_noon0
        if (st.next === '@queue') queue.push('dr_noon0')
        else if (st.next && st.next !== '@shop' && st.next !== '@book') queue.push(st.next)
        for (const c of st.choices ?? []) {
          choiceCount++
          if (c.next !== '@shop' && c.next !== '@book') queue.push(c.next)
          if (c.risk?.next) queue.push(c.risk.next)
        }
        if (st.pedal) { queue.push(st.pedal.success); queue.push(st.pedal.tooEarly); queue.push(st.pedal.tooLate) }
      }
      for (const id of ids) if (!seen.has(id)) errors.push(`DLC[${dlc.id}]: 步骤 ${id} 不可达`)
      for (const [id, st] of Object.entries(steps)) {
        for (const key of [st.bg, st.sprite, st.sprite2, st.image, st.phone]) {
          if (!key || key === 'me') continue
          if (!existsSync(`${root}/public/assets/${key}.png`)) errors.push(`DLC[${dlc.id}]/${id}: 缺少资源 ${key}.png`)
        }
        if (st.card && !dctx.CARDS?.[st.card]) errors.push(`DLC[${dlc.id}]/${id}: 引用了不存在的知识卡片 ${st.card}`)
      }
      console.log(`DLC[${dlc.id}]「${dlc.title}」 ${ids.length} 步`)
    }
    // 勋章引用校验
    const allBadgeIds = new Set([...Object.keys(ctx.BADGES ?? {}), ...Object.keys(dctx.DLC_BADGES ?? {}), ...Object.keys(cctx.CH2_BADGES ?? {})])
    const checkBadges = (steps, tag) => {
      for (const [id, st] of Object.entries(steps)) {
        if (st.effect?.badge && !allBadgeIds.has(st.effect.badge)) errors.push(`${tag}/${id}: 不存在的勋章 ${st.effect.badge}`)
        for (const c of st.choices ?? []) {
          if (c.effect?.badge && !allBadgeIds.has(c.effect.badge)) errors.push(`${tag}/${id}: 选项引用不存在的勋章 ${c.effect.badge}`)
        }
      }
    }
    for (const dlc of dctx.DLCS) checkBadges(dlc.steps, `DLC[${dlc.id}]`)
    for (const night of NIGHTS) checkBadges(night.steps, `night${night.id}`)

    // 第一章知识卡片/大事记引用校验（卡片与事件注册表在 dlc.ts）
    for (const night of NIGHTS) {
      for (const [id, st] of Object.entries(night.steps)) {
        if (st.card && !dctx.CARDS?.[st.card]) errors.push(`night${night.id}/${id}: 引用了不存在的知识卡片 ${st.card}`)
        if (st.event && !dctx.EVENTS?.[st.event]) errors.push(`night${night.id}/${id}: 引用了不存在的大事记 ${st.event}`)
      }
    }

    // 高亮标记 ** 配对校验（第一章 + DLC 所有文本与选项）
    const checkHl = (steps, tag) => {
      for (const [id, st] of Object.entries(steps)) {
        const texts = [st.text ?? '', ...(st.choices ?? []).map(c => c.text)]
        for (const t of texts) {
          if (((t.match(/\*\*/g) ?? []).length) % 2) errors.push(`${tag}/${id}: 高亮标记 ** 不配对`)
        }
      }
    }
    for (const night of NIGHTS) checkHl(night.steps, `night${night.id}`)
    for (const dlc of dctx.DLCS) checkHl(dlc.steps, `DLC[${dlc.id}]`)

    /* ================= 第二章「快与狠」校验 ================= */
    if (cctx.CH2_SHIFTS) {
      const allCards = { ...(dctx.CARDS ?? {}), ...(cctx.CH2_CARDS ?? {}) }
      const allEvents = { ...(dctx.EVENTS ?? {}), ...(cctx.CH2_EVENTS ?? {}) }
      for (const shift of cctx.CH2_SHIFTS) {
        const steps = shift.steps
        const ids = Object.keys(steps)
        stepCount += ids.length
        const seen = new Set()
        const queue = [shift.start]
        while (queue.length) {
          const id = queue.shift()
          if (!steps[id]) { errors.push(`CH2[${shift.id}]: 引用了不存在的步骤 ${id}`); continue }
          if (seen.has(id)) continue
          seen.add(id)
          const st = steps[id]
          const pushNext = (n) => {
            if (!n || n === '@shop' || n === '@book2') return
            if (n === '@quiz') { queue.push('c2am_3'); return } // 晨会考核结束后路由到 c2am_3
            queue.push(n)
          }
          pushNext(st.next)
          for (const c of st.choices ?? []) { choiceCount++; pushNext(c.next); if (c.risk?.next) pushNext(c.risk.next) }
          if (st.windowTask) pushNext(st.windowTask.success)
          if (st.checklist) pushNext(st.checklist.next)
        }
        for (const id of ids) if (!seen.has(id)) errors.push(`CH2[${shift.id}]: 步骤 ${id} 不可达`)
        for (const [id, st] of Object.entries(steps)) {
          const keys = [st.bg, st.sprite, st.sprite2, st.image, st.phone, st.windowTask?.image]
          for (let key of keys) {
            if (!key || key === 'me') continue
            if (key === 'luzhou') key = 'char_luzhou_m' // 陆舟立绘按玩家性别解析，两个文件都要在
            if (!existsSync(`${root}/public/assets/${key}.png`)) errors.push(`CH2[${shift.id}]/${id}: 缺少资源 ${key}.png`)
          }
          if (st.card && !allCards[st.card]) errors.push(`CH2[${shift.id}]/${id}: 引用了不存在的知识卡片 ${st.card}`)
          if (st.event && !allEvents[st.event]) errors.push(`CH2[${shift.id}]/${id}: 引用了不存在的大事记 ${st.event}`)
        }
        checkBadges(steps, `CH2[${shift.id}]`)
        checkHl(steps, `CH2[${shift.id}]`)
        console.log(`CH2[${shift.id}]「${shift.title}」 ${ids.length} 步`)
      }
      // 证物 flag 必须在剧情里真的被种下
      for (const [eid, e] of Object.entries(cctx.CH2_EVIDENCE ?? {})) {
        let planted = false
        for (const shift of cctx.CH2_SHIFTS) {
          for (const st of Object.values(shift.steps)) {
            if (st.effect?.flag === e.flag) planted = true
            for (const c of st.choices ?? []) if (c.effect?.flag === e.flag) planted = true
          }
        }
        if (!planted) errors.push(`CH2: 证物 ${eid} 的 flag「${e.flag}」没有任何步骤种下`)
        if (e.image && !existsSync(`${root}/public/assets/${e.image}.png`)) errors.push(`CH2: 证物 ${eid} 缺少图片 ${e.image}.png`)
      }
      // 知识卡片配图存在性
      for (const [cid, c] of Object.entries(cctx.CH2_CARDS ?? {})) {
        if (c.image && !existsSync(`${root}/public/assets/${c.image}.png`)) errors.push(`CH2: 卡片 ${cid} 缺少配图 ${c.image}.png`)
      }
      // 陆舟双性别立绘
      for (const g of ['m', 'f']) {
        if (!existsSync(`${root}/public/assets/char_luzhou_${g}.png`)) errors.push(`CH2: 缺少 char_luzhou_${g}.png`)
      }
      // 晨会题库
      ;(cctx.QUIZ2 ?? []).forEach((q, i) => {
        if (!q.options || q.answer >= q.options.length) errors.push(`QUIZ2第${i + 1}题配置错误`)
        const t = q.q + (q.explain ?? '')
        if (((t.match(/\*\*/g) ?? []).length) % 2) errors.push(`QUIZ2第${i + 1}题: 高亮标记 ** 不配对`)
      })
      console.log(`CH2 晨会题库 ${(cctx.QUIZ2 ?? []).length} 道`)
    }
  }
}

if (errors.length) { console.log('❌'); errors.forEach(e => console.log(' -', e)); process.exit(1) }
console.log('✅ 校验通过')
