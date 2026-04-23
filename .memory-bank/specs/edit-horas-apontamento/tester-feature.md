# Test Report — `edit-horas-apontamento` (FEATURE)

> Data: 2026-04-22 | Agente: tester (CodeSteer) | Stack: Vitest 4 + Playwright  
> IPD: `.memory-bank/specs/edit-horas-apontamento/planner-FEATURE.md` §6  
> T6: `.memory-bank/specs/edit-horas-apontamento/task-breakdown-FEATURE.md`

## Alvo testado

| Área | Ficheiros |
|------|-----------|
| Domínio | `apps/flowboard/src/domain/applyTargetHoursForCardInPeriod.ts` |
| Unit | `apps/flowboard/src/domain/applyTargetHoursForCardInPeriod.test.ts` |
| Feature | `apps/flowboard/src/features/hours/HoursView.tsx`, `HoursView.css` |
| E2E | `apps/flowboard/tests/e2e/hours-view.spec.ts` |

**Origem:** IPD §6.1 / §6.2 + missão tester (confirmar cobertura vs plano, executar comandos, gate FEATURE).

---

## Stack de testes detectada

| Campo | Valor |
|-------|--------|
| Test runner | Vitest 4 (`vitest run`) |
| Estilo | `describe` / `it`, asserts Vitest |
| Mocks | Não necessários na suíte de domínio (função pura) |
| E2E | Playwright; `getByTestId`; `test.describe.serial` + `test.skip` fora Chromium no bloco E2 |
| Diretório unit | Colocalizado: `src/domain/*.test.ts` |
| Diretório E2E | `apps/flowboard/tests/e2e/` |

---

## Cobertura vs IPD §6.1 (domínio — obrigatório)

| Requisito IPD §6.1 | Coberto? | Teste (nome resumido) |
|--------------------|----------|------------------------|
| Happy path: 2 segmentos no período, `targetMs` entre 0 e S; Σ duração no período = `targetMs`; `nextCompleted` = reconstrução ordenada | Sim | `happy path: two segments in period...` |
| Arredondamento: resto ≠ 0; Σ exata após correção | Sim | `rounding: remainder forces exact sum to targetMs` |
| `targetMs = 0`: remove selecionados no período; `completed` sem esses intervalos; fora do período intactos | Sim | `targetMs = 0 removes only R09-selected segments...` |
| `NO_SEGMENTS` | Sim | `NO_SEGMENTS when no segment end falls in period` |
| `INFEASIBLE_TARGET` (teto expediente / aumento inviável) | Sim | `INFEASIBLE_TARGET when proportional end exceeds working-hours ceiling` |
| `INVALID_TARGET` (`targetMs > maxTargetMs`) | Sim | `INVALID_TARGET when targetMs exceeds maxTargetMs...` |
| Working hours `enabled: true` vs `false` (tetos distintos) | Sim | `working hours off allows longer stretch than strict WH on same segment start` |
| Extra (não listado no bullet único do IPD) | Sim | `INVALID_TARGET for non-integer targetMs` — reforço do contrato §4.1.2 |

**Conclusão §6.1:** todos os bullets normativos do IPD têm pelo menos um caso assertivo; sem lacuna material face ao §6.1.

---

## Cobertura vs IPD §6.2 (E2E — mínimo)

| Requisito IPD §6.2 | Estado |
|--------------------|--------|
| Navegação `nav-hours` → `hours-view` | Coberto no smoke `navega para Horas e exibe a vista` |
| `data-testid` sugeridos (linha edit, modal, input, save, cancel, erro, retry) | Presentes em `HoursView.tsx` (`hours-row-edit` + `data-board-id` / `data-card-id`; `hours-edit-modal`, `hours-edit-input`, `hours-edit-save`, `hours-edit-cancel`, `hours-edit-error`; `hours-edit-retry` no banner de conflito). E2E usa subset: `nav-hours`, `hours-view`, `hours-row-edit`, `hours-edit-modal`, `hours-period-day`. |
| Cenário mínimo / setup auth | Reutiliza fluxo existente (`auth.setup.ts` + Kanban: criar cartão, arrastar colunas, Horas, abrir modal) |
| E2 (fechar modal ao mudar período/escopo) | Automatizado: `E2: alterar período (Dia/Semana) com modal aberta fecha o diálogo` |

