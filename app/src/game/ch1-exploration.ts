import type { Choice, GameState, Night, Step } from './types'

/** Reuse discoveries across nights without copying the fifth-night sealed cabinet. */
export function extendCh1ArchiveWindow(nights: Night[]): Night[] {
  const original = nights[2].steps
  const ids = ['n3_arc0', 'n3_arc1', 'n3_arc2', 'n3_arc3', 'n3_arc4', 'n3_cab0', 'n3_cab1', 'n3_cab2']
  for (const index of [1, 3]) {
    const remap = (id: string) => id.replace(/^n3_/, `n${index + 1}_`)
    for (const id of ids) {
      const step = original[id]
      nights[index].steps[remap(id)] = {
        ...step,
        ...(step.next ? { next: remap(step.next) } : {}),
        ...(step.choices ? { choices: step.choices.map(choice => ({ ...choice, next: remap(choice.next) })) } : {}),
      }
    }
  }
  return nights
}

/** One paid visit across nights 2–4; unfinished returns and late log checks are free. */
export function ch1ExplorationStep(id: string, step: Step, state: GameState): Step {
  const { flags, items, ap } = state
  const visited = !!(flags.archive_entered || flags.n3_arc || flags.archive_film || flags.archive_cab)
  if (/^n[234]_arc0$/.test(id)) return { ...step, text: '片库的铁门虚掩着，挂锁搁在门内的架子上。你推开门，月光从高窗照进来，照亮一排排码到天花板的片袋。' }
  if (id === 'n2_fan4a') return { ...step, text: visited
    ? '好小伙！……你去过旧片库了？这两天清点旧东西，挂锁摘下来了。里面的东西别乱搬，看完把门带上。'
    : '好小伙！……对了，这两天清点旧东西，旧片库没挂锁。进去看看可以，东西别乱搬，看完把门带上。' }
  if (id === 'n4_gossip1') return { ...step, text: '欸，你听说过没——老夜班的人说，凌晨路过旧片库，能听见里面哗啦哗啦翻片子的声音。那屋子以前一直锁着，这两天才打开。' }
  if (!/^n[234]_hub$/.test(id)) return step
  const prefix = id.slice(0, 3)
  const choices = (step.choices ?? []).filter(choice => choice.next !== `${prefix}arc0`)
  const extra: Choice[] = []
  if (!flags.archive_film || (items.includes('key') && !flags.archive_cab)) {
    extra.push(visited
      ? { text: '🗄️ 返回旧片库 · 还有没看完的东西（不耗行动力）', next: `${prefix}arc0` }
      : {
        text: ap >= 1 ? '🗄️ 去旧片库看看（行动力－1）' : '🗄️ 旧片库 · 需1点行动力，可先买咖啡',
        next: `${prefix}arc0`, cond: { ap: 1 }, effect: { ap: -1, flag: 'archive_entered' },
        ...(ap < 1 ? { disabledReason: '行动力不足，可到小卖部买咖啡后再来。' } : {}),
      })
  }
  if (id === 'n4_hub' && flags.n4_lei && flags.archive_film && !flags.pacs_log) {
    extra.push({ text: '💻 回信息科，请小雷查无名胶片（不耗行动力）', next: 'n4_lei2a', effect: { flag: 'pacs_log' } })
  }
  choices.splice(Math.max(0, choices.length - 1), 0, ...extra)
  return { ...step, choices }
}
