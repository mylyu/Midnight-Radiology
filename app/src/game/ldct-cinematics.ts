export type LdctCinematic = {
  id: 'meal' | 'phantom' | 'father-scan' | 'locked'
  image: string
  alt: string
  motion: 'push' | 'settle'
  locked?: boolean
}

export const LDCT_CINEMATIC_MEDIA_IDS = [
  'ldct_cg_meal_v1', 'ldct_cg_locked_v1', 'ldct_cg_phantom_v1', 'ldct_cg_father_scan_v1',
] as const

const meal: LdctCinematic = { id: 'meal', image: 'ldct_cg_meal_v1', motion: 'settle',
  alt: '医院附近的小饭馆，陆叔与陆舟围坐在热菜前，你也在桌边。' }
const phantom: LdctCinematic = { id: 'phantom', image: 'ldct_cg_phantom_v1', motion: 'push',
  alt: '两人把圆柱形实体模体安放到CT检查床上，准备在空档试扫。' }
const fatherScan: LdctCinematic = { id: 'father-scan', image: 'ldct_cg_father_scan_v1', motion: 'settle',
  alt: '陆舟陪父亲进入CT室，在开始扫描前帮他安顿好。' }
const locked: LdctCinematic = { id: 'locked', image: 'ldct_cg_locked_v1', motion: 'push', locked: true,
  alt: '两人靠近工作站查看扫描结果，迭代重建选配包没有开通。' }

const scenes: Readonly<Record<string, LdctCinematic>> = {
  lf_arrive_3: meal,
  lf_final_lu_0: meal,
  lf_final_lu_1: meal,
  lf_final_lu_2: meal,
  lf_plan_2: phantom,
  lf_phantom_0: phantom,
  lf_phantom_1: phantom,
  lf_phantom_2: phantom,
  lf_review_intro_0: phantom,
  lf_scan_0: fatherScan,
  lf_license_0: locked,
  lf_license_1: locked,
  lf_license_2: locked,
  lf_license_3: locked,
  lf_license_choice: locked,
}

/** Key the mounted component by scene.id, not the dialogue node: adjacent lines
 * share one camera move, and no animation callback advances the story. */
export function getLdctCinematic(nodeId: string): LdctCinematic | undefined {
  return scenes[nodeId]
}
