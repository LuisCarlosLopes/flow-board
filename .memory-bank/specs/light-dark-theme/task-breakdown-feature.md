# Task breakdown: light-dark-theme

**Data:** 2026-04-22  
**Dependências:** Aprovação HITL do pacote spec + IPD + este arquivo.

Ordem de execução:

## T1 — Infra de tema (sem UI)
- Criar `themeConstants.ts` e `themeStore.ts` conforme IPD.
- Testes Vitest `themeStore.test.ts`.
- **DoD:** testes passam; nenhuma mudança visual ainda.

## T2 — CSS tokens light
- Refatorar `tokens.css`: dark em `:root` + `[data-theme="dark"]` (se precisar igualdade exata com baseline); light em `[data-theme="light"]`.
- **DoD:** alternar `data-theme` manualmente no DevTools mostra tema claro utilizável.

## T3 — Bootstrap HTML + wiring React
- Script inline em `index.html`.
- Uma única chamada de sync no arranque (preferência: `main.tsx` imediato após imports, antes de `createRoot`, ou `useEffect` vazio no `App` — **evitar duplicar**).
- **DoD:** reload não pisca tema errado em condições normais.

## T4 — Toggle AppShell + SearchModal
- Botão na topbar + estilos mínimos.
- Remover media query inconsistente em `SearchModal.css`.
- **DoD:** AC.1–AC.5 da spec cobertos manualmente.

## T5 — Verificação final
- Rodar testes + lint do pacote.
- Atualizar `state.yaml` (`squad.status: concluído`) após verifier/reviewer (pós-implementação).

---

## Escopo de escrita autorizado (implementer)

Conforme `state.yaml` → `repo_write_scope`.
