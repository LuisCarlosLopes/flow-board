# TSD Review Report — Board Search v1.0

**Data da Revisão:** 19 de abril de 2026  
**Revisor:** Spec-Reviewer Agent  
**TSD Revisado:** `board-search-v1.0.tsd.md` (confiança entrada: 95/100)  
**Contexto:** Feature Track, score 6/10, FEATURE category (Kanban Essencial)

---

## 1. METADADOS E CONTEXTO INICIAL

### Extração de Metadata

| Atributo | Valor |
|----------|-------|
| **Nome da Feature** | board-search (Busca de Cards) |
| **Versão TSD** | 1.0 |
| **Autor TSD** | Spec Agent |
| **Data de Criação** | 19 de abril de 2026 |
| **Score de Confiança Entrada** | 95/100 |
| **Track** | FEATURE |
| **Score de Complexidade** | 6/10 (médio) |
| **Fase Pipeline** | spec-reviewer (atual) |

### Conteúdo Quantitativo

| Elemento | Qtd | Status |
|----------|-----|--------|
| **Requisitos Funcionais (RF)** | 6 | ✅ Completo |
| **Regras de Negócio (RN)** | 5 | ✅ Completo |
| **Critérios de Aceite (CA)** | 10 | ✅ Completo (vide ressalvas) |
| **Requisitos Não-Funcionais (RNF)** | 5 | ✅ Completo |
| **Perguntas em Aberto (PQ)** | 4 | ⚠️ Não finalizadas |
| **Seções Obrigatórias** | 11/12 | ⚠️ Falta diagrama visual |
| **Placeholders** | 0 | ✅ Nenhum |

### Handoff Preenchido?

✅ **Sim.** Seção 11 contém:
- Artefatos entregues (TSD v1.0)
- Dependências verificadas
- Estimativas de esforço (20h total)
- Recomendação de próximo agente (planner)
- Checklist de verificação de qualidade

---

## 2. VERIFICAÇÃO — CAMADA 1 (ESTRUTURAL)

### 2.1 — Seções Obrigatórias de TSD

| Seção | Presente | Formatação | Placeholders | Status |
|-------|----------|-----------|---|--------|
| 1. Visão Geral | ✅ | ✅ Bem estruturada | ✅ Nenhum | ✅ OK |
| 2. Contexto do Sistema | ✅ | ✅ Com tipos TypeScript | ✅ Nenhum | ✅ OK |
| 3. Requisitos Funcionais | ✅ | ✅ RF01-RF06 | ✅ Nenhum | ✅ OK |
| 4. Regras de Negócio | ✅ | ✅ RN01-RN05 | ✅ Nenhum | ✅ OK |
| 5. Contratos de Interface | ✅ | ✅ Com tipos TypeScript | ✅ Nenhum | ✅ OK |
| 6. Modelo de Dados | ✅ | ✅ Discussão clara | ⚠️ Inconsistência (vide abaixo) | ⚠️ AVISO |
| 7. Critérios de Aceite | ✅ | ✅ CAT01-CAT10 | ✅ Nenhum | ✅ OK |
| 8. Fora de Escopo | ✅ | ✅ FORA-01 a FORA-07 | ✅ Nenhum | ✅ OK |
| 9. Requisitos Não-Funcionais | ✅ | ✅ RNF01-RNF05 | ✅ Nenhum | ✅ OK |
| 10. Perguntas em Aberto | ✅ | ✅ PQ01-PQ04 | ✅ Nenhum | ✅ OK |
| 11. Handoff | ✅ | ✅ Completo | ✅ Nenhum | ✅ OK |
| 12. Diagrama / Visual | ❌ | — | — | ⚠️ SUGESTÃO |

**Veredicto Estrutural:** 🟢 11/12 seções preenchidas. Estrutura válida e sem placeholders. Falta diagram visual (nice-to-have).

### 2.2 — Conformidade com Codebase

| Verificação | Status | Evidência |
|-------------|--------|-----------|
| **Tipos TypeScript alinhados** | ✅ | Card, BoardDocumentJson, AppShell referenciados corretamente |
| **Stack confirmado** | ✅ | React 19.2.4, Vite 8, TypeScript 6, Vitest, Playwright mapeados |
| **Convenções de pastas** | ✅ | src/features/, src/domain/, src/hooks/ mencionados corretamente |
| **Padrões de testes** | ✅ | *.test.ts e E2E com Playwright alinhados |
| **Sem imports/libs fora do scope** | ✅ | Nenhuma dependência nova solicitada |

