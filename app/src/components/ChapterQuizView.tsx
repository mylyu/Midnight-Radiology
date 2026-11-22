import type { ReactNode } from 'react'
import { SceneBackground } from './SceneBackground'

export type ChapterQuizGrade = { title: string; line: string }
type Props = {
  chapter: 'ch1' | 'ch4'
  eyebrow: string
  intro: string
  questions: { q: string; options: string[]; answer: number; explain: string }[]
  index: number
  picked: number | null
  score: number
  finished: boolean
  grade: string
  gradeInfo: Record<string, ChapterQuizGrade>
  onPick: (index: number) => void
  onNext: () => void
  onDone: () => void
  doneLabel: string
  reward?: ReactNode
  resultNote?: ReactNode
  resultEyebrow?: string
  overlay?: boolean
  choiceDisabled?: boolean
  onChoiceClick?: (index: number, event: React.MouseEvent<HTMLButtonElement>) => void
}

/** Chapter 1's original morning-meeting layout and choice-in animation, shared verbatim. */
export function ChapterQuizView(props: Props) {
  const { chapter, eyebrow, intro, questions, index, picked, score, finished, grade, gradeInfo,
    onPick, onNext, onDone, doneLabel, reward, resultNote, resultEyebrow, overlay, choiceDisabled, onChoiceClick } = props
  const q = questions[index]
  return <div data-shared-chapter-quiz={chapter} className={overlay ? 'absolute inset-0 z-40 overflow-y-auto' : 'relative w-full h-full overflow-y-auto'}>
    <SceneBackground name="bg_day" fixed />
    <div className="absolute inset-0 bg-slate-950/60" />
    <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-4 py-10 gap-5">
      <p className="text-amber-300 tracking-[0.4em] text-sm">{eyebrow}</p>
      {!finished ? <div className="w-full max-w-2xl bg-slate-900/95 border-2 border-slate-600 rounded-xl p-6">
        <p className="text-slate-400 text-sm mb-1">{intro}</p>
        <p className="text-amber-200 text-xs mb-4 tracking-widest">第 {index + 1} / {questions.length} 题 · 当前得分 {score}</p>
        <h3 className="text-lg text-slate-100 leading-relaxed mb-4">{q.q}</h3>
        <div className="flex flex-col gap-2">{q.options.map((option, i) => {
          const isAnswer = i === q.answer
          const cls = picked === null ? 'bg-slate-800 border-slate-600 hover:border-amber-400 hover:bg-slate-700'
            : isAnswer ? 'bg-emerald-900/60 border-emerald-400' : i === picked ? 'bg-red-900/50 border-red-400' : 'bg-slate-800/50 border-slate-700 opacity-50'
          return <button key={i} data-dialogue-choice={String(i)} disabled={choiceDisabled || picked !== null}
            onClick={event => { if (onChoiceClick) onChoiceClick(i, event); else onPick(i) }}
            className={`text-left px-4 py-2.5 rounded-lg border transition-all text-slate-100 ${cls}`}>{option}</button>
        })}</div>
        {picked !== null && <div className="mt-4 choice-in">
          <p className={`text-sm leading-relaxed ${picked === q.answer ? 'text-emerald-300' : 'text-amber-300'}`}>
            {picked === q.answer ? '✓ 答对了。' : '✗ 答错了。'}{q.explain}
          </p>
          <button data-trilogy-quiz-next={chapter === 'ch4' ? '' : undefined} onClick={onNext}
            className="mt-3 w-full py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold tracking-widest hover:bg-amber-400">
            {index + 1 >= questions.length ? '查看成绩 →' : '下一题 →'}
          </button>
        </div>}
      </div> : <div className="w-full max-w-md bg-slate-900/95 border-2 border-amber-500/50 rounded-xl p-8 text-center choice-in">
        <p className="text-slate-400 text-sm mb-2">{resultEyebrow ?? '考核 · 成绩'}</p>
        <p className={`text-7xl font-black mb-2 ${grade === 'S' || grade === 'A' ? 'text-amber-300' : grade === 'B' ? 'text-sky-300' : 'text-slate-400'}`}>{grade}</p>
        <p className="text-amber-200 mb-4">{gradeInfo[grade].title}</p>
        <p className="text-slate-300 text-sm leading-relaxed text-left">{gradeInfo[grade].line}</p>
        {reward}{resultNote}
        <button data-trilogy-quiz-finish={chapter === 'ch4' ? '' : undefined} onClick={onDone}
          className="mt-6 w-full py-3 rounded-lg bg-amber-500 text-slate-950 font-bold tracking-widest hover:bg-amber-400">{doneLabel}</button>
      </div>}
    </div>
  </div>
}
