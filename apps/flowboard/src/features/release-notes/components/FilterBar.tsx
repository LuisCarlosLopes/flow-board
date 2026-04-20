import type { ChangeType } from '../types/releases.types'

export type FilterType = 'all' | ChangeType

type Props = {
  selectedType: FilterType
  onFilterChange: (type: FilterType) => void
}

const options: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'feature', label: 'Feature' },
  { value: 'fix', label: 'Fix' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'breaking', label: 'Breaking' },
]

export default function FilterBar({ selectedType, onFilterChange }: Props) {
  return (
    <div className="filter-bar" role="group" aria-label="Filter by change type">
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={value === selectedType ? 'filter-btn filter-btn--active' : 'filter-btn'}
          onClick={() => onFilterChange(value)}
          data-testid={`filter-${value}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
