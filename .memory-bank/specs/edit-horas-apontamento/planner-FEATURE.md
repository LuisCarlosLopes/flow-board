# IPD: Editar horas de apontamento (Horas no período) — v1.0

> Confiança: **82**/100 | Complexidade: **M** | Data: 2026-04-22  
> Track da Squad: **FEATURE** | Slug: `edit-horas-apontamento` | Subtask ID: null  
> Artefato Canônico: `.memory-bank/specs/edit-horas-apontamento/planner-FEATURE.md`  
> Base normativa: `spec-feature.md`, `spec-reviewer-feature.md` (AMARELO / M1 fechado), `architect-feature.md` (**binding**), `constitution.md`.

---

## 1. MISSÃO

**Objetivo:** Permitir editar o total de horas de uma linha `(boardId, cardId)` na vista **Horas no período**, via **modal** acessível, aplicando uma **única função de domínio** que mantém `timeSegments` e `cardTimeState[cardId].completed` coerentes, persistindo com `saveBoard` + SHA e atualizando tabela e rodapé **Total** sem dessincronia.

**Contexto de negócio:** Usuários precisam corrigir apontamentos exibidos no relatório sem voltar ao Kanban; a Constitution exige regras no domínio e persistência apenas via GitHub; o ARD fechou M1 (proporcional com tetos e códigos de erro).

---

## 2. ESTADO ATUAL DO SISTEMA

### 2.1 Estrutura de arquivos relevante

```
apps/flowboard/
├── src/
│   ├── domain/
│   │   ├── hoursAggregation.ts      ← agregação R09 (NÃO alterar sem ADR/spec)
│   │   ├── hoursProjection.ts       ← PeriodRange, segmentsCompletedInPeriod (NÃO alterar R09)
│   │   ├── workingHours.ts        ← clipIntervalToWorkingHours / expediente (leitura semântica tetos)
│   │   └── types.ts               ← CompletedSegment, BoardWorkingHours
│   ├── features/
│   │   ├── hours/
│   │   │   ├── HoursView.tsx      ← ZONA DE TRABALHO (UI + orquestração save)
│   │   │   └── HoursView.css
│   │   └── board/
│   │       ├── CreateTaskModal.tsx ← referência de modal (overlay, role="dialog", data-testid)
│   │       └── timeBridge.ts      ← append (fluxo normal do quadro; edição NÃO depende só disso)
│   └── infrastructure/
│       ├── persistence/
│       │   ├── boardRepository.ts ← saveBoard(boardId, doc, previousSha)
│       │   └── types.ts           ← BoardDocumentJson.timeSegments (+ segmentId)
│       └── github/
│           └── client.ts          ← putFileJson → GitHubHttpError 409 Conflict
└── tests/e2e/                     ← Playwright; padrão data-testid (ex.: create-task.spec.ts)
```

### 2.2 Stack e convenções detectadas

| Dimensão | Valor detectado |
|----------|-----------------|
| Linguagem | TypeScript (strict no pacote `flowboard`) |
| Framework | React 19 + Vite 8 |
| Domínio | Funções puras em `src/domain/`; testes Vitest em `*.test.ts` |
| Persistência | `createBoardRepository` → `saveBoard`; SHA de `loadBoard` |
| Conflito GitHub | `GitHubHttpError` com `status === 409` (`client.ts`) |
| UI / A11y | Modais com `role="dialog"`, `aria-modal="true"` (padrão `CreateTaskModal`) |
| E2E | Playwright; seletores preferindo `getByTestId` |
| Idioma | Código em inglês; mensagens de usuário em **pt-BR** (GA-03 do ARD) |

### 2.3 Contratos que NÃO podem quebrar

- **`aggregateTaskHoursForPeriod` / R09:** inclusão no período por `endMs` ∈ `[period.startMs, period.endMs]` (`segmentsCompletedInPeriod` em `hoursProjection.ts`). A feature não redefine esse critério.
- **`BoardRepository.saveBoard`:** `async saveBoard(boardId: string, doc: BoardDocumentJson, previousSha: string | null): Promise<void>` — manter assinatura e uso via cliente existente.
- **`BoardDocumentJson` (ADR-002 / types):** não adicionar campos novos nesta entrega; mutação apenas por reescrita de `timeSegments` e `cardTimeState` existentes.
- **Navegação Horas:** `data-testid="hours-view"` e `data-testid="nav-hours"` já existem — preservar.

