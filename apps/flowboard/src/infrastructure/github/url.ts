export type RepoResolution = {
  owner: string
  repo: string
  apiBase: string
  /** Normalized https clone URL for display */
  webUrl: string
}

const GITHUB_HOST = 'github.com'

/**
 * Normalize supported repo URL forms (TSD D14).
 */
export function parseRepoUrl(input: string): RepoResolution | { error: string } {
  const raw = input.trim()
  if (!raw) {
    return { error: 'URL vazia.' }
  }

  if (raw.includes('@') && raw.includes(':') && !raw.startsWith('http')) {
    const m = raw.match(/^git@github\.com:([^/]+)\/([^/.]+)(\.git)?$/i)
    if (!m) {
      return { error: 'Formato git@ não reconhecido.' }
    }
    const owner = m[1]!
    const repo = m[2]!
    const webUrl = `https://${GITHUB_HOST}/${owner}/${repo}`
    return { owner, repo, apiBase: 'https://api.github.com', webUrl }
  }

  let urlStr = raw
  if (!/^https?:\/\//i.test(urlStr)) {
    const parts = raw.split('/').filter(Boolean)
    if (parts.length === 2) {
      const [owner, repo] = parts
      urlStr = `https://${GITHUB_HOST}/${owner}/${repo}`
    } else {
      return { error: 'Use https://github.com/owner/repo ou owner/repo.' }
    }
  }

  let url: URL
  try {
    url = new URL(urlStr)
  } catch {
    return { error: 'URL inválida.' }
  }

  if (!url.hostname.endsWith(GITHUB_HOST)) {
    return { error: 'Apenas repositórios em github.com são suportados no MVP.' }
  }

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length < 2) {
    return { error: 'Caminho deve ser /owner/repo.' }
  }

  const owner = segments[0]!
  let repo = segments[1]!
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4)
  }

  const webUrl = `https://${GITHUB_HOST}/${owner}/${repo}`
  return { owner, repo, apiBase: 'https://api.github.com', webUrl }
}

/** Texto curto para chip na UI: `owner/repo` (evita truncar URLs longas). */
export function formatRepoChipLabel(webUrl: string): string {
  const u = webUrl.trim().replace(/\/$/, '')
  const m = u.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/i)
  if (m) {
    return m[1]!
  }
  return u.replace(/^https?:\/\//, '')
}
