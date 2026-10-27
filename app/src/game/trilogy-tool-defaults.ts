import type { TrilogyTool } from './trilogy-types'

/** Display and completion must use the same untouched control values. */
export function trilogyToolDefaults(tool: TrilogyTool) {
  return tool.kind === 'ultrasound' && tool.task === 'tgc'
    ? { value: 45, secondary: 0, choice: '凸阵' }
    : { value: 25, secondary: 50, choice: tool.kind === 'mri' ? 'T1' : '凸阵' }
}
