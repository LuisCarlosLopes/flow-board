# IPD: Integrar OnboardingPage Modal ao LoginView — v1.0

> Confiança: 95/100 | Complexidade: S | Data: 2026-04-20

---

## 1. MISSÃO

**Objetivo:**
Implementar um componente React `OnboardingPage` que funciona como modal/drawer integrado ao `LoginView`, acionável via botão "Como gerar PAT?", fornecendo instruções passo a passo sobre geração de GitHub Personal Access Token, configuração de scopes, integração ao FlowBoard e boas práticas de segurança.

**Contexto de Negócio:**
Novos usuários do FlowBoard enfrentam barreira na primeira autenticação ao não saberem gerar um PAT GitHub. A OnboardingPage reduz fricção ao oferecer tutorial inline, diminuindo suporte manual e acelerando onboarding. Inclui troubleshooting para erros comuns (token inválido, permissões insuficientes).

---

## 2. ESTADO ATUAL DO SISTEMA

### 2.1 Estrutura de Arquivos Relevante

```
apps/flowboard/src/
├── features/
│   ├── auth/
│   │   ├── LoginView.tsx              ← MODIFICAR (adicionar estado modal + botão)
│   │   ├── LoginView.css              ← PRESERVE (estilos existentes)
│   │   ├── OnboardingPage.tsx         ← CRIAR (novo componente modal)
│   │   └── OnboardingPage.css         ← CRIAR (estilos modal/overlay)
│   ├── app/
│   │   ├── SearchModal.tsx            ← LER (padrão modal de referência)
│   │   └── SearchModal.css            ← LER (padrão CSS de referência)
│   └── board/
│       ├── CreateTaskModal.tsx        ← LER (padrão modal de referência)
│       └── CreateTaskModal.css        ← LER (padrão CSS de referência)
├── hooks/
│   └── useClipboard.ts                ← REUTILIZAR (hook existente)
└── index.css                          ← PRESERVE (variáveis CSS globais)
```

### 2.2 Stack e Convenções Detectadas

| Dimensão | Valor Detectado |
|---|---|
| Linguagem/Versão | TypeScript 6.x em modo estrito |
| Framework | React 19.x + Vite |
| Padrão de Componente | Functional components + React hooks (useState, useEffect) |
| Padrão de Teste | Vitest + @testing-library/react + happy-dom |
| Padrão de CSS | BEM + CSS custom properties (variáveis CSS) + prefixo `.fb-*` por feature |
| Padrão de Naming | camelCase funções, PascalCase componentes; arquivos `.tsx` para componentes |
| Padrão de Modal | Overlay fixed com backdrop, conteúdo centralizado, controle via estado (isOpen boolean) |
| Acessibilidade | WCAG 2.1 AA — skip links, role="alert" para erros, tabindex, focus management |

### 2.3 Contratos que NÃO Podem Quebrar

```typescript
// LoginView.tsx — Props públicas que não podem mudar
type LoginViewProps = {
  onConnected: (session: FlowBoardSession) => void
}

// Assinatura de exportação (usada em App.tsx)
export function LoginView({ onConnected }: Props)
```

**Restrições:**
- Não alterar assinatura de props de `LoginView`
- Não alterar lógica de validação ou envio de PAT (LoginView linha 18–55)
- Não criar novos endpoints ou chamar APIs além das existentes
- Não modificar `FlowBoardSession` ou `sessionStore`

### 2.4 Módulo de Referência

Implementação similar encontrada em:
- **SearchModal.tsx** (`features/app/SearchModal.tsx`) — padrão completo de modal com overlay, backdrop, controle de estado, keyboard handling (Escape para fechar)
- **CreateTaskModal.tsx** (`features/board/CreateTaskModal.tsx`) — padrão de validação, form fields, buttons, error display
- **LoginView.css** e **SearchModal.css** — padrão de BEM naming, CSS custom properties, responsive design

Seguir a estrutura destes módulos para manter coesão visual e comportamental.

---

## 3. DEFINIÇÃO DE PRONTO (DoD)

A task está **COMPLETA** apenas quando todos os itens abaixo estiverem satisfeitos:

- [ ] **Funcional — OnboardingPage renderiza corretamente:**
  - Modal abre ao clicar botão "Como gerar PAT?" no LoginView
  - Conteúdo educacional é legível e bem organizado (seções com títulos, passos, exemplos)
  - Modal fecha ao clicar backdrop, pressionar Escape ou clicar botão "Fechar"
  - Design é consistente com LoginView (cores, tipografia, espaçamento)

- [ ] **Compilação:**
  - Zero erros TypeScript (`tsc --noEmit` limpo)
  - Zero warnings no ESLint (`eslint .`)
  - Build sucede (`npm run build`)