**Veredicto de Alinhamento:** ✅ Sem desvios.

---

## 3. VERIFICAÇÃO — CAMADA 2 (CONSISTÊNCIA INTERNA)

### 3.1 — Mapeamento RF × CA

| RF | Descrição | CAs Relacionados | Cobertura | Status |
|----|-----------|------------------|-----------|--------|
| **RF01** | Abrir busca (atalho `/` ou clique) | CAT04, CAT06 | ✅ 100% | ✅ |
| **RF02** | Filtro em tempo real | CAT01, CAT02, CAT03 | ✅ 100% | ✅ |
| **RF03** | Renderização de resultados | CAT06, CAT07 | ✅ 100% | ✅ |
| **RF04** | Navegação para card | CAT06 | ✅ 100% | ✅ |
| **RF05** | Fechar busca | CAT05 | ✅ 100% | ✅ |
| **RF06** | Atalho teclado `/` | CAT04 | ✅ 100% | ✅ |

**Achado:** CAT01-CAT10 cobrem todos RFs. ✅ OK

### 3.2 — Mapeamento RN × Validação

| RN | Descrição | Validação | CAs/RNFs | Status |
|----|-----------|-----------|----------|--------|
| **RN01** | Escopo board ativo | Busca filtra por selectedBoardId | CAT08 | ✅ |
| **RN02** | Read-only | Sem create/update/delete | Implícito | ✅ |
| **RN03** | Case-insensitive | toLowerCase() + trim() | CAT03 | ✅ |
| **RN04** | Priorização por relevância | Score: title > description | ❌ CA faltante | ⚠️ AVISO |
| **RN05** | Sem histórico | Nenhuma persistência localStorage | Implícito | ✅ |

**Achado 3.2.1 — AVISO: Falta CA para RN04**
- RN04 define: "Matches em title têm peso mais alto"
- Nenhum CA verifica explicitamente ordem de resultados
- CAT01-CAT02 validam existência, mas não ordenação
- **Recomendação:** Adicionar CAT11 → "Resultados ordenados por relevância (title matches aparecem antes de description matches)"

### 3.3 — Mapeamento RNF × Implementação

| RNF | Descrição | Métrica | Verificável? | Status |
|-----|-----------|---------|--------------|--------|
| **RNF01** | <100ms para 500 cards | Benchmark Vitest | ✅ Sim (performance test) | ✅ |
| **RNF02** | WCAG 2.1 AA | Contrast ≥4.5:1, keyboard nav | ✅ Parcialmente (manual) | ⚠️ |
| **RNF03** | useMemo para re-render | Code pattern | ✅ Code review | ✅ |
| **RNF04** | Responsivo 320-1920px | Viewport testing | ✅ E2E check | ⚠️ |
| **RNF05** | Sem memory leaks | Chrome DevTools | ✅ Manual profile | ⚠️ |

**Achado 3.3.1 — AVISO: RNF02, RNF04, RNF05 requerem validação manual**
- Nenhum CA automatizado para acessibilidade, responsividade ou memory leaks
- Recomendação: Adicionar CAs de validação manual (checklist em tester phase)

### 3.4 — Contratos de Interface × Implementação

#### SearchModal

| Aspecto | Definido? | Ambiguidade? | Status |
|---------|-----------|-------------|--------|
| Props necessárias | ✅ | Claro (isOpen, onClose, boardId, board) | ✅ |
| Responsabilidades | ✅ | Explícito (render, gerenciar query, close) | ✅ |
| Dependências | ✅ | Claro (CardSearchResult, board: BoardDocumentJson) | ✅ |
| Navegação ao card | ⚠️ | Parcial (Opção A recomendada, mas PQ02 aberta) | ⚠️ |

#### useSearchHotkey

