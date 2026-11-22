import assert from 'node:assert/strict'
import { CH4 } from '../src/game/ch4.ts'
import { TRILOGY_AVAILABILITY } from '../src/game/chapter-availability.ts'
import { checkMriPassword, MRI_UNLOCK_KEY, mriUnlocked, unlockMri } from '../src/game/mri-access.ts'
import { initializeTrilogy, trilogyProgress, trilogyStep, enterTrilogyNode, trilogyChoose, trilogyAdvance,
  trilogyReadBook, trilogyBookPageRead, trilogyBookUnlocked, beginTrilogyScan, completeTrilogyScan,
  trilogyBuy, trilogyGive, startTrilogyQuiz, answerTrilogyQuiz, nextTrilogyQuiz } from '../src/game/trilogy-session.ts'
import { trilogyVoice, trilogyVoiceAssets } from '../src/game/trilogy-audio.ts'
import { TRILOGY_DOCUMENTS } from '../src/game/trilogy-documents.ts'
import { MRI_SCAN_ART } from '../src/game/mri-scan-art.ts'
import { TRILOGY_CASE_NAMES } from '../src/game/trilogy-evidence.ts'
import { ch4ContactName, TRILOGY_COMMUNICATION_CUES } from '../src/game/trilogy-communications.ts'
import { access, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const checkinSource = await readFile(new URL('../src/components/Ch2Checkin.tsx', import.meta.url), 'utf8')
const screenSource = await readFile(new URL('../src/components/TrilogyScreen.tsx', import.meta.url), 'utf8')
const quizViewSource = await readFile(new URL('../src/components/ChapterQuizView.tsx', import.meta.url), 'utf8')
const scanSource = await readFile(new URL('../src/components/TrilogyScan.tsx', import.meta.url), 'utf8')
const sessionSource = await readFile(new URL('../src/game/trilogy-session.ts', import.meta.url), 'utf8')
const catalog = JSON.parse(await readFile(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
const visualContinuity = await readFile(new URL('../../docs/ch4-kimi-visual-source.md', import.meta.url), 'utf8')
assert.match(appSource, /去市院进修，自由探查检查室内外/)
assert.match(appSource, /text\.split\('\*\*'\)/)
assert.match(appSource, /text-amber-300 font-bold/)
assert.doesNotMatch(appSource, /从MRI选型谈判/)
assert.match(checkinSource, /aria-label=\{ariaLabel\}/)
assert.match(checkinSource, /className="ch2-checkin-model">\{model\}/)
assert.match(screenSource, /'MRI · 04'/)
assert.match(screenSource, /ariaLabel=\{chapter\.id === 'ch4' \? `\$\{chapter\.title\}日程打卡` : undefined\}/)
assert.match(screenSource, /if \(chapter\.id === 'ch4' && overlay === 'book'\)[\s\S]*?return <PaperBookOverlay\s+id="ch4"/)
assert.match(screenSource, /id="ch4"/)
assert.match(screenSource, /if \(chapter\.id === 'ch4'\) \{[\s\S]*?<ChapterQuizView chapter="ch4"/)
assert.match(screenSource, /<ChapterQuizView chapter="ch4"/)
assert.match(quizViewSource, /<SceneBackground name="bg_day" fixed/)
assert.match(quizViewSource, /bg-slate-950\/60/)
assert.match(quizViewSource, /bg-emerald-900\/60 border-emerald-400/)
assert.match(quizViewSource, /bg-red-900\/50 border-red-400/)
assert.match(quizViewSource, /choice-in/)
assert.match(screenSource, /title="📖 《磁共振笔记》"/)
assert.match(screenSource, /trilogyBookUnlocked\(chapter, p\.shift\)/)
assert.match(screenSource, /后续两页：下一日程解锁/)
assert.match(sessionSource, /export function trilogyBookUnlocked/)
assert.deepEqual(Object.keys(MRI_SCAN_ART).sort(), ['city-055-wide', 'city-3t', 'county-055-wide'])
for (const [model, regions] of Object.entries(MRI_SCAN_ART)) {
  const expectedRegions = model === 'city-055-wide' ? ['head'] : ['abdomen', 'cervical', 'head', 'knee', 'lumbar', 'shoulder', 'wrist']
  assert.deepEqual(Object.keys(regions).sort(), expectedRegions)
  for (const [region, asset] of Object.entries(regions)) {
    assert(catalog[asset], `${model}/${region}: canonical MRI positioning illustration exists`)
    await access(new URL(`../public/assets/${catalog[asset]}`, import.meta.url))
    assert(CH4.assets.includes(asset), `${model}/${region}: positioning illustration is preloaded by CH4`)
    if (region !== 'head') assert.notEqual(asset, regions.head, `${model}/${region}: never reuses the head-coil illustration`)
  }
}
assert.notEqual(MRI_SCAN_ART['city-3t'].head, MRI_SCAN_ART['county-055-wide'].head,
  'The city 3T and county 0.55T must not share the same machine-room illustration')
// Author-approved 2026-11-23 positioning redraw + CH4 compression; other IDs remain protected.
const expectedCountyVisualPaths = {
  trilogy_mri_scan_county_head_v1: 'media/trilogy_mri_scan_county_head_v1.7c075797501609d6.webp',
  trilogy_mri_scan_county_abdomen_v1: 'media/trilogy_mri_scan_county_abdomen_v1.3a8699b58d3eeef3.webp',
  trilogy_mri_scan_county_knee_v1: 'media/trilogy_mri_scan_county_knee_v1.789553e374169d18.webp',
  trilogy_mri_scan_county_lumbar_v1: 'media/trilogy_mri_scan_county_lumbar_v1.ddb347a50342269f.webp',
  trilogy_mri_scan_county_wrist_v1: 'media/trilogy_mri_scan_county_wrist_v1.8c2fc4507a00c9d3.webp',
  trilogy_mri_scan_county_shoulder_v1: 'media/trilogy_mri_scan_county_shoulder_v1.cbb99cc64aa0a192.webp',
  trilogy_mri_scan_county_cervical_v1: 'media/trilogy_mri_scan_county_cervical_v1.00516961ae0a3c0c.webp',
  pat_c4_mother_child_pixel_v1: 'media/pat_c4_mother_child_pixel_v1.1d9994e009e241b3.webp',
  pat_c4_xu_v1: 'media/pat_c4_xu_v1.238d7c59ee17e892.webp',
  bg_c4_county_magnet_room_v1: 'media/bg_c4_county_magnet_room_v1.1b703cf8255f8ac9.webp',
  bg_c4_county_corridor_v1: 'media/bg_c4_county_corridor_v1.e940b48897d758a3.webp',
  bg_c4_county_control_v1: 'media/bg_c4_county_control_v1.7e8a358401e65e6f.webp',
}
for (const [id, relative] of Object.entries(expectedCountyVisualPaths)) assert.equal(catalog[id], relative, `${id}: approved visual-continuity WebP`)
assert.notEqual(MRI_SCAN_ART['city-055-wide'].head, MRI_SCAN_ART['county-055-wide'].head,
  'The citys other 0.55T room has its own cool-tone acquisition art')
assert.match(scanSource, /data-mri-bed="fixed" data-mri-bed-travel="0\.000"/)
assert.match(scanSource, /data-mri-region=\{region\} data-mri-model=\{model\} data-mri-asset=\{art\}/)
assert.match(scanSource, /imageAsset\(art\)/)
assert.match(scanSource, /县院 0\.55T · 80厘米宽孔径 MRI/)
assert.match(scanSource, /市院另一检查区 · 0\.55T · 80厘米宽孔径 MRI/)
assert.match(scanSource, /市院 3T · 长机身 MRI/)
assert.match(scanSource, /序列采集 · 信号接收中/)
assert.doesNotMatch(scanSource, /检查床保持固定|检查床固定|扫描床固定|无患者带教|收到呼叫后停止/)
assert.match(scanSource, /data-scan-distress-panel/)
assert.match(scanSource, /data-scan-progress-frozen=\{distressActive \? 'true' : undefined\}/)
assert.match(scanSource, /Math\.min\(frame\.progress, distressAt \/ duration\)/)
assert.match(scanSource, /本次采集中止，不记为完成检查/)
assert.match(scanSource, /!distress && next\.complete/)
assert.match(scanSource, /data-scan-continue disabled=\{!distressReady\}/)
assert.match(scanSource, /frame\.elapsedMs >= stopAt/)
assert.match(scanSource, /接出患者，继续/)

assert.equal(TRILOGY_AVAILABILITY.ch4, true)
assert.equal(TRILOGY_AVAILABILITY.ch5, false)
assert.equal(checkMriPassword(' MRI2027 '), true)
assert.equal(checkMriPassword('ｍｒｉ２０２７'), true)
assert.equal(checkMriPassword('mri2026'), false)
const store = new Map()
globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) }
assert.equal(mriUnlocked(), false)
assert.equal(unlockMri('wrong'), false)
assert.equal(mriUnlocked(), false)
assert.equal(unlockMri('mRi2027'), true)
assert.equal(store.get(MRI_UNLOCK_KEY), '1')
assert.equal(mriUnlocked(), true)

const s = CH4.steps
const text = id => s[id]?.text ?? ''
for (const [id, step] of Object.entries(s)) {
  if (step.closeup) assert(catalog[step.image], `Cinematic closeup needs a real image: ${step.image}`)
  if (TRILOGY_DOCUMENTS[step.image]) {
    assert.equal(step.closeup, undefined, `Document must use its document renderer, not an invented PNG: ${step.image}`)
    assert(!CH4.assets.includes(step.image), `Document is not an image asset: ${step.image}`)
  }
  if (step.speaker === 'me') assert.equal(step.sprite, 'me', `${id}: protagonist dialogue must carry the protagonist portrait`)
}
assert.equal(CH4.characters.me.sprite, 'me')
for (const id of ['char_m', 'char_f']) {
  assert(CH4.assets.includes(id), `${id}: chapter preloads the selected protagonist portrait`)
  assert(catalog[id], `${id}: protagonist portrait exists in the canonical catalog`)
}
assert.match(screenSource, /sprite === 'me' \? `char_\$\{state\.gender\}` : sprite/)

// Seventh-generation story: six substantial schedules, eight cases, ten acquisitions,
// twelve note pages and no advanced experiment in the main chapter.
assert.equal(CH4.shifts.length, 6)
assert.equal(CH4.book.length, 12)
assert.equal(CH4.shifts[0].start, 'c4_pro_0')
assert.equal(CH4.shifts[0].checkinAt, 'c4_1_open_0')
assert.equal(CH4.shifts.at(-1).start, 'c4_6_open_0')
assert.deepEqual(CH4.shifts.map(shift => shift.start), [
  'c4_pro_0', 'c4_2_open_0', 'c4_3_open_0', 'c4_4_open_0', 'c4_5_open_0', 'c4_6_open_0',
])
assert.match(CH4.equipment, /^0\.55T\b/)
assert.match(CH4.equipment, /80厘米/)
assert.match(CH4.book.at(-1).body, /留待研究DLC/)
assert.deepEqual(CH4.shifts.map((_, shift) => trilogyBookUnlocked(CH4, shift)), [2, 4, 6, 8, 10, 12])
const tools = Object.entries(s).filter(([, step]) => step.tool)
const scans = Object.entries(s).filter(([, step]) => step.scan)
const playableScans = scans.filter(([id]) => id !== 'c4_county_dwi_scan')
assert.equal(tools.length, 0, 'Advanced experiments stay out of the main chapter')
for (const retired of [
  'c4_1_signal_lab', 'c4_2_timing_lab', 'c4_3_encoding_lab', 'c4_2_tool',
  'c4_4_sampling_lab', 'c4_5_research_q', 'c4_3_tool', 'c4_7_close_1', 'c4_9_artifact_stop_5',
]) assert.equal(s[retired], undefined, `${retired}: retired mainline dependency must not return`)

const realCaseImages = [
  'mri_real_tfcc_v1', 'mri_real_mrcp_v1', 'mri_real_hydrocephalus_v1',
  'mri_real_motion_ghost_v1', 'mri_real_knee_mimic_v1', 'mri_real_metal_artifact_v1',
  'mri_real_stroke_sequences_v1', 'mri_real_hemangioma_t2_v1', 'mri_real_hemangioma_dynamic_v1',
]
for (const id of realCaseImages) {
  assert(catalog[id], `${id}: canonical real-case image exists`)
  assert(CH4.assets.includes(id), `${id}: real-case image is preloaded`)
  await access(new URL(`../public/assets/${catalog[id]}`, import.meta.url))
}
assert.equal(CH4.assets.includes('mri_real_dwi_v1'), false, 'Retired county DWI image is no longer preloaded')
assert.equal(s.c4_4_head_result_0.image, 'mri_real_hydrocephalus_v1')
assert.match(text('c4_4_head_result_0'), /轴位T2图出来.*门诊申请.*接诊医师/)
assert.equal(s.c4_4_sequence_0.image, '', 'The child case does not reopen a multi-sequence lesson')
assert.match(text('c4_4_head_handoff_1'), /这两周/)
assert.match(text('c4_4_head_result_1'), /老周|你先看图/)
assert.match(text('c4_4_head_result_2'), /双侧侧脑室明显扩大.*脑积水可能/)
assert.match(text('c4_4_head_result_3'), /三岁.*脑室腹腔分流术/)
assert.match(text('c4_4_head_result_4'), /引到腹腔.*减轻积聚和颅内压.*正常发育.*接诊团队定/)
assert.equal(CH4.characters.child.name, '三岁女孩')
assert.doesNotMatch(text('c4_4_head_handoff_1'), /这三周/)
for (const [id, step] of Object.entries(s)) {
  assert(!/^mri_(?:wrist|brain|neck)|^mri_c4_(?:mrcp|knee|du_neck|acute_head|lumbar|liver|shoulder|yan_neck|xu_artifact)/.test(step.image ?? ''),
    `${id}: retired synthetic diagnostic image is not reused`)
}
const caseFlows = [
  ['c4_city_wrist', 'c4_1_case_0', 'c4_city_wrist_scan', 'c4_1_case_result_0', 'mri_real_tfcc_v1', 'wrist'],
  ['c4_city_claustrophobia', 'c4_1_feng_0', 'c4_feng_city_scan', 'c4_1_contrast_4', 'mri_real_stroke_sequences_v1', 'head'],
  ['c4_city_mrcp', 'c4_2_mrcp_0', 'c4_city_mrcp_scan', 'c4_2_mrcp_result_0', 'mri_real_mrcp_v1', 'abdomen'],
  ['c4_county_hydrocephalus', 'c4_4_head_0', 'c4_county_hydrocephalus_scan', 'c4_4_head_result_0', 'mri_real_hydrocephalus_v1', 'head'],
  ['c4_county_abdominal_motion', 'c4_5_motion_0', 'c4_county_abdominal_motion_scan', 'c4_5_motion_result_0', 'mri_real_motion_ghost_v1', 'abdomen'],
  ['c4_county_knee_mimic', 'c4_5_knee_0', 'c4_county_knee_scan', 'c4_5_knee_result_0', 'mri_real_knee_mimic_v1', 'knee'],
  ['c4_county_claustrophobia', 'c4_5_feng_0', 'c4_feng_county_scan', 'c4_5_feng_after_0', '', 'head'],
  ['c4_county_xu_lumbar', 'c4_6_xu_0', 'c4_xu_lumbar_scan', 'c4_6_artifact_intro_0', 'mri_real_metal_artifact_v1', 'lumbar'],
]
const expectedScanRegions = Object.fromEntries(caseFlows.map(row => [row[2], row[5]]))
expectedScanRegions.c4_feng_basic_scan = 'head'
expectedScanRegions.c4_county_abdominal_retry_scan = 'abdomen'
assert.deepEqual(Object.keys(expectedScanRegions).sort(), playableScans.map(([id]) => id).sort())
const nextIds = step => [step?.next, ...(step?.choices ?? []).flatMap(choice => [choice.next, choice.risk?.next])].filter(Boolean)
function reachable(start, target, beforeTarget = false) {
  const stack = [start], seen = new Set()
  while (stack.length) {
    const id = stack.pop()
    if (!id || seen.has(id)) continue
    if (id === target) return true
    seen.add(id)
    const step = s[id]
    if (!step) continue
    if (beforeTarget) assert(!realCaseImages.includes(step.image), `${start}: diagnostic image ${step.image} appears before ${target} at ${id}`)
    stack.push(...nextIds(step))
  }
  return false
}
for (const [caseId, start, scanId, result, image, region] of caseFlows) {
  assert.equal(s[start]?.caseId, caseId, `${caseId}: authored case entrance`)
  assert.equal(s[start]?.image, '', `${caseId}: no current diagnostic image or character illustration at patient arrival`)
  if (start === 'c4_4_head_0') {
    assert.equal(s[start]?.sprite, 'pat_c4_mother_child_pixel_v1', `${caseId}: one combined mother-holding-child pixel sprite`)
    assert.equal(s[start]?.closeup, undefined, `${caseId}: no cinematic child illustration`)
  }
  assert.equal(s[scanId]?.scan?.durationMs, 3000, `${caseId}: real 3000ms scan`)
  const model = caseId === 'c4_city_claustrophobia' ? 'city-055-wide' : caseId.startsWith('c4_city_') ? 'city-3t' : 'county-055-wide'
  assert.equal(s[scanId]?.scan?.mriRegion, region, `${caseId}: explicit patient region`)
  assert.equal(s[scanId]?.scan?.mriModel, model, `${caseId}: explicit hospital and machine model`)
  assert.equal(s[scanId]?.bg, model.startsWith('city-') ? 'bg_c4_city_control_v1' : 'bg_c4_county_control_v1')
  assert(catalog[MRI_SCAN_ART[model][region]], `${caseId}: model/region resolves to canonical art`)
  assert.doesNotMatch(s[scanId]?.scan?.label ?? '', /收到呼叫后停止/, `${caseId}: scan title stays in the acquisition moment`)
  assert.ok(s[scanId]?.next, `${caseId}: scan has a story continuation`)
  assert(reachable(start, scanId, true), `${caseId}: scan is reachable before results`)
  assert(reachable(scanId, result), `${caseId}: result follows the scan`)
  if (image) assert.equal(s[result]?.image, image, `${caseId}: real reference image belongs to this case`)
  else assert(!s[result]?.image, `${caseId}: follow-up without a new diagnostic image stays empty`)
}
assert.equal(playableScans.length, 10)
assert.equal(TRILOGY_CASE_NAMES.c4_city_claustrophobia, '冯叔·换机完成与疑似轻型卒中')
assert.equal(TRILOGY_CASE_NAMES.c4_county_claustrophobia, '冯叔·县院复查完成')
assert.equal(TRILOGY_CASE_NAMES.c4_county_hydrocephalus, '三岁女孩·脑室扩大与脑积水评估')
assert.equal(s.c4_county_dwi_scan.scan.label, s.c4_county_hydrocephalus_scan.scan.label, 'Legacy scan cursor opens only the current child case')
assert.equal(s.c4_1_case_full_1.next, 'c4_1_feng_0')
assert.equal(s.c4_1_case_help_1.next, 'c4_1_feng_0')
assert.equal(s.c4_1_feng_9.next, 'c4_feng_basic_scan')
assert.equal(s.c4_feng_basic_scan.next, 'c4_1_feng_stop_0')
assert.equal(s.c4_1_feng_transfer_7.next, 'c4_feng_city_scan')
assert.equal(s.c4_feng_city_scan.next, 'c4_1_contrast_0')
assert.equal(s.c4_1_contrast_10.next, 'c4_1_close_0')
assert.equal(s.c4_feng_basic_scan.text, '3T首个头部序列刚开始采集。')
assert.equal(s.c4_feng_basic_scan.scan.label, '3T 头部 MRI · 首个序列开始')
assert.equal(s.c4_feng_basic_scan.scan.durationMs, 3000)
assert.equal(s.c4_feng_basic_scan.scan.mriRegion, 'head')
assert.equal(s.c4_feng_basic_scan.scan.mriModel, 'city-3t')
assert.deepEqual(s.c4_feng_basic_scan.scan.distress,
  { atMs: 250, stopAfterMs: 3000, text: '冯叔：停一下！让我出去！我喘不上气！' })
assert.equal(s.c4_feng_city_scan.scan.mriModel, 'city-055-wide')
assert.equal(s.c4_feng_city_scan.scan.distress, undefined)
assert.match(s.c4_feng_city_scan.scan.label, /T1／T2／FLAIR／DWI/)
assert.match(s.c4_feng_city_scan.text, /T1、T2、FLAIR、DWI依次分段采集/)
assert.match(text('c4_1_contrast_0'), /T1、T2、FLAIR、DWI四组都采完了/)
assert.equal(s.c4_1_contrast_1.speaker, 'me')
assert.match(text('c4_1_contrast_1'), /采集权重不一样.*脑脊液在T1偏暗、T2偏亮，FLAIR会把自由水信号压暗/)
assert.match(text('c4_1_contrast_2'), /我还是怕.*喊了有人应.*孔口也没那么压/)
assert.equal(s.c4_1_contrast_3.speaker, 'shen')
assert.match(text('c4_1_contrast_3'), /DWI高、ADC低.*怎么理解/)
assert.match(text('c4_1_contrast_4'), /脑桥区.*DWI高信号、ADC对应低信号.*疑似轻型缺血性卒中.*轻微中风.*同类型真实病例/)
assert.match(text('c4_1_contrast_5'), /几分钟说话不清.*这样也算中风/)
assert.match(text('c4_1_contrast_6'), /疑似.*今晚.*神经内科.*用药和复查/)
assert.match(text('c4_1_contrast_7'), /我陪您去.*神经内科/)
assert.match(text('c4_1_contrast_8'), /同类型病例.*原始图组和报告.*联系神经内科/)
assert.match(text('c4_1_feng_stop_1'), /第一组刚开头，后面三组还没做.*交接单/)
assert.match(text('c4_1_feng_stop_4'), /是不是就做不了.*憋死/)
assert.equal(s.c4_1_feng_q.choices.length, 3)
const refundChoice = s.c4_1_feng_q.choices.find(choice => choice.next === 'c4_1_feng_refund_0')
assert(refundChoice, 'Feng can be told that stopping remains refundable before choosing the other room')
assert.match(refundChoice.text, /退费.*换机后的费用/)
assert.deepEqual(refundChoice.effect, { badge: 'c4r_call_answered' })
for (const id of ['c4_1_feng_refund_2', 'c4_1_feng_sit_1', 'c4_1_feng_route_1']) assert.equal(s[id].next, 'c4_1_feng_transfer_0')
assert.match(text('c4_1_feng_refund_0'), /今晚不再继续.*未完成项目可以退费.*实际完成项目核/)
assert.match(text('c4_1_feng_refund_1'), /能退就好.*孩子添麻烦.*先别急着退/)
assert.match(text('c4_1_feng_refund_2'), /退费、改约和换机.*另一检查区.*费用等实际检查后再核/)
assert.match(text('c4_1_feng_transfer_0'), /同层.*另一检查区.*0\.55T、80厘米大孔径/)
assert.doesNotMatch(text('c4_1_feng_transfer_0'), /县院后来采购|把3T的孔/)
assert.equal(s.c4_1_feng_transfer_0.image, 'cg_c4_city_wide_bore_v1')
assert.equal(s.c4_1_feng_transfer_0.closeup, true)
assert.match(text('c4_1_feng_transfer_1'), /宽一些.*噪声还是有.*呼叫.*说停/)
assert.match(text('c4_1_feng_transfer_2'), /场强低一些.*久一点.*调整分辨率和参数/)
assert.match(text('c4_1_feng_transfer_4'), /T1、T2、FLAIR、DWI.*四组.*分段/)
assert.match(text('c4_1_feng_transfer_6'), /我还是怕.*先扫一组.*每次捏了都有人答/)
assert.match(text('c4_5_feng_2'), /四组都做完了.*疑似轻型缺血性卒中.*神经内科.*按医嘱用药.*按约定复查/)
assert.doesNotMatch(text('c4_5_feng_2'), /没做完|没做成|检查补上/)
assert.doesNotMatch(text('c4_5_feng_3'), /不是补上市院/)
assert.match(text('c4_3_budget_keep_0'), /3T刚响就中止.*0\.55T大孔径后完成了四组/)
assert.match(text('c4_4_sequence_0'), /孩子到儿科.*贴纸/)

assert(reachable('c4_county_abdominal_motion_scan', 'c4_county_abdominal_retry_scan'), 'Necessary repeat follows motion review')
assert.equal(s.c4_county_abdominal_retry_scan.scan.durationMs, 3000)
assert.equal(s.c4_county_abdominal_retry_scan.scan.mriRegion, 'abdomen')
assert.equal(s.c4_county_abdominal_retry_scan.scan.mriModel, 'county-055-wide')
assert.equal(s.c4_county_abdominal_retry_scan.next, 'c4_5_motion_after_0')
assert.equal(s.c4_5_motion_after_0.image, 'mri_real_hemangioma_t2_v1')
assert.match(text('c4_5_motion_after_0'), /必要序列完成.*新图组与首段分开标记.*中等、重T2参考图/)
const caseSteps = Object.values(s).filter(step => step.caseId)
const caseIds = [...new Set(caseSteps.map(step => step.caseId))]
assert.equal(caseIds.length, 8)
assert.deepEqual(caseIds.sort(), caseFlows.map(row => row[0]).sort())
for (const source of [
  'https://link.springer.com/article/10.1007/s00256-025-05106-x',
  'https://commons.wikimedia.org/wiki/File:MRCP_Choledocholithiasis.jpg',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC4340093/',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC7310981/',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC4126146/',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC11608002/',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC8125971/',
]) assert(visualContinuity.includes(source), `Real case source is registered: ${source}`)
for (const license of ['CC BY 4.0', 'CC BY-NC-SA 3.0', 'CC BY-SA 3.0', 'CC BY-NC 4.0', 'CC BY-NC 3.0']) assert(visualContinuity.includes(license))
assert(visualContinuity.includes('3614059f45a56618464e108989913959a96d45c3c9360e97067909071c16f999'))
assert(visualContinuity.includes('c5b308a21b70941287982ebad51b8d126db578609f037cbc825ba135b0cde3b2'))

// The original rotation/procurement prelude is retained; the family payoff now
// follows city arrival before the unchanged formal check-in. Tang stays a nurse.
const preludeIds = Object.keys(s).filter(id => /^c4_(pro|apply|departure)_/.test(id) || id === 'c4_city_arrival')
assert.equal(preludeIds.length, 15)
assert.match(text('c4_pro_5'), /周三来，跟一周/)
assert.equal(s.c4_pro_5.next, 'c4_apply_zhou_0')
assert.match(text('c4_apply_director_1'), /人排开了就去.*照不照得起来/)
assert.equal(s.c4_apply_director_1.effect.flag, 'c4_training_approved')
assert.match(text('c4_apply_zhou_1'), /改约的电话我来盯.*排班/)
assert.equal(s.c4_apply_zhou_1.speaker, 'tang')
assert.equal(s.c4_apply_director_2.speaker, 'tang')
for (const id of preludeIds) {
  assert.notEqual(s[id].speaker, 'mystery', `${id}: Xu does not open the chapter`)
  assert.doesNotMatch(text(id), /顶班|一个月|两周交接/)
}
assert.equal(s.c4_city_arrival.image, 'cg_c4_city_hospital_entrance')
assert.equal(CH4.adapt('c4_city_arrival', s.c4_city_arrival, { gender: 'm', flags: {} }).image, 'cg_c4_city_hospital_entrance')
assert.equal(CH4.adapt('c4_city_arrival', s.c4_city_arrival, { gender: 'f', flags: {} }).image, 'cg_c4_city_hospital_entrance_female')
assert.match(text('c4_city_arrival'), /周三傍晚.*拖着箱子/)
assert.match(text('c4_1_open_1'), /县院来的吧.*能熬夜/)
assert.deepEqual(CH4.shifts.slice(0, 2).map(shift => shift.date), [
  '2027年3月3日 · 晚间接诊', '2027年3月9日 · 晚间接诊',
])
assert.match(text('c4_apply_zhou_0'), /许建平还没定检查日期.*先别排/)
assert.doesNotMatch(text('c4_apply_zhou_1'), /许建平|预约本.*日期/)
assert.match(text('c4_2_close_4'), /周二收班/)
assert.equal(s.c4_2_close_4.effect.flag, 'c4_city_week_completed')

// Equipment, sequences and the two artifact cards use their real authored positions.
for (const [id, image, card] of [
  ['c4_1_magnet_0', 'mri_c4_magnet_system', 'c4_magnet'],
  ['c4_1_gradient_0', 'mri_c4_gradient_system', 'c4_gradient'],
  ['c4_1_rf_0', 'mri_c4_rf_system', 'c4_rf'],
  ['c4_1_contrast_0', 'mri_c4_basic_contrast_v1', 'c4_contrast'],
  ['c4_1_contrast_4', 'mri_real_stroke_sequences_v1', 'c4_stroke'],
  ['c4_5_motion_result_0', 'mri_real_motion_ghost_v1', 'c4_quality'],
  ['c4_6_stop_0', '', 'c4_foreign'],
]) {
  if (image) assert.equal(s[id].image, image)
  assert.equal(s[id].card, card)
  if (image) assert(catalog[image], `${id}: canonical teaching/reference image exists`)
}
for (const [id, image, cameraMotion] of [
  ['c4_1_feng_transfer_0', 'cg_c4_city_wide_bore_v1', 'settle'],
  ['c4_3_install_1', 'cg_c4_magnet_lift_v1', 'pan'],
  ['c4_3_install_3', 'cg_c4_install_complete_v1', 'settle'],
  ['c4_3_install_7', 'cg_c4_ribbon_stop_v1', 'push'],
  ['c4_3_ribbon_outside_1', 'cg_c4_ribbon_cutting_v1', 'push'],
]) {
  assert.equal(s[id].image, image)
  assert.equal(s[id].closeup, true)
  assert.equal(s[id].cameraMotion, cameraMotion)
  assert(CH4.assets.includes(image), `${id}: installation closeup is preloaded`)
  assert(catalog[image], `${id}: installation closeup has a canonical WebP`)
  await access(new URL(`../public/assets/${catalog[image]}`, import.meta.url))
}
for (const id of ['c4_3_door_0', 'c4_3_door_1', 'c4_3_door_2', 'c4_3_install_0', 'c4_3_install_1', 'c4_3_install_2'])
  assert.equal(s[id].bg, 'bg_c4_county_corridor_preinstall_v1', `${id}: the equipment room is visibly empty before the magnet is installed`)
for (const id of ['c4_3_install_3', 'c4_3_install_7', 'c4_3_install_8', 'c4_3_install_9'])
  assert.equal(s[id].bg, 'bg_c4_county_corridor_v1', `${id}: installed-room background appears only after the magnet is in place`)
assert(CH4.assets.includes('bg_c4_county_corridor_preinstall_v1'))
assert(catalog.bg_c4_county_corridor_preinstall_v1)
assert.match(text('c4_3_install_7'), /交接快做完.*剪刀已经举起来.*跑过去拦住/)
assert.match(text('c4_3_install_8'), /先别剪.*磁场没有下班键.*剪刀先收好/)
assert.match(text('c4_3_install_9'), /红绸挪到.*医院正门.*带大家退开/)
assert.equal(s.c4_3_install_9.next, 'c4_3_ribbon_outside_0')
assert.match(text('c4_3_ribbon_outside_0'), /收好剪刀.*撤到警戒区外/)
assert.match(text('c4_3_ribbon_outside_1'), /县医院正门外.*剪断/)
assert.match(text('c4_3_ribbon_outside_2'), /照片就在这儿拍.*机房那边别围人/)
assert.equal(s.c4_3_ribbon_outside_3.next, 'c4_3_end')
assert.doesNotMatch(Object.values(s).map(step => step.text).join(''), /院长在新机房门口剪断红绸/)
assert.match(text('c4_4_open_0'), /11月15日07:50.*三岁，头痛/)
assert.match(text('c4_4_sequence_0'), /孩子到儿科.*贴纸/)
assert.match(text('c4_4_sequence_right_1'), /控制台.*账号.*试用单/)
assert.equal(s.c4_4_sequence_q.choices.length, 3)
assert.match(s.c4_4_sequence_q.text, /这张T2图上，脑脊液为什么亮/)
assert.match(s.c4_4_sequence_q.choices[0].text, /T2较长.*接回波时信号还比较强/)
assert.match(CH4.book[6].body, /硬件看场强.*软件看序列.*FOV.*矩阵.*NEX／NSA/)
assert.match(text('c4_1_magnet_2'), /场强用T表示.*信号潜力.*不是人人都非3T不可/)
assert.match(text('c4_1_magnet_3'), /孔径就是人躺进去那段空间，按厘米算.*怕憋.*不包图像一定漂亮/)
assert.match(text('c4_1_magnet_5'), /ppm差异.*一般越小越均匀.*脂肪抑制.*哪个范围测/)
assert.match(text('c4_1_rf_1'), /通道.*多路一起听.*部位、线圈和序列配得上.*不是数越大越神气/)
assert.match(text('c4_1_rf_3'), /包得住要看的地方.*形状也得合适.*贴合些.*信号/)
assert.match(text('c4_1_rf_4'), /贴合不是勒紧.*躺得难受.*重扫/)
assert.match(text('c4_1_gradient_2'), /最大梯度强度.*小视野、薄层、高分辨.*DWI.*别只挑最大数/)
assert.match(text('c4_1_gradient_3'), /爬升率.*多快到目标强度.*回波间隔、快速序列和采集效率.*噪声/)
assert.match(text('c4_1_rf_0'), /准备柜一开.*A17转接件.*维修工号和日期.*拍进手机/)
assert.match(text('c4_1_gradient_4'), /这几项我知道怎么问了.*腕伤小伙/)
assert.doesNotMatch(text('c4_1_gradient_4'), /A17|老白|配件/)
assert.match(text('c4_2_repair_0'), /第一晚拍的照片.*维修登记.*供货人那格却空着/)
assert.doesNotMatch(text('c4_2_repair_0'), /A17|老白/)
assert.match(text('c4_2_close_0'), /老范发来两版报价.*AI智能重建/)
assert.match(text('c4_2_close_1'), /维修标签有回话.*不是原厂编号.*沿维修单找经手人.*软件报价别搅一起/)
assert.match(text('c4_2_close_2'), /基本重建本来就有.*AI重建是我们原厂的单列选配/)
for (const id of ['c4_2_close_1', 'c4_2_close_2', 'c4_2_close_3', 'c4_2_end'])
  assert.doesNotMatch(text(id), /A17|老白/, `${id}: colleagues do not repeat the accessory subplot`)

assert.match(CH4.book[8].body, /不擅长不等于不能看|不能简化成/)

// Story entries, exploration and gifts never grant attributes. Every positive
// attribute choice belongs to one 2–3 option decision with exactly one rewarded answer.
for (const [id, step] of Object.entries(s)) {
  for (const key of ['skill', 'heart', 'wealth']) assert.equal(step.effect?.[key], undefined,
    `${id}: ordinary story entry must not directly change ${key}`)
}
const hubs = Object.entries(s).filter(([id]) => /c4_[1-6]_hub$/.test(id))
assert.equal(hubs.length, 6)
const placeEntries = []
for (const [hubId, hub] of hubs) {
  assert(hub.choices.length >= 5, `${hubId}: activities, finds and utilities share one level`)
  assert(hub.choices.every(choice => choice.icon), `${hubId}: every visible option has a compact icon`)
  assert.equal(hub.choices.filter(choice => /^c4_[1-6]_place_\d+$/.test(choice.next ?? '')).length, 0,
    `${hubId}: no second-level place menu remains in the live hub`)
  assert(!/练屏气|训练憋气|陪.*憋气/.test(hub.choices.map(choice => choice.text).join('')), `${hubId}: no artificial breath-training excursion`)
  placeEntries.push([hubId, hubId, hub])
  const events = (hub.choices ?? []).filter(choice => choice.cond?.notFlag && choice.effect?.ap === -1)
  assert(events.length >= 2, `${hubId}: direct activities are available without navigation`)
  for (const choice of events) {
    assert(s[choice.next], `${hubId}: direct event target exists`)
    const requiredFlag = choice.cond.notFlag
    const stack = [choice.next, choice.risk?.next], seen = new Set()
    let completionFound = false
    while (stack.length) {
      const node = stack.pop()
      if (!node || node === hubId || seen.has(node)) continue
      seen.add(node)
      const current = s[node]
      if (!current) continue
      if (current.effect?.flag === requiredFlag) completionFound = true
      stack.push(current.next, ...(current.choices ?? []).flatMap(option => [option.next, option.risk?.next]))
    }
    assert(completionFound, `${hubId}: ${choice.next} eventually sets ${requiredFlag}`)
  }
  assert(hub.choices.some(choice => choice.next !== '@shop' && choice.next !== '@book' && !choice.cond), `${hubId}: free mainline continuation`)
}
const legacyPlaces = Object.entries(s).filter(([id]) => /^c4_[1-6]_place_\d+$/.test(id))
assert.equal(legacyPlaces.length, 17)
for (const [id, place] of legacyPlaces) {
  assert(place.choices.every(choice => choice.icon), `${id}: old save cursor retains readable icons`)
  assert(place.choices.some(choice => /^c4_[1-6]_hub$/.test(choice.next)), `${id}: old cursor can still return to its hub`)
}
const attributeKeys = ['skill', 'heart', 'wealth']
for (const id of ['c4_apply_zhou_1', 'c4_3_open_2', 'c4_4_emergency_1', 'c4_5_open_1', 'c4_6_open_1', 'c4_wrap_3']) {
  assert.equal(s[id].speaker, 'tang', `${id}: Tang remains a mainline nurse and coordinator`)
}
assert.equal(s.c4_4_hub.bg, 'bg_c4_county_corridor_v1')
assert.equal(s.c4_5_evidence_0.bg, 'bg_c4_county_corridor_v1')
assert.equal(s.c4_6_help_tang_0.bg, 'ch2_bg_breakroom_day')
assert.equal(s.c4_5_end.bg, 'ch2_bg_breakroom_day')
for (const id of ['c4_wrap_0', 'c4_wrap_research_0', 'c4_wrap_exam_0', 'c4_wrap_end', 'c4_6_end']) assert.equal(s[id].bg, 'bg_office', `${id}: night wrap uses the night office`)
for (const id of ['c4_pro_0', 'c4_pro_4']) assert.equal(s[id].bg, 'bg_office')
assert.equal(s.c4_pro_5.bg, 'bg_office_day')
for (const id of ['c4_3_install_0', 'c4_3_ribbon_outside_0', 'c4_4_open_0', 'c4_5_open_0', 'c4_6_open_0']) assert.notEqual(s[id].bg, 'bg_corridor')
assert.equal(s.c4_5_motion_after_0.image, 'mri_real_hemangioma_t2_v1')
assert.equal(s.c4_5_motion_after_3.image, 'mri_real_hemangioma_dynamic_v1')
assert.equal(s.c4_5_motion_after_5.next, 'c4_5_knee_0')
const storyDecisions = Object.entries(s).filter(([, step]) => step.shuffleChoices)
assert.equal(storyDecisions.length, 15)
for (const [id, step] of storyDecisions) {
  assert.equal(step.choices.length, 3, `${id}: every story decision has exactly three options`)
  assert.equal(new Set(step.choices.map(choice => choice.text)).size, 3, `${id}: options are distinct`)
  for (const choice of step.choices) {
    assert(choice.text.length <= 18, `${id}: concise option: ${choice.text}`)
    assert.doesNotMatch(choice.text, /AI听起来先进|把黑影当成急症|先点同意|再补一堆序列名|直接确定病因|先保展示软件|回家等短信|马上接出/)
    for (const key of attributeKeys) assert((choice.effect?.[key] ?? 0) >= 0, `${id}: no punitive black-and-white attribute answer`)
  }
}
for (const [id, step] of Object.entries(s)) {
  if (/^c4_[1-6]_(?:hub|place_\d+)$/.test(id)) assert.equal(step.shuffleChoices, false, `${id}: exploration and legacy place menus keep their fixed order`)
}
for (const [id, speaker] of [
  ['c4_1_case_result_1', 'shen'], ['c4_2_mrcp_result_1', 'shen'], ['c4_4_head_result_1', 'zhou'],
  ['c4_5_motion_result_1', 'zhou'], ['c4_5_knee_result_1', 'zhou'],
  ['c4_6_artifact_intro_1', 'zhou'], ['c4_6_artifact_intro_2', 'zhou'],
]) assert.equal(s[id].speaker, speaker, `${id}: mentor questions replace another patient-doctor explanation`)

const rewardedChoices = []
for (const [id, step] of Object.entries(s)) {
  const rewarded = (step.choices ?? []).filter(choice => attributeKeys.some(key => (choice.effect?.[key] ?? 0) > 0))
  if (!rewarded.length) continue
  assert.equal(step.choices.length, 3, `${id}: attribute reward requires a three-option decision`)
  assert.equal(rewarded.length, 1, `${id}: only the single correct option gains attributes`)
  rewardedChoices.push({ id, choice: rewarded[0] })
}
assert.equal(rewardedChoices.length, 15)
const explorationEvents = placeEntries.flatMap(([, placeId, place]) => (place.choices ?? [])
  .filter(choice => choice.effect?.ap === -1 && choice.cond?.notFlag).map(choice => ({ ...choice, placeId })))
const discoveryEvents = explorationEvents.filter(choice => !choice.risk)
const helpingEvents = explorationEvents.filter(choice => choice.risk)
assert.equal(discoveryEvents.length, 12)
assert.equal(helpingEvents.length, 5)
assert(explorationEvents.every(choice => attributeKeys.every(key => choice.effect?.[key] === undefined)))
assert(helpingEvents.every(choice => choice.risk.chance === 0.3))

// Seven optional finds are direct, free and non-farmable. The referral bag has an explicit handover source.
const hiddenChoices = placeEntries.flatMap(([hubId, placeId, place]) => (place.choices ?? [])
  .filter(choice => /_find_\d+_0$/.test(choice.next ?? '')).map(choice => ({ hubId, placeId, choice })))
assert.equal(hiddenChoices.length, 7)
for (const { hubId, placeId, choice } of hiddenChoices) {
  assert(choice.icon, `${placeId}: hidden find has its own icon`)
  assert(choice.cond?.notFlag, `${placeId}: hidden find has a persistent receipt`)
  assert.equal(choice.effect, undefined, `${placeId}: searching costs no AP and grants no stats`)
  const found = s[choice.next]
  assert.equal(found.effect.flag, choice.cond.notFlag)
  assert.equal(found.effect.ap, undefined)
  for (const key of ['skill', 'heart', 'wealth']) assert.equal(found.effect[key], undefined)
  assert.equal(found.next, hubId, `${choice.next}: returns directly to the same one-level hub`)
  assert.doesNotMatch(found.text, /隐藏线索|隐藏证据|已收入证据夹/)
  assert.doesNotMatch(found.text, /不增加属性|不会重复领取/)
}
const referralFind = hiddenChoices.find(({ choice }) => choice.cond.notFlag === 'c4r7_hidden_referral')
assert(referralFind)
assert.match(referralFind.choice.text, /登记台.*退回的归档片袋/)
assert.match(s[referralFind.choice.next].text, /旧片数字化退回件.*交接单.*按单开袋.*原件装回、重新封存/)
assert.doesNotMatch(s[referralFind.choice.next].text, /走廊里有一只|走廊.*翻翻旧片袋/)

// Glasses, procurement, evidence and the two returning people are one causal story.
assert.equal(s.c4_2_glasses_safe_1.next, 'c4_2_mrcp_0')
assert.equal(s.c4_2_glasses_people_2.next, 'c4_2_mrcp_0')
assert.equal(s.c4_2_mrcp_handoff_1.next, 'c4_2_xu_0')
assert.equal(s.c4_2_mrcp_family_1.next, 'c4_2_xu_0')
assert.equal(s.c4_2_xu_listen_1.next, 'c4_2_close_0')
assert.equal(s.c4_2_xu_records_1.next, 'c4_2_close_0')
assert.match(text('c4_2_xu_0'), /老范把我的申请给你了.*我是许建平.*上次做超声/)
assert.match(text('c4_2_xu_2'), /年轻时做过手术.*不知道里面有没有留东西.*先取消/)
assert.doesNotMatch([0, 1, 2].map(index => text(`c4_2_xu_${index}`)).join(''), /刚才是不是有东西吸上去了|老范告诉你.*眼镜/)
assert.match(text('c4_4_open_1'), /孩子来得早.*妈妈怕迟到/)
assert.doesNotMatch(text('c4_4_open_1'), /许建平|档案窗口/)
assert.match(text('c4_5_feng_0'), /许建平跟在最后.*旧纸袋.*不挡路/)
assert.match(text('c4_2_incident_3'), /吸在磁体外壳/)
assert.doesNotMatch([0,1,2,3,4,5,6].map(i => text(`c4_2_incident_${i}`)).join(''), /掏出眼镜|扬了扬|往前跨/)
assert.match(text('c4_2_incident_4'), /轻眼镜.*小心试着.*拿下来/)
assert.match(text('c4_2_incident_5'), /先停手，退回来.*重要安全事故征候.*不能因为眼镜轻就徒手拔/)
assert.match(text('c4_2_incident_6'), /收手退回门边.*守住入口.*工程人员处置/)
assert.equal(s.c4_2_incident_3.image, 'cg_c4_glasses_v3')
assert.equal(s.c4_2_glasses_q.choices.length, 3)
for (const choice of s.c4_2_glasses_q.choices) assert.equal(choice.effect.badge, 'c4r_magnet_stop')
assert.match(text('c4_2_glasses_safe_0'), /轮椅或剪刀.*可能直接出人命/)
assert.match(text('c4_2_glasses_safe_1'), /伸手尝试.*事故征候记录/)
assert.match(text('c4_2_glasses_people_2'), /轮椅或剪刀一旦吸附，可能致命/)
assert.match(text('c4_2_mrcp_0'), /事故征候已经记录.*工程人员处置并核过现场后，夜班恢复/)
assert.equal(CH4.characters.worker.name, '疑似胆总管结石患者')
assert.equal(CH4.characters.courier.name, '设备送货员')
assert.equal(s.c4_3_door_1.speaker, 'courier')
assert.equal(s.c4_2_close_1.effect.flag, 'c4_repair_tag')
assert.equal(s.c4_3_open_0.effect.flag, 'c4_old_contract')
assert.equal(s.c4_3_open_3.effect.flag, 'c4_old_contract')
assert.equal(s.c4_3_quotes_0.effect.flag, 'c4_contract_split')
assert.equal(s.c4_3_bai_1.effect.flag, 'c4_a17_batch')
assert.match(CH4.adapt('c4_3_quotes_2', s.c4_3_quotes_2, { flags: { c3_wen_copy_kept: true } }).text, /第三章.*核对联.*原厂AI单列.*30天试用/)
// 小唐加入采购交接后仍沿原节点顺序推进，旧游标保持有效。
assert.equal(s.c4_3_open_1.next, 'c4_3_open_2')
assert.equal(s.c4_3_open_3.next, 'c4_3_quotes_0')
assert.equal(s.c4_3_quotes_2.next, 'c4_3_quotes_3')
assert.equal(s.c4_3_quotes_4.next, 'c4_3_quote_q')
assert.equal(s.c4_3_quote_clear_0.next, 'c4_3_quote_clear_1')
assert.equal(s.c4_3_quote_wrong_0.next, 'c4_3_quote_wrong_1')
assert.equal(s.c4_3_bai_1.next, 'c4_3_hub', 'The live accessory exchange is one message and one reply')
for (const id of ['c4_3_bai_2', 'c4_3_bai_3', 'c4_3_bai_4']) {
  assert.equal(s[id].next, 'c4_3_hub', `${id}: compressed legacy cursor safely rejoins procurement`)
  assert.equal(s[id].effect, undefined)
  assert.doesNotMatch(text(id), /A17|老白/)
}
assert.match(text('c4_3_open_0'), /两版报价.*小唐.*AI智能重建/)
assert.match(text('c4_3_quotes_0'), /基本重建已经包含.*AI重建是原厂单列选配.*数据服务/)
assert.match(text('c4_3_quotes_2'), /30天试用单.*账号和到期日.*不采购就不收正式授权费/)
assert.doesNotMatch(text('c4_3_quotes_4'), /A17|老白|配件/)
assert.match(text('c4_3_bai_1'), /资料先发来.*今天只核采购配置，不买配件/)
assert.match(text('c4_3_bai_0'), /卖线圈转接件和常用备件.*老范把A17标签照片/)
assert.equal(s.c4_3_bai_0.image, 'item_c4_a17_parts_v1')
assert.equal(s.c4_3_quotes_0.image, 'item_c4_quote_folder_v1')
assert.equal(s.c4_3_decision_0.effect.flag, 'c4_procurement_decided')
assert.equal(s.c4_3_ribbon_outside_3.effect.flag, 'c4_installed_ready')
for (const id of ['c4_5_evidence_0', 'c4_5_evidence_1', 'c4_5_evidence_2', 'c4_5_evidence_q', 'c4_5_chain_right_0', 'c4_5_chain_wrong_1', 'c4_5_chain_price_1', 'c4_5_chain_recover_3']) {
  assert.equal(s[id].next, 'c4_5_feng_0', `${id}: retired vendor cursor safely rejoins the patient mainline`)
  assert.equal(s[id].effect, undefined)
  assert.equal(s[id].choices, undefined)
}
assert.equal(s.c4_5_knee_explain_1.next, 'c4_5_feng_0')
assert.equal(s.c4_5_knee_review_1.next, 'c4_5_feng_0')
assert.match(text('c4_3_bai_0'), /以后缺备用件可以问我.*批次、兼容机型和质保/)
assert.match(text('c4_3_install_5'), /交接做完我才进来.*备用件和升级件.*不催你们买/)
assert.doesNotMatch(text('c4_3_archive_2'), /A17|老白/)
assert.doesNotMatch(text('c4_3_decision_2'), /A17|老白/)
assert.match(text('c4_3_quotes_3'), /试用是试用.*买不买/)

// Patients and relatives ask concrete questions; the protagonist answers before handoff.
for (const [id, pattern] of [
  ['c4_1_case_5', /软骨和韧带.*两次受伤/],
  ['c4_1_case_result_2', /信号不连续.*完整图组.*查体/],
  ['c4_1_feng_transfer_2', /场强低一些.*久一点.*调整分辨率和参数/],
  ['c4_1_contrast_6', /疑似.*今晚.*神经内科.*用药和复查/],
  ['c4_2_mrcp_result_2', /MRCP突出胆管里的水.*结石.*暗的小缺口/],
  ['c4_2_mrcp_result_4', /住不住院.*疼痛、黄疸、发热和化验.*别让他开车/],
  ['c4_4_head_5', /想去就先去.*难受就告诉我们/],
  ['c4_4_head_result_2', /双侧侧脑室明显扩大.*晨起呕吐.*步态不稳.*脑积水可能/],
  ['c4_4_head_result_4', /分流术.*引到腹腔.*正常发育.*接诊团队定/],
  ['c4_5_motion_result_2', /血管搏动.*鬼影.*挪动造成模糊.*不是多出一排病灶/],
  ['c4_5_motion_after_2', /典型肝血管瘤.*重T2.*完整图组.*超声和病史/],
  ['c4_5_motion_after_5', /不一定.*领取方式和复诊科室.*需要补查/],
  ['c4_5_knee_result_2', /移位的韧带.*前后图.*完整图组和查体/],
  ['c4_6_xu_6', /金属也能让那一片变黑、变形.*图像质量.*原图留下/],
  ['c4_6_stop_2', /原图留下.*早上核定的条件.*短TE的SE/],
  ['c4_6_stop_4', /SE、短TE和短Echo Spacing.*目标结构能不能评.*图像质量/],
]) {
  assert.equal(s[id].speaker, 'me', `${id}: protagonist participates in the explanation`)
  assert.match(text(id), pattern)
}

assert.match(text('c4_5_motion_result_0'), /黄框.*AP方向.*画面上下.*相位编码方向/)

// Feng's later success causes Xu's appointment. The black shadow converges on stopping,
// the old operation record explains only the lumbar finding, and the neck gets its own route.
assert.equal(s.c4_feng_city_scan.text, '0.55T大孔径下，T1、T2、FLAIR、DWI依次分段采集。')
assert.equal(s.c4_feng_city_scan.scan.label, '市院0.55T 头部 MRI · T1／T2／FLAIR／DWI')
assert.equal(s.c4_feng_city_scan.scan.distress, undefined)
assert.match(text('c4_feng_county_scan'), /0\.55T大孔径头部序列采集中/)
assert.equal(s.c4_5_feng_after_5.effect.flag, 'c4_xu_witness')
assert.equal(s.c4_5_feng_after_5.effect.badge, 'c4r_witness')
assert.match(text('c4_5_close_0'), /自己在预约单上写了名字和日期/)
assert.equal(s.c4_5_receipt_q.choices[0].effect.flag, 'c4_xu_receipt')
assert.match(text('c4_6_stop_5'), /后续采集按调整后的方案继续.*呼叫球/)
assert.match(CH4.adapt('c4_epilogue_5', s.c4_epilogue_5, { flags: { c4_xu_listened: true } }).text, /没逼我/)
assert.match(CH4.adapt('c4_6_follow_0', s.c4_6_follow_0, { flags: { c3_xu_query_started: true } }).text, /上次的受理号/)
const stopChoice = s.c4_6_artifact_q.choices.find(choice => choice.next === 'c4_6_stop_0')
const wrongChoice = s.c4_6_artifact_q.choices.find(choice => choice.next === 'c4_6_wrong_0')
assert.match(stopChoice.text, /留原图.*短TE的SE补扫/)
assert.equal(stopChoice.effect.badge, 'c4r_black_shadow')
assert.equal(wrongChoice.effect?.heart, undefined)
assert.match(text('c4_6_wrong_0'), /原图留下.*早上核过的植入物资料.*补哪一组/)
assert.equal(s.c4_6_stop_5.effect.flag, 'c4_xu_implant_query')
assert.match(text('c4_6_artifact_intro_1'), /SE序列.*180°重聚脉冲.*磁场不均匀.*相位离散/)
assert.match(text('c4_6_artifact_intro_2'), /回波时间（TE）.*回波间隔（Echo Spacing）.*尽量缩短.*减少相位散失.*不保证全消/)
assert.match(text('c4_6_stop_1'), /早上核的是能不能扫.*怎么把这一片看清.*换种序列/)
assert.match(text('c4_epilogue_4'), /完整旧病历与腰椎图.*手术记录.*此前核过的植入物资料/)
assert.equal(s.c4_epilogue_4.effect.flag, 'c4_implant_identified')
assert.match(text('c4_epilogue_6'), /手术单.*父亲.*许守义.*另夹着他自己的.*转诊存根/)
assert.match(text('c4_epilogue_7'), /两份复印件分开放好.*父亲转诊后的去向还要继续查/)
assert.equal(s.c4_epilogue_8.effect.flag, 'c4_father_transfer')
assert.equal(s.c4_epilogue_8.effect.badge, 'c4r_formal_record')
assert.match(text('c4_6_close_0'), /左颈.*另交门诊接着评估/)
assert.equal(s.c4_6_close_0.effect.flag, 'c4_neck_followup')
assert.equal(s.c4_6_close_0.card, 'c4_uncertain')
assert.equal(s.c4_epilogue_end.text, '第四章·共振，完。')
assert.equal(s.c4_epilogue_end.end, true)
assert.match(text('c4_epilogue_learning_1'), /三月在市院学的.*回来一直用到现在.*还想再去跟一段/)
assert.match(CH4.shifts.at(-1).title, /看清黑影之后/)
for (const [id, step] of Object.entries(s)) {
  assert(!/^c4_nuclear_training_/.test(step.effect?.flag ?? ''), `${id}: no new PET approval or booking history`)
  if (/^c4_(?:wrap|epilogue)/.test(id)) assert.doesNotMatch(step.text, /PET|核医学|γ相机|2028|研究合作待续|下一章|流浪老人/,
    `${id}: ending belongs to this chapter, not repeated future teasers`)
}

// The last salary is still paid at its legacy cursor. The research conversation
// is now just a message and reply; retired cursors resume without extra rewards.
assert.equal(s.c4_6_end.next, 'c4_wrap_0')
assert.equal(s.c4_6_end.end, undefined)
assert.equal(s.c4_6_end.effect.gold, 260)
assert.equal(s.c4_6_end.effect.badge, 'c4r_survivor')
assert.equal(s.c4_wrap_4.next, 'c4_wrap_research_0')
assert.equal(s.c4_wrap_research_1.next, 'c4_wrap_exam_0')
assert.equal(s.c4_wrap_exam_3.next, 'c4_wrap_end')
assert.equal(s.c4_wrap_end.end, true)
assert.equal(s.c4_wrap_end.effect, undefined)
assert.match(text('c4_wrap_1'), /报个平安.*头不晕.*饭也吃了/)
assert.doesNotMatch(text('c4_wrap_1'), /小许|许建平|档案/)
assert.equal(s.c4_wrap_1.communication, 'sms')
assert.equal(s.c4_wrap_1.sprite, '')
assert.match(text('c4_wrap_4'), /明早的交接.*今晚都到这儿.*饭盒/)
assert.doesNotMatch(text('c4_wrap_4'), /AI|A17|厂家/)
for (const id of ['c4_wrap_research_0', 'c4_wrap_research_1']) {
  assert.equal(s[id].communication, 'sms', `${id}: every Shen line stays in the same remote conversation`)
  assert.equal(s[id].phone, 'char_c4_shen_v3')
}
assert.equal(s.c4_wrap_research_0.sprite, '', 'Shen remains remote')
assert.equal(s.c4_wrap_research_1.sprite, 'me', 'The local protagonist replies in place')
assert.match(text('c4_wrap_research_0'), /扫得更快.*看脑活动.*有空再.*聊/)
for (let i = 2; i <= 6; i++) {
  const id = `c4_wrap_research_${i}`
  assert.equal(s[id].next, 'c4_wrap_exam_0')
  assert.equal(s[id].effect, undefined)
  assert.equal(s[id].communication, undefined)
  assert.equal(TRILOGY_COMMUNICATION_CUES[id], undefined)
}
assert.match(text('c4_wrap_exam_1'), /五道基础题.*磁场、脉冲、参数和图像.*图是怎么来的/)
const closingIds = Object.keys(s).filter(id => /^c4_wrap(?:_|$)/.test(id))
assert.equal(closingIds.length, 17)
for (const id of closingIds) {
  assert.equal(s[id].tool, undefined, `${id}: no advanced experiment`)
  assert.equal(s[id].scan, undefined, `${id}: no new acquisition`)
  assert.equal(s[id].effect?.skill, undefined, `${id}: no automatic skill reward`)
  assert.equal(s[id].effect?.heart, undefined, `${id}: no automatic heart reward`)
  assert.equal(s[id].effect?.gold, undefined, `${id}: no extra salary`)
}

const expectedPortraits = {
  wrist: 'ch2_patient_wrist_student', anxious: 'pat_c4_feng_v3', worker: 'pat_c4_liu_v4',
  child: 'pat_c4_mother_child_pixel_v1', mother: 'pat_c4_mother_child_pixel_v1', aunt: 'pat_c4_wu_v3', knee: 'pat_c4_chen_v3',
  mystery: 'pat_c4_xu_v1', courier: '', elder: 'pat_c4_fang_v3',
  wen: 'char_wen', lei: 'char_lei', bai: 'char_bai',
}
for (const [speaker, sprite] of Object.entries(expectedPortraits)) {
  assert.equal(CH4.characters[speaker].sprite, sprite)
  if (sprite) assert(catalog[sprite], `${speaker}: ${sprite} is imported`)
}
// The male teacher portrait stays on the established logical ID; his two live voice takes use the older r9 read.
assert.equal(catalog.pat_c4_chen_v3, 'media/pat_c4_chen_v3.aea6005f443e954c.webp')
assert.equal(CH4.characters.wrist.sprite, 'ch2_patient_wrist_student')
assert.equal(CH4.characters.mystery.sprite, 'pat_c4_xu_v1')
const activePatientSpeakers = ['wrist', 'anxious', 'worker', 'child', 'aunt', 'knee', 'mystery']
for (const speaker of [...activePatientSpeakers, 'mother']) {
  const sprite = CH4.characters[speaker].sprite
  assert(sprite, `${speaker}: every active patient and the child's mother has a portrait`)
  assert(catalog[sprite], `${speaker}: portrait is registered`)
  assert(CH4.assets.includes(sprite), `${speaker}: portrait is preloaded`)
  for (const [id, step] of Object.entries(s)) if (step.speaker === speaker && !step.communication)
    assert.equal(step.sprite, sprite, `${id}: physical dialogue uses the configured portrait`)
}
for (const id of ['c4_4_head_0', 'c4_4_head_1', 'c4_4_head_3', 'c4_4_head_4', 'c4_4_head_result_3', 'c4_4_head_result_5'])
  assert.equal(s[id].sprite, 'pat_c4_mother_child_pixel_v1', `${id}: mother and child share one held-together pixel portrait`)
assert.equal(s.c4_4_head_0.closeup, undefined, 'The opening has no cinematic illustration')
assert.equal(s.c4_4_head_0.image, '', 'The opening uses only the combined portrait')
assert.equal(s.c4_4_head_0.sprite, 'pat_c4_mother_child_pixel_v1')
assert.match(text('c4_4_head_0'), /妈妈抱着她/)
for (const [id, step] of Object.entries(s)) {
  assert.notEqual(step.sprite, 'pat_c4_child_v1', `${id}: no separate child portrait`)
  assert.notEqual(step.sprite, 'pat_kidmom', `${id}: no separate mother portrait`)
  assert.notEqual(step.image, 'cg_c4_mother_child_v1', `${id}: no separately posed mother-child CG`)
}
assert(!CH4.assets.includes('pat_c4_child_v1'))
assert(!CH4.assets.includes('pat_kidmom'))
assert(!CH4.assets.includes('cg_c4_mother_child_v1'))
assert.deepEqual(Object.entries(s).filter(([, step]) => step.speaker === 'bai').map(([id]) => id),
  ['c4_3_bai_0', 'c4_3_install_5'], 'Lao Bai has only one SMS arrival and one post-install visit')
assert.deepEqual(Object.entries(s).filter(([, step]) => /A17/.test(`${step.text} ${step.imageLabel ?? ''}`)).map(([id]) => id),
  ['c4_1_rf_0', 'c4_3_bai_0'], 'A17 is discovered once and quoted once, without repeated explanations')
assert.doesNotMatch(text('c4_epilogue_0'), /配件|报价|A17|老白/)

const playerLines = Object.values(s).flatMap(step => [
  step.text, step.imageLabel ?? '', step.scan?.label ?? '', ...(step.choices ?? []).map(choice => choice.text),
]).filter(Boolean)
for (const label of Object.values(s).map(step => step.imageLabel).filter(Boolean)) {
  assert.doesNotMatch(label, /真实病例参考|非.+本人|不是.+影像|未涂改|本作后加|叙事插图/)
}
for (const line of playerLines) {
  assert.doesNotMatch(line, /郭阳|刘师傅|陈老师|老杜|孟女士|方伯|吴阿姨|孙阿姨|秦老师|林阿姨|严阿姨/)
  assert.doesNotMatch(line, /一个月|第四周|无患者带教|检查床固定|扫描床固定|检查床保持固定|拍餐椅|练屏气|训练憋气/)
  assert.doesNotMatch(line, /不再只抄数字|看对比，不背|隐藏线索.*已收入证据夹/)
  assert.doesNotMatch(line, /^送货师傅/)
}
assert.match(text('c4_1_case_5'), /是\*\*三角纤维软骨复合体（TFCC）\*\*：\*\*一组位于手腕小指侧的软骨和韧带，帮助稳定腕关节、缓冲受力。\*\*/)
assert.match(text('c4_1_case_result_2'), /\*\*TFCC外周信号不连续\*\*/)
const highlighted = Object.values(s).filter(step => step.text.includes('**'))
for (const step of highlighted) assert.equal((step.text.match(/\*\*/g) ?? []).length % 2, 0, step.text)
const voices = Object.values(s).map(step => trilogyVoice(CH4, step)).filter(Boolean)
const expectedVoices = ['vox_c4_aunt_r8', 'vox_c4_feng_r7', 'vox_c4_knee_r9', 'vox_c4_knee_wait_r9', 'vox_c4_worker_r7', 'vox_c4_wrist_r7', 'vox_c4_xu_r7', 'vox_c4_xuning_v3']
assert.deepEqual([...new Set(voices)].sort(), expectedVoices)
assert.deepEqual(trilogyVoiceAssets(CH4).sort(), expectedVoices)
const firstPatientVoice = {
  wrist: 'vox_c4_wrist_r7', anxious: 'vox_c4_feng_r7', worker: 'vox_c4_worker_r7',
  aunt: 'vox_c4_aunt_r8', knee: 'vox_c4_knee_wait_r9', mystery: 'vox_c4_xu_r7',
}
for (const [speaker, voice] of Object.entries(firstPatientVoice)) {
  const [id, firstSpoken] = Object.entries(s).find(([, step]) => step.speaker === speaker) ?? []
  assert(firstSpoken, `${speaker}: patient has a spoken entrance`)
  assert.equal(firstSpoken.voice, voice, `${id}: first spoken entrance carries the matching short voice`)
  if (firstSpoken.communication) {
    assert(firstSpoken.phone, `${id}: remote entrance uses the character's phone portrait`)
    assert.equal(firstSpoken.sprite, '', `${id}: remote speaker is not physically teleported into the room`)
  } else {
    assert.equal(firstSpoken.sprite, CH4.characters[speaker].sprite, `${id}: physical entrance uses the patient's real portrait`)
    assert(catalog[firstSpoken.sprite], `${id}: patient portrait exists`)
  }
}
for (const voice of new Set(voices)) {
  const audioUrl = new URL(`../public/audio/${voice}.mp3`, import.meta.url)
  await access(audioUrl)
  const measured = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', fileURLToPath(audioUrl),
    '-af', 'loudnorm=I=-20:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
  assert.equal(measured.status, 0, `${voice}: final MP3 decodes and can be measured`)
  const json = measured.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/)
  assert(json, `${voice}: loudnorm measurement exists`)
  const loudness = JSON.parse(json[0])
  assert(Number(loudness.input_i) >= -22 && Number(loudness.input_i) <= -18,
    `${voice}: integrated loudness ${loudness.input_i} LUFS stays near -20`)
  assert(Number(loudness.input_tp) <= -1.5, `${voice}: true peak ${loudness.input_tp} dBTP has headroom`)
}

// Fifth-generation and older saves reopen only CH4. Historical collections, other DLC,
// certificates and flags survive; chapter-local scans, quiz and temporary book receipts reset.
const certificate = { name: '旧玩家', studentId: 'OLD', grade: 'A', code: 'OLD-CERT', gold: 100, badgeCount: 2 }
const otherCh2 = { done: true, certificate: { marker: 'preserve-ch2' } }
const otherLdct = { done: true, marker: 'preserve-ldct' }
const old = {
  gender: 'f', night: 5, gold: 500, skill: 3, heart: 4, wealth: 2, durability: 80,
  badges: ['c4_survivor', 'c4r_research_honest'], stamps: [1, 2, 3, 4, 5],
  flags: { mystery_told: true, old_story_flag: true, c4_old_contract: true, c4_book_page_3: true, c4_book_8: true },
  lastCheckin: '', streak: 0, finished: true, seed: 42, items: [], ap: 1, buyCount: 0,
  cards: ['c4_signal'], events: [], playerName: '旧玩家', playerId: 'OLD',
  dlc: { ch2: otherCh2, ldct: otherLdct, ch4: { chapter: { version: 1, storyRevision: 5, runId: 'ch4-rewrite5-old', shift: 4, stepId: 'c4_1_open_0', phase: 'story',
    applied: ['c4_1_open_0'], visited: ['c4_1_open_0'], tools: { old: {} }, scans: { old: {} }, snapshots: {}, gifts: [],
    shop: { shift: 4, lotteryCount: 0, buyCount: 0 }, certificate } } },
}
const migrated = initializeTrilogy(old, CH4)
const mp = trilogyProgress(migrated, 'ch4')
assert.equal(mp.storyRevision, 7)
assert.equal(mp.choiceRewardRevision, 1)
assert.equal(mp.runId, 'ch4-rewrite7-42')
assert.equal(mp.shift, 0)
assert.equal(mp.stepId, 'c4_pro_0')
assert.deepEqual(mp.tools, {})
assert.deepEqual(mp.scans, {})
assert.equal(mp.quiz, undefined)
assert.equal(mp.done, false)
assert.deepEqual(mp.certificate, certificate)
assert.equal(migrated.flags.c4_rewrite_migrated, true)
assert.equal(migrated.flags.c4_rewrite7_migrated, true)
assert.equal(migrated.flags.mystery_told, true)
assert.equal(migrated.flags.old_story_flag, true)
assert.equal(migrated.flags.c4_old_contract, true)
assert.equal(migrated.flags.c4_book_page_3, undefined)
assert.equal(migrated.flags.c4_book_8, undefined)
assert.deepEqual(migrated.badges, old.badges)
assert.deepEqual(migrated.cards, old.cards)
assert.deepEqual(migrated.dlc.ch2, otherCh2)
assert.deepEqual(migrated.dlc.ldct, otherLdct)
assert.equal(initializeTrilogy(migrated, CH4), migrated)
const deletedCursor = { ...migrated, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4, chapter: { ...mp, stepId: 'c4_2_report_q' } } } }
const recovered = initializeTrilogy(deletedCursor, CH4)
assert.equal(trilogyProgress(recovered, 'ch4').stepId, 'c4_pro_0')
assert.equal(trilogyProgress(recovered, 'ch4').storyRevision, 7)
const fresh = initializeTrilogy({ ...old, dlc: { ch2: otherCh2 } }, CH4)
assert.equal(trilogyProgress(fresh, 'ch4').storyRevision, 7)
assert.equal(trilogyProgress(fresh, 'ch4').runId, 'ch4-rewrite7-42')

