import { GitHubContentsClient } from '../github/client.js'
import {
  CATALOG_PATH,
  boardFilePath,
  createPresetBoardDocument,
  emptyCatalog,
} from './boardFactory.js'
import type { BoardDocumentJson, CatalogJson } from './types.js'

export type { CatalogJson } from './types.js'

export function createBoardRepository(client: GitHubContentsClient) {
  return {
    async loadCatalog(): Promise<{ catalog: CatalogJson; sha: string | null }> {
      const got = await client.tryGetFileJson(CATALOG_PATH)
      if (!got) {
        return { catalog: emptyCatalog(), sha: null }
      }
      return { catalog: parseCatalog(got.json), sha: got.sha }
    },

    async saveCatalog(catalog: CatalogJson, previousSha: string | null): Promise<void> {
      await client.putFileJson(CATALOG_PATH, catalog, previousSha)
    },

    async loadBoard(
      boardId: string,
      options?: { signal?: AbortSignal },
    ): Promise<{ doc: BoardDocumentJson; sha: string } | null> {
      const path = boardFilePath(boardId)
      const got = await client.tryGetFileJson(path, options?.signal)
      if (!got) {
        return null
      }
      return { doc: parseBoard(got.json), sha: got.sha }
    },

    async saveBoard(boardId: string, doc: BoardDocumentJson, previousSha: string | null): Promise<void> {
      await client.putFileJson(boardFilePath(boardId), doc, previousSha)
    },
  }
}

export type BoardRepository = ReturnType<typeof createBoardRepository>

export async function createBoardEntry(
  repo: BoardRepository,
  title: string,
): Promise<{ catalog: CatalogJson; board: BoardDocumentJson }> {
  const trimmed = title.trim()
  const t = trimmed.length > 0 ? trimmed : 'Novo quadro'
  const { catalog, sha: catSha } = await repo.loadCatalog()
  const boardId = crypto.randomUUID()
  const doc = createPresetBoardDocument(boardId, t)
  await repo.saveBoard(boardId, doc, null)
  const nextCatalog: CatalogJson = {
    schemaVersion: 1,
    boards: [...catalog.boards, { boardId, title: doc.title, dataPath: boardFilePath(boardId) }],
  }
  await repo.saveCatalog(nextCatalog, catSha)
  return { catalog: nextCatalog, board: doc }
}

export async function renameBoardEntry(
  repo: BoardRepository,
  boardId: string,
  newTitle: string,
): Promise<CatalogJson> {
  const trimmed = newTitle.trim()
  if (!trimmed) {
    throw new Error('Título não pode ser vazio.')
  }
  const { catalog, sha: catSha } = await repo.loadCatalog()
  const loaded = await repo.loadBoard(boardId)
  if (!loaded) {
    throw new Error('Quadro não encontrado.')
  }
  if (!catalog.boards.some((b) => b.boardId === boardId)) {
    throw new Error('Quadro não está no catálogo.')
  }
  const nextDoc: BoardDocumentJson = { ...loaded.doc, title: trimmed }
  const nextCatalog: CatalogJson = {
    ...catalog,
    boards: catalog.boards.map((b) => (b.boardId === boardId ? { ...b, title: trimmed } : b)),
  }
  await repo.saveBoard(boardId, nextDoc, loaded.sha)
  await repo.saveCatalog(nextCatalog, catSha)
  return nextCatalog
}

export async function deleteBoardEntry(
  repo: BoardRepository,
  client: GitHubContentsClient,
  boardId: string,
): Promise<CatalogJson> {
  const { catalog, sha: catSha } = await repo.loadCatalog()
  if (catalog.boards.length <= 1) {
    throw new Error('Não é possível excluir o último quadro.')
  }
  if (!catalog.boards.some((b) => b.boardId === boardId)) {
    throw new Error('Quadro não encontrado.')
  }
  const path = boardFilePath(boardId)
  const nextCatalog: CatalogJson = {
    schemaVersion: 1,
    boards: catalog.boards.filter((b) => b.boardId !== boardId),
  }
  await repo.saveCatalog(nextCatalog, catSha)
  const got = await client.tryGetFileJson(path)
  if (got) {
    await client.deleteFile(path, got.sha)
  }
  return nextCatalog
}

function parseCatalog(json: unknown): CatalogJson {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('catalog.json inválido')
  }
  const o = json as Record<string, unknown>
  if (o.schemaVersion !== 1 || !Array.isArray(o.boards)) {
    throw new Error('catalog.json inválido')
  }
  for (const entry of o.boards) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('catalog.json inválido')
    }
    const b = entry as Record<string, unknown>
    if (
      typeof b.boardId !== 'string' ||
      !b.boardId.trim() ||
      typeof b.title !== 'string' ||
      !b.title.trim() ||
      typeof b.dataPath !== 'string' ||
      !b.dataPath.trim()
    ) {
      throw new Error('catalog.json inválido')
    }
  }
  return o as unknown as CatalogJson
}

function parseBoard(json: unknown): BoardDocumentJson {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('board.json inválido')
  }
  const o = json as Record<string, unknown>
  if (o.schemaVersion !== 1 || typeof o.boardId !== 'string' || !o.boardId.trim()) {
    throw new Error('board.json inválido')
  }
  if (!Array.isArray(o.columns) || !Array.isArray(o.cards) || !Array.isArray(o.timeSegments)) {
    throw new Error('board.json inválido')
  }
  if (o.cardTimeState === null || typeof o.cardTimeState !== 'object' || Array.isArray(o.cardTimeState)) {
    throw new Error('board.json inválido')
  }
  return o as unknown as BoardDocumentJson
}

/** Ensures catalog + at least one preset board exist (bootstrap empty repo). */
export async function bootstrapFlowBoardData(
  client: GitHubContentsClient,
): Promise<{ catalog: CatalogJson; board: BoardDocumentJson }> {
  const repo = createBoardRepository(client)
  const { catalog, sha } = await repo.loadCatalog()
  if (catalog.boards.length > 0) {
    const first = catalog.boards[0]!
    const loaded = await repo.loadBoard(first.boardId)
    if (loaded) {
      return { catalog, board: loaded.doc }
    }
    throw new Error(
      'O catálogo referencia um quadro que não existe no repositório. Verifique flowboard/ no GitHub.',
    )
  }

  const boardId = crypto.randomUUID()
  const title = 'Meu quadro'
  const doc = createPresetBoardDocument(boardId, title)
  const nextCatalog: CatalogJson = {
    schemaVersion: 1,
    boards: [
      {
        boardId,
        title,
        dataPath: boardFilePath(boardId),
      },
    ],
  }

  await client.putFileJson(boardFilePath(boardId), doc, null)
  await client.putFileJson(CATALOG_PATH, nextCatalog, sha)

  return { catalog: nextCatalog, board: doc }
}