- [ ] **Testes de LoginView:**
  - Nenhuma suite existente quebrada (se houver)
  - Novos testes para: abertura/fechamento do modal, funcionamento do botão

- [ ] **Novos testes para OnboardingPage:**
  - Teste unitário: modal renderiza quando isOpen=true
  - Teste: backdrop click fecha modal
  - Teste: Escape key fecha modal
  - Teste: conteúdo estático é renderizado

- [ ] **Lint/Format:**
  - Zero warnings ESLint
  - Código formatado (prettier ou manual conforme padrão do projeto)

- [ ] **Edge Cases:**
  - [ ] Modal em viewport pequena (mobile, 320px) → responsivo, sem overflow não intencional
  - [ ] Modal com JavaScript desabilitado → graceful (sem erro crítico, mas funcionalidade reduzida)
  - [ ] Keyboard navigation → Tab trap funciona, Escape sempre fecha
  - [ ] WCAG 2.1 AA — aria-label, role="dialog" ou role="alertdialog", focus management

- [ ] **Acessibilidade (WCAG 2.1 AA):**
  - role="dialog" ou role="alertdialog" no container modal
  - aria-labelledby apontando para título do modal
  - aria-modal="true"
  - Contraste de cor (foreground × background) ≥ 4.5:1 (AA) ou ≥ 7:1 (AAA)
  - Keyboard accessible (Tab, Escape)

---

## 4. ESPECIFICAÇÃO DE IMPLEMENTAÇÃO

### 4.1 Contrato da Feature

```
INPUT:
  Acionador: Clique no botão "Como gerar PAT?" dentro de LoginView
  Props do OnboardingPage:
    isOpen: boolean — controla visibilidade
    onClose: () => void — callback ao fechar
  
VISUALIZAÇÃO (quando isOpen=true):
  - Overlay de backdrop com blur (opacity 60–70%)
  - Modal centralizado, max-width 600px, padding var(--space-4)
  - Título "Como gerar um Personal Access Token"
  - 5–6 seções educacionais com passos, screenshots (ou ASCII art), exemplos de scopes
  - Seção de troubleshooting (token inválido, permissões insuficientes)
  - Botão "Fechar" ou apenas close icon
  - Acessível via Escape ou clique backdrop

OUTPUT (sucesso):
  - Usuário lê instruções e entende fluxo de geração de PAT
  - Modal fecha sem efeito colateral
  - Estado do LoginView não afetado (inputs, formulário continuam como estavam)

OUTPUT (falha/edge cases):
  - Viewport muito pequena → modal redimensiona, conteúdo scrollável internamente
  - Screen reader → identifica como dialog, lê título e conteúdo em ordem
```

### 4.2 Fluxo de Execução

```
1. LoginView: Estado local [isOnboardingOpen, setIsOnboardingOpen] inicializado em false
2. LoginView: Renderiza botão "Como gerar PAT?" entre title e form
3. Botão clicado → setIsOnboardingOpen(true)
4. OnboardingPage renderiza com isOpen=true
5. OnboardingPage monta:
   - Overlay (fixed, inset 0, backdrop)
   - Dialog container (centered, max-width 600px)
   - Header com título + close icon
   - Scroll container com seções (Steps, Troubleshooting, Tips)
   - Footer com botão "Fechar"
6. Usuário interage:
   - Clica "Fechar" → onClose() → setIsOnboardingOpen(false)
   - Clica backdrop → onClose()
   - Pressiona Escape → onClose()
7. OnboardingPage desmonta, LoginView volta ao estado anterior
```

### 4.3 Mapa de Alterações

| Ação | Arquivo | O que muda | Motivo |
|---|---|---|---|
| CRIAR | `apps/flowboard/src/features/auth/OnboardingPage.tsx` | Novo componente React (150–200 linhas): tipos Props, estado, renderização de modal com conteúdo educacional (6 seções), handlers (onClose, keyboard), acessibilidade | Fornecer tutorial interativo de PAT no modal |
| CRIAR | `apps/flowboard/src/features/auth/OnboardingPage.css` | Novos estilos CSS (150–200 linhas): `.fb-onb-backdrop`, `.fb-onb-modal`, `.fb-onb-header`, `.fb-onb-section`, `.fb-onb-steps`, `.fb-onb-close-btn`, etc. | Estilizar overlay, dialog, conteúdo conforme padrão do projeto |
| MODIFICAR | `apps/flowboard/src/features/auth/LoginView.tsx` | Adicionar: import OnboardingPage, estado useState(false), botão "Como gerar PAT?" entre title e form, condicional para renderizar OnboardingPage | Integrar modal de onboarding ao fluxo de login |
| NÃO TOCAR | `apps/flowboard/src/features/auth/LoginView.css` | — | Preserve estilos existentes; novos estilos vão em OnboardingPage.css |
| NÃO TOCAR | `apps/flowboard/src/App.tsx` | — | Não alterar routing ou estrutura da app |
| NÃO TOCAR | `apps/flowboard/src/infrastructure/**` | — | Preserve camada de dados e GitHub client |

