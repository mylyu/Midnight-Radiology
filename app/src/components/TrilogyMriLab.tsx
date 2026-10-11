import { useEffect, useMemo, useRef } from 'react'
import { MRI_GRID, MRI_B0_T, MRI_GAMMA_HZ_T, MRI_KSPACE_REFERENCE_AMPLITUDE, MRI_TISSUES, mriContrast, mriControl, mriEncode, mriExcitation,
  mriImagePixels, mriKspacePixels, mriMotion, mriReference, mriRelaxAt, mriSample,
  mriSamplingName } from '../game/trilogy-mri-numerics'
import './TrilogyMriLab.css'

interface Props {
  task: string
  variant?: string
  value: number
  secondary: number
  choice: string
  onChange: (patch: { value?: number; secondary?: number; choice?: string }) => void
}
function Pixels({ pixels, label }: { pixels: Uint8ClampedArray; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (context) context.putImageData(new ImageData(new Uint8ClampedArray(pixels), MRI_GRID, MRI_GRID), 0, 0)
  }, [pixels])
  return <figure><canvas ref={canvas} width={MRI_GRID} height={MRI_GRID} aria-label={label} role="img" /><figcaption>{label}</figcaption></figure>
}
function Slider({ name, value, label, onChange }: { name: string; value: number; label: string; onChange: (value: number) => void }) {
  return <label className="trilogy-mri-control"><span>{label}</span><input type="range" min="0" max="100" value={mriControl(value)} aria-label={name} onChange={e => onChange(Number(e.target.value))} /></label>
}
function curvePath(values: number[], max = 1) {
  return values.map((v, i) => `${i ? 'L' : 'M'}${18 + i * 284 / (values.length - 1)},${137 - v / max * 116}`).join(' ')
}