// Author-approved family payoff and optional archive routes. These are state
// transitions, not fixed prose totals: skipping a side story must remain safe.
const payoffFixture = (node, flags = {}) => {
  const state = structuredClone(fresh)
  state.flags = { ...state.flags, ...flags }
  Object.assign(state.dlc.ch4.chapter, { stepId: node, phase: node.startsWith('c4_epilogue') ? 'epilogue' : 'story',
    shift: node.startsWith('c4_epilogue') ? 5 : 0, applied: [], visited: [] })
  return enterTrilogyNode(state, CH4, node)
}
const continueTo = (initial, target) => {
  let state = initial
  for (let guard = 0; guard < 40; guard++) {
    const id = trilogyProgress(state, 'ch4').stepId
    if (id === target) return state
    assert(!trilogyStep(state, CH4).choices?.length, `${id}: expected a direct continuation`)
    const next = trilogyAdvance(state, CH4, id)
    assert.notEqual(trilogyProgress(next, 'ch4').stepId, id, `${id}: a continuation must advance`)
    state = next
  }
  assert.fail(`Did not reach ${target}`)
}
assert.equal(s.c4_city_arrival.next, 'c4_cousin_report_0')
assert.equal(s.c4_cousin_report_3.next, 'c4_1_open_0')
assert.match(text('c4_cousin_report_1'), /轻度侧脑室增宽.*没有发现其他脑部结构异常.*复查也稳定/)
assert.match(text('c4_cousin_report_2'), /喂完奶.*不让全家睡觉/)
for (const experienced of [false, true]) {
  const initial = payoffFixture('c4_cousin_report_0', experienced ? { c3_cousin_mri_pending: true } : {})
  const line = trilogyStep(initial, CH4).text
  if (experienced) assert.match(line, /去年陪表姐等报告.*外套/)
  else { assert.match(line, /去年表姐产检.*补做的MRI/); assert.doesNotMatch(line, /陪表姐等报告|还记得/) }
  const finished = continueTo(initial, 'c4_1_open_0')
  assert.equal(finished.flags.c4_cousin_mri_resolved, true)
  assert.deepEqual(attributeStatsForMigration(finished), attributeStatsForMigration(initial))
  assert.equal(finished.ap, initial.ap)
  assert.deepEqual(finished.badges, initial.badges)
}
for (const id of ['c4_cousin_report_2', 'c4_cousin_report_3', 'c4_1_family_1', 'c4_1_family_2', 'c4_epilogue_baby_1', 'c4_epilogue_baby_2']) {
  assert.equal(ch4ContactName(CH4, id, s[id]), '表姐', `${id}: replies do not change the remote contact`)
  assert.equal(s[id].phone, 'pat_cousin')
  assert.equal(s[id].sprite, s[id].speaker === 'me' ? 'me' : '', `${id}: no pregnant full-body sprite in the current scene`)
  assert.equal(s[id].voice, undefined, `${id}: no new or reused character voice`)
}
for (const prefix of ['c4_cousin_report_', 'c4_1_family_', 'c4_epilogue_baby_']) {
  assert.equal(Object.keys(TRILOGY_COMMUNICATION_CUES).filter(id => id.startsWith(prefix)).length, 1,
    `${prefix}: one arrival sound per conversation`)
}
for (const node of ['c4_5_receipt_offer', 'c4_epilogue_3']) {
  assert.equal(s[node].choices.length, 2)
  assert.equal(s[node].shuffleChoices, false)
  for (const choice of s[node].choices) assert.equal(choice.effect, undefined, `${node}: choosing to look or leave costs no AP`)
}
{
  const before = payoffFixture('c4_5_receipt_offer')
  const skip = trilogyChoose(before, CH4, 'c4_5_receipt_offer', s.c4_5_receipt_offer.choices[1])
  assert.equal(trilogyProgress(skip, 'ch4').stepId, 'c4_5_close_0')
  assert.equal(skip.flags.c4_xu_receipt, undefined)
  assert.equal(skip.ap, before.ap)
  assert.deepEqual(attributeStatsForMigration(skip), attributeStatsForMigration(before))
  let looked = trilogyChoose(before, CH4, 'c4_5_receipt_offer', s.c4_5_receipt_offer.choices[0])
  const choice = trilogyStep(looked, CH4).choices.find(option => option.effect?.skill === 1)
  looked = trilogyChoose(looked, CH4, 'c4_5_receipt_q', choice)
  assert.equal(looked.flags.c4_xu_receipt, true)
  assert.equal(looked.skill, before.skill + 1)
  assert.equal(looked.ap, before.ap)
  const persisted = initializeTrilogy(structuredClone(looked), CH4)
  assert.equal(trilogyChoose(persisted, CH4, 'c4_5_receipt_q', choice), persisted, 'Repeated receipt submit after refresh does not pay twice')
  assert.equal(continueTo(persisted, 'c4_5_close_0').skill, before.skill + 1)
}
for (const look of [false, true]) {
  const before = payoffFixture('c4_epilogue_3')
  let continued = trilogyChoose(before, CH4, 'c4_epilogue_3', s.c4_epilogue_3.choices[look ? 0 : 1])
  continued = continueTo(continued, 'c4_epilogue_baby_0')
  assert.equal(!!continued.flags.c4_father_transfer, look, 'Only the archive visitor acquires the transfer lead')
  assert.equal(continued.badges.includes('c4r_formal_record'), look)
  assert.equal(continued.cards.includes('c4_records'), look)
  assert.equal(continued.ap, before.ap)
  assert.deepEqual(attributeStatsForMigration(continued), attributeStatsForMigration(before))
  const resumed = initializeTrilogy(structuredClone(continued), CH4)
  assert.equal(trilogyProgress(resumed, 'ch4').stepId, 'c4_epilogue_baby_0')
  assert.match(trilogyStep(resumed, CH4).text, /胎儿MRI.*没有发现其他脑部结构异常.*复查也稳定/,
    'Mid-chapter old saves still receive the missed family conclusion at the ending')
  const ending = continueTo(resumed, 'c4_epilogue_end')
  assert.equal(ending.flags.c4_cousin_baby_update, true)
  assert(!Object.keys(ending.flags).some(flag => /^c4_nuclear_training_/.test(flag)))
  assert.deepEqual(attributeStatsForMigration(ending), attributeStatsForMigration(before))
  const done = trilogyAdvance(ending, CH4, 'c4_epilogue_end')
  assert.equal(trilogyProgress(done, 'ch4').phase, 'done')
  assert.equal(trilogyAdvance(done, CH4, 'c4_epilogue_end'), done)
  if (look) {
    const again = enterTrilogyNode(done, CH4, 'c4_epilogue_8')
    assert.deepEqual(again.badges, done.badges)
    assert.deepEqual(again.cards, done.cards)
  }
}
assert.doesNotMatch(trilogyStep(payoffFixture('c4_epilogue_baby_0', { c4_cousin_mri_resolved: true }), CH4).text,
  /没有发现其他脑部结构异常/, 'A player who heard the report gets a short callback, not the full explanation again')
