import { useEffect } from 'react'
import { FEEDBACK_NAMES, type StatNotice } from '../game/stat-feedback'
import './StatFeedback.css'

function Notice({ notice, onExpire }: { notice: StatNotice; onExpire: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onExpire(notice.id), Math.max(0, notice.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [notice.id, notice.expiresAt, onExpire])
  return <div className="stat-feedback-notice" data-stat-notice={notice.id}>
    <span className="stat-feedback-values">{notice.changes.map(row => <span key={row.key}
      className={row.amount > 0 ? 'stat-feedback-gain' : 'stat-feedback-loss'}>
      {FEEDBACK_NAMES[row.key]}{row.amount > 0 ? '＋' : '－'}{Math.abs(row.amount)}{row.key === 'durability' ? '%' : ''}
    </span>)}</span>
    <span className="stat-feedback-reason">{notice.reason}</span>
  </div>
}

/** Lives outside the remounting dialogue; silent and never catches pointer input. */
export function StatFeedback({ notices, active, onExpire }: {
  notices: StatNotice[]; active: boolean; onExpire: (id: number) => void
}) {
  return <div className="stat-feedback" data-stat-feedback aria-live="polite" aria-atomic="false"
    style={{ visibility: active ? 'visible' : 'hidden' }}>
    {notices.map(notice => <Notice key={notice.id} notice={notice} onExpire={onExpire} />)}
  </div>
}
