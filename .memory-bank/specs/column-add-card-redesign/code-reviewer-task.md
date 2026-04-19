# code-reviewer-task — column-add-card-redesign (TASK)

**Data:** 2026-04-19  
**Veredicto:** 🟢 Aprovado para merge (zero critical / zero high)

---

## Escopo revisado

| Arquivo | Notas |
|---------|--------|
| `apps/flowboard/src/features/board/BoardView.tsx` | Estado do modal, handlers, `BoardColumn`, botão por coluna |
| `apps/flowboard/src/features/board/BoardView.css` | `.fb-col-add-card` |
| `apps/flowboard/src/features/board/CreateTaskModal.tsx` | `data-testid` + `data-default-column-id` no overlay |
| `apps/flowboard/tests/e2e/create-task.spec.ts` | Novo caso de coluna |
| `apps/flowboard/package.json` | `@playwright/test` |

---

## Findings

### Critical / High

Nenhum.

### Medium (opcional / melhoria incremental)

1. **`data-default-column-id` em produção**  
   Expõe UUID de coluna no DOM para facilitar E2E. Aceitável para app interno; alternativa futura seria expor só em `import.meta.env.DEV` ou prefixo `data-e2e-*` documentado.

2. **E2E dependente da ordem das colunas**  
   O teste usa `.last()` na lista `column-add-card-*`. Se a ordem de colunas mudar no documento, o teste ainda valida consistência interna (testId ↔ atributo), mas deixa de garantir um papel específico (ex. “done”). Aceitável para smoke de wiring.

### Low

- `aria-label` concatena `column.label` sem sanitização extra; rótulos vêm do documento persistido — risco mínimo (mesmo modelo que títulos de coluna já exibidos).

---

## Checklist de qualidade

- [x] Tipagem consistente (`TaskModalState` discriminado por `mode`)
- [x] Sem regressão óbvia no fluxo de edição (`{ mode: 'edit', card }`)
- [x] DnD: `onPointerDown` com `stopPropagation` no add (alinhado aos botões do card)
- [x] Acessibilidade: botão nativo, `aria-label`, `:focus-visible` no CSS
- [x] Escopo respeitado (sem tags/hashtags do mock)

---

## Tolerância TASK

Máximo 2 findings **medium** permitidos; este review registra **2 medium** não bloqueantes → **go**.