for (const [prefix, start, last, next] of [['c4_wrap_research_', 2, 6, 'c4_wrap_exam_0'], ['c4_epilogue_', 9, 17, 'c4_epilogue_baby_0']]) {
  for (let index = start; index <= last; index++) {
    const id = `${prefix}${index}`
    const before = payoffFixture(id, { c4_nuclear_training_ready: true, c4_father_transfer: true })
    const resumed = initializeTrilogy(structuredClone(before), CH4)
    assert.equal(trilogyProgress(resumed, 'ch4').storyRevision, 7)
    assert.equal(trilogyProgress(resumed, 'ch4').stepId, id, `${id}: old cursor is not restarted`)
    assert.equal(s[id].effect, undefined)
    assert.equal(s[id].card, undefined)
    assert.equal(s[id].communication, undefined)
    const advanced = trilogyAdvance(resumed, CH4, id)
    assert.equal(trilogyProgress(advanced, 'ch4').stepId, next)
    assert.equal(advanced.flags.c4_nuclear_training_ready, true, 'Old PET history is retained, not rewritten')
    assert.equal(advanced.flags.c4_father_transfer, true)
    assert.deepEqual(attributeStatsForMigration(advanced), attributeStatsForMigration(before))
    assert.deepEqual(advanced.badges, before.badges)
    assert.deepEqual(advanced.cards, before.cards)
  }
}

