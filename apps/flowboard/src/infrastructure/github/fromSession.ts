import type { FlowBoardSession } from '../session/sessionStore'
import { GitHubContentsClient } from './client'
import { BFF_GITHUB_API_PREFIX } from './url'

export function createClientFromSession(session: FlowBoardSession): GitHubContentsClient {
  return new GitHubContentsClient({
    token: '',
    owner: session.owner,
    repo: session.repo,
    apiBase: BFF_GITHUB_API_PREFIX,
    useBff: true,
    fetchImpl: (input, init) => globalThis.fetch(input, { ...init, credentials: 'include' }),
  })
}