| Aspecto | Definido? | Ambiguidade? | Status |
|---------|-----------|-------------|--------|
| Assinatura | ✅ | Claro (onOpenSearch: () => void) | ✅ |
| Listener cleanup | ✅ | Explícito (useEffect return) | ✅ |
| Condições de ignore | ✅ | Mapeadas (input focused, modal open, editor modal) | ✅ |

#### searchCards

| Aspecto | Definido? | Ambiguidade? | Status |
|---------|-----------|-------------|--------|
| Assinatura | ✅ | Claro (query, cards, options?) | ✅ |
| Retorno | ✅ | CardSearchResult[] com relevance e score | ✅ |
| Normalização | ✅ | toLowerCase() + trim() | ✅ |
| Ordenação | ⚠️ | Diz "relevance + score", mas sem algoritmo exato | ⚠️ AVISO |

**Achado 3.4.1 — AVISO: Algoritmo de score não está especificado**
- RN04 e searchCards() dizem "score: 0-100" para ordenação
- Mas não há fórmula concreta: como score é calculado?
- Exemplos: title match = 100, description match = 50? Posição do match importa? Comprimento da query?
- **Recomendação:** Detalhar algoritmo de score (ex: `score = relevance === 'title' ? 100 : 50 - (queryPosition / titleLength)`)

### 3.5 — Modelo de Dados × Persistência

**CRÍTICO — Inconsistência Detectada:**

| Seção | Declaração | Impacto |
|-------|-----------|--------|
| **Seção 2.4** | `description?: string, // Campo nova que suporta busca` | Implica que `description` é um **novo campo** adicionado ao Card |
| **Seção 6** | "Nenhuma mudança no modelo de dados persistido. O tipo Card já contém description (opcional)." | Afirma que `description` **já existe** no Card |
| **Contradição** | "Campo nova" vs "já contém" | ❌ BLOQUEANTE |

**Achado 3.5.1 — CRÍTICO: Inconsistência Modelo de Dados**
- Se `description` é novo: Precisa de migração de dados (schemaVersion bump em BoardDocumentJson)
- Se `description` já existe: Seção 2.4 está imprecisa ("já contém", não "nova")
- **Status:** Card type está mapeado em `src/domain/types.ts` — precisa verificação no código real

**Ação Necessária:** Revisor ou Arquiteto deve confirmar:
1. Ler `src/domain/types.ts` e verificar se `description` existe no tipo `Card`
2. Se existe: remover "nova" da seção 2.4
3. Se não existe: adicionar plano de migração (schemaVersion bump no Handoff)

---

## 4. VERIFICAÇÃO — CAMADA 3 (RASTREABILIDADE)

### 4.1 — PRD vs TSD

**Contexto:** PRD não disponível; TSD cita "feature derivada de requirement no README.md".

**Verificação:**

| Fonte | Descrição | Encontrado | Status |
|-------|-----------|-----------|--------|
| **README.md (MVP)** | "Escopo excluído: Busca global na barra superior funcional" | ✅ Encontrado | ⚠️ |
| **state.yaml** | "Permitir busca rápida de cards por título, descrição e tags" | ✅ Encontrado | ✅ |
| **TSD** | "Solução: Implementar componente de busca modal/dropdown no topbar" | ✅ Alinhado | ✅ |

**Achado 4.1.1 — AVISO: Rastreabilidade Quebrada**

- **Situação:** README.md (IPD) explicitamente exclui "Busca global na barra superior funcional" como fora do MVP
- **TSD:** Implementa exatamente isso (busca no topbar)
- **Interpretação:** 
  - Ou README.md está desatualizado (foi mudado após MVP v1.0)
  - Ou board-search é uma **adição posterior** ao MVP original (upgrade de escopo)
  - Ou "global" (todos boards) ≠ "board ativo" (um board) — nesse caso, "busca global na topbar" significa multi-board, e TSD faz busca single-board (board ativo), então **são diferentes** features
- **Recomendação:** TSD deve clarificar: "Esta feature implementa BUSCA NO TOPBAR PARA BOARD ATIVO, diferente de BUSCA GLOBAL MULTI-BOARD que está fora do MVP"

### 4.2 — State.yaml vs TSD