// Story answers use a deterministic per-save Fisher-Yates order. Refresh is stable;
// across seeds, each unique rewarded answer visits all three displayed positions.
for (const [id, raw] of storyDecisions) {
  const rewarded = raw.choices.find(choice => attributeKeys.some(key => (choice.effect?.[key] ?? 0) > 0))
  const originalOrder = raw.choices.map(choice => choice.text)
  const positions = new Set()
  for (let seed = 1; seed <= 64; seed++) {
    const base = trilogyProgress(fresh, 'ch4')
    const fixture = { ...fresh, seed, dlc: { ...fresh.dlc, ch4: { ...fresh.dlc.ch4,
      chapter: { ...base, runId: `choice-order-${seed}`, stepId: id, phase: 'story' } } } }
    const displayed = trilogyStep(fixture, CH4)
    assert.deepEqual(trilogyStep(fixture, CH4), displayed, `${id}: same save and seed never reroll on refresh`)
    assert.equal(displayed.choices.length, 3)
    positions.add(displayed.choices.findIndex(choice => choice.text === rewarded.text))
  }
  assert.deepEqual([...positions].sort(), [0, 1, 2], `${id}: rewarded answer position varies across saves`)
  assert.deepEqual(raw.choices.map(choice => choice.text), originalOrder, `${id}: runtime shuffle never mutates authored data`)
}

