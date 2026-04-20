# Code Review Blockers — Onboarding Page

> **Status:** 🔴 CONDICIONAL — 2 ACÕESs ALTOS bloqueiam merge  
> **Data:** 2026-04-20  
> **Agente:** code-reviewer

---

## ⛔ Bloqueadores de Merge

### BLOCKER #1: Focus Management não implementado (WCAG 2.1 AA)

**Arquivo:** `apps/flowboard/src/features/auth/OnboardingPage.tsx`

**Problema:** 
Modal não implementa focus trap + focus restore conforme WCAG 2.1 AA. IPD (implementer-task.md, linha 144) declarou "WCAG 2.1 AA" como DoD obrigatório.

**Impacto:**
- Usuários com deficiência motora (dependentes de teclado) não conseguem usar modal
- Viola conformidade acessibilidade obrigatória
- SearchModal.tsx (referência) implementa isso; OnboardingPage está aquém

**Correção obrigatória:**
Implemente focus trap (Tab wrapping) + focus restore (ao fechar) conforme SearchModal.tsx linhas 165-203.

**Prazo:** Antes de merge

---

### BLOCKER #2: Duplicação de lógica Escape (Code Quality)

**Arquivo:** `apps/flowboard/src/features/auth/OnboardingPage.tsx`, linhas 24-36

**Problema:**
`useEffect` global listener para Escape (linhas 24-36) duplica lógica do `onKeyDown` do modal (linhas 49-57). Viola DRY (Don't Repeat Yourself).

**Impacto:**
- Dívida técnica: mudanças requerem atualizar 2 lugares
- Fragilidade: event ordering ambígua
- Inconsistência: SearchModal usa só listener no dialog

**Correção obrigatória:**
Remova `useEffect` linhas 24-36. Mantenha apenas `onKeyDown={handleModalKeyDown}` no modal.

**Prazo:** Antes de merge

---

## ✅ Verificação Pré-Merge

Após implementador aplicar blockers, code-reviewer deve validar:

- [ ] Focus trap implementado (Tab wrap)
- [ ] Focus restore ao fechar modal
- [ ] `useEffect` global Escape removido
- [ ] Testes ainda passando (183+)
- [ ] TypeScript compilation sem erros
- [ ] ESLint zero warnings

---

## Status

**Código está:** 80% pronto para merge  
**Bloqueadores:** 2 (ambos endereçáveis em <30 min)  
**Risco técnico:** Médio (acessibilidade fora de spec)  
**Recomendação:** 🔴 **NÃO MERGE** até blockers serem endereçados

---

**Próxima ação:** Implementador corrige ALTOS → Resubmete → Code-reviewer spot-check → APROVAR

