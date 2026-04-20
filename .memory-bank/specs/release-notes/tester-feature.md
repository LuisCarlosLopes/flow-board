# Tester — Release Notes (FEATURE)

**Data:** 2026-04-20  
**Stack:** Vitest + Testing Library (happy-dom); Playwright (Chromium, Firefox, WebKit)

## Resumo

| Camada | Ficheiros | Estado |
|--------|-----------|--------|
| Unitário | `ReleaseNotesPage.test.tsx`, `useCurrentVersion.test.ts` | OK — 8 testes |
| E2E | `tests/e2e/release-notes.spec.ts` | OK — 9 passed / 3 skipped (badge, sem sessão) |

---

## Comportamentos cobertos (unitário)

- Render da página e listagem das duas versões do JSON  
- Filtro “feature” reduz alterações visíveis dentro do card  
- Filtro “All” restaura lista completa  
- Badge “Archived” apenas em release arquivada  
- Marcadores `data-change-type` para tipos  
- Hook devolve versão do primeiro release não arquivado (com mock do JSON)

---

## Comportamentos cobertos (E2E)

- `GET /releases` — título, cards 0.1.0 e 0.2.0  
- Filtro feature — texto “Version history UI” visível; “Performance optimization” oculto no card 0.2.0  
- Badge archived no 0.1.0  
- Navegação a partir do shell — **condicional:** `test.skip` se `board-canvas` não carregar (sem PAT/sessão)

---

## Cobertura (amostra direccionada)

Comando: `vitest run --coverage` restrito aos dois ficheiros de teste da feature.

- **Statements ~97%** nos ficheiros incluídos no relatório parcial; ramo `throw` em `useCurrentVersion` (sem release ativo) não exercitado — aceitável.

---

## Pré-requisitos de ambiente

- `npx playwright install` (ou CI equivalente) para Firefox/WebKit  
- E2E do badge: sessão FlowBoard válida ou aceitar skip

---

## Veredicto

**Testes adequados ao risco da FEATURE:** critérios de aceite observáveis com prova automatizada; sem necessidade obrigatória de novos casos para merge.