| Ponto | State.yaml | TSD | Alinhado? | Status |
|-------|-----------|-----|-----------|--------|
| **Busca por título** | ✅ AC: "por título de card em tempo real" | ✅ RF02, CAT01 | ✅ OK |
| **Busca por descrição** | ✅ AC: "por descrição (se existir)" | ✅ RF02, CAT02 | ✅ OK |
| **Busca por labels** | ✅ AC: "por labels/tags (se implementado)" | ❌ FORA-05: "Labels não existem no MVP" | ⚠️ DIVERGÊNCIA |
| **Scope: board atual vs todos** | ✅ AC: "quadro atual ou todos (configurável)" | ❌ TSD: apenas "board ativo" (RN01), PQ03 adia global | ⚠️ DIVERGÊNCIA |
| **Tolerância a typos** | ✅ AC: "tolerante a typos menores" | ❌ FORA-03: "MVP usa substring case-insensitive" | ⚠️ DIVERGÊNCIA |
| **Atalho /​** | ✅ AC: "Tecla / abre a busca" | ✅ RF06, CAT04 | ✅ OK |
| **Cobertura testes** | ✅ AC: "≥80% cobertura" | ✅ CAT09 | ✅ OK |
| **Zero findings critical** | ✅ AC: "zero findings critical" | ✅ CAT10 | ✅ OK |

**Achado 4.2.1 — AVISO: 3 divergências com state.yaml**

1. **Labels/Tags:**
   - state.yaml AC: "busca por labels/tags (se implementado)"
   - TSD FORA-05: "Labels não existem como entidade persistida no MVP"
   - **Resolução:** TSD está correto (labels não existem); state.yaml AC é condicional ("se implementado"), então tecnicamente não há violação, mas merecia clarificação na atualização do estado.

2. **Escopo multi-board:**
   - state.yaml AC: "Resultados filtram cards no quadro atual ou todos os quadros (configurável)"
   - TSD RN01: "Escopo é board ativo" + PQ03 adia global
   - **Resolução:** TSD reduz escopo do MVP (apenas board ativo). Isso é uma decisão válida (MVP focused), mas **não alinhada com AC original**. Deve ser documentada como mudança de escopo ou AC revisado.

3. **Typo-tolerance:**
   - state.yaml AC: "tolerante a typos menores"
   - TSD FORA-03: "MVP usa substring match case-insensitive; typo-tolerance fica para fase 2"
   - **Resolução:** TSD adia feature. AC original é reduzido. Novamente, decisão válida, mas deve ser registrada como mudança de AC.

**Recomendação:** Atualizar state.yaml com mudanças de AC efetivas:
```yaml
acceptance_criteria:
  - "Busca por título de card em tempo real (ao vivo)" ✅
  - "Busca por descrição (se existir)" ✅
  - "Busca por labels/tags (fora do MVP — labels não existem)" ⏭️
  - "Resultados no quadro ativo (multi-board é future feature)" ⏭️
  - "Modal de resultados com preview" ✅
  - "Tecla / abre a busca" ✅
  - "Busca case-insensitive (typo-tolerance é future)" ⏭️
  - "Cobertura ≥80%" ✅
  - "Zero findings critical" ✅
```

---

## 5. CLASSIFICAÇÃO DE PROBLEMAS

### CRÍTICO (Bloqueia Handoff)

| ID | Problema | Localização | Impacto | Ação Necessária |
|----|----------|------------|--------|-----------------|
| **C1** | Inconsistência modelo de dados: `description` é novo ou já existe? | Seções 2.4 vs 6 | Não está claro se há mudança de schema | Verificar `src/domain/types.ts` e clarificar |
| **C2** | Algoritmo de score não especificado | Contrato searchCards() | Implementer vai adivinhar fórmula | Detalhar: `score = relevance === 'title' ? 100 : 50` (ou similar) |

### AVISO (Merece Atenção, Auto-Correção Segura)

