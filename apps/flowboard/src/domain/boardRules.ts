import type { Column } from './types'

/**
 * P01–P02 / V01: valid layout for a board.
 * Requires ≥3 columns, ≥1 backlog, exactly 1 in_progress, exactly 1 done (MVP operational preset).
 */
export function validateColumnLayout(
  columns: Column[],
): { ok: true } | { ok: false; message: string } {
  if (columns.length < 3) {
    return { ok: false, message: 'O quadro deve ter no mínimo três colunas.' }
  }
  const backlog = columns.filter((c) => c.role === 'backlog').length
  const inProgress = columns.filter((c) => c.role === 'in_progress').length
  const done = columns.filter((c) => c.role === 'done').length
  if (backlog < 1) {
    return { ok: false, message: 'É necessário pelo menos uma coluna com papel Backlog.' }
  }
  if (inProgress !== 1) {
    return {
      ok: false,
      message: 'Deve existir exatamente uma coluna com papel Em progresso.',
    }
  }
  if (done !== 1) {
    return {
      ok: false,
      message: 'Deve existir exatamente uma coluna com papel Concluído.',
    }
  }
  return { ok: true }
}
