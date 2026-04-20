import { dayStartMs, localDayRange, splitWallIntervalByLocalDays } from './hoursProjection'
import type { BoardWorkingHours, CompletedSegment } from './types'

/**
 * Recorta um intervalo já contido num único dia civil pela janela [startMinute, endMinute).
 * Sem expediente ou desligado: devolve o intervalo se tiver duração positiva.
 */
export function clipIntervalToWorkingHours(
  seg: CompletedSegment,
  wh?: BoardWorkingHours | null,
): CompletedSegment[] {
  if (seg.endMs <= seg.startMs) {
    return []
  }
  if (!wh?.enabled) {
    return [{ ...seg }]
  }
  const dayStart = dayStartMs(new Date(seg.startMs))
  const wStart = dayStart + wh.startMinute * 60 * 1000
  const wEndEx = dayStart + wh.endMinute * 60 * 1000
  const clipStart = Math.max(seg.startMs, wStart)
  const clipEnd = Math.min(seg.endMs, wEndEx - 1)
  if (clipEnd <= clipStart) {
    return []
  }
  return [{ startMs: clipStart, endMs: clipEnd }]
}

/** Pipeline: dia civil → janela (D3–D6). */
export function materializeCountableIntervals(
  startMs: number,
  endMs: number,
  wh?: BoardWorkingHours | null,
): CompletedSegment[] {
  if (endMs <= startMs) {
    return []
  }
  const out: CompletedSegment[] = []
  for (const seg of splitWallIntervalByLocalDays(startMs, endMs)) {
    out.push(...clipIntervalToWorkingHours(seg, wh))
  }
  return out
}

/**
 * Primeiro instante ≥ fromMs que é o início de uma janela expediente (ou o próprio instante se já dentro da janela).
 */
export function firstWorkingWindowStartMs(fromMs: number, wh: BoardWorkingHours): number {
  const dayStart = dayStartMs(new Date(fromMs))
  const wStart = dayStart + wh.startMinute * 60 * 1000
  const wEndEx = dayStart + wh.endMinute * 60 * 1000
  if (fromMs < wStart) {
    return wStart
  }
  if (fromMs < wEndEx) {
    return fromMs
  }
  const nextDayStart = localDayRange(new Date(fromMs)).endMs + 1
  return nextDayStart + wh.startMinute * 60 * 1000
}

/** Após fechar segmentos até lastEndMs, próximo instante onde o contador pode reabrir (D4 sem wh = 00:00 do dia seguinte). */
export function nextWindowStartAfterClosed(lastEndMs: number, wh?: BoardWorkingHours | null): number {
  if (!wh?.enabled) {
    return localDayRange(new Date(lastEndMs)).endMs + 1
  }
  return firstWorkingWindowStartMs(lastEndMs + 1, wh)
}

/**
 * Ao entrar em in_progress: instante em que o tempo começa a contar (D6 reentrada).
 */
export function snapStartForEnteringInProgress(nowMs: number, wh?: BoardWorkingHours | null): number {
  if (!wh?.enabled) {
    return nowMs
  }
  return firstWorkingWindowStartMs(nowMs, wh)
}

/**
 * Separa tempo já fechado (meia-noite / fim de janela) do segmento ainda aberto até `nowMs`.
 */
export function partitionActiveWork(
  activeStartMs: number,
  nowMs: number,
  wh?: BoardWorkingHours | null,
): { completedSegments: CompletedSegment[]; nextActiveStartMs: number | undefined } {
  if (activeStartMs >= nowMs) {
    return { completedSegments: [], nextActiveStartMs: activeStartMs }
  }
  const segments = materializeCountableIntervals(activeStartMs, nowMs, wh)
  if (segments.length === 0) {
    return {
      completedSegments: [],
      nextActiveStartMs: wh?.enabled
        ? firstWorkingWindowStartMs(activeStartMs, wh)
        : localDayRange(new Date(activeStartMs)).endMs + 1,
    }
  }
  const last = segments[segments.length - 1]!
  /** `materializeCountableIntervals` devolve `endMs` ≤ `nowMs`; igualdade = segmento ainda contando. */
  const stillOpen = last.endMs >= nowMs
  if (!stillOpen) {
    return {
      completedSegments: segments,
      nextActiveStartMs: nextWindowStartAfterClosed(last.endMs, wh),
    }
  }
  const prev = segments.slice(0, -1)
  return {
    completedSegments: prev,
    nextActiveStartMs: last.startMs,
  }
}
