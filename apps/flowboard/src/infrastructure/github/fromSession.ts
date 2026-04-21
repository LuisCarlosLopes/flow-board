import type { FlowBoardSession } from '../session/sessionStore'
import { GitHubContentsClient } from './client'
import { GITHUB_API_BASE } from './url'

export function createClientFromSession(session: FlowBoardSession): GitHubContentsClient {
  return new GitHubContentsClient({
    token: session.pat,
    owner: session.owner,
    repo: session.repo,
    apiBase: GITHUB_API_BASE,
  })
}
