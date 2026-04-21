import { describe, expect, it } from 'vitest'
import { parseRepoUrl } from './url'

describe('parseRepoUrl', () => {
  it('parses https github URL', () => {
    const r = parseRepoUrl('https://github.com/acme/flowboard-data')
    expect('error' in r).toBe(false)
    if ('error' in r) return
    expect(r.owner).toBe('acme')
    expect(r.repo).toBe('flowboard-data')
    expect(r.apiBase).toBe('https://api.github.com')
  })

  it('parses owner/repo shorthand', () => {
    const r = parseRepoUrl('acme/repo')
    expect('error' in r).toBe(false)
    if ('error' in r) return
    expect(r.webUrl).toBe('https://github.com/acme/repo')
  })

  it('parses git@ form', () => {
    const r = parseRepoUrl('git@github.com:acme/repo.git')
    expect('error' in r).toBe(false)
    if ('error' in r) return
    expect(r.owner).toBe('acme')
    expect(r.repo).toBe('repo')
  })

  it('rejects typosquat host ending in github.com', () => {
    const r = parseRepoUrl('https://evilgithub.com/acme/repo')
    expect('error' in r).toBe(true)
  })

  it('rejects www.github.com (hostname must be exactly github.com)', () => {
    const r = parseRepoUrl('https://www.github.com/acme/repo')
    expect('error' in r).toBe(true)
  })
})
