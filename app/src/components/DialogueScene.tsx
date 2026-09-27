import type { ButtonHTMLAttributes, HTMLAttributes, ImgHTMLAttributes, ReactNode, Ref } from 'react'

type Accent = 'amber' | 'teal'

/** Shared presentation only: chapters keep their own story, reward and save logic. */
export function DialogueStage({ children, className = '', ref, ...props }: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return <div ref={ref} className={`relative w-full h-full cursor-pointer ${className}`} {...props}>{children}</div>
}

export function DialogueShade() {
  return <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
}

export function DialogueHeader({ title, children, accent = 'teal' }: { title: ReactNode; children: ReactNode; accent?: Accent }) {
  return <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between flex-wrap gap-y-1 px-4 py-2 bg-slate-950/70 text-xs md:text-sm">
    <span className={`${accent === 'amber' ? 'text-amber-200' : 'text-teal-200'} tracking-widest whitespace-nowrap`}>{title}</span>
    <span className="text-slate-300 flex items-center gap-2 md:gap-3 flex-wrap justify-end">{children}</span>
  </div>
}

export function DialoguePortrait({ side = 'left', className = '', ...props }: ImgHTMLAttributes<HTMLImageElement> & { side?: 'left' | 'right' }) {
  const position = side === 'left'
    ? 'sprite-l absolute bottom-48 portrait:bottom-44 left-4 md:left-24 portrait:h-44 h-64 md:h-96 object-contain pixel drop-shadow-2xl z-10'
    : 'sprite-r absolute bottom-48 portrait:bottom-44 right-4 md:right-24 portrait:h-40 h-56 md:h-80 object-contain pixel opacity-80 drop-shadow-2xl z-10'
  return <img className={`${position} ${className}`} {...props} />
}

export function DialoguePanel({ speaker, text, textKey, arrow = false, accent = 'teal', children, dialogRef, ...props }: {
  speaker?: { name: string; color: string }; text: ReactNode; textKey: string;
  arrow?: boolean; accent?: Accent; children?: ReactNode; dialogRef?: Ref<HTMLDivElement>;
} & HTMLAttributes<HTMLDivElement>) {
  return <div ref={dialogRef} className="dialog-wrap absolute bottom-0 inset-x-0 z-20 p-4 md:p-6" {...props}>
    <div className="dialog-box max-w-4xl mx-auto bg-slate-900/95 border-2 border-slate-600 rounded-xl p-4 md:p-5 min-h-32 relative">
      {speaker?.name && <span className="absolute -top-4 left-4 px-3 py-1 rounded-md text-sm font-bold bg-slate-800 border border-slate-600" style={{ color: speaker.color }}>{speaker.name}</span>}
      <p key={textKey} className="text-slate-100 leading-relaxed text-base md:text-lg whitespace-pre-wrap min-h-[4.9rem] md:min-h-[5.4rem] text-in">{text}</p>
      {arrow && <span className={`absolute bottom-3 right-4 ${accent === 'amber' ? 'text-amber-300' : 'text-teal-300'} animate-bounce`}>▼</span>}
      {children}
    </div>
  </div>
}

export function DialogueChoices({ children, className = 'max-h-[38vh] overflow-y-auto' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-4 flex flex-col gap-2 choice-in ${className}`} onClick={e => e.stopPropagation()}>{children}</div>
}

export function DialogueChoice({ accent = 'teal', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { accent?: Accent }) {
  return <button className={`text-left px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 ${accent === 'amber' ? 'hover:border-amber-400' : 'hover:border-teal-400'} hover:bg-slate-700 transition-all text-slate-100 ${className}`} {...props} />
}
