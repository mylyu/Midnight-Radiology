/** Native document/keepsake illustrations: readable type, no generated lettering. */
export const TRILOGY_DOCUMENTS: Record<string, { icon: string; title: string; lines: string[]; kind: 'paper' | 'gift' }> = {
  item_missing_notice: { kind: 'paper', icon: '📄', title: '寻人启事 · 留存副本', lines: ['许守义', '1998年11月 · 禾川县', '提供人：许建平', '经本人许可，用于查询旧记录'] },
  item_transfer_record: { kind: 'paper', icon: '📑', title: '旧转诊索引 · 核验回复', lines: ['许守义 · 1998年', '本院转出 → 外地省院', '身份与登记编号已核对', '后续情况，仍需接收医院核验'] },
  item_father_film: { kind: 'paper', icon: '🎞️', title: '旧影像复制件', lines: ['许守义', '身份、转诊索引与留存记录一致', '复制件已交家属', '不是县医院那张无名胶片'] },
  item_zhou_note: { kind: 'paper', icon: '📝', title: '老周的交接便笺', lines: ['交班联系人写在背面', '设备保养照交接表办', '有疑问，叫值班医师', '早餐别总吃泡面'] },
  item_reunion_gifts: { kind: 'gift', icon: '🧵', title: '阿姨缝的擦镜布', lines: ['新的小方布，边角缝得很整齐', '擦眼镜、擦手机', '不是探头清洁用品'] },
  item_qian_seeds: { kind: 'gift', icon: '🌱', title: '老钱的两包菜种', lines: ['自家留下来的', '纸袋口折了两道', '等天气暖一点，再种'] },
  item_pet_bookmark: { kind: 'gift', icon: '🔖', title: '进修书签', lines: ['微光 · 带教记录', '留给自己夹书', '不夹患者原件'] },
}
