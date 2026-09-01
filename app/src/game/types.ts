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
  sfx?: 'stamp' | 'xray' | 'badge' | 'ring' | 'radio' | 'buzz' | 'cry_child' | 'groan_man' | 'vox_mom' | 'vox_worker' | 'vox_mystery' | 'vox_thin' | 'vox_aunt' | 'vox_dad' | 'vox_tang' | 'vox_zhou' | 'vox_lei' | 'vox_fan' | 'vox_he' | 'vox_qian' | 'vox_kai' | 'vox_jiang' | 'vox_wen' | 'vox_bai' | 'vox_director'
  sfx2?: 'stamp' | 'xray' | 'badge' | 'ring' | 'radio' | 'buzz' | 'cry_child' | 'groan_man' | 'vox_mom' | 'vox_worker' | 'vox_mystery' | 'vox_thin' | 'vox_aunt' | 'vox_dad' | 'vox_tang' | 'vox_zhou' | 'vox_lei' | 'vox_fan' | 'vox_he' | 'vox_qian' | 'vox_kai' | 'vox_jiang' | 'vox_wen' | 'vox_bai' | 'vox_director'
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