export function TrilogyMriLab({ task, variant, value, secondary, choice, onChange }: Props) {
  const control = mriControl(value, 25), second = mriControl(secondary)
  const signal = task === 'mri-relax' && variant === 'signal'
  const contrast = task === 'mri-relax' && !signal
  const encoding = task === 'mri-encoding'
  const motion = task === 'mri-sampling' && variant === 'motion'
  const pattern = mriSamplingName(choice)
  const rfOffset = signal ? second : 50
  const contrastValue = contrast ? control : 25, contrastSecond = contrast ? second : 50
  const encodingValue = encoding ? control : 25, encodingSecond = encoding ? second : 50
  const motionValue = motion ? control : 25, motionSecond = motion ? second : 50
  const sampling = !signal && !contrast && !encoding && !motion
  const samplePattern = sampling ? pattern : 'full', sampleExtent = sampling ? control : 25
  const excitation = useMemo(() => mriExcitation(rfOffset), [rfOffset])
  const time = Math.round(control * 30), magnetization = mriRelaxAt(time, excitation)
  const comparison = useMemo(() => mriContrast(contrastValue, contrastSecond), [contrastValue, contrastSecond])
  const encoded = useMemo(() => mriEncode(encodingValue, encodingSecond), [encodingValue, encodingSecond])
  const moved = useMemo(() => mriMotion(motionValue, motionSecond), [motionValue, motionSecond])
  const sampled = useMemo(() => mriSample(samplePattern, sampleExtent), [samplePattern, sampleExtent])
  const working = encoding ? encoded : motion ? moved : sampled
  const referencePixels = useMemo(() => mriImagePixels(mriReference()), [])
  const imagePixels = useMemo(() => mriImagePixels(contrast ? comparison.image : working.image), [contrast, comparison.image, working.image])
  const kPixels = useMemo(() => mriKspacePixels(working.kspace, motion ? moved.affected : undefined, encoding ? encoded.inspect : undefined), [working.kspace, motion, moved.affected, encoding, encoded.inspect])
  const longitudinal = Array.from({ length: 61 }, (_, i) => mriRelaxAt(i * 50, excitation).mz)
  const transverse = Array.from({ length: 61 }, (_, i) => mriRelaxAt(i * 50, excitation).mxy)
  const patterns = [['full', '完整'], ['center', '留中心'], ['edge', '留边缘'], ['r2', '隔一行'], ['r4', '隔三行']]
  return <section className="trilogy-mri-demo" data-mri-task={task} data-mri-variant={variant} onClick={e => e.stopPropagation()}>
    <div className="trilogy-mri-visuals">
      {signal ? <div className="trilogy-mri-signal">
        <div className="trilogy-mri-values"><span>纵向 Mz <strong>{magnetization.mz.toFixed(2)}</strong></span><span>横向 Mxy <strong>{magnetization.mxy.toFixed(2)}</strong></span></div>
        <svg viewBox="0 0 320 166" role="img" aria-label="RF停止后，纵向恢复与横向衰减曲线">
          <path d="M18 16V137H306" fill="none" stroke="#64748b" />
          <path d={curvePath(longitudinal)} fill="none" stroke="#5eead4" strokeWidth="2.5" />
          <path d={curvePath(transverse)} fill="none" stroke="#fbbf24" strokeWidth="2.5" />
          <path d={`M${18 + time / 3000 * 284} 17V137`} stroke="#e2e8f0" strokeDasharray="3 3" />
          <text x="3" y="20">1</text><text x="3" y="140">0</text><text x="18" y="157">RF停</text><text x="257" y="157">3000 ms</text>
        </svg>
        <p><i className="trilogy-mri-key-z" />纵向恢复 <i className="trilogy-mri-key-xy" />横向衰减</p>
        <small>{MRI_B0_T}T · 1 ms矩形RF脉冲 · 均匀场教学样品</small>
      </div> : contrast ? <div className="trilogy-mri-contrast">
        <Pixels pixels={imagePixels} label="同一模体 · 固定灰度尺" />
        <div className="trilogy-mri-materials">{MRI_TISSUES.map((tissue, i) => <div key={tissue.name}><span>{tissue.name}</span><meter min="0" max="1" value={comparison.signals[i]} /><strong style={{ color: tissue.color }}>{comparison.signals[i].toFixed(2)}</strong></div>)}</div>
        <small>两种样品的T1/T2不同，位置与灰度尺不变。</small>
      </div> : <>
        <div className="trilogy-mri-canvases"><Pixels pixels={referencePixels} label="原教学样品" /><Pixels pixels={kPixels} label="收到的k空间" /><Pixels pixels={imagePixels} label="实际逆变换结果" /></div>
        {encoding ? <div className="trilogy-mri-row">
          <span>相位行 ky={encoded.inspect} · {encoded.received ? '这行已收' : '这行还没收'}</span>
          <svg viewBox="0 0 320 166" role="img" aria-label="当前相位行的复数读出数据">
            <path d="M18 79H302" stroke="#475569" />
            <path d={curvePath(Array.from(encoded.readoutReal, v => .5 + v / (2 * MRI_KSPACE_REFERENCE_AMPLITUDE)), 1)} fill="none" stroke="#5eead4" strokeWidth="1.5" />
            <path d={curvePath(Array.from(encoded.readoutImag, v => .5 + v / (2 * MRI_KSPACE_REFERENCE_AMPLITUDE)), 1)} fill="none" stroke="#fbbf24" strokeWidth="1.5" />
          </svg>
          <small>青：实部 · 黄：虚部；每行都是整层信号的组合。</small>
        </div> : <small>{motion ? '橙色行标出位移后的采样；幅度可能相同，相位关系已经改变。' : '图像使用同一0–1灰度尺；k空间使用固定对数幅度尺。'}</small>}
      </>}
    </div>
    <div className="trilogy-mri-controls">
      {signal ? <>
        <Slider name="观察时间" value={control} label={`RF停后：${time} ms`} onChange={value => onChange({ value })} />
        <Slider name="射频频率偏移" value={second} label={`RF ${(excitation.frequencyHz / 1e6).toFixed(6)} MHz · 偏移 ${Math.round(excitation.detuningHz)} Hz`} onChange={secondary => onChange({ secondary })} />
        <button onClick={() => onChange({ secondary: 50 })}>对准 {(MRI_B0_T * MRI_GAMMA_HZ_T / 1e6).toFixed(3)} MHz</button>
        <p>先对准RF，再看两个分量一起变；纵向不是等横向掉完才恢复。</p>
      </> : contrast ? <>
        <Slider name="重复时间TR" value={control} label={`TR：${comparison.tr} ms`} onChange={value => onChange({ value })} />
        <Slider name="回波时间TE" value={second} label={`TE：${comparison.te} ms`} onChange={secondary => onChange({ secondary })} />
        <div className="trilogy-mri-presets"><button onClick={() => onChange({ value: 14, secondary: 5 })}>短TR / 短TE</button><button onClick={() => onChange({ value: 100, secondary: 5 })}>长TR / 短TE</button><button onClick={() => onChange({ value: 100, secondary: 80 })}>长TR / 长TE</button></div>
        <p>一次先改一个时间。晚接回波，差异可能更大，信号也更少。</p>
      </> : encoding ? <>
        <Slider name="已采集相位行数" value={control} label={`已收：${encoded.rows} / 64行`} onChange={value => onChange({ value })} />
        <Slider name="查看相位编码行" value={second} label={`查看相位行：${encoded.inspect}`} onChange={secondary => onChange({ secondary })} />
        <div className="trilogy-mri-presets"><button onClick={() => onChange({ value: Math.min(100, (encoded.rows + 1 - 1) * 100 / 63) })}>再收一行</button><button onClick={() => onChange({ value: 100 })}>收齐作对照</button></div>
        <p>从中心向外收。不是给照片贴一排像素，是补齐另一方向的编码。</p>
      </> : motion ? <>
        <Slider name="样品位移" value={control} label={`一次横向位移：${moved.dx.toFixed(1)} 格`} onChange={value => onChange({ value })} />
        <Slider name="位移发生时间" value={second} label={`第 ${moved.start} / 64行之后移动`} onChange={secondary => onChange({ secondary })} />
        <button onClick={() => onChange({ value: 0 })}>留不动的一版</button>
        <p>这次改的是采样行的相位。不同时间收的数据，得对应同一个位置。</p>
      </> : <>
        <div className="trilogy-mri-patterns" aria-label="k空间采样方式">{patterns.map(([id, label]) => <button key={id} aria-pressed={pattern === id} onClick={() => onChange({ choice: id })}>{label}</button>)}</div>
        {(pattern === 'center' || pattern === 'edge') && <Slider name="中心频域范围" value={control} label={`中心半宽：${sampled.radius} 格`} onChange={value => onChange({ value })} />}
        <div className="trilogy-mri-values"><span>保留样本 <strong>{sampled.count} / 4096</strong></span><span>相位行 <strong>{sampled.rows} / 64</strong></span></div>
        <p>{pattern === 'r2' || pattern === 'r4' ? '少收行确实省循环，普通逆变换不会替你解开折叠。' : pattern === 'center' ? '先看轮廓，再看细边缘。能看见整幅不等于信息齐全。' : pattern === 'edge' ? '边缘数据仍影响整幅图，不是仅留下照片边框。' : '完整数据先留在旁边，换一种采样才有同条件的对照。'}</p>
      </>}
    </div>
  </section>
}
