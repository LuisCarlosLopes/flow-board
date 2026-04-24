import type { FlowBoardSession } from '../session/sessionStore'
import { FlowBoardGitHubGateway } from './flowBoardGitHubGateway'

export function createClientFromSession(session: FlowBoardSession): FlowBoardGitHubGateway {
  void session
  return new FlowBoardGitHubGateway()
}
