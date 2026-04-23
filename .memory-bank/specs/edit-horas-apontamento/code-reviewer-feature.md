# Code Review Report — `edit-horas-apontamento` (FEATURE)

> Data: 2026-04-22 | Agente: code-reviewer | Módulos: quality, security, performance

## Contexto

**Linguagem/Stack:** TypeScript, React 19, Vite; Vitest; Playwright (E2E).  
**Contexto de execução:** Browser (feature `HoursView`); domínio puro sem I/O.  
**Escopo revisado:** `applyTargetHoursForCardInPeriod.ts` (+ testes), `HoursView.tsx` / `HoursView.css`, `hours-view.spec.ts`.  
**Normativo:** `spec-feature.md` (RF/RNB/E\*), `planner-FEATURE.md` (IPD §3–§6, §4.1.2), `architect-feature.md` (ARD §3.2, GA-03), `constitution.md` (I, VI).

---

### Problemas Críticos

Nenhum encontrado.

---

### Problemas Altos

#### [ALTO] [A11y] `aria-hidden` no ancestral oculta o `dialog` dos leitores de ecrã

**LOCALIZAÇÃO:** `HoursView.tsx` — markup do modal (`fb-hours-modal-overlay` + `role="dialog"`).  
**PROBLEMA:** O overlay usa `aria-hidden="true"` enquanto o painel com `role="dialog"` é **descendente**. Em árvores de acessibilidade, `aria-hidden` no ancestral remove o ramo (incluindo o diálogo) da API de acessibilidade — contraria **RF-01 / RF-02** (modal acessível, nome/foco/teclado para todos os utilizadores).  
**EVIDÊNCIA:**

```505:514:apps/flowboard/src/features/hours/HoursView.tsx
      {edit ? (
        <div className="fb-hours-modal-overlay" aria-hidden="true">
          <div
            className="fb-hours-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hours-edit-title"
            data-testid="hours-edit-modal"
            onClick={(ev) => ev.stopPropagation()}
          >
```

**CORREÇÃO:** Remover `aria-hidden` deste wrapper **ou** repor o backdrop como elemento irmão (só o backdrop com `aria-hidden="true"`) e manter o `dialog` fora de nós ocultos; garantir que o nome acessível (`aria-labelledby`) permaneça num nó **não** oculto.  
**JUSTIFICATIVA:** Padrão WAI-ARIA: conteúdo modal deve permanecer exposto às tecnologias assistivas; alinhado a **RF-02** (`spec-feature.md` §3) e **IPD §3** (modal acessível).

---

### Problemas Médios

#### [MÉDIO] [Corretude / IPD] Duração proporcional nula (`d' ≤ 0`) sem política de 1 ms

**LOCALIZAÇÃO:** `applyTargetHoursForCardInPeriod.ts` — após `proportionalDurations`.  
**PROBLEMA:** **IPD §4.1.2 item 7** e **ARD §3.2** permitem piso mínimo (ex.: 1 ms) quando compatível com `targetMs` e tetos; o código devolve `INFEASIBLE_TARGET` se qualquer `d' ≤ 0`. Para alvos muito pequenos com vários segmentos no período, o método do maior resto pode atribuir 0 ms a um índice — utilizador vê “inviável” em cenário que a norma ainda admite redistribuição mínima.  
**EVIDÊNCIA:**

```137:144:apps/flowboard/src/domain/applyTargetHoursForCardInPeriod.ts
  const dPrime = proportionalDurations(targetMs, selected, dMs)

  for (let i = 0; i < selected.length; i++) {
    if (dPrime[i]! <= 0) {
      return { ok: false, code: 'INFEASIBLE_TARGET' }
    }
  }
```