### 2.4 Módulo de referência

- **Modal + overlay + `data-testid`:** `apps/flowboard/src/features/board/CreateTaskModal.tsx` + CSS associado.
- **Testes de domínio:** `apps/flowboard/src/domain/hoursAggregation.test.ts` (estilo Vitest + fixtures mínimas).

---

## 3. DEFINIÇÃO DE PRONTO (DoD)

Alinhado a `acceptance_criteria` em `state.yaml` e ao TSD/ARD:

- [ ] **RF-01:** Cada linha da tabela (quando há dados) expõe ação explícita para editar tempo (botão ou controle de célula com nome acessível / `aria-label`), operável por teclado.
- [ ] **RF-02:** Modal com título da tarefa, nome do quadro, valor atual (formato coerente com a coluna Tempo), campo para novo total no **período atual**, Cancelar / Salvar; estado de carregamento ao salvar; erros de validação, domínio, rede e conflito visíveis.
- [ ] **RF-03 / persistência:** Após sucesso, persistência GitHub consistente com `timeSegments` + `cardTimeState`; lista e **Total** refletem o novo agregado (re-`load` ou estado equivalente sem total incoerente).
- [ ] **RNB-02 / ARD:** Pós-save, multiset de intervalos em `cardTimeState[cardId].completed` coincide com o derivado de **todos** os `timeSegments` daquele `cardId` (estratégia preferida: **reconstruir `completed` a partir de `timeSegments` do card** após aplicar substituições/remoções).
- [ ] **Constitution VI:** Testes automatizados cobrindo a função de domínio (casos ARD) + lint limpo no pacote `flowboard`; ponteiro E2E mínimo documentado/implementável (seção 6).
- [ ] **Compilação:** `pnpm`/`npm` no pacote: `tsc -b` / build sem erros.
- [ ] **Edge cases (DoD explícito):**
  - [ ] **E1 / NO_SEGMENTS:** sem segmentos elegíveis no período para o card → não persiste; mensagem clara.
  - [ ] **E2:** mudança de período (`periodKind`, `anchor`), ou escopo (`scope`) com modal aberta → fechar modal e descartar edição (não salvar alvo de contexto obsoleto).
  - [ ] **E3:** card arquivado → ação de edição **desabilitada** (ex.: `disabled` + `title` / texto auxiliar), sem abrir modal de edição de horas.
  - [ ] **E4:** múltiplos segmentos no período → uma edição ajusta o **total** da linha conforme domínio.
  - [ ] **E5:** falha de rede / erro GitHub genérico → mensagem visível; estado não marcado como persistido.
  - [ ] **INFEASIBLE_TARGET:** alvo proporcional viola teto de expediente/dia → não persiste; mensagem acionável em pt-BR.
  - [ ] **409 Conflict:** SHA obsoleto → mensagem de conflito + ação **“Recarregar e tentar de novo”** (re-`loadBoard` + usuário reconfirma/salva).

---

## 4. ESPECIFICAÇÃO DE IMPLEMENTAÇÃO

### 4.1 Contrato da feature (UI → domínio → persistência)

**INPUT (camada feature, ao salvar):**

- Identidade da linha: `boardId`, `cardId` (da `TaskHoursRow`).
- `period: PeriodRange` atual da vista (mesmo objeto lógico usado em `aggregateTaskHoursForPeriod`).
- `targetHoursDecimal: number` — horas decimais digitadas pelo usuário (≥ 0, validação na UI antes do domínio).
- Documento completo do quadro obtido por `loadBoard(boardId)` **imediatamente antes** de aplicar o patch (garante SHA fresco e reduz janela de conflito).

**Validação na borda (feature + reforço no domínio):**

- Rejeitar (sem chamar GitHub) se: não finito, `< 0`, `NaN`.
- **`INVALID_TARGET` (domínio):** `targetMs` após arredondamento (§4.1.1) ultrapassa **`maxTargetMs`** definido abaixo **ou** `< 0`.

