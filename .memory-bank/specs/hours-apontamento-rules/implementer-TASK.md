# implementer — TASK — hours-apontamento-rules

**Data:** 2026-04-20  
**Track:** TASK  
**Status:** concluído (implementação no repo)

## Entregas

### Persistência (T1)
- `BoardWorkingHours` em `domain/types.ts`; `BoardDocumentJson.workingHours?` em `infrastructure/persistence/types.ts`.
- Boards novos sem campo = legado 24h.

### Domínio (T2–T6)
- `hoursProjection.ts`: `dayStartMs`, `splitWallIntervalByLocalDays`.
- `workingHours.ts`: `clipIntervalToWorkingHours`, `materializeCountableIntervals`, `firstWorkingWindowStartMs`, `snapStartForEnteringInProgress`, `partitionActiveWork`, `nextWindowStartAfterClosed`.
- `timeEngine.ts`: `applyCardMove(..., wh?)` com pipeline ao fechar em `done`; `reconcileTimeStateWithCardPositions` (D2); `reconcileActiveTimers` + `reconcileBoardTimeState` (D4/D6 Opção A).

### Bridge (T7)
- `appendNewSegments` inalterado; teste `timeBridge.test.ts` com dois segmentos numa transição.

### UI (T8)
- `ColumnEditorModal`: expediente opcional (checkbox + time início/fim), validação `start < end`.
- `BoardView`: reconciliação ao carregar (persiste se sanar estado); intervalo 60s + `visibilitychange`; `commitAfterDrag` e `handleColumnApply` passam `workingHours`.

### Qualidade (T9)
- `npm test` e `npm run lint` (sem erros em `src/`); `npm run build` OK.

## Próxima fase sugerida (squad)

- **code-reviewer** → **tester** (pipeline TASK).

## Notas

- Turno noturno (janela cruzando meia-noite) permanece fora do escopo (IPD).
- ESLint: `eslint-disable-next-line` no efeito que abre modal a partir de `cardToEditId` (padrão pré-existente).