> ⚠️ Qualquer arquivo não listado nesta tabela não deve ser modificado.

### 4.4 Dependências

```json
{
  "novas_libs": [],
  "libs_existentes_usadas": [
    "react@^19.2.4",
    "@testing-library/react@^16.3.2",
    "vitest (já instalado)"
  ],
  "migrations_necessarias": false,
  "variaveis_de_ambiente_novas": []
}
```

---

## 5. GUARDRAILS DE IMPLEMENTAÇÃO

Anti-patterns proibidos nesta implementação:

- ❌ Usar `any` ou tipos implícitos — manter TypeScript strict
- ❌ Modificar LoginView além do necessário (inputs, validação, session logic intocados)
- ❌ Criar arquivo .test.tsx dentro de OnboardingPage.tsx — manter separado se houver teste
- ❌ Usar global state ou context — passar props isOpen/onClose diretamente
- ❌ Lançar erros não esperados — modal é educacional, sem lógica crítica
- ❌ Modificar arquivos fora do Mapa de Alterações (4.3)
- ❌ Adicionar dependências (npm install) — usar apenas React e TypeScript
- ❌ Implementar melhorias não listadas (ex: persistência de "não mostrar mais") — listar como sugestão
- ❌ CSS absoluto/inline — usar classes BEM em OnboardingPage.css
- ❌ Quebrar acessibilidade (WCAG 2.1 AA) — sempre incluir roles, labels, focus trap

---

## 6. TESTES A IMPLEMENTAR

### 6.1 OnboardingPage (novo arquivo: OnboardingPage.test.tsx)

```typescript
describe('OnboardingPage', () => {
  it('renderiza modal quando isOpen=true', () => {
    // Renderizar com isOpen=true, verificar dialog está no DOM
  })

  it('não renderiza quando isOpen=false', () => {
    // Renderizar com isOpen=false, verificar dialog não está no DOM
  })

  it('chama onClose ao clicar backdrop', async () => {
    // Mock onClose, clicar backdrop, verificar chamada
  })

  it('chama onClose ao pressionar Escape', async () => {
    // userEvent.keyboard('{Escape}'), verificar onClose foi chamado
  })

  it('renderiza conteúdo educacional (title, seções, botão fechar)', () => {
    // Verificar presença de elementos: h2, sections com text, button "Fechar"
  })

  it('tem atributos acessibilidade (role, aria-labelledby, aria-modal)', () => {
    // Verificar role="dialog", aria-modal="true", aria-labelledby
  })
})
```

### 6.2 LoginView (modificar test existente ou criar novo)

Se houver LoginView.test.tsx:

```typescript
describe('LoginView com OnboardingPage', () => {
  it('renderiza botão "Como gerar PAT?"', () => {
    // Verificar botão está no DOM
  })

  it('abre modal ao clicar "Como gerar PAT?"', async () => {
    // userEvent.click(button), verificar OnboardingPage modal aparece
  })

  it('fecha modal ao clicar botão "Fechar" da OnboardingPage', async () => {
    // Abrir modal, clicar "Fechar", verificar modal desaparece
  })

  it('não quebra fluxo de login quando modal está aberto', async () => {
    // Abrir modal, input de repo URL e PAT continuam funcionando
  })
})
```

---

## 7. RISCOS, ASSUNÇÕES E PONTOS DE ATENÇÃO

### 7.1 Riscos e Pontos de Atenção

- **Risco: Conteúdo desatualizado** → GitHub muda UI de PAT generation → mitigation: documentar "última atualização" em comentário CSS, revisar anualmente
- **Risco: Modal muito grande em mobile** → viewport pequena (320px) → mitigation: CSS media queries, max-height com scroll interno
- **Risco: Tab trap quebrado** → keyboard navigation quebra fora do modal → mitigation: testar manualmente Tab/Shift+Tab
- **Dependência frágil: Padrão modal** → Se SearchModal ou CreateTaskModal mudar padrão → mitigation: OnboardingPage é self-contained, independente

### 7.2 Assunções Não-Bloqueantes

