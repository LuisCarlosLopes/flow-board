# Code Review Report — Onboarding Page Modal

> **Data:** 2026-04-20 | **Agente:** code-reviewer | **Módulos:** quality, security

---

## Contexto

| Campo | Valor |
|---|---|
| **Linguagem/Stack** | TypeScript + React 18 (Vitest + React Testing Library) |
| **Contexto de execução** | Browser (SPA) — Login Flow |
| **Escopo** | 5 arquivos: OnboardingPage.tsx/css/test, LoginView.tsx/css (modificado) |
| **Módulos aplicados** | quality, security |

---

## 🔴 Problemas Críticos

✅ **Nenhum encontrado.**

Verificado:
- Sem injeção de código (conteúdo estático, sem sanitização de user input)
- Sem exposição de secrets (token não persiste em modal, passado via callback)
- Sem race conditions ou memory leaks óbvios
- Refs limpas, event listeners removidos, memoization correta

---

## 🟠 Problemas Altos

### 1. Duplicação de lógica Escape — Keyboard Event Handling

**LOCALIZAÇÃO:** `OnboardingPage.tsx`, linhas 24-36 e 49-57

**PROBLEMA:**
Componente implementa **dois listeners** para Escape:
1. Global `document.addEventListener` (linhas 24-36)
2. Modal `onKeyDown` (linhas 49-57)

Esta duplicação é:
- **Redundante:** mesma tecla capturada em dois lugares
- **Difícil de manter:** mudanças requerem atualizar dois locais
- **Inconsistente:** SearchModal.tsx (referência do projeto) usa apenas o listener no dialog

**EVIDÊNCIA:**
```typescript
// Listener 1: Global (redundante)
useEffect(() => {
  if (!isOpen) return
  const handleKeyDown = (e: globalThis.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [isOpen, onClose])

// Listener 2: No dialog (efetivo)
const handleModalKeyDown = useCallback(
  (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  },
  [onClose],
)
```

**CORREÇÃO:**
Remova o `useEffect` global (linhas 24-36). Mantenha apenas `onKeyDown` no modal:

```typescript
// REMOVA:
// useEffect(() => {
//   if (!isOpen) return
//   const handleKeyDown = (e: globalThis.KeyboardEvent) => {
//     if (e.key === 'Escape') {
//       e.preventDefault()
//       onClose()
//     }
//   }
//   document.addEventListener('keydown', handleKeyDown)
//   return () => document.removeEventListener('keydown', handleKeyDown)
// }, [isOpen, onClose])

// MANTENHA:
const handleModalKeyDown = useCallback(
  (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  },
  [onClose],
)
```