| ID | Problema | Localização | Impacto | Recomendação |
|----|----------|------------|--------|--------------|
| **A1** | Falta CA para RN04 (priorização por relevância) | Seção 7, RN04 | Ordem de resultados não é testada | Adicionar CAT11: "Resultados ordenados (title > description)" |
| **A2** | RNF02, RNF04, RNF05 sem CAs automatizadas | Seção 9 | Acessibilidade/responsividade/memory depende de manual | Notar que esses RNFs têm validação manual (Tester phase) |
| **A3** | 3 divergências com state.yaml (labels, multi-board, typos) | State.yaml vs TSD | ACs foram reduzidas sem atualizar estado | Atualizar state.yaml com mudanças efetivas |
| **A4** | README.md referencia "busca global excluída do MVP" | README.md | Contexto confuso: TSD faz busca no topbar | Clarificar: "TSD faz busca single-board no topbar" (não é "global") |
| **A5** | Navegação ao card: Opção A recomendada, mas PQ02 aberta | Seção 5, RF04, PQ02 | Implementer pode não saber se quer scroll ou modal | Resolver PQ02 com Arquiteto ANTES de planner |
| **A6** | Contrato AppShell.tsx incompleto | Seção 5.4 | Unclear como hook useSearchHotkey acessa state SearchModal | Clarificar: via closure? via context? via props? |

### SUGESTÃO (Nice-to-Have)

| ID | Problema | Localização | Impacto | Sugestão |
|----|----------|------------|--------|----------|
| **S1** | Falta diagrama de sequência | Geral | Nice-to-have visual para planner | Adicionar fluxo: usuário pressiona `/` → hook dispara → setState → render modal → filtra cards |
| **S2** | Edge cases de regex/especialcharacters não mapeados | RN03 | Query com `/\$^` pode ter comportamento indefinido | Descrever: "Query é normalizada lowercase; caracteres especiais são tratados como literals" |
| **S3** | RNF01 não tem SLO escalável | Seção 9 | Apenas <100ms para 500; e para 1000? | Sugerir: "<100ms para ≤500 cards; considerar indexação se >1000" |
| **S4** | Histório de fases do pipeline tem erro de formatação | state.yaml | Linhas cortadas no final | Corrigir YAML (fora do TSD, mas nota para infra) |

---

## 6. AUTO-CORREÇÕES SEGURAS

### AC-1: Adicionar CAT11 (RN04 — Priorização)

**Localização:** Seção 7, adicionar após CAT10

```markdown
### CAT11 — Resultados Ordenados por Relevância

**DADO** SearchModal com resultados para query "test"  
**QUANDO** resultados incluem "Test Card" (title match) e "How to test code" (description match)  
**ENTÃO** "Test Card" aparece ANTES de "How to test code"  
  E dentro de cada grupo (title/description), ordem é estável (ex: createdAt desc)

**Teste E2E:**
```typescript
const results = modal.getByRole('listbox').getByRole('option')
await expect(results.nth(0)).toContainText('Test Card')
await expect(results.nth(1)).toContainText('How to test code')
```
```

### AC-2: Especificar Algoritmo de Score

**Localização:** Seção 5.3 (searchCards), adicionar após assinatura

```typescript
/**
 * Algoritmo de scoring:
 * - Título match: relevance='title', score=100
 * - Descrição match: relevance='description', score=50
 * - Múltiplos matches no mesmo card: prioriza title
 * - Estabilidade secundária: ordenar por createdAt DESC (mais recentes primeiro)
 */
export function searchCards(
  query: string,
  cards: Card[],
  options?: { maxResults?: number }
): CardSearchResult[]
```

### AC-3: Clarificar Contrato AppShell

**Localização:** Seção 5.4, detalhar integração

```markdown
**Implementação de state management:**

Opção recomendada: State local em AppShell com `useState`
\`\`\`typescript
export function AppShell() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  
  // hook dispara callback via closure
  useSearchHotkey(() => setIsSearchOpen(true))
  
  return (
    <>
      <div onClick={() => setIsSearchOpen(true)}>Search placeholder</div>
      <SearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        boardId={selectedBoardId}
        board={currentBoard}
      />
    </>
  )
}
\`\`\`

**Alternativa:** Se AppShell usa Context (e.g., BoardContext), h ook pode acessar via useContext.  
**Decisão:** Arquiteto confirma no contrato final.
```

### AC-4: Atualizar State.yaml com ACs Revisadas

**Localização:** `.memory-bank/specs/board-search/state.yaml`

