import {
  GitHubContentsClient,
  type FlowBoardContentsGateway,
  type FlowBoardJsonGateway,
} from '../src/infrastructure/github/client'
import { parseBoardDocumentJson, parseCatalogJson } from '../src/infrastructure/persistence/boardRepository'
import type { SessionRecord } from './sessions'

export class GitHubContentsService implements FlowBoardContentsGateway, FlowBoardJsonGateway {
  private readonly session: SessionRecord
  private readonly fetchImpl?: typeof fetch

  constructor(session: SessionRecord, fetchImpl?: typeof fetch) {
    this.session = session
    this.fetchImpl = fetchImpl
  }

  async verifyRepositoryAccess(): Promise<void> {
    await this.client().verifyRepositoryAccess()
  }

  async getFileJson(path: string, signal?: AbortSignal): Promise<{ sha: string; json: unknown }> {
    const file = await this.client().getFileJson(path, signal)
    validateFlowBoardJson(path, file.json)
    return file
  }

  async tryGetFileJson(path: string, signal?: AbortSignal): Promise<{ sha: string; json: unknown } | null> {
    const file = await this.client().tryGetFileJson(path, signal)
    if (!file) {
      return null
    }
    validateFlowBoardJson(path, file.json)
    return file
  }

  async putFileJson(path: string, json: unknown, sha: string | null): Promise<void> {
    validateFlowBoardJson(path, json)
    await this.client().putFileJson(path, json, sha)
  }

  async getFileRaw(path: string, signal?: AbortSignal): Promise<{ sha: string; contentBase64: string }> {
    return this.client().getFileRaw(path, signal)
  }

  async tryGetFileRaw(path: string, signal?: AbortSignal): Promise<{ sha: string; contentBase64: string } | null> {
    return this.client().tryGetFileRaw(path, signal)
  }

  async putFileBase64(path: string, contentBase64: string, sha: string | null, message?: string): Promise<void> {
    await this.client().putFileBase64(path, contentBase64, sha, message)
  }

  async deleteFile(path: string, sha: string): Promise<void> {
    await this.client().deleteFile(path, sha)
  }

  private client(): GitHubContentsClient {
    return new GitHubContentsClient({
      token: this.session.token,
      owner: this.session.session.owner,
      repo: this.session.session.repo,
      fetchImpl: this.fetchImpl,
    })
  }
}

function validateFlowBoardJson(path: string, json: unknown): void {
  if (path === 'flowboard/catalog.json') {
    parseCatalogJson(json)
    return
  }
  if (path.startsWith('flowboard/boards/')) {
    parseBoardDocumentJson(json)
  }
}