// A seventh-revision save already settled on the old c4_6_end resumes at the
// added closing scene. Salary, badges and stats do not replay; refresh is stable.
{
  const current = trilogyProgress(migrated, 'ch4')
  const oldSettlement = { ...migrated, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4,
    chapter: { ...current, shift: 5, stepId: 'c4_6_end', phase: 'settle', applied: [...current.applied, 'c4_6_end'] } } } }
  const resumed = initializeTrilogy(oldSettlement, CH4)
  const rp = trilogyProgress(resumed, 'ch4')
  assert.equal(rp.phase, 'story')
  assert.equal(rp.stepId, 'c4_wrap_0')
  assert.equal(rp.applied.filter(id => id === 'c4_6_end').length, 1)
  assert.deepEqual(attributeStatsForMigration(resumed), attributeStatsForMigration(oldSettlement))
  assert.deepEqual(resumed.badges, oldSettlement.badges)
  assert.equal(initializeTrilogy(resumed, CH4), resumed, 'Closing-scene migration is refresh-idempotent')
}

// Feng migration separates the retired standalone lesson, the former three-basic
// conversation, mid-decision saves and already completed later history.
for (const stepId of ['c4_1_contrast_0', 'c4_1_contrast_1', 'c4_1_contrast_2']) {
  const current = trilogyProgress(migrated, 'ch4')
  const legacyContrast = { ...migrated, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4,
    chapter: { ...current, stepId, phase: 'story', scans: { c4_city_wrist_scan: { startedAt: 1000, ended: true, completed: true } } } } } }
  const relocated = initializeTrilogy(legacyContrast, CH4)
  const rp = trilogyProgress(relocated, 'ch4')
  assert.equal(rp.stepId, 'c4_1_feng_0')
  assert.equal(rp.storyRevision, 7)
  assert.equal(rp.runId, current.runId)
  assert.deepEqual(rp.scans, trilogyProgress(legacyContrast, 'ch4').scans)
  assert.deepEqual(attributeStatsForMigration(relocated), attributeStatsForMigration(legacyContrast))
  assert.equal(initializeTrilogy(relocated, CH4), relocated, 'Contrast-cursor migration is refresh-idempotent')
}
for (const stepId of ['c4_1_contrast_0', 'c4_1_contrast_1', 'c4_1_contrast_2']) {
  const current = trilogyProgress(migrated, 'ch4')
  const oldBasicContrast = { ...migrated, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4,
    chapter: { ...current, stepId, phase: 'story', scans: {
      c4_feng_basic_scan: { startedAt: 1500, ended: true, completed: true },
    } } } } }
  const moved = initializeTrilogy(oldBasicContrast, CH4), rp = trilogyProgress(moved, 'ch4')
  assert.equal(rp.stepId, 'c4_1_feng_stop_0', `${stepId}: former basic completion moves to the new immediate-stop decision`)
  assert.deepEqual(rp.scans.c4_feng_basic_scan, { startedAt: 1500, ended: true, completed: false, interrupted: true })
  assert.equal(rp.scans.c4_feng_city_scan, undefined)
  assert.deepEqual(attributeStatsForMigration(moved), attributeStatsForMigration(oldBasicContrast))
  assert.equal(initializeTrilogy(moved, CH4), moved)
}
function attributeStatsForMigration(state) {
  return { gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth }
}
for (const stepId of ['c4_1_contrast_0', 'c4_1_contrast_3', 'c4_1_contrast_4', 'c4_1_contrast_10']) {
  const current = trilogyProgress(migrated, 'ch4')
  const newContrast = { ...migrated, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4,
    chapter: { ...current, stepId, phase: 'story', scans: {
      c4_feng_basic_scan: { startedAt: 1500, ended: true, completed: false, interrupted: true },
      c4_feng_city_scan: { startedAt: 2000, ended: true, completed: true },
    } } } } }
  assert.equal(initializeTrilogy(newContrast, CH4), newContrast,
    `${stepId}: new immediate-stop plus four-sequence completion proves the current contrast cursor`)
}
{
  const current = trilogyProgress(migrated, 'ch4')
  const oldCityCursor = { ...migrated, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4,
    chapter: { ...current, stepId: 'c4_feng_city_scan', phase: 'story', scans: {
      c4_feng_basic_scan: { startedAt: 1500, ended: true, completed: true },
      c4_feng_city_scan: { startedAt: 2000, ended: true, completed: false, interrupted: true },
    } } } } }
  const moved = initializeTrilogy(oldCityCursor, CH4), rp = trilogyProgress(moved, 'ch4')
  assert.equal(rp.stepId, 'c4_1_feng_stop_0')
  assert.equal(rp.scans.c4_feng_basic_scan.interrupted, true)
  assert.equal(rp.scans.c4_feng_city_scan, undefined)
  assert.equal(initializeTrilogy(moved, CH4), moved)
}
for (const stepId of ['c4_1_feng_refund_1', 'c4_1_feng_sit_1', 'c4_1_feng_route_1']) {
  const current = trilogyProgress(migrated, 'ch4')
  const decision = { ...migrated, heart: 9, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4,
    chapter: { ...current, stepId, phase: 'story', scans: {
      c4_feng_basic_scan: { startedAt: 1500, ended: true, completed: true },
      c4_feng_city_scan: { startedAt: 2000, ended: true, completed: false, interrupted: true },
    } } } } }
  const moved = initializeTrilogy(decision, CH4), rp = trilogyProgress(moved, 'ch4')
  assert.equal(rp.stepId, stepId, `${stepId}: earned decision reward and cursor are not replayed`)
  assert.equal(moved.heart, 9)
  assert.equal(rp.scans.c4_feng_basic_scan.interrupted, true)
  assert.equal(rp.scans.c4_feng_city_scan, undefined)
  assert.equal(initializeTrilogy(moved, CH4), moved)
}
{
  const current = trilogyProgress(migrated, 'ch4')
  const later = { ...migrated, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4,
    chapter: { ...current, stepId: 'c4_1_close_0', phase: 'story', scans: {
      c4_feng_basic_scan: { startedAt: 1500, ended: true, completed: true },
      c4_feng_city_scan: { startedAt: 2000, ended: true, completed: false, interrupted: true },
    } } } } }
  const moved = initializeTrilogy(later, CH4), rp = trilogyProgress(moved, 'ch4')
  assert.equal(rp.stepId, 'c4_1_close_0', 'Later history does not replay the rewritten case')
  assert.deepEqual(rp.scans.c4_feng_basic_scan, { startedAt: 1500, ended: true, completed: false, interrupted: true })
  assert.deepEqual(rp.scans.c4_feng_city_scan, { startedAt: 2000, ended: true, completed: true })
  assert.equal(initializeTrilogy(moved, CH4), moved)
}
for (const stepId of ['c4_feng_city_scan', 'c4_1_feng_stop_0', 'c4_1_close_0']) {
  const current = trilogyProgress(migrated, 'ch4')
  const later = { ...migrated, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4,
    chapter: { ...current, stepId, phase: 'story', scans: {
      c4_feng_basic_scan: { startedAt: 1500, ended: true, completed: false, interrupted: true },
      c4_feng_city_scan: { startedAt: 2000, ended: true, completed: true },
    } } } } }
  assert.equal(initializeTrilogy(later, CH4), later, `${stepId}: current wide-bore progress stays exactly in place`)
}

