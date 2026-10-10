import type { GameState } from '../game/types'
import type { TrilogyChapter, TrilogyTool } from '../game/trilogy-types'
import { completeTrilogyTool, trilogyProgress, updateTrilogyTool } from '../game/trilogy-session'
import { imageAsset } from '../lib/image-assets'
import { useRef } from 'react'
import { acceptInput } from '../game/input-gate'
import { UltrasoundPhantom } from './UltrasoundPhantom'
import { TrilogyUltrasoundLab } from './TrilogyUltrasoundLab'
import { TrilogyNuclearLab } from './TrilogyNuclearLab'
import { TrilogyMriLab } from './TrilogyMriLab'
import './TrilogyCourseLab.css'

export function TrilogyLab({ state, chapter, tool, update }: { state: GameState; chapter: TrilogyChapter;
  tool: TrilogyTool; update: (fn: (s: GameState) => GameState) => void }) {
  const p = trilogyProgress(state, chapter.id)!, node = p.stepId
  const saved = p.tools[node] ?? { value: 25, secondary: 50, choice: tool.kind === 'mri' ? 'T1' : '凸阵' }
  const gate = useRef({ until: 0 })
  const set = (patch: Partial<typeof saved>) => update(s => updateTrilogyTool(s, chapter.id, node, { ...saved, ...patch }))
  const finish = (assisted: boolean, now: number) => { if (acceptInput(gate.current, now, 500)) update(s => completeTrilogyTool(s, chapter, node, assisted)) }
  const image = tool.images?.[saved.choice] ?? tool.image
  const choices = tool.kind === 'mri' ? Object.keys(tool.images ?? { T1: '', T2: '', FLAIR: '' })
    : tool.task === 'probe' ? ['凸阵', '线阵', '相控阵'] : []
  const ultrasound = ['echo', 'tgc', 'm_mode', 'doppler', 'resolution'].includes(tool.task)
  const nuclear = ['collimator', 'spect', 'coincidence', 'counting'].includes(tool.task)
  const magnetic = tool.task.startsWith('mri-')
  const course = ultrasound || nuclear || magnetic
  const courseProps = { task: tool.task, variant: tool.variant, value: saved.value, secondary: saved.secondary, choice: saved.choice, onChange: set }
  return <div data-trilogy-lab={tool.task} className="trilogy-lab" onClick={e => e.stopPropagation()}>
    <header><span className="text-teal-200 text-xs">{tool.kind === 'ultrasound' ? '探头与显示' : tool.kind === 'mri' ? '工作站 · 序列对照' : '核医学工作站'}</span><h2>{tool.title}</h2><p>{tool.prompt}</p></header>
    {ultrasound ? <TrilogyUltrasoundLab {...courseProps} /> : nuclear ? <TrilogyNuclearLab {...courseProps} /> : magnetic ? <TrilogyMriLab {...courseProps} /> : <div className="trilogy-lab-work">
      <div className="trilogy-lab-image">
        {tool.kind === 'ultrasound' ? <UltrasoundPhantom position={tool.task === 'probe' ? saved.value : 50} gain={tool.task === 'gain' ? saved.value : 50}
          depth={tool.task === 'depth' ? saved.value : 55} probe={tool.task === 'probe' ? saved.choice : '线阵'} /> : image && <img src={imageAsset(tool.task === 'fusion' ? tool.reference ?? image : image)} className="pixel" alt="当前图像" style={{
          filter: tool.task === 'gain' ? `brightness(${.25 + saved.value / 65}) contrast(${.8 + saved.value / 200})`
            : undefined,
          transform: tool.task === 'depth' ? `scale(${1 + (100 - saved.value) / 120})`
            : undefined,
          clipPath: tool.task === 'probe' && saved.choice === '相控阵' ? 'polygon(50% 0,100% 100%,0 100%)'
            : tool.task === 'probe' && saved.choice === '线阵' ? 'inset(0 18%)' : undefined,
        }} />}
        {image && tool.task === 'artifact' && saved.value < 50 && <img src={imageAsset(image)} className="pixel trilogy-fusion-overlay" alt="运动重影示意"
          style={{ transform: 'translateX(12px)', opacity: .3 }} />}
        {tool.task === 'fusion' && tool.reference && image && <img src={imageAsset(image)} className="pixel trilogy-fusion-overlay" alt="PET摄取层"
          style={{ opacity: .65, transform: `translate(${(saved.value - 50) * .7}px,${(saved.secondary - 50) * .7}px)` }} />}
        {tool.task === 'decay' && <div className="trilogy-decay-display"><span>F-18</span><strong>{Math.round(100 * 2 ** (-saved.value / 110))}%</strong><div className="trilogy-decay-dots">{Array.from({ length: 30 }, (_, i) => <i key={i} style={{ opacity: i < 30 * 2 ** (-saved.value / 110) ? 1 : .12 }} />)}</div><small>相对活度 · 等待 {saved.value} 分钟</small></div>}
      </div>
      <aside className="trilogy-lab-controls">
        {choices.length > 0 && <div className="grid grid-cols-3 gap-2">{choices.map(choice => <button key={choice} aria-pressed={saved.choice === choice} onClick={() => set({ choice })}>{choice}</button>)}</div>}
        {tool.task === 'artifact' ? <div className="grid grid-cols-2 gap-2"><button aria-pressed={saved.value < 50} onClick={() => set({ value: 25 })}>看受运动影响的那段</button><button aria-pressed={saved.value >= 50} onClick={() => set({ value: 75 })}>沟通后必要补采</button></div>
          : tool.task !== 'sequence' && <label>{tool.task === 'fusion' ? '横向对齐' : tool.task === 'decay' ? '等待时间' : tool.task === 'probe' ? '探头位置' : tool.task === 'depth' ? '显示深度' : '总增益'}
            <input aria-label={tool.task === 'decay' ? '等待时间' : '主要调节'} type="range" min="0" max={tool.task === 'decay' ? 220 : 100} value={saved.value} onChange={e => set({ value: Number(e.target.value) })} /></label>}
        {tool.task === 'fusion' && <label>纵向对齐<input aria-label="纵向对齐" type="range" min="0" max="100" value={saved.secondary} onChange={e => set({ secondary: Number(e.target.value) })} /></label>}
        <p className="text-sm text-slate-300">{tool.task === 'gain' ? saved.value < 35 ? '暗处还埋着细节。慢慢调亮看看。' : saved.value > 80 ? '亮得发白，层次开始挤在一起。' : '能分开亮暗了。先留这一版。'
          : tool.task === 'decay' ? '同一批药会随时间衰减，不是等够时间就凭空补回来。'
            : tool.task === 'probe' ? `当前：${saved.choice} · 换一种视野，再移动观察位置。`
              : tool.task === 'sequence' ? `当前查看 ${saved.choice}。同一处结构，换一种对比。`
                : tool.task === 'artifact' ? saved.value < 50 ? '重影让轮廓不稳。试着改善运动条件。' : '轮廓稳定了，再交老师核对。' : '调整后与对照比较，不必一次做到完美。'}</p>
        <details><summary>请同事带我看看</summary><p>{tool.help}</p><button onClick={() => finish(true, performance.now())}>一起看过了，回到故事</button></details>
      </aside>
    </div>}
    {course && <details className="trilogy-course-help"><summary>请同事带我看看</summary><p>{tool.help}</p><button onClick={() => finish(true, performance.now())}>一起看过了，回到故事</button></details>}
    <footer><button data-trilogy-tool-done className="trilogy-primary" onClick={() => finish(false, performance.now())}>留这一版，接着聊 →</button></footer>
  </div>
}
