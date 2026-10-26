import type { TrilogyId } from './trilogy-types'

export const TRILOGY_EVIDENCE: Record<TrilogyId, { flag: string; title: string; body: string; image?: string }[]> = {
  ch3: [
    { flag: 'c3_missing_notice', title: '许守义的寻人启事', body: '许建平留下的副本。上面写着父亲的姓名、1998年离家的时间，以及最后有人见到他的地点。查询申请已交给受理窗口。', image: 'item_missing_notice' },
    { flag: 'c3_han_scope_recorded', title: '“仅核对，未交接”', body: '你要求澄清回收范围、逐件编号。核对联与未签回收联不同，设备和留存件没有现场交出。' },
    { flag: 'c3_wen_copy_kept', title: '雯雯的来电', body: '雯雯来电确认核对联仍在院里，并说她手上也有新版附件，可以提交给院里核查。你已把附件名称记下并发给小雷。' },
  ],
  ch4: [
    { flag: 'c4_receipt_conflict', title: '回函与旧任务范围不同', body: '2025旧任务索引与2027“全部删除”回函存在范围缺口；原件已登记，不等于盒子恢复联网。' },
    { flag: 'c4_father_transfer', title: '经核验的转诊索引', body: '许守义当年从本院转出。接收医院与转诊编号明确，后来的生活仍需外院核实。', image: 'item_transfer_record' },
  ],
  ch5: [
    { flag: 'c5_source_checked', title: 'R-17与用途附件', body: '参与核对的来源、批次和用途附件摘要。原始受控资料由院方保管，玩家没有私自取走病例。' },
    { flag: 'c5_lei_origin_verified', title: '不是只接过一根线', body: '院内留存提案、接收方批次原件与技术合作记录互相核对，确认小雷主动参与安排旧样本的项目用途。后来断网留证属实，不能替代对此前行为的责任核查。' },
    { flag: 'c5_sms_resolved', title: '雯雯的提醒', body: '旧工作号码、发送记录与雯雯提供的附件经过核验。“别把盒子还给他们”是保留原件的提醒，不是离线设备复活。' },
    { flag: 'c5_father_resolved', title: '片上终于有了名字', body: '两院记录与外地家属回复说明父亲离家后转院、在外地生活及失联的经过；2001年去世。属于父亲的复制件已交付，许建平自己的随访仍继续。', image: 'item_father_film' },
  ],
}
export const TRILOGY_CASE_NAMES: Record<string, string> = {
  c3_aunt: '钼靶阿姨·本次乳腺超声', c3_gallstone: '腹痛患者·胆囊声影', c3_cousin: '表姐·二十四周检查', c3_wang: '王叔·心超复诊',
  c3_young_liver: '体检青年·肝肾回声对照',
  c4_wrist: '小程·新腕痛', c4_luo_safety: '罗阿姨·留针资料核实', c4_song_motion: '老宋·呼叫与运动', c4_xu_neck: '许建平·头部与颈部评估',
  c5_qian: '老钱·术后新变化', c5_xu: '许建平·第五诊',
}
