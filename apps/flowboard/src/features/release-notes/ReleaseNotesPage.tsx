import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import releasesData from '../../data/releases.json'
import FilterBar, { type FilterType } from './components/FilterBar'
import ReleaseCard from './components/ReleaseCard'
import type { Release } from './types/releases.types'
import './release-notes.css'

const allReleases = releasesData as Release[]

function compareSemverDesc(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0
    const vb = pb[i] ?? 0
    if (vb !== va) return vb - va
  }
  return 0
}

/** Newest first: release date (desc), then semver (desc). */
function sortReleasesDesc(releases: Release[]): Release[] {
  return [...releases].sort((x, y) => {
    const byDate = y.releaseDate.localeCompare(x.releaseDate)
    if (byDate !== 0) return byDate
    return compareSemverDesc(x.version, y.version)
  })
}

function filterReleases(releases: Release[], selected: FilterType): Release[] {
  if (selected === 'all') {
    return releases
  }
  return releases
    .map((r) => ({
      ...r,
      changes: r.changes.filter((c) => c.type === selected),
    }))
    .filter((r) => r.changes.length > 0)
}

export default function ReleaseNotesPage() {
  const [selectedType, setSelectedType] = useState<FilterType>('all')

  const visible = useMemo(() => {
    return sortReleasesDesc(filterReleases(allReleases, selectedType))
  }, [selectedType])

  return (
    <div className="release-notes-layout" data-testid="release-notes-page">
      <header className="release-notes-topbar">
        <div className="release-notes-topbar__row">
          <Link
            to="/"
            className="release-notes-topbar__home"
            data-testid="release-notes-back-home"
            aria-label="Voltar ao início"
          >
            <span className="release-notes-topbar__mark" aria-hidden>
              F
            </span>
            <span className="release-notes-topbar__brand">FlowBoard</span>
          </Link>
          <span className="release-notes-topbar__page-label">Release notes</span>
        </div>
      </header>
      <div className="release-notes-page">
        <header className="release-notes-page__header">
          <h1 className="release-notes-page__title">Release notes</h1>
          <p className="release-notes-page__subtitle">FlowBoard changelog by version.</p>
        </header>
        <FilterBar selectedType={selectedType} onFilterChange={setSelectedType} />
        <div className="releases-list">
          {visible.map((release) => (
            <ReleaseCard key={release.version} release={release} />
          ))}
        </div>
      </div>
    </div>
  )
}
