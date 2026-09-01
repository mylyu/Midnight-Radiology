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
vm.runInContext(src + '\nthis.NIGHTS = NIGHTS; this.QUIZ = QUIZ;', ctx)

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
if (errors.length) { console.log('❌'); errors.forEach(e => console.log(' -', e)); process.exit(1) }
console.log('✅ 校验通过')
