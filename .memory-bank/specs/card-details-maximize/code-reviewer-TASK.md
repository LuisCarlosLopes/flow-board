# Code Review — card-details-maximize (TASK)

> **Agente:** code-reviewer  
> **Escopo:** `CreateTaskModal` (maximizar painel), delta em `.tsx` / `.css` / `.test.tsx`  
> **Data:** 2026-04-21  
> **Veredicto:** **Aprovado para merge** — zero findings **critical**

---

## Sumário executivo

A entrega cumpre o plano: estado local, reset ao fechar, `data-testid` e `aria-pressed`, CSS com painel ampliado e área de descrição flexível. Testes RTL cobrem alternância e persistência de dados. Não há exposição de dados, XSS novo ou quebra de contrato com `Card` / persistência.

**Quality score:** 88/100 (pequenos nitpicks de CSS e estilo, nenhum bloqueio).

---

## Matriz de arquivos

| Arquivo | Avaliação | Notas |
|---------|-----------|--------|
| `CreateTaskModal.tsx` | OK | Toggle acessível; ícone com `aria-hidden`; submit inalterado |
| `CreateTaskModal.css` | OK | Modificadores coerentes; ver nitpick abaixo |
| `CreateTaskModal.test.tsx` | OK | Cenários objetivos; `querySelector` aceitável no contexto de um único modal |

---

## Findings por severidade

### Critical

*Nenhum.*

---

### Medium

**M1 — CSS redundante em `.fb-ctm-overlay--maximized`**

- **Evidência:** O overlay base já usa `place-items: center`. O bloco adiciona `place-items: center` e `align-content: center` sem mudar layout observável.
- **Risco:** Baixo — ruído de manutenção, não bug.
- **Sugestão:** Remover a regra vazia ou documentar intenção futura (ex. alinhamento em outro breakpoint).

**M2 — Foco preso no diálogo (pré-existente, não regressão)**

- **Contexto:** O modal não implementa focus trap; usuários de teclado podem tabear para fora — já era assim antes do maximize.
- **Sugestão:** Backlog: `focus-trap` ou padrão Radix/Headless; fora do escopo desta TASK.

---

### Low

**L1 — Concatenação de `className`**

- Padrão `['a', cond && 'b'].filter(Boolean).join(' ')` repetido duas vezes; opcional extrair helper `cn` local se o projeto adotar isso em outros pontos.

**L2 — Teste com `document.querySelector('.fb-ctm')`**

- Aceitável enquanto só existe um painel por árvore; se no futuro houver mais de um modal, preferir `within(dialog)` ou `data-testid` no painel.

---

## Checklist (qualidade / segurança / a11y)

| Item | Status |
|------|--------|
| Sem novos `any` / supressões desnecessárias | OK |
| Estado sensível / secrets | N/A |
| `aria-pressed` + `aria-label` no toggle | OK |
| `disabled` no toggle durante submit | OK |
| Reset `isMaximized` ao fechar | OK |
| Regressão validação/submit | Não identificada |

---

## Rastreabilidade × acceptance criteria (state.yaml)

| Critério | Status |
|----------|--------|
| Controle visível para alternar tamanho | OK |
| Painel maior no viewport com padding seguro | OK |
| Dados preservados ao alternar | OK + teste |
| `data-testid` estável (`ctm-maximize-toggle`) | OK |
| `role="dialog"`, título associado | OK (inalterado) |

---

## Conclusão

**Merge:** recomendado. Opcional: aplicar apenas o cleanup de **M1** em follow-up de uma linha.
