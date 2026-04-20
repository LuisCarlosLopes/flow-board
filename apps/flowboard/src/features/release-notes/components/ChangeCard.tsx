import type { Change, ChangeType } from '../types/releases.types'

const typeEmoji: Record<ChangeType, string> = {
  feature: '📦',
  fix: '✅',
  improvement: '⚡',
  breaking: '⚠️',
}

const typeLabel: Record<ChangeType, string> = {
  feature: 'Feature',
  fix: 'Fix',
  improvement: 'Improvement',
  breaking: 'Breaking',
}

const typeBorderVar: Record<ChangeType, string> = {
  feature: 'var(--accent)',
  fix: 'var(--success)',
  improvement: 'var(--warning)',
  breaking: 'var(--danger)',
}

type Props = {
  change: Change
}

export default function ChangeCard({ change }: Props) {
  return (
    <article
      className={`change-card change-card--${change.type}`}
      style={{ borderLeftColor: typeBorderVar[change.type] }}
    >
      <div className="change-card__type" data-change-type={change.type}>
        <span aria-hidden="true">{typeEmoji[change.type]}</span>{' '}
        <span>{typeLabel[change.type]}</span>
      </div>
      <h3 className="change-card__title">{change.title}</h3>
      <p className="change-card__description">{change.description}</p>
    </article>
  )
}