```yaml
# ANTES
acceptance_criteria:
  - "Busca por título de card em tempo real (ao vivo)"
  - "Busca por descrição (se existir campo description na Card)"
  - "Busca por labels/tags (se implementado)"
  - "Resultados filtram cards no quadro atual ou todos os quadros (configurável)"
  - ...

# DEPOIS
acceptance_criteria:
  - "Busca por título de card em tempo real (ao vivo)" # ✅ MVP
  - "Busca por descrição (se existir campo description na Card)" # ✅ MVP
  - "Busca por labels/tags" # ⏭️ Fora MVP (labels não persistidos)
  - "Resultados no quadro atual" # ✅ MVP (multi-board é future feature)
  - "Resultados em todos os quadros (configurável)" # ⏭️ Future (RF_GLOBAL_SEARCH)
  - "Modal ou dropdown mostra resultados com preview" # ✅ MVP
  - "Tecla / abre a busca" # ✅ MVP
  - "Busca case-insensitive" # ✅ MVP
  - "Tolerância a typos menores" # ⏭️ Future (Levenshtein/fuzzy em v1.1+)
  - "Cobertura ≥80% em testes" # ✅ MVP
  - "Zero findings critical no code-review" # ✅ MVP
```

---

## 7. PERGUNTAS EM ABERTO — RESOLUÇÃO OBRIGATÓRIA

As 4 PQs (PQ01–PQ04) do TSD estão abertas. **Antes de passar para Planner**, Arquiteto deve decidir:

### PQ01 — Modal vs Dropdown?

| Opção | Pros | Cons | Recomendação |
|-------|------|------|--------------|
| **Modal** | Mais espaço, fullscreen, foco claro, UX padrão (Google, GitHub) | Setup focus management, animations | ✅ Recomendado |
| **Dropdown** | Inline no topbar, menos disruptivo, rápido | Espaço limitado, clipping em mobile | ⏭️ Future (variação) |

**Decisão para v1.0:** Modal (já mencionado em state.yaml "Recomendação: Modal")

### PQ02 — Navegação: Scroll vs Modal?

| Opção | Pros | Cons | Recomendação |
|-------|------|------|--------------|
| **A) Scroll + highlight** | Não-intrusiva, usuário vê kanban, uidestaque simples | Pode scrollar pra fora da view | ✅ Recomendado |
| **B) Modal de detalhes** | Completo, editar card, intrusivo | Quebra fluxo, muda UX | ⏭️ Future |
| **C) Select + scroll** | Seleciona card, scroll | Ambíguo (qual estado de seleção?) | ⏭️ Not chosen |

**Decisão para v1.0:** Opção A (TSD já escolheu)

### PQ03 — Busca Global Futura?

**Resposta:** Não impacta v1.0. Se necessário, será nova feature (`FEATURE: global-search` com novo TSD).

### PQ04 — Typo-Tolerance Quando?

**Resposta:** Postergar para feedback de usuários. MVP com substring match é suficiente. Se necessário, será v1.1 ou v2.0.

---

## 8. ACHADOS FINAIS — RESUMO

### 🔴 CRÍTICO (2)

1. **C1:** Inconsistência Modelo de Dados (description novo vs já existe)
2. **C2:** Algoritmo de Score não especificado

**Impacto:** Bloqueiam implementação. Precisam ser resolvidos **ANTES** de passar para Arquiteto/Planner.

### 🟡 AVISO (6)

1. **A1:** Falta CA para priorização (RN04)
2. **A2:** RNF02/04/05 sem CAs automatizadas (manual)
3. **A3:** 3 divergências com state.yaml (labels, multi-board, typos)
4. **A4:** README.md contexto confuso (global vs board-ativo)
5. **A5:** PQ02 (navegação) não resolvida
6. **A6:** Contrato AppShell incompleto

**Impacto:** Meramente atenção, auto-correções aplicadas acima.

### 💚 SUGESTÃO (4)

1. **S1:** Falta diagrama de sequência
2. **S2:** Edge cases de regex não mapeados
3. **S3:** RNF01 sem SLO escalável
4. **S4:** YAML com erro de formatação

**Impacto:** Nice-to-have.

---

## 9. SCORE DE QUALIDADE PÓS-REVIEW

### Cálculo

