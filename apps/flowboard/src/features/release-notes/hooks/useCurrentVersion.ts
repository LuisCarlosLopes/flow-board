import { useMemo } from 'react'
import releasesData from '../../../data/releases.json'
import type { CurrentVersion, Release } from '../types/releases.types'

const releases = releasesData as Release[]

/**
 * Returns the semantic version of the active (non-archived) release from `releases.json`.
 */
export function useCurrentVersion(): CurrentVersion {
  return useMemo(() => {
    const active = releases.find((r) => !r.archived)
    if (!active) {
      throw new Error('No non-archived release found in releases.json')
    }
    return { version: active.version }
  }, [])
}
