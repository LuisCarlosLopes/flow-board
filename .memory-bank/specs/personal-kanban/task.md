# FlowBoard MVP — Plano de execução (task breakdown)

> **Origem:** `planner-epic.md` v1.0 | **Epic:** personal-kanban | **Data:** 2026-04-19  
> **Uso:** executar em ordem; **track sugerido** para ondas posteriores.

---

## Ordem global

| ID | Task | Depende de | Track sugerido |
|----|------|------------|----------------|
| T1 | Bootstrap `apps/flowboard` (Vite React TS, lint, scripts `dev/build/test`) | — | TASK |
| T2 | Tipos de domínio + invariantes coluna (P01–V02) + testes | T1 | TASK |
| T3 | Motor de tempo: segmentos R01–R06, totais, projeção horas R09 + testes | T2 | TASK |
| T4 | `GitHubContentsClient` + normalização URL + testes mock (401/409/429) | T1 | TASK |
| T5 | `boardRepository`: ler/escrever `catalog.json` e `boards/*.json` com SHA | T3, T4 | FEATURE |
| T6 | Sessão PAT (`sessionStorage`) + camada que injeta token no client | T4 | TASK |
| T7 | UI Login + validação real API + logout + copy segurança RF14 | T5, T6 | FEATURE |
| T8 | UI lista/seleção quadros + criar renomear excluir (confirmação) | T7 | FEATURE |
| T9 | BoardView: colunas preset, CRUD card, editar colunas (modal), DnD | T8 | FEATURE |
| T10 | HoursView: filtros período + escopo; RF12 ou corte documentado | T9 | FEATURE |
| T11 | Remover/ocultar busca/notificações/favoritos/labels reais; a11y básico | T9 | TASK |
| T12 | README, matriz RF×teste preenchida, revisão DoD | T10, T11 | TASK |

---

## Critérios de conclusão por task (verificáveis)

- **T1:** `pnpm/npm run build` e `npm run test` passam (mesmo que smoke).  
- **T2:** Testes falham se P01/P02 violados.  
- **T3:** Casos R03, R04, R06 cobertos por teste unitário.  
- **T4:** Mock prova retry/backoff em 429 e novo GET em 409.  
- **T5:** Integração simulada: grava e relê mesmo `boardId` com SHA coerente.  
- **T6:** Após logout, `sessionStorage` sem PAT; após refresh sem sessão, tela login.  
- **T7:** Erro de PAT/repo visível; sucesso leva a shell autenticado.  
- **T8:** Dois quadros criados no mesmo repo de teste persistem após reload.  
- **T9:** Mover card Working→Done altera totais; invalid column edit bloqueada.  
- **T10:** Totais batem com fixtures de domínio para período fixo.  
- **T11:** Topbar sem chamada de busca; botões decorativos desabilitados ou ausentes.  
- **T12:** DoD §3 planner marcado checklist-completo no PR ou doc.

---

## Sub-tracks EPIC (para ondas)

- **Onda A (T1–T4):** fundação — pode rodar **TASK** por PR.  
- **Onda B (T5–T7):** persistência + auth — **FEATURE**-sized.  
- **Onda C (T8–T11):** produto visível — **FEATURE**.  
- **Onda D (T12):** fechamento — **TASK**.

---

## Bloqueios

Nenhum conhecido além de credenciais GitHub de teste fornecidas pelo desenvolvedor.