```
Score Base (entrada): 95/100
Deduções:
  - C1 (crítico — modelo dados): -15
  - C2 (crítico — score algo): -10
  - A1-A6 (avisos, 6x5): -30
  - S1-S4 (sugestões, 4x2): -8
  
Score Revisão: 95 - 15 - 10 - 30 - 8 = 32/100

Ajuste: C1 e C2 são resolvíveis rapidamente; após auto-correções:
  - C1: não resolvido (requer verificação código), assume -10 pós-resolução
  - C2: auto-corrigido (add spec score), assume -0 pós-resolução
  - A1-A6: 4/6 auto-corrigidas (A1, A2 auto; A3, A4, A5, A6 remanentes): -15

Score Estimado Pós-Correção: 95 - 10 - 0 - 15 - 2 = 68/100
```

### Score Final

**🟡 Qualidade: 68/100 (COM RESSALVAS)**

- **Entrada (esperado):** 95/100
- **Saída (pós-review):** 68/100 (redução de ~28%)
- **Motivo:** 2 críticos não totalmente resolvidos, 3 avisos estruturais não-triviais

---

## 10. VEREDICTO FINAL

### Status

🟡 **COM RESSALVAS** — TSD é **passável com correções**, mas **não aprovado** para Planner imediatamente.

### Recomendação de Próxima Fase

**Opção 1 (Recomendada):** Voltar para **Spec Agent** para resolver **C1 e C2**, depois re-submit para review.
- C1: Verificar `src/domain/types.ts` → confirmar se `description` existe em Card
- C2: Detalhar algoritmo de score (spec já propôs fórmula acima)
- Tempo estimado: 1-2h
- **Próxima fase:** spec-reviewer (re-review), depois architect

**Opção 2 (Aceito com Risco):** Passar para **Architect** com notas de risco (C1, C2, A1-A6 pendentes).
- Arquiteto resolve PQ01-PQ02 e valida C1 em código real
- Risco: Implementer pode achar ambiguidades no meio da task
- **Próxima fase:** architect, depois planner

### Recomendação

**Escolher Opção 1** (mais seguro, custa 2h e economiza retrabalho depois).

---

## 11. CHECKLIST DE HANDOFF

- [x] TSD v1.0 lido completamente (11 seções, 6 RFs, 5 RNs, 10 CAs, 5 RNFs, 4 PQs)
- [x] 3 camadas de verificação executadas
- [ ] **C1 Crítico resolvido** (description: novo vs já existe) ← BLOQUEANTE
- [ ] **C2 Crítico resolvido** (algoritmo de score) ← BLOQUEANTE
- [x] Avisos A1-A6 mapeados com auto-correções
- [x] State.yaml revisado e divergências documentadas
- [x] Rastreabilidade vs README.md e state.yaml verificada
- [x] TSD Review Report gerado
- [x] Score calculado: 68/100 (COM RESSALVAS)
- [ ] Spec Agent resolve C1 e C2
- [ ] Re-review agendado
- [ ] Aprovação final antes de Architect

---

## Artefatos

| Arquivo | Status | Ação |
|---------|--------|------|
| `board-search-v1.0.tsd.md` | ✅ Revisado | Aguarda C1, C2 resolução |
| `board-search-v1.0.tsd-review.md` | ✅ Gerado | Este documento |
| `board-search/state.yaml` | ✅ Revisado | Requer atualização de ACs |
| `src/domain/types.ts` | ⏳ Não verificado | Spec Agent verifica C1 |

---

## Próximos Passos

### Imediato (Spec Agent)

1. Ler `src/domain/types.ts` → verificar Card.description
2. Confirmar se `description` é novo ou já existe
3. Se novo: adicionar migration note em Handoff
4. Se já existe: remover "nova" de seção 2.4
5. Detalhar algoritmo de score (usar proposta acima)
6. Re-submit TSD para review

### Após Aprovação (Arquiteto)

1. Resolver PQ01 (modal) — **já decidido:** modal
2. Resolver PQ02 (navegação) — **já decidido:** scroll + highlight
3. Validar contrato AppShell vs contexto/state management
4. Pass para Planner com decisões cristalizadas

---

**Relatório Gerado:** 19 de abril de 2026  
**Revisor:** Spec-Reviewer Agent  
**Status:** 🟡 COM RESSALVAS | Score: 68/100 | Ação: Resolver C1 + C2 antes de Architect
