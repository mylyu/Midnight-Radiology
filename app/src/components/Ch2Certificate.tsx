import { useRef, useState } from 'react'
import { CH2_CERTIFICATE_GRADES, CH2_CERTIFICATE_ID_MAX, CH2_CERTIFICATE_NAME_MAX,
  canIssueCh2Certificate, issueCh2Certificate, validCh2CertificateIdentity, verifyCh2CredCode } from '../game/ch2-certificate'
import { playSfx } from '../game/store'
import type { GameState } from '../game/types'
import { imageAsset } from '../lib/image-assets'
import { SceneBackground } from './SceneBackground'

const inputStyle = 'min-w-0 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:border-amber-400 outline-none'
const buttonStyle = 'min-h-11 py-2.5 px-3 rounded-lg bg-amber-500 text-slate-950 font-bold tracking-widest disabled:opacity-40 hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300'

/** Chapter 1's paper-and-stamp presentation, without using or overwriting its identity or certificate. */
export function Ch2Certificate({ state, update }: { state: GameState; update: (f: (s: GameState) => GameState) => void }) {
  const [name, setName] = useState(state.playerName ?? '')
  const [sid, setSid] = useState(state.playerId ?? '')
  const [error, setError] = useState('')
  const issuing = useRef(false)
  const certificate = state.dlc?.ch2?.certificate
  const eligible = canIssueCh2Certificate(state)
  if (!eligible) return null

  const issue = () => {
    if (issuing.current || certificate || !validCh2CertificateIdentity(name, sid)) return
    // Synchronous guard prevents duplicate stamp sounds before React commits the updated save.
    issuing.current = true
    const preview = issueCh2Certificate(state, name, sid)
    if (preview === state) {
      issuing.current = false
      setError('当前记录暂时无法盖章，请检查通关记录。')
      return
    }
    update(current => issueCh2Certificate(current, name, sid))
    void playSfx('stamp')
  }

  return certificate ? <section data-ch2-certificate="issued" aria-label="第二章通关凭证"
    className="relative mx-auto mb-4 w-full max-w-md rounded-xl border-4 border-amber-700 bg-amber-50 p-4 text-amber-950 shadow-2xl md:p-6">
    <div className="mb-2 flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs tracking-widest text-amber-700">深夜影像科 · 第二章通关凭证</p>
        <p className="mt-1 text-lg font-bold">快与狠 · CT篇</p>
      </div>
      <img src={imageAsset('stamp')} className="pixel h-14 w-14 shrink-0 rotate-[-12deg] object-contain opacity-90 md:h-16 md:w-16" alt="通关盖章" />
    </div>
    <p data-ch2-certificate-name className="break-all text-xl font-bold leading-relaxed">{certificate.name}</p>
    <p data-ch2-certificate-student-id className="mt-1 break-all text-sm leading-relaxed text-amber-800">学号 {certificate.studentId}</p>
    <p className="mt-3 text-left text-sm leading-relaxed">
      已完成第二章「快与狠」全部五个班次<br />
      三夜两白 · 晨会与尾声已完成<br />
      盖章时：💰{certificate.gold} 金币 · 🏅{certificate.badgeCount} 枚本章勋章 · 📖{certificate.shiftCount} 班<br />
      晨会考核评级：<strong>{certificate.grade}{certificate.grade === '未记录' ? '' : ' 级'}</strong>
    </p>
    <p data-ch2-certificate-code className="mt-3 break-all rounded bg-amber-200/70 px-2 py-2 text-center font-mono text-base tracking-wider">{certificate.code}</p>
    <p className="mt-2 text-xs leading-relaxed text-amber-700">截图本凭证提交给老师 · 可在「教师验证入口」选择第二章校验。</p>
    <p className="mt-1 text-xs leading-relaxed text-amber-700">凭证保留盖章时的记录，之后消费和收集不改变这张凭证。</p>
  </section> : <section data-ch2-certificate="form" aria-labelledby="ch2-certificate-title"
    className="mx-auto mb-4 w-full max-w-md rounded-xl border border-amber-500/40 bg-slate-900/90 p-4 md:p-6">
    <h3 id="ch2-certificate-title" className="mb-2 text-center text-amber-200 tracking-wider">📜 领取你的第二章通关凭证</h3>
    <p className="mb-3 text-xs leading-relaxed text-slate-400">请确认姓名和学号后盖章，截图提交作业。若已填写第一章信息，这里会预填；仍需确认后领取。</p>
    <form aria-label="第二章通关凭证信息" className="flex flex-col gap-2" onClick={event => event.stopPropagation()}
      onSubmit={event => { event.preventDefault(); issue() }}>
      <label className="text-xs text-slate-300" htmlFor="ch2-certificate-name">姓名</label>
      <input id="ch2-certificate-name" value={name} onChange={event => { setName(event.target.value); setError('') }}
        maxLength={CH2_CERTIFICATE_NAME_MAX} autoComplete="name" required placeholder="姓名" className={inputStyle} />
      <label className="text-xs text-slate-300" htmlFor="ch2-certificate-sid">学号</label>
      <input id="ch2-certificate-sid" value={sid} onChange={event => { setSid(event.target.value); setError('') }}
        maxLength={CH2_CERTIFICATE_ID_MAX} autoCapitalize="off" spellCheck={false} required placeholder="学号" className={inputStyle} />
      <button type="submit" disabled={!validCh2CertificateIdentity(name, sid)} className={`${buttonStyle} mt-2`}>盖章发证</button>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </form>
  </section>
}

