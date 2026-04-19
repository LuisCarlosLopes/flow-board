# Delivery report — implementer EPIC onda B (T5–T7)

> **Data:** 2026-04-19 | **Escopo:** `task.md` T5–T7 | **App:** `apps/flowboard/`

---

## Objetivo

Persistência de catálogo e quadros (`flowboard/catalog.json`, `flowboard/boards/*.json`), sessão PAT em `sessionStorage`, fluxo de login com bootstrap de dados vazio e shell autenticado com logout.

## Entregue

| Item | Evidência |
|------|-----------|
| T5 `boardRepository` | `src/infrastructure/persistence/types.ts`, `boardFactory.ts`, `boardRepository.ts` (`createBoardRepository`, `bootstrapFlowBoardData`); erro se catálogo referencia quadro ausente |
| T6 Sessão | `src/infrastructure/session/sessionStore.ts` + `sessionStore.test.ts` (chave `flowboard.session.v1`) |
| T7 Login / shell | `LoginView.tsx`, `AppShell.tsx`, `App.tsx`; `index.html` título **FlowBoard**, `lang="pt-BR"` |

## Testes

- `npm test` — **24** testes (Vitest).
- `npm run build` — OK.

## Próxima onda

- Onda C (T8–T11): lista/CRUD de quadros, BoardView, HoursView, polish UI.

## DoD parcial (onda B)

- [x] Repositório lê/grava catálogo e quadros com SHA  
- [x] Bootstrap cria preset quando catálogo vazio  
- [x] Sessão e PAT não persistem após logout (teste unitário)  
- [x] Login valida API e trata erros  

---

```json
{ "agent": "implementer", "wave": "B", "status": "ok" }
```