**OUTPUT domínio — função pura** `applyTargetHoursForCardInPeriod` (nome canônico alinhado ao ARD; pode ser renomeado se o implementer padronizar export, mantendo o contrato):

Ver subseção **4.1.2** para tipo de retorno e códigos.

**OUTPUT persistência:**

- Sucesso: `saveBoard(boardId, nextDoc, sha)` com `sha` retornado pelo último `loadBoard`.
- Falha 409: propagar / mapear para UX de retry (não mascarar como sucesso).

### 4.1.1 Política única horas → milissegundos

**Regra única:** `targetMs = Math.round(hoursDecimal * 3_600_000)` (hora decimal → ms inteiro, meia-unidade para cima/baixo no 0,5 ms).

- O mesmo fator **3_600_000** deve ser usado de ponta a ponta (exibição pode continuar `(ms/3_600_000).toFixed(2)` como hoje).

### 4.1.2 Contrato da função de domínio (binding ARD §3 + §5)

**Arquivo novo:** `apps/flowboard/src/domain/applyTargetHoursForCardInPeriod.ts` (nome final pode ser ajustado desde que o contrato abaixo se preserve).

```typescript
import type { PeriodRange } from './hoursProjection'
import type { BoardWorkingHours, CompletedSegment } from './types'

export type BoardTimeSegment = {
  segmentId: string
  cardId: string
  startMs: number
  endMs: number
}

export type ApplyTargetHoursForPeriodResult =
  | { ok: true; nextSegments: BoardTimeSegment[]; nextCompleted: CompletedSegment[] }
  | {
      ok: false
      code: 'NO_SEGMENTS' | 'INFEASIBLE_TARGET' | 'INVALID_TARGET'
      detail?: string
    }

export function applyTargetHoursForCardInPeriod(input: {
  cardId: string
  period: PeriodRange
  /** Soma-alvo em ms após política §4.1.1. */
  targetMs: number
  cardSegments: BoardTimeSegment[]
  cardCompleted: CompletedSegment[]
  workingHours?: BoardWorkingHours | null
}): ApplyTargetHoursForPeriodResult
```

**Semântica obrigatória (resumo executável; detalhe normativo = ARD §3.2):**

1. **Seleção:** segmentos afetados = `{ s ∈ cardSegments | s.cardId = cardId ∧ endMs ∈ period (R09 inclusivo) }` — mesmo critério que `segmentsCompletedInPeriod` aplicado a cada segmento como `CompletedSegment`.
2. Se soma das durações dos selecionados `S === 0` → `{ ok: false, code: 'NO_SEGMENTS' }`.
3. Se `targetMs === 0` → remover do `timeSegments` do card todos os selecionados (por `segmentId`); **reconstruir** `nextCompleted` ordenando por `startMs` os `{startMs,endMs}` de **todos** os segmentos restantes do card (incluindo fora do período).
4. Se `targetMs > 0`:** distribuição proporcional** com `d'_i = round(targetMs * d_i / S)` + **correção determinística de resto** para garantir `Σ d'_i = targetMs` exatamente (ex.: maior resto primeiro, ordem estável por `startMs` / `segmentId`).
5. **`newEndMs_i = startMs_i + d'_i`**; **`newEndMs_i` ≤ `ceilingEndMs_i`** onde `ceilingEndMs_i` = último instante válido no **mesmo dia civil** que `startMs_i` e, se `workingHours?.enabled`, dentro de `[wStart, wEndEx - 1]` daquele dia (semântica ARD = alinhada a `clipIntervalToWorkingHours` / `BoardWorkingHours`).
6. Violação de teto para qualquer `i` após o cálculo → `{ ok: false, code: 'INFEASIBLE_TARGET' }`.
7. Garantir `newEndMs_i > startMs_i` quando `d'_i > 0`; se política de duração mínima for necessária, usar **1 ms** como piso mínimo **somente** quando compatível com `targetMs` e tetos; se impossível, tratar como `INFEASIBLE_TARGET`.
8. **`nextSegments`:** array completo substituindo apenas as linhas dos `segmentId` afetados; demais segmentos do board (outros cards) inalterados na projeção da função — a feature monta o array final do documento.
9. **`INVALID_TARGET`:** `targetMs` negativo, não inteiro (se bypass da UI), ou `targetMs > maxTargetMs` com:

