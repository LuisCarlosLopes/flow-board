import type { BoardDocumentJson } from '../infrastructure/persistence/types'

export type CatalogBoardRef = { boardId: string; archived?: boolean }

export type ValidateSelectedBoardsResult =
  | { ok: true }
  | { ok: false; code: 'missing' | 'archived'; boardId: string }

/** @MindSpec: CA-E1 — each selected id must exist in catalog and not be archived. */
export function validateSelectedBoardsAgainstCatalog(
  catalogBoards: readonly CatalogBoardRef[],
  selectedIds: ReadonlySet<string>,
): ValidateSelectedBoardsResult {
  const byId = new Map(catalogBoards.map((b) => [b.boardId, b]))
  for (const id of selectedIds) {
    const e = byId.get(id)
    if (!e) {
      return { ok: false, code: 'missing', boardId: id }
    }
    if (e.archived === true) {
      return { ok: false, code: 'archived', boardId: id }
    }
  }
  return { ok: true }
}

/**
 * @MindFlow: Sequential load → any null or throw aborts (RF-07 / CA-08).
 * @MindRisk: No partial dataset; callers must not mix with failed boards.
 */
export async function loadBoardDocumentsOrThrow(
  loadBoard: (id: string) => Promise<{ doc: BoardDocumentJson } | null>,
  boardIds: readonly string[],
): Promise<BoardDocumentJson[]> {
  const docs: BoardDocumentJson[] = []
  for (const id of boardIds) {
    const got = await loadBoard(id)
    if (!got) {
      throw new Error(
        `Não foi possível carregar o quadro selecionado (${id}). Verifique a conexão e tente novamente.`,
      )
    }
    docs.push(got.doc)
  }
  return docs
}
