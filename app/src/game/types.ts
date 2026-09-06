export interface Effect {
  gold?: number
  skill?: number
  wealth?: number
  heart?: number
  durability?: number
  badge?: string
  flag?: string
  /** 行动力（自由行动段消耗/恢复） */
  ap?: number
  /** 获得道具 */
  item?: string
  /** 失去道具 */
  loseItem?: string
}

/** 选项出现/可用的条件 */
export interface Cond {
  /** 需要已置位的剧情旗标 */
  flag?: string
  /** 该旗标已置位时隐藏（用于一次性地点/事件） */
  notFlag?: string
  /** 需要持有道具 */
  item?: string
  /** 需要至少这么多金币（仅显示用，扣费在 effect 里） */
  gold?: number
  /** 需要剩余行动力 >= 该值 */
  ap?: number
}

export interface Choice {
  text: string
  next: string
  effect?: Effect
  tag?: 'good' | 'bad' | 'neutral'
  cond?: Cond
  /** 意外分支：chance 概率触发，改为进入 next 步骤并追加 effect（基础 effect 照常生效——好意仍在，但出了岔子） */
  risk?: { chance: number; next: string; effect?: Effect }
}

export interface Step {
  speaker?: string
  text?: string
  sprite?: string
  sprite2?: string
  bg?: string
  image?: string
  choices?: Choice[]
  next?: string
  effect?: Effect
  stamp?: boolean
  /** DLC·DR：AI 初诊提示面板（建议 + 置信度） */
  ai?: { suggestion: string; confidence: string }
  /** DLC·DSA：踩踏板时序配合——指示条单次扫过，绿色窗口内踩下成功 */
  pedal?: { durationMs: number; windowStart: number; windowEnd: number; success: string; tooEarly: string; tooLate: string; dose: number; failDose: number }
  /** DLC·DSA：本步累计剂量增加（mGy，HUD 实时显示） */
  dose?: number
  /** DLC：知识卡片 ID——进入本步即收入「夜班手册」 */
  card?: string
  /** DLC：大事记条目 ID——进入本步即记入「夜班手册·大事记」 */
  event?: string
  sfx?: 'stamp' | 'xray' | 'badge' | 'ring' | 'radio' | 'buzz' | 'cry_child' | 'groan_man' | 'vox_mom' | 'vox_worker' | 'vox_mystery' | 'vox_thin' | 'vox_aunt' | 'vox_dad' | 'vox_tang' | 'vox_zhou' | 'vox_lei' | 'vox_fan' | 'vox_he' | 'vox_qian' | 'vox_kai' | 'vox_jiang' | 'vox_wen' | 'vox_bai' | 'vox_director' | 'vox_shao' | 'vox_du' | 'vox_qin' | 'vox_liao'
  sfx2?: 'stamp' | 'xray' | 'badge' | 'ring' | 'radio' | 'buzz' | 'cry_child' | 'groan_man' | 'vox_mom' | 'vox_worker' | 'vox_mystery' | 'vox_thin' | 'vox_aunt' | 'vox_dad' | 'vox_tang' | 'vox_zhou' | 'vox_lei' | 'vox_fan' | 'vox_he' | 'vox_qian' | 'vox_kai' | 'vox_jiang' | 'vox_wen' | 'vox_bai' | 'vox_director' | 'vox_shao' | 'vox_du' | 'vox_qin' | 'vox_liao'
  /** 曝光后的 CR 读取流程：值为要逐行扫描显示的影像素材名；'none' 表示只跑进度条不出图 */
  readout?: string
  /** 电话通话中：值为电话那端人物的立绘素材名，显示来电头像卡片 */
  phone?: string
  /** 对讲机通话中：值为对讲机那端人物的立绘素材名，显示对讲频道卡片 */
  radio?: string
  end?: boolean
}

export interface Night {
  id: number
  title: string
  subtitle: string
  start: string
  steps: Record<string, Step>
}

export interface GameState {
  gender: 'm' | 'f'
  night: number
  gold: number
  skill: number
  wealth: number
  heart: number
  durability: number
  badges: string[]
  stamps: number[]
  flags: Record<string, boolean | string>
  lastCheckin: string
  streak: number
  finished: boolean
  seed: number
  playerName?: string
  playerId?: string
  /** 背包道具 */
  items: string[]
  /** 剩余行动力 */
  ap: number
  /** 商店累计购买次数（勋章用） */
  buyCount: number
  /** 刮刮乐：最后购买的夜次 & 当夜已刮张数（每日限购5张） */
  lotteryNight?: number
  lotteryCount?: number
  /** —— 中途存档（每一步自动保存） —— */
  screenHint?: 'night' | 'day' | 'quiz' | 'chapterEnd'
  stepId?: string
  viewBg?: string
  viewSprite?: string
  viewSprite2?: string
  /** 已应用过效果的 step key（`${night}-${stepId}`），恢复时跳过避免重复生效 */
  resumeKey?: string
  /** —— DLC（番外篇）进度与数据 —— */
  /** 各 DLC 的进度：stepId/画面/通关标记/剂量/队列与AI决策记录 */
  dlc?: Record<string, DlcProgress>
  /** 夜班手册·已收集的知识卡片 ID */
  cards?: string[]
  /** 夜班手册·大事记条目 ID */
  events?: string[]
}

export interface DlcProgress {
  stepId?: string
  viewBg?: string
  viewSprite?: string
  viewSprite2?: string
  done?: boolean
  /** DSA：全程累计剂量 mGy */
  dose?: number
  /** DSA：踏板尝试次数 / 成功次数 */
  pedalTry?: number
  pedalOk?: number
  /** DR：已接诊完的病人 ID 列表（顺序即接诊顺序） */
  served?: string[]
  /** DR：因等待过久病情恶化、离开队列的病人 ID 列表 */
  gone?: string[]
  /** DR：AI 初诊决策记录（patientId → 玩家是否采纳） */
  aiChoices?: Record<string, boolean>
}

export interface ShopItem {
  id: string
  icon: string
  name: string
  price: number
  desc: string
  /** 第三章夜起才上架（如钥匙） */
  minNight?: number
}