/** Do not accept parseInt-style truncation ("5x", "5.5") or blank-as-zero in teacher input. */
function exactInteger(text: string): number {
  if (!/^\d+$/.test(text.trim())) return Number.NaN
  const value = Number(text.trim())
  return Number.isSafeInteger(value) ? value : Number.NaN
}

export function Ch2CertificateVerify({ onBack }: { onBack: () => void }) {
  const [fields, setFields] = useState({ name: '', sid: '', gold: '', badges: '', shifts: '', grade: '', code: '' })
  const [result, setResult] = useState<null | boolean>(null)
  const edit = (key: keyof typeof fields, value: string) => {
    setFields(current => ({ ...current, [key]: value }))
    setResult(null)
  }
  const verify = () => {
    setResult(verifyCh2CredCode(fields.code, fields.name, fields.sid, exactInteger(fields.gold),
      exactInteger(fields.badges), exactInteger(fields.shifts), fields.grade))
  }
  const rows = [
    ['name', '姓名', CH2_CERTIFICATE_NAME_MAX], ['sid', '学号', CH2_CERTIFICATE_ID_MAX],
    ['gold', '金币数', 16], ['badges', '本章勋章数', 4], ['shifts', '班次数', 2],
  ] as const
  return <section data-ch2-certificate-verify aria-label="第二章通关凭证教师验证" className="relative h-full w-full overflow-y-auto">
    <SceneBackground name="bg_day" fixed />
    <div className="pointer-events-none absolute inset-0 bg-slate-950/70" />
    <div className="relative z-10 flex min-h-full flex-col items-center justify-center gap-4 px-4 py-8">
      <h2 className="text-center text-2xl tracking-widest text-amber-100">第二章通关凭证 · 教师验证</h2>
      <p className="max-w-md text-center text-sm text-slate-400">按凭证截图填写盖章时的信息，校对姓名、战绩与第二章通关码是否一致。</p>
      <form className="flex w-full max-w-md flex-col gap-2 rounded-xl border border-slate-600 bg-slate-900/90 p-4 md:p-6"
        onSubmit={event => { event.preventDefault(); verify() }}>
        {rows.map(([key, label, maxLength]) => <div key={key} className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`ch2-verify-${key}`} className="text-xs text-slate-300">{label}</label>
          <input id={`ch2-verify-${key}`} value={fields[key]} onChange={event => edit(key, event.target.value)} maxLength={maxLength}
            inputMode={key === 'gold' || key === 'badges' || key === 'shifts' ? 'numeric' : 'text'}
            autoCapitalize="off" spellCheck={false} placeholder={label} className={inputStyle} />
        </div>)}
        <label htmlFor="ch2-verify-grade" className="text-xs text-slate-300">晨会评级</label>
        <select id="ch2-verify-grade" value={fields.grade} onChange={event => edit('grade', event.target.value)} className={inputStyle}>
          <option value="">选择凭证上的评级</option>
          {CH2_CERTIFICATE_GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
        </select>
        <label htmlFor="ch2-verify-code" className="text-xs text-slate-300">通关码</label>
        <input id="ch2-verify-code" value={fields.code} onChange={event => edit('code', event.target.value)} maxLength={22}
          spellCheck={false} autoCapitalize="characters" placeholder="YSK2-种子段-校验段" className={inputStyle} />
        <button type="submit" className={`${buttonStyle} mt-2`}>校验</button>
        <div aria-live="polite">
          {result === true && <p className="mt-2 text-center text-emerald-300">✅ 校验通过——第二章凭证信息与通关码一致</p>}
          {result === false && <p className="mt-2 text-center text-red-400">❌ 校验失败——请核对截图中的全部信息，并确认使用第二章通关码</p>}
        </div>
      </form>
      <p className="max-w-md text-center text-xs leading-relaxed text-slate-500">这是本地作业凭证的一致性校验，不是联网实名认证或防作弊认证。第一章的 YSK 通关码请返回原入口校验。</p>
      <button type="button" onClick={onBack} className="min-h-11 rounded-lg border border-slate-600 bg-slate-800/80 px-6 py-3 text-amber-100 hover:border-amber-400">← 返回教师验证</button>
    </div>
  </section>
}