// A direct hub event costs AP once. Finds, activities and pagination add no attributes.
const attributeStats = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth })
const findPlaceEvent = target => {
  for (const [hubId, placeId, place] of placeEntries) {
    const choice = place.choices.find(option => option.next === target)
    if (choice) return { hubId, placeId, choice }
  }
  throw new Error(`Missing direct event: ${target}`)
}
for (const [target, flag] of [
  ['c4_1_route_0', 'c4r6_1_route'],
  ['c4_1_family_0', 'c4r6_1_family'],
]) {
  const { hubId, placeId, choice } = findPlaceEvent(target)
  const atPlace = enterTrilogyNode(migrated, CH4, hubId)
  const before = attributeStats(atPlace)
  let played = trilogyChoose(atPlace, CH4, placeId, choice)
  assert.deepEqual(attributeStats(played), before, `${target}: direct exploration grants no attributes`)
  assert.equal(trilogyProgress(played, 'ch4').stepId, target, `${target}: hub enters the event without a place menu`)
  assert.equal(played.ap, atPlace.ap - 1)
  let guard = 0
  while (trilogyProgress(played, 'ch4').stepId !== hubId && guard++ < 10) {
    const id = trilogyProgress(played, 'ch4').stepId
    const beforePage = attributeStats(played)
    played = trilogyAdvance(played, CH4, id)
    assert.deepEqual(attributeStats(played), beforePage, `${id}: reading the exploration adds no numeric reward`)
  }
  assert.equal(played.flags[flag], true)
  assert.equal(trilogyChoose(played, CH4, hubId, choice), played, `${target}: completed reward cannot be farmed`)
}

