# Delivery report — implementer EPIC onda A (T1–T4)

> **Data:** 2026-04-19 | **Escopo:** `task.md` T1–T4 | **App:** `apps/flowboard/`

---

## Objetivo

Fundar o pacote FlowBoard com Vite React TS, domínio (colunas + tempo + projeção de horas) e cliente GitHub Contents com testes de erro/retry.

## Entregue

| Item | Evidência |
|------|-----------|
| T1 Bootstrap | `apps/flowboard/` com `npm run dev`, `npm test`, `npm run build` |
| T2 Regras P01–P02 | `src/domain/boardRules.ts` + `boardRules.test.ts` |
| T3 Motor R01–R06 | `src/domain/timeEngine.ts` + `timeEngine.test.ts`; `hoursProjection.ts` |
| T4 Cliente GitHub | `src/infrastructure/github/url.ts`, `client.ts` + testes 401/429/409 retry |

## Testes

- `npm test` — **20** testes passando (Vitest).

## Não incluído (próximas ondas)

- T5–T12: repositório de quadros, sessão, UI login/board/hours.

## DoD parcial (onda A)

- [x] Build e testes verdes  
- [x] Domínio coberto por testes para invariantes e segmentos  
- [x] Cliente HTTP com conflito/rate limit tratados em teste  

---

```json
{ "agent": "implementer", "wave": "A", "status": "ok" }
```
