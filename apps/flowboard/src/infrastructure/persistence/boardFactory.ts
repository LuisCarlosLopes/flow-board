import type { BoardDocumentJson, CatalogJson } from './types'

export function boardFilePath(boardId: string): string {
  return `flowboard/boards/${boardId}.json`
}

export const CATALOG_PATH = 'flowboard/catalog.json'

export function createPresetBoardDocument(boardId: string, title: string): BoardDocumentJson {
  return {
    schemaVersion: 1,
    boardId,
    title,
    columns: [
      { columnId: `${boardId}:todo`, label: 'Todo', role: 'backlog' },
      { columnId: `${boardId}:work`, label: 'Working', role: 'in_progress' },
      { columnId: `${boardId}:done`, label: 'Done', role: 'done' },
    ],
    cards: [],
    timeSegments: [],
    cardTimeState: {},
  }
}

export function emptyCatalog(): CatalogJson {
  return { schemaVersion: 1, boards: [] }
}