for (const { hubId, placeId, choice } of hiddenChoices) {
  const atPlace = enterTrilogyNode(migrated, CH4, hubId)
  const before = attributeStats(atPlace)
  const found = trilogyChoose(atPlace, CH4, placeId, choice)
  assert.equal(trilogyProgress(found, 'ch4').stepId, choice.next)
  assert.equal(found.flags[choice.cond.notFlag], true)
  assert.deepEqual(attributeStats(found), before, `${choice.next}: hidden find grants no attributes`)
  assert.equal(found.ap, atPlace.ap, `${choice.next}: hidden find costs no AP`)
  const returned = trilogyAdvance(found, CH4, choice.next)
  assert.equal(trilogyProgress(returned, 'ch4').stepId, hubId)
  assert.equal(trilogyChoose(returned, CH4, placeId, choice), returned, `${choice.next}: collected find cannot be claimed twice`)
}

// A save already inside a retired direct-reward exploration keeps its cursor and
// existing stats. Loading, completed events and current saves never add attributes.
const legacyMid = { ...migrated, heart: 4, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4,
  chapter: { ...trilogyProgress(migrated, 'ch4'), stepId: 'c4_1_family_1', choiceRewardRevision: undefined } } } }
const compensated = initializeTrilogy(legacyMid, CH4)
assert.equal(compensated.heart, 4)
assert.equal(compensated.skill, legacyMid.skill)
assert.equal(trilogyProgress(compensated, 'ch4').stepId, 'c4_1_family_1')
assert.equal(trilogyProgress(compensated, 'ch4').choiceRewardRevision, 1)
assert.equal(initializeTrilogy(compensated, CH4), compensated, 'Refresh cannot repeat the legacy compensation')
const legacyCompleted = { ...legacyMid, heart: 5, flags: { ...legacyMid.flags, c4r6_1_family: true } }
const completedMigration = initializeTrilogy(legacyCompleted, CH4)
assert.equal(completedMigration.heart, 5)
assert.equal(trilogyProgress(completedMigration, 'ch4').choiceRewardRevision, 1)
const currentMid = { ...legacyMid, dlc: { ...legacyMid.dlc, ch4: { ...legacyMid.dlc.ch4,
  chapter: { ...legacyMid.dlc.ch4.chapter, choiceRewardRevision: 1 } } } }
assert.equal(initializeTrilogy(currentMid, CH4), currentMid, 'Current in-flight saves receive no load-time reward')

// Two pages unlock per schedule. Reading keeps one receipt per schedule but never adds attributes.
const bookStart = migrated
assert.equal(trilogyBookUnlocked(CH4, 0), 2)
assert.equal(trilogyReadBook(bookStart, CH4), bookStart, 'Opening CH4 notes alone grants nothing')
assert.equal(trilogyReadBook(bookStart, CH4, 2), bookStart, 'A locked third page cannot pay early')
assert.equal(trilogyReadBook(bookStart, CH4, -1), bookStart, 'Invalid page indices are ignored')
assert.equal(trilogyReadBook(bookStart, CH4, 1.5), bookStart, 'Fractional page indices are ignored')
assert.equal(trilogyBookPageRead(bookStart, CH4, 0), false)
const readLatest = trilogyReadBook(bookStart, CH4, 1)
assert.equal(readLatest.skill, bookStart.skill)
assert.equal(readLatest.flags.c4_book_shift_0, true)
assert.equal(readLatest.flags.c4_book_page_1, undefined)
assert.equal(trilogyBookPageRead(readLatest, CH4, 1), true)
assert.equal(trilogyBookPageRead(readLatest, CH4, 0), true, 'One receipt covers every valid page in this schedule')
assert.equal(trilogyReadBook(readLatest, CH4, 1), readLatest, 'Repeated page, close and reopen cannot repay')
assert.equal(trilogyReadBook(readLatest, CH4, 0), readLatest, 'Turning to another page cannot repay')
assert.equal(initializeTrilogy(readLatest, CH4), readLatest, 'Refresh preserves the schedule receipt without repaying')
const secondSchedule = { ...readLatest, dlc: { ...readLatest.dlc, ch4: { ...readLatest.dlc.ch4,
  chapter: { ...trilogyProgress(readLatest, 'ch4'), shift: 1 } } } }