| # | Assunção residual | Default adotado | Justificativa | Impacto se estiver errada |
|---|---|---|---|---|
| A1 | Modal sempre monta em LoginView, não em contexto de AppShell | OnboardingPage renderizado condicionalmente em LoginView apenas | User decision explícito; simplifica integração | Se precisar onboarding em múltiplos lugares, refatorar para context (low effort) |
| A2 | Conteúdo educacional é estático (sem vídeos, links externos) | 6 seções de texto + exemplos de código em `<pre>` | Reduz complexidade, mantém on-brand, offline-friendly | Se legal/product requerer vídeos, criar task separada |
| A3 | Botão "Como gerar PAT?" fica visível sempre (não oculto em accordion) | Renderizar entre título e form em LoginView | Melhor UX para first-time users | Se espaço ficar muito apertado, mover para menu ou help icon |
| A4 | Close button no modal é "Fechar" texto, não só icon | Texto + icon (X) para acessibilidade | Melhor para screen readers, não ambíguo | Icon-only funciona, mas reduz clarity |

**Nenhuma assunção bloqueante para o executor.** Todas têm default explícito e baixo risco.

---

## 8. PROTOCOLO DE AUTO-CORREÇÃO

O executor deve verificar cada item **antes** de declarar a task completa:

```
VERIFICAÇÃO 1 — Compilação
  → npm run build executa sem erros?
  → tsc --noEmit retorna zero erros?
  → Se NÃO: parar e corrigir tipos TypeScript.

VERIFICAÇÃO 2 — Contratos
  → LoginView.tsx mantém assinatura de Props?
  → Nenhuma função de autenticação foi alterada?
  → Se NÃO: reverter mudanças fora do escopo.

VERIFICAÇÃO 3 — Escopo
  → Apenas 3 arquivos foram tocados (LoginView.tsx, OnboardingPage.tsx, OnboardingPage.css)?
  → Nenhum arquivo de infrastructure, app, board foi modificado?
  → Se NÃO: auditar mudanças, reverter se necessário.

VERIFICAÇÃO 4 — DoD
  → Todos os itens da Seção 3 estão satisfeitos?
  → Modal renderiza? Tests passam? ESLint clean?
  → Se NÃO: continuar implementação até completar.

VERIFICAÇÃO 5 — Acessibilidade (manual)
  → Testar com Tab/Shift+Tab (keyboard navigation funciona?)
  → Testar com Escape (modal fecha?)
  → Testar com screen reader (nvda/jaws lê dialog e conteúdo?)
  → Se NÃO: ajustar ARIA attributes.
```

---

## 9. FORMATO DE ENTREGA DO EXECUTOR

O LLM executor deve finalizar com este bloco obrigatório:

```
## Arquivos Gerados/Modificados
- [caminho completo] — [o que foi feito]
  - apps/flowboard/src/features/auth/OnboardingPage.tsx — novo componente
  - apps/flowboard/src/features/auth/OnboardingPage.css — novo arquivo de estilos
  - apps/flowboard/src/features/auth/LoginView.tsx — adicionado estado + botão

## Decisões de Design Tomadas
- [decisão] → [justificativa baseada no IPD]

## Sugestões Fora de Escopo (não implementadas)
- [item identificado] → [motivo para não implementar agora]

## Checklist DoD
- [x/o] Funcional: [descrição]
- [x/o] Compilação: [status]
- [x/o] Testes: [status]
```

---

## 10. METADADOS

| Campo | Valor |
|---|---|
| Confiança do Plano | 95/100 |
| Complexidade Estimada | S (3–5 arquivos, 1 novo contrato menor: Props/onClose, sem migration) |
| Módulo de Referência | SearchModal.tsx, CreateTaskModal.tsx |
| Total de Arquivos Impactados | 3 (1 CRIAR + 1 CRIAR + 1 MODIFICAR) |
| Requer Migration de Banco | Não |
| Decisões Bloqueantes em Aberto | 0 |
| Assunções Não-Bloqueantes Documentadas | 4 (todas com default explícito) |
| Versão do IPD | v1.0 |
| Autor | planner (Haiku 4.5) |
| Data de Geração | 2026-04-20 |

---

## PRÓXIMOS PASSOS

1. **Task Breakdown** (próximo agente): Decompor em sub-tasks menores se necessário (ex: implementar seções HTML, CSS, testes)
2. **Implementer**: Executar conforme IPD, seguindo Mapa de Alterações
3. **Code Reviewer**: Validar Protocolo de Auto-Correção, estilos BEM, acessibilidade
4. **Tester**: Validar suites de teste, E2E manual (modal abre/fecha, keyboard navigation, mobile responsiveness)

---

**FIM DO IPD — Pronto para Task Breakdown**