**`maxTargetMs` (fecha M2 do spec-reviewer):**

- `nDays = max(1, Math.ceil((period.endMs - period.startMs + 1) / 86_400_000))`
- `maxTargetMs = nDays * 24 * 3_600_000`

(Limita a “24h × número de dias civis cobertos pelo intervalo”, coerente com teto “razoável” do TSD para períodos day/week/month.)

**Mapeamento de mensagens (pt-BR, GA-03):**

| `code` | Mensagem sugerida (ajustável copy) |
|--------|-----------------------------------|
| `NO_SEGMENTS` | Não há tempo concluído desta tarefa neste período para ajustar. Recarregue a lista. |
| `INFEASIBLE_TARGET` | Este valor não cabe nos intervalos de trabalho já registrados para este período. Reduza o total ou ajuste o quadro no Kanban. |
| `INVALID_TARGET` | Valor inválido ou acima do máximo permitido para o período selecionado. |
| GitHub 409 | O quadro foi alterado em outro lugar. Recarregue e tente salvar novamente. |

### 4.2 Fluxo de execução (passo a passo)

1. Usuário em `HoursView` com linhas carregadas; clica **Editar** na linha `(boardId, cardId)`.
2. Abre modal: exibe `cardTitle`, `boardTitle`, horas atuais da linha, campo numérico inicializado com valor atual.
3. **Cancelar** ou **Esc** → fecha sem persistir.
4. **Salvar:**
   - Validação UI: número ≥ 0, finito; opcionalmente limitar dígitos decimais exibidos (2 casas alinhadas à tabela).
   - `targetMs = Math.round(hours * 3_600_000)`.
   - `loadBoard(boardId)` → se null, erro amigável; senão `doc`, `sha`.
   - Resolver `card` em `doc.cards`; se `card.archived` → não deveria ocorrer se botão desabilitado; se ocorrer, abortar com erro suave.
   - Montar `cardSegments` a partir de `doc.timeSegments` (filtrar `cardId`), `cardCompleted` de `doc.cardTimeState[cardId]?.completed ?? []`.
   - `result = applyTargetHoursForCardInPeriod({ ... })`.
   - Se `!result.ok` → exibir mensagem do código; não chamar `saveBoard`.
   - Se `ok` → construir `nextDoc`: substituir entradas de `timeSegments` com mesmos `segmentId` afetados por novos `startMs`/`endMs` (ou remover); aplicar `cardTimeState[cardId].completed = result.nextCompleted` (e limpar entrada se vazia, seguindo padrão já usado no repo ao omitir objeto vazio).
   - `repo.saveBoard(boardId, nextDoc, sha)`.
   - Sucesso → fechar modal, `await load()` da lista de horas (reusa agregação existente).
   - `GitHubHttpError` **409** → mensagem de conflito + CTA de recarregar (re-executar `loadBoard` e manter modal aberta ou reabrir com valores frescos — preferir **fechar modal**, `load()` geral, toast/alert pedindo nova edição).
5. **E2:** se `periodKind`, `anchor` ou `scope` mudar enquanto modal aberta → `useEffect` fecha modal e limpa estado de edição.

### 4.3 Mapa de alterações (somente sob `apps/flowboard/`)

