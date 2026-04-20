import type { Release } from '../types/releases.types'
import ChangeCard from './ChangeCard'

function formatReleaseDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type Props = {
  release: Release
}

export default function ReleaseCard({ release }: Props) {
  return (
    <section className="release-card" data-testid={`release-card-${release.version}`}>
      <header className="release-card__header">
        <span className="release-card__version">v{release.version}</span>
        <span className="release-card__date">{formatReleaseDate(release.releaseDate)}</span>
        {release.archived ? (
          <span className="release-card__archive-badge" data-testid="archive-badge">
            Arquivada
          </span>
        ) : null}
      </header>
      <div className="release-card__changes">
        {release.changes.map((change) => (
          <ChangeCard key={change.id} change={change} />
        ))}
      </div>
    </section>
  )
}
