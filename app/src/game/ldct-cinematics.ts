export type LdctCinematic = {
  id: 'meal' | 'table-explain' | 'phantom' | 'father-scan' | 'locked' | 'director-caught' | 'director-review'
  image: string
  alt: string
  motion: 'push' | 'settle'
  locked?: boolean
}

export const LDCT_CINEMATIC_MEDIA_IDS = [
  'ldct_cg_meal_v1', 'ldct_cg_locked_v1', 'ldct_cg_phantom_v1', 'ldct_cg_father_scan_v1',
  'ldct_cg_director_caught_v1', 'ldct_cg_director_review_v1',
  'ldct_cg_table_explain_v1',
] as const

const meal: LdctCinematic = { id: 'meal', image: 'ldct_cg_meal_v1', motion: 'settle',
  alt: '医院附近的小饭馆，陆叔与陆舟围坐在热菜前，你也在桌边。' }
const tableExplain: LdctCinematic = { id: 'table-explain', image: 'ldct_cg_table_explain_v1', motion: 'push',
  alt: '餐桌上，你用笔和草稿纸画CT与图像示意，陆叔放下筷子，凑过来看。' }
const phantom: LdctCinematic = { id: 'phantom', image: 'ldct_cg_phantom_v1', motion: 'push',
  alt: '两人把圆柱形实体模体安放到CT检查床上，准备在空档试扫。' }
const fatherScan: LdctCinematic = { id: 'father-scan', image: 'ldct_cg_father_scan_v1', motion: 'settle',
  alt: '陆舟陪父亲进入CT室，在开始扫描前帮他安顿好。' }
const locked: LdctCinematic = { id: 'locked', image: 'ldct_cg_locked_v1', motion: 'push', locked: true,
  alt: '两人靠近工作站查看扫描结果，迭代重建选配包没有开通。' }
const caught: LdctCinematic = { id: 'director-caught', image: 'ldct_cg_director_caught_v1', motion: 'push',
  alt: '主任站在控制室门口，指着还没登记的设备使用本。' }
const review: LdctCinematic = { id: 'director-review', image: 'ldct_cg_director_review_v1', motion: 'settle',
  alt: '主任在工作站坐下，用鼠标翻看胸部薄层序列。' }

const scenes: Readonly<Record<string, LdctCinematic>> = {
  lf_arrive_3: meal,
  lf_table_explain_0: tableExplain,
  lf_table_explain_1: tableExplain,
  lf_table_explain_2: tableExplain,
  lf_table_explain_3: tableExplain,
  lf_plan_3: phantom,
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
  lf_trial_license_0: locked,
  lf_trial_license_1: locked,
  lf_trial_license_2: locked,
  lf_trial_license_3: locked,
  lf_caught_0: caught,
  lf_caught_1: caught,
  lf_caught_2: caught,
  lf_caught_3: caught,
  lf_caught_4: caught,
  lf_caught_choice: caught,
  lf_pitch_1: review,
  lf_pitch_2: review,
  lf_pitch_3: review,
  lf_pitch_4: review,
  lf_director_review_0: review,
  lf_director_review_1: review,
  lf_director_review_2: review,
  lf_director_review_3: review,
  lf_director_method_0: review,
  lf_director_method_1: review,
  lf_director_method_2: review,
  lf_director_method_3: review,
}

/** Key the mounted component by scene.id, not the dialogue node: adjacent lines
 * share one camera move, and no animation callback advances the story. */
export function getLdctCinematic(nodeId: string): LdctCinematic | undefined {
  return scenes[nodeId]
}
