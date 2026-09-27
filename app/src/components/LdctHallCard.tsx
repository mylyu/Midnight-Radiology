import { useState } from 'react'
import type { GameState } from '../game/types'
import { ldctUnlocked, unlockLdct } from '../game/ldct-access'

export function LdctHallCard({ state, onEnter }: { state: GameState; onEnter: () => void }) {
  const [open, setOpen] = useState(ldctUnlocked)
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const p = state.dlc?.ldct?.ldct
  const unlock = () => {
    const ok = unlockLdct(code)
    setError(!ok)
    if (ok) { setOpen(true); setCode('') }
  }
  return <section data-ldct-entry className="bg-slate-900/90 border-2 border-cyan-700 rounded-2xl p-5 flex flex-col gap-3">
    <div className="flex items-center gap-3"><span className="text-3xl">{open ? '◐' : '🔒'}</span><div>
      <h3 className="text-lg text-cyan-100 font-bold">低剂量CT：噪声之外 · 开场体验</h3>
      <p className="text-xs text-slate-400">先吃饭 · 五段投影小实验 · 独立加载</p>
    </div></div>
    <p className="text-sm text-slate-300 leading-relaxed">老同学约了顿饭。饭还没上齐，你们已经问起了对方的进度。图像越来越干净，有个细节却越来越难找。</p>
    <p className="text-xs text-amber-200/80">故事在第二章之后、第三章之前；无需通关解锁。当前仅含第一段，后三段待制作。</p>
    {open ? <button className="min-h-11 rounded-lg bg-cyan-700 px-4 py-2 text-white" onClick={onEnter}>
      {p?.phase === 'settle' ? '查看开场记录' : p ? '继续开场体验' : '开始开场体验'}
    </button> : <form className="flex gap-2" onSubmit={event => { event.preventDefault(); unlock() }}>
      <input aria-label="低剂量CT访问码" autoComplete="off" value={code} onChange={e => { setCode(e.target.value); setError(false) }} placeholder="输入访问码"
        className="min-w-0 flex-1 rounded-lg bg-slate-800 border border-slate-600 px-3 py-2" />
      <button className="rounded-lg bg-cyan-700 px-4 py-2 min-h-11" disabled={!code.trim()}>解锁体验</button>
    </form>}
    {error && <p role="alert" className="text-sm text-rose-300">访问码不对，请核对后再试。</p>}
    <p className="text-[11px] text-slate-500">访问码仅控制本机教学入口，不是账号安全认证。</p>
  </section>
}