**Lacunas E2E (residual, não bloqueiam §6.2 último parágrafo):**

- Não há assert Playwright para **Salvar**, **Cancelar**, validação de input, mensagens de domínio/rede ou CTA **409** (`hours-edit-retry`) — permanecem cobertos por **unit + revisão estática + verifier**; ampliar E2E seria endurecimento opcional pós-MVP.
- Bloco E2 mutante GitHub: `test.skip(browserName !== 'chromium', …)` — alinhado ao Delivery/verifier; **menos cobertura multi-browser** para esse cenário.

---

## Code review (ALTO a11y) — verificação no repo

O relatório `code-reviewer-feature.md` apontava **ALTO**: `aria-hidden="true"` num ancestral do `role="dialog"`.

**Estado atual:** o markup usa `fb-hours-modal-root` com **backdrop** decorativo `aria-hidden="true"` e o **painel `role="dialog"` como irmão**, não descendente do nó oculto — comentário explícito no código. O achado **F1 deixa de aplicar** à revisão atual do repositório.

*(Outros pontos médios do code-reviewer — focus trap, `pointer-events`, política 1 ms — permanecem fora do escopo estrito deste Test Report §6, mas podem ser rastreados em merge review.)*

---

## Resultado da execução (cwd: `apps/flowboard`)

| Comando | Exit code |
|---------|------------|
| `pnpm run test` | **0** |
| `pnpm exec playwright test tests/e2e/hours-view.spec.ts --project=chromium` | **0** |

**Tail Vitest (resumo):** 26 ficheiros, **281** testes passados, ~2,8 s.

**Tail Playwright:** 3 passed (setup auth + smoke + E2 período/modal), ~10,6 s, projeto **chromium**.

---

## Flaky / deferral

| Risco | Nota |
|-------|------|
| E2E + GitHub | Persistência real e `board-page-saving` — possível flakiness operacional; mitigado por timeouts generosos e `describe.serial`. |
| Drag Kanban | Dependência de DnD estável no Chromium para preparar dados em Horas. |
| Chromium-only (E2 mutante) | Documentado no spec; outros browsers não executam o teste E2. |

---

## Comportamentos não cobertos por E2E automatizado

- Fluxo completo **editar → Salvar → reload lista** apenas ao nível de testes manuais / verifier; não reproduzido no `hours-view.spec.ts`.
- Conflito **409** e banner **retry** sem cenário Playwright dedicado.

---

## Bugs descobertos durante esta passagem

Nenhum novo: suíte **verde** nos comandos acima.

---

## Status final — gate FEATURE (testes)

| Campo | Valor |
|-------|--------|
| IPD §6.1 | **Atendido** |
| IPD §6.2 (mínimo + E2) | **Atendido** (com lacunas E2E profundidade documentadas) |
| `pnpm run test` | **PASS** (exit 0) |
| Playwright `hours-view.spec.ts` chromium | **PASS** (exit 0) |
| **FEATURE gate (tester)** | **PASS** |

---

```json
{
  "agent": "tester",
  "status": "complete",
  "slug": "edit-horas-apontamento",
  "track": "FEATURE",
  "unit_tests_analyzed": 9,
  "integration_e2e_files": 1,
  "pnpm_run_test_exit": 0,
  "playwright_hours_view_exit": 0,
  "ipd_6_1_complete": true,
  "ipd_6_2_minimum_met": true,
  "feature_gate": "PASS",
  "bugs_discovered": 0,
  "report_path": ".memory-bank/specs/edit-horas-apontamento/tester-feature.md"
}
```