| Ação | Arquivo | O que muda | Motivo |
|------|---------|------------|--------|
| **CRIAR** | `apps/flowboard/src/domain/applyTargetHoursForCardInPeriod.ts` | Função pura + tipos `BoardTimeSegment`, `ApplyTargetHoursForPeriodResult`; cálculo tetos, proporcional, zero, resto | Constitution I + ARD |
| **CRIAR** | `apps/flowboard/src/domain/applyTargetHoursForCardInPeriod.test.ts` | Casos: feliz multi-segmento, `targetMs=0`, resto Σ=T, `NO_SEGMENTS`, `INFEASIBLE_TARGET` (teto), `INVALID_TARGET` (cap), wh on/off | Verificabilidade |
| **MODIFICAR** | `apps/flowboard/src/features/hours/HoursView.tsx` | Estado modal; botão editar por linha; `loadBoard` pré-save; chamada domínio; patch `nextDoc`; tratamento `GitHubHttpError`; fechar em mudança de período/escopo | RF-01–05 |
| **MODIFICAR** | `apps/flowboard/src/features/hours/HoursView.css` | Estilos mínimos do overlay/dialog alinhados ao visual existente (referência `fb-ctm`) | UX |
| **NÃO TOCAR** | `apps/flowboard/src/domain/hoursAggregation.ts` | — | Risco de alterar R09/agregação sem ADR |
| **NÃO TOCAR** | `apps/flowboard/src/domain/hoursProjection.ts` | — | R09 estável |
| **NÃO TOCAR** | `apps/flowboard/src/features/board/timeBridge.ts` | — | ARD: edição não usa só `appendNewSegments` |
| **NÃO TOCAR** | `apps/flowboard/src/infrastructure/persistence/boardRepository.ts` | — | Contrato estável; usar como está |

> Se, durante a implementação, um helper de teto reutilizável for extraído para `workingHours.ts` para evitar duplicação, isso constitui **mudança adicional pequena** no mesmo pacote — atualizar este mapa na revisão do IPD (v1.1) antes do merge se divergir.

### 4.4 Dependências

```json
{
  "novas_libs": [],
  "libs_existentes_usadas": [
    "react@19",
    "vitest@4 (já no pacote flowboard)"
  ],
  "migrations_necessarias": false,
  "variaveis_de_ambiente_novas": []
}
```

---

## 5. GUARDRAILS DE IMPLEMENTAÇÃO

- ❌ Implementar regra de redistribuição só na UI (violates Constitution I).
- ❌ Persistir quando `applyTargetHoursForCardInPeriod` retornar `ok: false`.
- ❌ Usar apenas `appendNewSegments` para refletir edição (GA-02 ARD).
- ❌ Alterar `segmentsCompletedInPeriod` / critério R09 sem spec/ADR.
- ❌ Modificar arquivos fora do mapa (§4.3) por conveniência.
- ❌ Introduzir campos novos em `BoardDocumentJson` nesta entrega.
- ❌ Mensagens de erro de domínio/conflito apenas em inglês para o usuário final.

---

## 6. TESTES

### 6.1 Domínio (obrigatório — Vitest)

Arquivo: `applyTargetHoursForCardInPeriod.test.ts`. Cobrir pelo menos:

- **Happy path:** dois segmentos no período, `targetMs` entre 0 e S, verificar Σ duração no período = `targetMs` e `nextCompleted` = reconstrução ordenada de todos os segmentos do card.
- **Arredondamento:** `targetMs` que force resto ≠ 0; assert Σ exata após correção de resto.
- **`targetMs = 0`:** segmentos do período removidos; `completed` sem esses intervalos; segmentos fora do período intactos.
- **`NO_SEGMENTS`:** nenhum segmento com `endMs` no período.
- **`INFEASIBLE_TARGET`:** fixture onde `targetMs > S` e `startMs + d'_i` excede teto (ex.: expediente curto + aumento grande).
- **`INVALID_TARGET`:** `targetMs > maxTargetMs` derivado do período de teste.
- **Working hours:** `enabled: true` vs `false` (tetos diferentes).

### 6.2 E2E (mínimo — ponteiros Playwright)

- **Rota:** app já embute `HoursView` em `AppShell`; usar `data-testid="nav-hours"` para entrar na vista, depois `data-testid="hours-view"`.
- **Novos `data-testid` sugeridos** (alinhado à skill de testid do repo / padrão `ctm-*`):
  - `hours-row-edit-{boardId}-{cardId}` **ou** um único `hours-row-edit` com `data-board-id` / `data-card-id` nos atributos (evitar IDs instáveis em paralelo — preferir atributos `data-*` na linha).
  - `hours-edit-modal`, `hours-edit-input`, `hours-edit-save`, `hours-edit-cancel`, `hours-edit-error` (role alert), `hours-edit-retry` (CTA 409).
