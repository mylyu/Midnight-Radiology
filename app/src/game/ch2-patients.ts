import type { Step } from './types'

/** Entrance staging only: no diagnosis, reward or graph mutation. Sick patients
 * are seen before the staff discussion; transport-bed art is cleared on scan. */
export const CH2_PATIENT_ENTRANCES = [
 {id:'fall',step:'c2n1_m0',sprite:'ch2_patient_fall_bandaged_bed',voice:null},
 {id:'stone',step:'c2n1_pain',sprite:'pat_stone',voice:'vox_guy'},
 {id:'lung',step:'c2d2_3',sprite:'pat_uncle2',voice:null},
 {id:'gut',step:'c2d2_8',sprite:'pat_gut',voice:'vox_ch2_gut'},
 {id:'waiting',step:'c2d2_q0',sprite:'ch2_patient_waiting_elder',voice:'vox_ch2_waiting'},
 {id:'postop',step:'c2d2_q1a',sprite:'ch2_patient_postop_wheelchair',voice:null},
 {id:'trauma',step:'c2d2_t0',sprite:'ch2_patient_trauma_bed',voice:null},
 {id:'wrist',step:'c2d2_11',sprite:'ch2_patient_wrist_student',voice:null},
 {id:'stroke',step:'c2n3_m2',sprite:'ch2_patient_stroke_bed',voice:null},
 {id:'chest',step:'c2n3_h0',sprite:'ch2_patient_chest_wheelchair',voice:null},
 {id:'mystery',step:'c2n3_x1',sprite:'pat_mystery',voice:'vox2_mystery'},
 {id:'aorta',step:'c2d4_2',sprite:'ch2_patient_aorta_bed',voice:null},
 {id:'denture',step:'c2d4_11a',sprite:'pat_grandpa2',voice:null},
 {id:'kid',step:'c2n5_m3',sprite:'pat_kidmom_holding',voice:'cry_child'},
] as const

// Previous generated files remain recoverable, but are not entrance sounds.
export const CH2_RETIRED_PATIENT_VOICES = ['fall','stroke','lung','postop','chest','aorta','trauma','wrist','denture'].map(id=>`vox_ch2_${id}`)

const entrances = Object.fromEntries(CH2_PATIENT_ENTRANCES.map(patient=>[patient.step,patient]))
const beforeScan: Record<string,string> = {}
function stage(sprite: string, ids: string[]) { for (const id of ids) beforeScan[id]=sprite }
stage('ch2_patient_fall_bandaged_bed',['c2n1_m1','c2n1_m2','c2n1_m3a','c2n1_m3b'])
stage('pat_stone',['c2n1_p1','c2n1_p2','c2n1_p2a','c2n1_p2b','c2n1_p2c'])
stage('pat_gut',['c2d2_9a','c2d2_9b'])
stage('ch2_patient_waiting_elder',['c2d2_q1b','c2d2_q1c'])
stage('ch2_patient_stroke_bed',['c2n3_m3','c2n3_m4'])
stage('ch2_patient_chest_wheelchair',['c2n3_h1','c2n3_h2','c2n3_h3a','c2n3_h3b','c2n3_h3c'])
stage('ch2_patient_aorta_bed',['c2d4_3','c2d4_aorta_resist','c2d4_aorta_wife','c2d4_aorta_doctor','c2d4_aorta_consent','c2d4_4','c2d4_5','c2d4_6','c2d4_7','c2d4_8'])
stage('pat_grandpa2',['c2d4_m2'])

const lines: Record<string,string> = {
 c2d2_8:'小伙子弯着腰挪到门边，攥着腹部的衣服：「哎哟……肚子疼死了。」',
 c2d2_q0:'大爷又探过头：「哎，到我没有啊？」',
 c2d2_q1a:'电梯门一开，术后复查的病人坐着轮椅进来，把申请单递给小唐。',
}

export function patientStep(id:string, step:Step):Step {
 const entrance=entrances[id]
 const sprite=entrance?.sprite ?? beforeScan[id]
 if (!sprite) return step
 const next:Step={...step}
 // Staff remain visible alongside the patient. A patient is never replaced by
 // an unexplained staff portrait at the moment the admission is described.
 if (step.sprite && step.sprite.startsWith('char_')) next.sprite2=sprite
 else next.sprite=sprite
 if (entrance?.voice && ![step.sfx,step.sfx2].includes(entrance.voice)) {
  if (!step.sfx) next.sfx=entrance.voice
  else next.sfx2=entrance.voice
 }
 if (lines[id]) next.text=id==='c2d2_q1a' ? lines[id]+'\n'+step.text : step.text+'\n'+lines[id]
 // The existing delayed branch complaint belongs to this patient now; the
 // voice has already accompanied his arrival, not just the wrong queue choice.
 if (id==='c2d2_9b') next.sfx=undefined
 return next
}

export const isPatientBed = (sprite?:string) => !!sprite?.startsWith('ch2_patient_') && sprite.endsWith('_bed')
export const isPatientWheelchair = (sprite?:string) => !!sprite?.startsWith('ch2_patient_') && sprite.endsWith('_wheelchair')