assert.equal(trilogyBookUnlocked(CH4, 1), 4)
assert.equal(trilogyBookPageRead(secondSchedule, CH4, 2), false)
const readSecondSchedule = trilogyReadBook(secondSchedule, CH4, 2)
assert.equal(readSecondSchedule.skill, secondSchedule.skill, 'A later schedule records reading without a direct reward')
assert.equal(readSecondSchedule.flags.c4_book_shift_1, true)
assert.equal(trilogyReadBook(readSecondSchedule, CH4, 3), readSecondSchedule)
assert.equal(trilogyReadBook(readSecondSchedule, CH4, 4), readSecondSchedule, 'A locked page in the new schedule cannot pay')
assert.match(screenSource, /onPageChange=\{page =>/)
assert.match(screenSource, /trilogyReadBook\(s, chapter, page\)/)
assert.doesNotMatch(screenSource, /data-ch4-book-reward|本日程首次阅读：医术\+1/)

// Shop purchases and gift sharing retain their item/economy effects without adding attributes.
for (const [item, price] of [['milktea', 200], ['book', 100]]) {
  const before = { ...bookStart, items: [] }
  const bought = trilogyBuy(before, CH4, item)
  assert(bought.items.includes(item))
  assert.equal(bought.gold, before.gold - price)
  for (const key of attributeKeys) assert.equal(bought[key], before[key], `${item}: purchase grants no ${key}`)
}
const giftAt = enterTrilogyNode({ ...bookStart, items: ['snack'] }, CH4, 'c4_1_route_0')
const giftBefore = attributeStats(giftAt)
const giftPlayed = trilogyGive(giftAt, CH4, 'c4_1_route_0', 'snack')
assert.equal(giftPlayed.items.includes('snack'), false)
assert.deepEqual(attributeStats(giftPlayed), giftBefore, 'CH4 snack sharing consumes the item without adding attributes')

// The final assessment tests only MRI physics and imaging fundamentals.
assert.equal(CH4.quiz.length, 8)
const quizPlotTerms = /冯叔|许建平|小唐|老周|沈岚|院长|眼镜|教练|妈妈|阿姨|拄拐|采购|退费|事故征候|收据|排班/
const quizTopics = [/90°射频脉冲/, /180°重聚脉冲/, /T1弛豫与T2弛豫/, /TR／TE.*T1加权/, /金属或磁敏感伪影.*SE与GRE/, /梯度系统/, /接收带宽/, /扩散受限/]
CH4.quiz.forEach((question, index) => {
  assert.match(question.q, quizTopics[index])
  assert.equal(question.options.length, 3)
  assert.equal(new Set(question.options).size, 3)
  assert(question.answer >= 0 && question.answer < 3)
  assert.doesNotMatch([question.q, ...question.options, question.explain].join(' '), quizPlotTerms)
})

// A zero-score CH4 assessment receives zero skill, not a participation point.
let zeroQuiz = startTrilogyQuiz(bookStart, CH4)
const beforeZeroQuiz = attributeStats(zeroQuiz)
for (let index = 0; index < 5; index++) {
  const progress = trilogyProgress(zeroQuiz, 'ch4')
  const row = progress.quiz.questions[progress.quiz.index]
  const question = CH4.quiz[row.question]
  const wrong = (question.answer + 1) % question.options.length
  zeroQuiz = answerTrilogyQuiz(zeroQuiz, CH4, wrong)
  zeroQuiz = nextTrilogyQuiz(zeroQuiz, CH4)
}
assert.equal(trilogyProgress(zeroQuiz, 'ch4').quiz.completed, true)
assert.equal(trilogyProgress(zeroQuiz, 'ch4').quiz.grade, 'C')
assert.deepEqual(attributeStats(zeroQuiz), beforeZeroQuiz, 'All five answers wrong means no attribute or score-based gold reward')

// Scan receipts use the saved wall clock. A stopped distress interaction ends, but never counts as completed.
const scanFixture = node => {
  const progress = trilogyProgress(migrated, 'ch4')
  const state = { ...migrated, dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4,
    chapter: { ...progress, stepId: node, phase: 'story', scans: {}, applied: [], visited: [] } } } }
  return enterTrilogyNode(state, CH4, node)
}
const normalStarted = beginTrilogyScan(scanFixture('c4_city_wrist_scan'), CH4, 'c4_city_wrist_scan', 100000)
assert.equal(trilogyProgress(normalStarted, 'ch4').scans.c4_city_wrist_scan.startedAt, 100000)
assert.equal(beginTrilogyScan(normalStarted, CH4, 'c4_city_wrist_scan', 101000), normalStarted,
  'Beginning the same scan twice cannot reset its saved clock')
assert.equal(initializeTrilogy(normalStarted, CH4), normalStarted, 'Refresh preserves the in-progress scan receipt')
assert.equal(completeTrilogyScan(normalStarted, CH4, 'c4_city_wrist_scan', 102999), normalStarted,
  'A normal 3000ms scan cannot complete early')
const normalDone = completeTrilogyScan(normalStarted, CH4, 'c4_city_wrist_scan', 103000)
assert.deepEqual(trilogyProgress(normalDone, 'ch4').scans.c4_city_wrist_scan,
  { startedAt: 100000, ended: true, completed: true })
assert.equal(trilogyProgress(normalDone, 'ch4').stepId, 'c4_1_case_result_0')
assert.equal(completeTrilogyScan(normalDone, CH4, 'c4_city_wrist_scan', 104000), normalDone,
  'A completed scan cannot advance twice')

const basicStarted = beginTrilogyScan(scanFixture('c4_feng_basic_scan'), CH4, 'c4_feng_basic_scan', 150000)
assert.equal(completeTrilogyScan(basicStarted, CH4, 'c4_feng_basic_scan', 153249), basicStarted,
  'Feng remains in the stopping interaction for the full 3000ms after his 250ms call')
const basicDone = completeTrilogyScan(basicStarted, CH4, 'c4_feng_basic_scan', 153250)
assert.deepEqual(trilogyProgress(basicDone, 'ch4').scans.c4_feng_basic_scan,
  { startedAt: 150000, ended: true, completed: false, interrupted: true })
assert.equal(trilogyProgress(basicDone, 'ch4').stepId, 'c4_1_feng_stop_0',
  'The first 3T sequence stops immediately and never unlocks the contrast conversation')
assert.match(text('c4_1_feng_stop_1'), /第一组刚开头，后面三组还没做/)
assert.equal(completeTrilogyScan(basicDone, CH4, 'c4_feng_basic_scan', 154000), basicDone,
  'An interrupted scan cannot advance or complete twice')

const cityStarted = beginTrilogyScan(scanFixture('c4_feng_city_scan'), CH4, 'c4_feng_city_scan', 200000)
assert.equal(completeTrilogyScan(cityStarted, CH4, 'c4_feng_city_scan', 202999), cityStarted,
  'The city 0.55T T1/T2/FLAIR/DWI acquisition requires its real 3000ms')
const cityDone = completeTrilogyScan(cityStarted, CH4, 'c4_feng_city_scan', 203000)
assert.deepEqual(trilogyProgress(cityDone, 'ch4').scans.c4_feng_city_scan,
  { startedAt: 200000, ended: true, completed: true })
assert.equal(trilogyProgress(cityDone, 'ch4').stepId, 'c4_1_contrast_0',
  'All four sequences are completed before the contrast conversation')
assert.equal(completeTrilogyScan(cityDone, CH4, 'c4_feng_city_scan', 204000), cityDone,
  'A completed scan cannot advance twice')

// The refund branch preserves its story and badge, but does not directly add attributes or change gold.
const atFengFollowUp = scanFixture('c4_1_feng_q')
const refundPlayed = trilogyChoose(atFengFollowUp, CH4, 'c4_1_feng_q', refundChoice)
assert.equal(trilogyProgress(refundPlayed, 'ch4').stepId, 'c4_1_feng_refund_0')
assert.equal(refundPlayed.heart, atFengFollowUp.heart)
for (const key of ['gold', 'skill', 'wealth', 'ap']) assert.equal(refundPlayed[key], atFengFollowUp[key])
assert(refundPlayed.badges.includes('c4r_call_answered'))
let refundCursor = refundPlayed
const refundStats = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth, ap: state.ap })
for (const id of ['c4_1_feng_refund_0', 'c4_1_feng_refund_1', 'c4_1_feng_refund_2']) {
  assert.equal(trilogyProgress(refundCursor, 'ch4').stepId, id)
  const beforePage = refundStats(refundCursor)
  refundCursor = trilogyAdvance(refundCursor, CH4, id)
  assert.deepEqual(refundStats(refundCursor), beforePage, `${id}: refund dialogue grants no hidden stats`)
}
assert.equal(trilogyProgress(refundCursor, 'ch4').stepId, 'c4_1_feng_transfer_0')

// Five colleague events have deterministic, replay-stable 30% mishaps. Both outcomes
// converge on the hub, set one completion receipt and leave the free mainline intact.
const helpSpecs = [
  ['c4_1_hub', 'c4_1_help_shen_0', 'c4_1_help_shen_mishap_0', 'c4r6_1_help_shen', 'ap', -1],
  ['c4_3_hub', 'c4_3_help_fan_0', 'c4_3_help_fan_mishap_0', 'c4r6_3_help_fan', 'gold', -25],
  ['c4_4_hub', 'c4_4_help_zhou_0', 'c4_4_help_zhou_mishap_0', 'c4r6_4_help_zhou', 'ap', -1],
  ['c4_5_hub', 'c4_5_help_tang_0', 'c4_5_help_tang_mishap_0', 'c4r6_5_help_tang', 'gold', -15],
  ['c4_6_hub', 'c4_6_help_tang_0', 'c4_6_help_tang_mishap_0', 'c4r6_6_help_tang', 'gold', -30],
]
const helpFixture = (placeId, runId) => {
  const progress = trilogyProgress(migrated, 'ch4')
  const state = { ...migrated, ap: 3, flags: { ...migrated.flags }, badges: [...migrated.badges],
    dlc: { ...migrated.dlc, ch4: { ...migrated.dlc.ch4, chapter: { ...progress, runId, stepId: placeId, phase: 'story', applied: [], visited: [] } } } }
  return enterTrilogyNode(state, CH4, placeId)
}
for (const [hub, success, mishap, flag, riskKey, riskAmount] of helpSpecs) {
  const { placeId, choice } = findPlaceEvent(success)
  assert(choice && choice.risk)
  assert.equal(choice.effect.heart, undefined)
  assert.equal(choice.effect.ap, -1)
  assert.equal(choice.cond.notFlag, flag)
  assert.equal(choice.risk.next, mishap)
  assert.equal(choice.risk.chance, 0.3)
  assert.equal(choice.risk.effect[riskKey], riskAmount)
  assert.equal(choice.risk.effect.badge, 'good_intentions')
  let normal, accident
  for (let i = 0; i < 200 && (!normal || !accident); i++) {
    const before = helpFixture(placeId, `colleague-help-${i}`)
    const played = trilogyChoose(before, CH4, placeId, choice)
    const current = trilogyProgress(played, 'ch4').stepId
    if (current === success && !normal) normal = { before, played }
    if (current === mishap && !accident) accident = { before, played }
  }
  assert(normal && accident, `${placeId}: deterministic seeds cover both help outcomes`)
  for (const [kind, route] of [['success', normal], ['mishap', accident]]) {
    const { before, played } = route
    assert.equal(played.heart, before.heart, `${placeId}/${kind}: helping grants no direct attribute`)
    const expectedAp = Math.max(0, before.ap - 1 + (kind === 'mishap' && riskKey === 'ap' ? riskAmount : 0))
    const expectedGold = Math.max(0, before.gold + (kind === 'mishap' && riskKey === 'gold' ? riskAmount : 0))
    assert.equal(played.ap, expectedAp, `${placeId}/${kind}: AP consequence is exact`)
    assert.equal(played.gold, expectedGold, `${placeId}/${kind}: gold consequence is exact`)
    assert.equal(played.badges.includes('good_intentions'), kind === 'mishap')
    if (kind === 'mishap') {
      assert.match(text(mishap), /意外/)
      assert.deepEqual(trilogyChoose(before, CH4, placeId, choice), played, 'Same saved seed and cursor never reroll the mishap')
    }
    let cursor = played, guard = 0
    while (trilogyProgress(cursor, 'ch4').stepId !== hub && guard++ < 8) {
      const id = trilogyProgress(cursor, 'ch4').stepId
      const stats = attributeStats(cursor)
      cursor = trilogyAdvance(cursor, CH4, id)
      assert.deepEqual(attributeStats(cursor), stats, `${id}: outcome pagination adds no further stats`)
    }
    assert.equal(trilogyProgress(cursor, 'ch4').stepId, hub, `${placeId}/${kind}: returns to exploration`)
    assert.equal(cursor.flags[flag], true)
    assert.equal(trilogyChoose(cursor, CH4, hub, choice), cursor, `${placeId}/${kind}: completed direct help cannot be farmed`)
  }
}

console.log(JSON.stringify({ status: 'passed', contract: 'ch4-revision7-three-choices-mentor-prompts-se-physics-quiz-county-visual-v2', schedules: 6,
  nodes: Object.keys(s).length, cases: caseIds.length, hubs: hubs.length, tools: tools.length, scans: playableScans.length,
  realCaseImages: realCaseImages.length, discoveries: discoveryEvents.length, colleagueHelps: helpingEvents.length, rewardedDecisions: rewardedChoices.length,
  bookPages: CH4.book.length, explicitVoices: voices.length, migration: 'revision-7-safe' }))