- **Cenário mínimo:** autenticação/setup igual aos testes existentes em `tests/e2e/`; navegar a Horas; se fixture de dados com tempo no período não existir, o E2E pode **criar tempo via Kanban** num período conhecido **ou** documentar dependência de board de teste — o **implementer** escolhe o caminho mais estável já usado no pacote (preferir reutilizar fluxo existente de criação de tarefa + mover colunas se houver padrão).

> Se E2E for bloqueado por dados voláteis, registrar no relatório do executor com motivo; ainda assim **domínio + lint** são obrigatórios (DoD `state.yaml`).

---

## 7. RISCOS, ASSUNÇÕES E PONTOS DE ATENÇÃO

### 7.1 Riscos

- **Conflito 409 entre `loadBoard` e `saveBoard`:** mitigação — mensagem + retry com novo `loadBoard`; não auto-merge de múltiplas edições.
- **Drift `completed`:** mitigação — reconstrução a partir de `timeSegments` do card após patch (ARD §3.2 item 7).
- **Performance:** boards muito grandes — substituição por `segmentId` é O(n) sobre `timeSegments`; aceitável no MVP.

### 7.2 Assunções não bloqueantes

| # | Assunção | Default | Justificativa | Se errada |
|---|----------|---------|-----------------|-----------|
| A1 | Card sempre presente em `doc.cards` para linhas da tabela | Se ausente, tratar como erro de estado e não persistir | Agregação usa títulos de cards existentes | UX de erro raro |
| A2 | `segmentId` único por linha em `timeSegments` | Substituir por id exato | Modelo atual JSON | Ajustar query de substituição |

**Decision register (interno, resumo):** M1 (proporcional × expediente) **resolvido pelo ARD**; M2 (teto) **resolvido por `maxTargetMs`**; M3 (409 UX) **resolvido em §4.2**; nenhuma decisão consequencial em aberto para o executor.

---

## 8. PROTOCOLO DE AUTO-CORREÇÃO

1. **Compilação:** `apps/flowboard` — `pnpm exec tsc -b` / `pnpm run build` conforme scripts do pacote.
2. **Contratos:** `saveBoard`, tipos JSON, R09 intocados nos módulos proibidos.
3. **Escopo:** diff limitado ao mapa §4.3.
4. **DoD:** percorrer checklist §3; rodar `pnpm run test` / `pnpm run lint` no pacote.

---

## 9. FORMATO DE ENTREGA DO EXECUTOR

O executor deve encerrar com:

```
## Arquivos Gerados/Modificados
- ...

## Decisões de Design Tomadas
- ...

## Sugestões Fora de Escopo (não implementadas)
- ...

## Checklist DoD
- [x] / [ ] itens da seção 3 deste IPD
```

---

## 10. METADADOS

| Campo | Valor |
|--------|--------|
| Confiança do plano | 82/100 |
| Track | FEATURE |
| Slug | `edit-horas-apontamento` |
| Subtask ID | null |
| Artefato canônico | `.memory-bank/specs/edit-horas-apontamento/planner-FEATURE.md` |
| Complexidade | M |
| Módulo de referência | `CreateTaskModal.tsx`, `hoursAggregation.test.ts` |
| Total de arquivos impactados (previsto) | 4 (2 novos + 2 modificados) |
| Migration | Não |
| Decisões bloqueantes em aberto | 0 |
| Assunções não bloqueantes | 2 (A1–A2) |
| Versão IPD | v1.0 |
| Autor | planner (CodeSteer) |

```json
{
  "agent": "planner",
  "status": "success",
  "slug": "edit-horas-apontamento",
  "track": "FEATURE",
  "subtask_id": null,
  "confidence_score": 82,
  "artifact_path": ".memory-bank/specs/edit-horas-apontamento/planner-FEATURE.md",
  "files_to_create": 2,
  "files_to_modify": 2,
  "files_not_touch": 4,
  "blocking_decisions_count": 0,
  "non_blocking_assumptions_count": 2,
  "assumptions_documented": true,
  "complexity": "M",
  "migrations_needed": false
}
```