**CORREÇÃO:** Implementar (ou documentar explicitamente como decisão consciente no IPD) redistribuição determinística de 1 ms até todos os `d' > 0` ou falhar com `INFEASIBLE_TARGET` só quando aritmeticamente impossível dentro dos tetos.  
**JUSTIFICATIVA:** Fecha lacuna entre implementação e contrato normativo **IPD §4.1.2** / **ARD §3.2** (piso mínimo opcional mas normado).

#### [MÉDIO] [UX / Segurança de interação] Overlay com `pointer-events: none`

**LOCALIZAÇÃO:** `HoursView.css` — `.fb-hours-modal-overlay`.  
**PROBLEMA:** Cliques/toques “atravessam” o backdrop escuro e podem ativar controlos por baixo (já assinalado no **Delivery** / **verifier**). Não é injeção nem token, mas é **superfície de erro humano** e pode causar ações inesperadas com modal “aberto”.  
**EVIDÊNCIA:**

```273:283:apps/flowboard/src/features/hours/HoursView.css
.fb-hours-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--backdrop-overlay);
  display: grid;
  place-items: center;
  padding: var(--space-3);
  /* Permite clicar nos filtros de período/escopo por baixo (E2 IPD: mudança de contexto fecha o modal). */
  pointer-events: none;
}
```

**CORREÇÃO:** Preferir capturar eventos no overlay e reencaminhar apenas para controlos de contexto (período/escopo) **ou** fechar/realizar “cancel” ao clicar fora, em vez de deixar pass-through global; documentar trade-off no IPD se mantido.  
**JUSTIFICATIVA:** Reduz risco de clique fantasma; alinha risco residual já notado no **verifier-feature.md** §6 / **implementer-FEATURE.md** “Riscos”.

#### [MÉDIO] [A11y] Sem gestão explícita de foco preso (focus trap)

**LOCALIZAÇÃO:** `HoursView.tsx` — modal (comparado a **IPD §2.3** referência `CreateTaskModal`: “foco preso”).  
**PROBLEMA:** Há foco inicial no input (`requestAnimationFrame`), **Esc** e `role="dialog"`, mas Tab pode sair do modal para o documento — desvio do padrão de modal citado no IPD.  
**EVIDÊNCIA:** `useEffect` foca `hoursInputRef`; não há `focusin`/`tabIndex` ciclo nem biblioteca de trap.  
**CORREÇÃO:** Reutilizar o mesmo padrão de `CreateTaskModal` (trap + retorno de foco ao fechar) ou `inert` no conteúdo de fundo enquanto `edit` está ativo.  
**JUSTIFICATIVA:** **RF-02** / **IPD §2.3** (padrão modal do app).

---

### Baixo / Info

#### [BAIXO] [Qualidade] `parseDateInput` sem validação de componentes

**LOCALIZAÇÃO:** `HoursView.tsx` — `parseDateInput`.  
**PROBLEMA:** Valores inválidos do `<input type="date">` podem produzir `Date` inválida com pouco feedback.  
**EVIDÊNCIA:** `const [y, mo, da] = v.split('-').map(Number)` sem checagem de `NaN` / intervalos.  
**CORREÇÃO:** Validar e, se inválido, manter âncora anterior ou mostrar erro local.  
**JUSTIFICATIVA:** Robustez marginal; risco baixo com input nativo.

#### [INFO] [Performance] `structuredClone(doc)` no save

**LOCALIZAÇÃO:** `HoursView.tsx` — `handleSaveHours`.  
**PROBLEMA:** Clonagem profunda do documento completo — O(tamanho do JSON); aceitável para MVP (**IPD §7.1**).  
**EVIDÊNCIA:** `const nextDoc = structuredClone(doc)`.  
**CORREÇÃO:** Nenhuma obrigatória; monitorizar se boards muito grandes gerarem jank.  
**JUSTIFICATIVA:** Trade-off claro; fora do hot path de scroll.

---

### Segurança (tokens, injeção)

