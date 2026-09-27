import { playSfx } from '../game/store'
import { enterFullscreenLandscape, exitFullscreenUnlock } from '../lib/fullscreen'

export function FullscreenBtn({ className = '' }: { className?: string }) {
  if (typeof document === 'undefined' || !document.fullscreenEnabled) return null
  return <button onClick={e => {
    e.stopPropagation(); playSfx('click')
    if (document.fullscreenElement) exitFullscreenUnlock()
    else void enterFullscreenLandscape()
  }} className={`text-xs text-slate-400 hover:text-amber-300 border border-slate-700 rounded px-2 py-0.5 ${className}`}
  title="全屏显示(支持的设备上将自动横屏)">⛶ 全屏</button>
}
