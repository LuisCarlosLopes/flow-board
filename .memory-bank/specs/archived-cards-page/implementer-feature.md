# Delivery Report — archived-cards-page

> **Agente:** implementer (sessão orquestrador) | **Data:** 2026-04-22  
> **TSD:** spec-feature.md v1.1 | **IPD:** planner-feature.md v1.0

## Mapa de alterações (executado)

| Ficheiro | Acção |
|----------|--------|
| `apps/flowboard/src/features/board/ArchivedCardsPage.tsx` | Criado — carga/salvamento/reconciliação alinhados ao `BoardView`, lista `isCardArchived` + `sortArchivedByDefault`, restaurar/excluir com paridade, empty state sem quadro |
| `apps/flowboard/src/features/board/ArchivedCardsPage.css` | Criado — estilos da lista (antes `fb-archived*` no canvas) |
| `apps/flowboard/src/features/app/AppShell.tsx` | Rota `/archived` via `useLocation`, separador **Arquivados** (`nav-archived`), abas Quadro/Horas saem de `/archived` com `navigate('/')`, `SearchModal` ao escolher resultado redirecciona para `/` + Kanban para abrir modal |
| `apps/flowboard/src/features/board/BoardView.tsx` | Removida secção colapsável de arquivados; confirm de arquivar atualizado (RF06) |
| `apps/flowboard/src/features/board/BoardView.css` | Removidos estilos `fb-archived*` (movidos para `ArchivedCardsPage.css`) |
| `apps/flowboard/tests/e2e/card-archive.spec.ts` | Navegação `nav-archived` + asserção de URL `/archived` |

## Verificações locais

- `npx eslint` nos ficheiros TSX alterados: OK  
- `npm run test -- --run` (Vitest): **273** testes OK  
- `npm run build`: OK  

## Notas

- `App.tsx` inalterado (`path="*"` cobre `/archived`).  
- Domínio `cardArchive.ts`, `SearchModal`, `cardSearch` não alterados.

## Riscos residuais

- Duplicação de lógica de reload/tick 60s entre `BoardView` e `ArchivedCardsPage` (aceite no IPD; hook partilhado possível em follow-up).