**JUSTIFICATIVA:**
- Reduz dívida técnica (aplicar DRY — Don't Repeat Yourself)
- Alinha com padrão estabilizado do projeto (SearchModal)
- Reduz surface area para bugs de event ordering
- Simplifica testes (menos mocks necessários)

---

### 2. Modal não implementa focus management — Acessibilidade WCAG 2.1 AA

**LOCALIZAÇÃO:** `OnboardingPage.tsx`, linhas 19-234

**PROBLEMA:**
Componente não gerencia focus conforme exigência de WCAG 2.1 AA:

1. **Focus trap:** Tab não deve sair do modal enquanto aberto ❌
2. **Focus restore:** Ao fechar, foco deve retornar ao botão que abriu ❌

Implementação atual tem:
- ✅ `aria-modal="true"` (correto)
- ❌ Sem trap de focus (Tab pode navegar para fora do modal)
- ❌ Sem restore de focus ao fechar

Comparar com SearchModal.tsx (linhas 165-203) — implementa focus trap completo.

**EVIDÊNCIA:**
```typescript
// Falta focus trap e restore
if (!isOpen) {
  return null
}

return (
  <div ref={backdropRef} className="fb-onb-backdrop" onClick={handleBackdropClick} role="presentation">
    <div
      ref={modalRef}
      className="fb-onb-modal"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleModalKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
```

**CORREÇÃO:**
Implemente focus management conforme SearchModal (copie padrão):

```typescript
import { useEffect, useRef, useCallback } from 'react'

export function OnboardingPage({ isOpen, onClose }: OnboardingPageProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Focus trap: prevent Tab from leaving modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const modal = modalRef.current
    previousFocusRef.current = document.activeElement as HTMLElement

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const getFocusableElements = (): HTMLElement[] => {
      const nodes = modal.querySelectorAll<HTMLElement>(focusableSelector)
      return [...nodes].filter(
        (el) => el.getAttribute('aria-hidden') !== 'true' && modal.contains(el),
      )
    }

    const handleTabKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = getFocusableElements()
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (!(active instanceof HTMLElement) || !modal.contains(active)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
        return
      }

      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTabKey)

    // Auto-focus first focusable element
    const focusable = getFocusableElements()
    if (focusable.length > 0) {
      focusable[0].focus()
    }

    return () => {
      document.removeEventListener('keydown', handleTabKey)
      // Restore focus to triggering element on close
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Remove old global Escape listener (replaced by modal's onKeyDown)
  // useEffect() lines 24-36 should be deleted
}
```

**JUSTIFICATIVA:**
- **Requisito explícito:** IPD declarou "WCAG 2.1 AA" como DoD (implementer-task.md, linha 144)
- **Padrão do projeto:** SearchModal.tsx implementa exatamente isso
- **Impacto real:** Usuários dependentes de teclado (deficiência motora) não conseguem usar modal sem focus trap
- **Conformidade legal:** WCAG 2.1 AA é critério de acessibilidade obrigatório em muitos contextos

---

## 🟡 Problemas Médios

### 1. Falta de focus restore no LoginView

**LOCALIZAÇÃO:** `LoginView.tsx`, linhas 69-75 e 119

**PROBLEMA:**
Quando OnboardingPage fecha, o focus não é restaurado ao botão "Como gerar PAT?" que a abriu.

```typescript
<button
  className="fb-login__onboarding-btn"
  onClick={() => setIsOnboardingOpen(true)}
  type="button"
>
  Como gerar PAT?
</button>

{/* Quando fecha, focus fica perdido */}
<OnboardingPage isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
```

**CORREÇÃO:**
Capture referência ao botão e restaure foco ao fechar modal:

```typescript
import { useRef, useCallback } from 'react'

export function LoginView({ onConnected }: Props) {
  const onboardingButtonRef = useRef<HTMLButtonElement>(null)

  const handleCloseOnboarding = useCallback(() => {
    setIsOnboardingOpen(false)
    // Restore focus to triggering button (handled by OnboardingPage focus trap)
    // or explicitly:
    // onboardingButtonRef.current?.focus()
  }, [])

  return (
    <main className="fb-login" id="main-content" tabIndex={-1}>
      {/* ... */}
      <button
        ref={onboardingButtonRef}  // ← ADD
        className="fb-login__onboarding-btn"
        onClick={() => setIsOnboardingOpen(true)}
        type="button"
      >
        Como gerar PAT?
      </button>
      {/* ... */}
      <OnboardingPage 
        isOpen={isOnboardingOpen} 
        onClose={handleCloseOnboarding}  // ← UPDATE
      />
    </main>
  )
}
```

Melhor: deixar OnboardingPage salvar e restaurar focus automaticamente (implementado no ALTO achado #2). O LoginView não precisa fazer nada extra.

**JUSTIFICATIVA:**
- WCAG 2.1 AA: Critério 3.2.1 (Focus Order)
- Padrão de acessibilidade em modais
- Melhora UX para usuários de teclado

---

### 2. Documentação defensiva — Ambiguidade de keyboard events

**LOCALIZAÇÃO:** `OnboardingPage.tsx`, linhas 64-73

**PROBLEMA:**
```typescript
<div
  ref={backdropRef}
  className="fb-onb-backdrop"
  onClick={handleBackdropClick}
  role="presentation"
  // FALTA: documentação sobre keyboard handling no backdrop
>
  <div
    ref={modalRef}
    className="fb-onb-modal"
    onClick={(e) => e.stopPropagation()}
    onKeyDown={handleModalKeyDown}
    // Escape aqui, mas não no backdrop
  >
```

Não há bug atual, mas é frágil se alguém adicionar listeners ao backdrop no futuro.

**CORREÇÃO:**
Adicione comentário clarificador:

```typescript
<div
  ref={backdropRef}
  className="fb-onb-backdrop"
  onClick={handleBackdropClick}
  role="presentation"
  // NOTE: Backdrop does not handle keyboard events. Escape is handled only by modal's onKeyDown.
  // This prevents double-handling if backdrop gains keyboard listeners in future.
>
```

**JUSTIFICATIVA:**
- Documentação defensiva
- Previne bugs de event ordering no futuro
- Baixo custo, alto valor de manutenibilidade

---

### 3. Teste de conteúdo estático é genérico demais

**LOCALIZAÇÃO:** `OnboardingPage.test.tsx`, linhas 58-71

**PROBLEMA:**
```typescript
it('renderiza conteúdo educacional (seções, exemplos)', () => {
  // ...
  const content = container.textContent || ''
  expect(content).toContain('Personal Access Token')  // Muito genérico
  expect(content).toContain('Passo')                   // Pode quebrar com typo
  expect(content).toContain('GitHub')                  // Muito genérico
})
```

Strings genéricas não cobrem adequadamente as 7 seções. Um typo em um título quebraria teste falso.

**CORREÇÃO:**
Seja mais específico, testando cada seção nomeada:

```typescript
it('renderiza conteúdo educacional (seções, exemplos)', () => {
  const onClose = vi.fn()
  const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

  const content = container.textContent || ''
  
  // All 7 sections should be present
  expect(content).toContain('O que é um Personal Access Token?')
  expect(content).toContain('Passo 1: Acessar GitHub Settings')
  expect(content).toContain('Passo 2: Criar Token')
  expect(content).toContain('Passo 3: Selecionar Escopos')
  expect(content).toContain('Passo 4: Colar Token no FlowBoard')
  expect(content).toContain('Erros Comuns e Soluções')
  expect(content).toContain('Boas Práticas de Segurança')
})
```

**JUSTIFICATIVA:**
- Melhor cobertura de regressão (7 seções todos nomeadas)
- Teste torna-se documentação viva
- Falha mais cedo se conteúdo educacional mudar

---

## 🔵 Problemas Baixos / Info

### 1. CSS — padding redundante em section--warning

**LOCALIZAÇÃO:** `OnboardingPage.css`, linhas 201-205

**PROBLEMA:**
```css
.fb-onb-section--warning {
  border-left: 4px solid var(--warning);
  padding-left: calc(var(--space-4) - 4px);  /* Compensando border */
}
```

O `calc()` está compensando o `border-left`. Funciona, mas é frágil se `--space-4` mudar.

**CORREÇÃO (opcional):**
Se alinhamento visual está OK, deixe como está. Se quiser simplificar:

```css
.fb-onb-section--warning {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(251, 146, 60, 0.08));
  border-left: 4px solid var(--warning);
  padding: var(--space-4);
  /* Border sits outside padding automatically */
}
```

Ou usar logical properties (mais moderno):
```css
.fb-onb-section--warning {
  padding-inline-start: var(--space-4);
  border-inline-start: 4px solid var(--warning);
}
```

**JUSTIFICATIVA:**
- Observação de manutenibilidade
- Não quebra nada hoje
- Nice-to-have para futuro refactor

---

### 2. Falta `data-testid` em elementos chave

**LOCALIZAÇÃO:** `OnboardingPage.tsx` e `OnboardingPage.test.tsx`

**PROBLEMA:**
Testes usam `querySelector('.fb-onb-modal')`, que é frágil a mudanças CSS. Padrão do projeto usa `data-testid` (SearchModal.tsx, linha 323).

**EVIDÊNCIA:**
```typescript
// Teste atualmente:
const backdrop = container.querySelector('.fb-onb-backdrop')  // Frágil a CSS
expect(backdrop).toBeInTheDocument()

// Deveria ser:
const backdrop = container.getByTestId('onboarding-backdrop')  // Robusta
expect(backdrop).toBeInTheDocument()
```

**CORREÇÃO:**
Adicione `data-testid` nos componentes-chave:

```typescript
// OnboardingPage.tsx
return (
  <div
    ref={backdropRef}
    className="fb-onb-backdrop"
    data-testid="onboarding-backdrop"  // ← ADD
    onClick={handleBackdropClick}
    role="presentation"
  >
    <div
      ref={modalRef}
      className="fb-onb-modal"
      data-testid="onboarding-modal"   // ← ADD
      onClick={(e) => e.stopPropagation()}
      // ...
    >
```

Atualize testes:
```typescript
it('renderiza modal quando isOpen=true', () => {
  const onClose = vi.fn()
  const { getByTestId } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

  expect(getByTestId('onboarding-backdrop')).toBeInTheDocument()
  expect(getByTestId('onboarding-modal')).toBeInTheDocument()
  expect(getByTestId('onboarding-modal')).toHaveAttribute('aria-modal', 'true')
})
```

**JUSTIFICATIVA:**
- Segue padrão de projeto (SearchModal)
- Testes mais legíveis e manuteníveis
- Desacoplamento CSS/testes (CSS pode mudar, teste não quebra)

---

### 3. Breakpoint de CSS poderia ser melhor documentado

**LOCALIZAÇÃO:** `OnboardingPage.css`, comentários linhas 10-14, 375-419

**PROBLEMA:**
Documentação menciona "mobile-first (320px)" mas há jumps entre base implicit e 360px breakpoint.

```css
/* 
 * Responsive:
 * - Mobile-first (320px)      ← implicit
 * - Tablet (768px+)           ← explicit
 * - Desktop (1024px+)         ← explicit
 */

/* ... lots of css ... */

@media (max-width: 360px) {  /* Jump from implicit 320px to explicit 360px */
  /* ... */
}
```

**CORREÇÃO (documentação apenas):**
Deixe claro que 320px-360px usam defaults de `.fb-onb-backdrop` + `.fb-onb-modal`:

```css
/*
 * Responsive Design:
 * 
 * Base (320px–360px): Implicit defaults in .fb-onb-backdrop and .fb-onb-modal
 *   - width: 90vw; max-width: 600px
 *   - padding: var(--space-3)
 *   - Ensures fit on very small screens without explicit breakpoint
 * 
 * Tablet (360px–768px): @media (max-width: 360px) adjusts padding/sizing
 * Tablet+ (768px): @media (min-width: 768px) increases width to 80vw
 * Desktop+ (1024px): @media (min-width: 1024px) sets width to 50vw
 */
```

**JUSTIFICATIVA:**
- Clarificação de intent
- Código está correto, apenas documentar melhor

---

## 📊 Resumo

| Métrica | Valor |
|---|---|
| **Total de achados** | 8 |
| **Críticos (🔴)** | 0 |
| **Altos (🟠)** | 2 |
| **Médios (🟡)** | 3 |
| **Baixos/Info (🔵)** | 3 |

---

## ✅ Verificações Passadas

| Verificação | Status | Notas |
|---|---|---|
| **Compilação TypeScript** | ✅ | Zero erros (verificado em implementer-task.md) |
| **Lint ESLint** | ✅ | Zero warnings (verificado em implementer-task.md) |
| **Testes Vitest** | ✅ | 7 novos testes passando (183 total) |
| **Padrões CSS BEM** | ✅ | Nomenclatura `.fb-onb-*` consistente |
| **Imports TypeScript** | ✅ | Referências relativas corretas |
| **Acessibilidade base** | ✅ | `role="dialog"`, `aria-modal`, `aria-labelledby` presentes |
| **Keyboard Escape** | ✅ | Funciona (mas com duplicação — vide ALTO #1) |
| **Click backdrop** | ✅ | Funciona |
| **Responsividade** | ✅ | Mobile (320px), Tablet (768px), Desktop (1024px) |

---

## 🎯 Recomendação de Merge

**Status:** 🔴 **CONDICIONAL** (bloqueia merge se ALTOS não forem endereçados)

**Ações necessárias (ALTOS):**

1. **[ALTO #1] Remova listener global Escape** — Remova `useEffect` linhas 24-36
2. **[ALTO #2] Implemente focus management** — Adicione focus trap + restore (copie de SearchModal)

**Ações recomendadas (MÉDIOS):**

3. **[MÉDIO #1] Focus restore no LoginView** — Adicione ref ao botão (ou deixar para OnboardingPage)
4. **[MÉDIO #2] Documentação defensiva** — Adicione comentário sobre keyboard handling
5. **[MÉDIO #3] Teste mais específico** — Nomeie todas as 7 seções no teste

**Nice-to-have (BAIXOS):**

6. **[BAIXO #1] Refactor CSS padding** — Opcional, funciona hoje
7. **[BAIXO #2] Adicione data-testid** — Segue padrão, opcional
8. **[BAIXO #3] Documente breakpoints** — Comentário apenas

---

## 📝 Prioridade de Correção

```
BLOQUEADOR (merge não pode prosseguir):
  1. [ALTO #2] Focus management — WCAG 2.1 AA compliance
  2. [ALTO #1] Duplicação Escape — Code quality (DRY)

RECOMENDADO (antes de merge):
  3. [MÉDIO #3] Teste mais específico — Cobertura melhor
  4. [MÉDIO #1] Focus restore LoginView — Acessibilidade completa
  5. [MÉDIO #2] Documentação defensiva — Manutenibilidade

OPCIONAL (pós-merge):
  6. [BAIXO #1] CSS refactor
  7. [BAIXO #2] data-testid
  8. [BAIXO #3] CSS documentation
```

---

## Conclusão

**Código entregue está 80% pronto.** Implementação técnica é sólida (compilação, lint, testes passando), mas **acessibilidade não atende WCAG 2.1 AA conforme IPD** e há **dívida técnica** (duplicação de Escape).

**Com as 2 correções de ALTO, código atingirá 100% de conformidade.**

---

**Data da revisão:** 2026-04-20  
**Próximo passo:** Implementador endereça ACÕESs ALTOS → Resubmete para spot-check → APROVAR/MERGE