**Nenhum problema encontrado** no diff revisto: sem `dangerouslySetInnerHTML`, sem concatenação em queries; entrada numérica normalizada e validada na UI + domínio; persistência via repositório existente (sem novos superfícies de segredo no escopo).

---

### Performance

**Nenhum hotspot novo crítico:** substituição de `timeSegments` por `cardId` é O(n) sobre segmentos (**IPD §7.1**); `load()` já iterava quadros — comportamento pré-existente.

---

### Rastreabilidade spec / IPD / ARD

| Achado | Referência |
|--------|------------|
| `aria-hidden` + dialog | **TSD** RF-01, RF-02 (§3); **IPD** §3 DoD RF-02, §2.3 |
| `d' ≤ 0` vs 1 ms | **IPD** §4.1.2 item 7; **ARD** §3.2 (duração mínima / viabilidade) |
| Pointer-events overlay | **IPD** §4.2 E2; **verifier** §6 divergência |
| Focus trap | **IPD** §2.3; **TSD** RF-02 |
| R09 / seleção | **ARD** §3.2 item 1 — implementação usa `segmentsCompletedInPeriod` via `isSegmentCompletedInPeriodR09` (**alinhado** a `hoursProjection.ts` L34–38) |

---

### Tabela resumo de achados

| ID | Severidade | Categoria | Título | Ficheiro |
|----|------------|-----------|--------|----------|
| F1 | ALTO | A11y | `aria-hidden` no overlay oculta o `dialog` das tecnologias assistivas | `HoursView.tsx` |
| F2 | MÉDIO | Corretude | `d' ≤ 0` → `INFEASIBLE` sem política de 1 ms (IPD §4.1.2 / ARD §3.2) | `applyTargetHoursForCardInPeriod.ts` |
| F3 | MÉDIO | UX / interação | `pointer-events: none` no backdrop — cliques passam para a página | `HoursView.css` |
| F4 | MÉDIO | A11y | Sem focus trap explícito (desvio vs IPD §2.3 / `CreateTaskModal`) | `HoursView.tsx` |
| F5 | BAIXO | Qualidade | `parseDateInput` sem validação de `NaN` / intervalo | `HoursView.tsx` |
| F6 | INFO | Performance | `structuredClone` do doc completo no save (aceitável MVP) | `HoursView.tsx` |

---

### Resumo

| Campo | Valor |
|--------|--------|
| Total de achados | 6 |
| Críticos | 0 |
| Altos | 1 |
| Médios | 3 |
| Baixos / Info | 2 |
| **Merge-ready (recomendação code-reviewer)** | **NO** |
| **Recomendação interna (taxonomia agente)** | **CONDICIONAL** (≥1 ALTO, 0 CRÍTICOS) |
| Correção prioritária | Corrigir hierarquia `aria-hidden` vs `role="dialog"` para cumprir RF modal acessível |

---

```json
{
  "agent": "code-reviewer",
  "status": "complete",
  "modules_loaded": ["quality", "security", "performance"],
  "findings_total": 6,
  "findings_critical": 0,
  "findings_high": 1,
  "findings_medium": 3,
  "findings_low": 1,
  "findings_info": 1,
  "tagger_missing": 0,
  "tagger_inadequate": 0,
  "recommendation": "CONDICIONAL",
  "merge_ready": false,
  "priority_fix": "Remover aria-hidden do ancestral do dialog ou separar backdrop/dialog (A11y HIGH)",
  "report_path": ".memory-bank/specs/edit-horas-apontamento/code-reviewer-feature.md"
}
```

---

### Atualização (pós-relatório)

**[ALTO] A11y `aria-hidden`:** corrigido na implementação — `fb-hours-modal-root` sem `aria-hidden`; fundo em `fb-hours-modal-backdrop` (irmão) com `aria-hidden="true"`; `role="dialog"` permanece fora do subárvore oculta (`HoursView.tsx` + `HoursView.css`). Reexecutar revisão se for exigido merge-ready formal **YES**.
