import type { TrilogyId } from './trilogy-types'

export const TRILOGY_EVIDENCE: Record<TrilogyId, { flag: string; title: string; body: string; image?: string }[]> = {
  ch3: [
    { flag: 'c3_missing_notice', title: '许守义的寻人启事', body: '许建平留下的副本。上面写着父亲的姓名、1998年离家的时间，以及最后有人见到他的地点。查询申请已交给受理窗口。', image: 'item_missing_notice' },
    { flag: 'c3_han_scope_recorded', title: '“仅核对，未交接”', body: '你要求澄清回收范围、逐件编号。核对联与未签回收联不同，设备和留存件没有现场交出。' },
    { flag: 'c3_wen_copy_kept', title: '雯雯的来电', body: '雯雯来电确认核对联仍在院里，并说她手上也有新版附件，可以提交给院里核查。你已把附件名称记下并发给小雷。' },
  ],
  ch4: [
    { flag: 'c4_old_contract', title: '两版报价与预约本', body: '老范带来两版报价，小唐同时核对着装机日期和患者改约。设备、软件与患者安排各自有人接手。' },
    { flag: 'c4_contract_split', title: '基本重建已含，AI单列', body: '雯雯确认常规基本重建已经包含，原厂AI重建是单列选配。30天试用与正式购买分开，不采购不收正式授权费。' },
    { flag: 'c4_repair_tag', title: 'A17维修标签', body: '市院柔性线圈旁的标签留有批次、工号和日期。A17是线圈转接件，沿维修单查经手人即可。' },
    { flag: 'c4_a17_batch', title: 'A17配件销售短信', body: '老白是线圈转接件与常用备件销售者。他确认可日后提供备用件报价，A17标签、批次和兼容机型先核对；采购会上不购买配件。' },
    { flag: 'c4_remote_log', title: '原厂AI试用账号', body: '装机首日，原厂AI30天试用账号自动发起远程授权校验。账号、时间和试用单已留存，远程请求先拒绝。' },
    { flag: 'c4_ai_trial_closed', title: '30天试用已关闭', body: '雯雯承认装机时勾选试用却没当面说清。试用与远程授权已关闭，不采购、不收费，常规重建不受影响。' },
    { flag: 'c4_adapter_verified', title: '旧版线索｜两张单放到桌面', body: '历史存档保留：旧版第四章曾分开核对A17维修更换单与原厂AI试用单；现役主线不再重复这段厂家流程。' },
    { flag: 'c4_chain_solved', title: '旧版线索｜两张回执各自归档', body: '历史存档保留：旧版第四章曾分别签收AI试用关闭与A17换件回执；现役主线不再发放对应旗标或勋章。' },
    { flag: 'c4_xu_receipt', title: '许建平保管的旧收据', body: '腰椎、老县医院、1998年是档案查询的起点。原件仍由许建平自己保管，院里只登记必要线索。' },
    { flag: 'c4_implant_identified', title: '腰椎黑影有了来路', body: '旧手术记录确认当年腰椎留有金属植入物，名称和位置能够解释这次信号丢失与变形。原图和图像质量评价均已交接。' },
    { flag: 'c4_neck_followup', title: '左颈资料另走评估', body: '左颈改变来自另一份旧资料，不能用腰椎金属伪影一并解释。相关记录和转诊单已单独交接。' },
    { flag: 'c4_father_transfer', title: '监护人签名与转诊存根', body: '1998年手术记录中的监护人签名为许守义，日期、身份关系和原病历编号均能核对。它证明那次签字与转诊，不虚构他后来的生活。', image: 'item_transfer_record' },
    { flag: 'c4_receipt_conflict', title: '旧版线索｜回函与旧任务范围不同', body: '历史存档保留：2025旧任务索引与2027“全部删除”回函存在范围缺口；原件已登记，不等于盒子恢复联网。' },
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
  c4_city_wrist: '腕伤小伙·TFCC损伤参考', c4_city_claustrophobia: '冯叔·换机完成与疑似轻型卒中',
  c4_city_mrcp: '腹痛患者·胆总管结石MRCP参考', c4_county_hydrocephalus: '三岁女孩·脑室扩大与脑积水评估',
  c4_county_abdominal_motion: '腹痛阿姨·腹部运动伪影与必要重采', c4_county_knee_mimic: '拄拐老师·膝部易误认影像',
  c4_county_claustrophobia: '冯叔·县院复查完成', c4_county_xu_lumbar: '许建平·腰椎金属伪影与旧手术记录',
  c5_qian: '老钱·术后新变化', c5_xu: '许建平·第五诊',
}
