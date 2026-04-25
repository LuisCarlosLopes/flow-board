import type { FlowBoardSession } from '../session/sessionStore'
import { GitHubContentsClient } from './client'

export function createClientFromSession(session: FlowBoardSession): GitHubContentsClient {
  return new GitHubContentsClient({
    owner: session.owner,
    repo: session.repo,
    apiBase: session.apiBase,
  })
}
