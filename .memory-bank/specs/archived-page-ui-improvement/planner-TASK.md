# IPD: Melhoria visual e de UX da página Arquivados — v1.1

> Confiança: **92**/100 | Complexidade: **S** | Data: 2026-04-22  
> Track da Squad: **TASK** | Slug: **archived-page-ui-improvement** | Subtask ID: null  
> Artefato Canônico: `.memory-bank/specs/archived-page-ui-improvement/planner-TASK.md`  
> **Referência de UI (protótipo):** `.memory-bank/specs/archived-page-ui-improvement/prototype-archived-page.html`

---

## 1. MISSÃO

**Objetivo:**  
Refinar a rota `/archived` (`ArchivedCardsPage`) com hierarquia visual tech-dark alinhada ao app, metadados derivados apenas de `BoardDocumentJson` existente (`columns[]`, `card.columnId`, `card.archivedAt`), CTAs com Restaurar mais proeminente que Excluir, navegação explícita de volta ao quadro, e lista/estados vazios mais informativos — **sem** novos campos em `Card` ou no JSON do board e **sem** operações em massa.

**Contexto de Negócio:**  
A página de arquivados já existe e funciona; o feedback é baixa densidade de informação, título fraco e hierarquia fraca entre ações. O utilizador precisa ver de onde veio o card e quando foi arquivado (quando disponível), voltar ao Kanban sem ambiguidade, e restaurar com confiança visual — tudo dentro do modelo de dados atual.

**Critério de sucesso (fonte: `state.yaml`):**  
AC da spec operacional satisfeitos; **layout, hierarquia e estados (lista, vazio, carregando) alinhados ao protótipo HTML** (Sec. 2.5), mapeando tokens e tipografia do app onde o ficheiro de protótipo usar valores ou fontes só para demonstração; E2E de arquivamento verde após ajustes de seletores/cópia; `pnpm build` / `pnpm test` executados em `apps/flowboard` (único `package.json` do repo).

---

## 2. ESTADO ATUAL DO SISTEMA

### 2.1 Estrutura de Arquivos Relevante

```
apps/flowboard/
├── src/
│   ├── App.tsx                          ← rotas (`/releases` vs `*` → AppShell); NÃO precisa mudar para “voltar”
│   ├── features/
│   │   ├── app/
│   │   │   ├── AppShell.tsx             ← rota `/archived`, tab “Arquivados”; referência de layout
│   │   │   └── AppShell.css             ← `.fb-main` padding; archived não usa `--kanban`
│   │   ├── board/
│   │   │   ├── ArchivedCardsPage.tsx    ← ZONA DE TRABALHO PRINCIPAL
│   │   │   └── ArchivedCardsPage.css    ← ZONA DE TRABALHO PRINCIPAL
│   │   └── release-notes/
│   │       └── ReleaseNotesPage.tsx     ← padrão `Link` react-router-dom
│   └── domain/
│       ├── types.ts                     ← `Card`, `Column` (contrato de leitura)
│       └── cardArchive.ts               ← `isCardArchived`, `sortArchivedByDefault` (não alterar comportamento)
└── tests/e2e/
    └── card-archive.spec.ts             ← ajustes se DOM/cópia mudarem
```

### 2.2 Stack e Convenções Detectadas

| Dimensão | Valor Detectado |
|---|---|
| Linguagem | TypeScript (strict no pacote; `tsc -b` no build) |
| Framework | React 19 + Vite |
| Roteamento | `react-router-dom` v6 (`BrowserRouter`, `Route`, `Routes`; `Link` em `ReleaseNotesPage.tsx`) |
| Estilo | CSS modules por arquivo; tokens `--space-*`, `--text-*`, `--accent*`, `--danger-*`, `--bg-*`, `--border-*` (`ArchivedCardsPage.css`, `AppShell.css`, `index.css`) |
| Datas pt-BR | `Intl.DateTimeFormat('pt-BR', …)` / `toLocaleDateString('pt-BR')` (`HoursView.tsx`, `ReleaseCard.tsx`, `plannedDateStatus.ts`) |
| Teste unitário | Vitest (`pnpm test`) |
| E2E | Playwright (`tests/e2e/card-archive.spec.ts`; `data-testid` em `archived-page`, `archived-row-*`, `archived-restore-*`, `archived-delete-*`) |

### 2.3 Contratos que NÃO Podem Quebrar

- **Tipos de domínio (leitura apenas):** `Card` inclui `columnId: string`, `archived?: boolean`, `archivedAt?: string` (ISO 8601); `Column` inclui `columnId`, `label`, `role` — `apps/flowboard/src/domain/types.ts`.
- **Props públicas de `ArchivedCardsPage`:**  
  `session: FlowBoardSession`, `boardId: string | null`, `onBoardPersisted?: () => void` — não mudar assinatura nem semântica de persistência.
- **Comportamento de negócio:** `handleUnarchiveCard`, `handleDeleteCard`, `saveDocument`, reload/reconcile — lógica existente deve permanecer; apenas apresentação e pequenos helpers de **display** no mesmo ficheiro.
- **Persistência:** nenhum novo campo no documento do board; não alterar `BoardDocumentJson` / repositório.

### 2.4 Módulo de Referência

- **Navegação:** `apps/flowboard/src/features/release-notes/ReleaseNotesPage.tsx` — uso de `Link` do `react-router-dom`.
- **Datas pt-BR:** `apps/flowboard/src/features/hours/HoursView.tsx` e `apps/flowboard/src/domain/plannedDateStatus.ts`.
- **Botões com peso “primary” / accent:** padrões em `LoginView.css` e `CreateTaskModal.css` (variáveis `--accent`, `--accent-fg`, `--accent-hover`) — espelhar **tokens** no CSS da página de arquivados, sem copiar markup desnecessário.

### 2.5 Referência de protótipo (UI canónica)

**Ficheiro:** `.memory-bank/specs/archived-page-ui-improvement/prototype-archived-page.html`

O protótipo é a **fonte de verdade visual e estrutural** para a *área de conteúdo* de `ArchivedCardsPage` (não recriar a barra de tabs nem o “shell” de marca do demo: `AppShell` já fornece navegação e contexto; implementar o que estiver *dentro* de `<main class="archived-page">` e o comportamento equivalente).

| Elemento no protótipo (classe / bloco) | O que a implementação deve refletir |
|----------------------------------------|--------------------------------------|
| `.archived-page__toolbar` | Faixa superior: título + contagem + bloco de texto; à direita, link “Voltar ao quadro” (`.link-back`, ícone seta) com foco visível. |
| `.archived-page__eyebrow` | Texto de contexto acima do H1 (no app: p.ex. “Quadro ativo” + identificador do board quando disponível — alinhar *padrão* ao demo, com dados reais). |
| `.archived-page__title` + `.archived-page__count` | Título “Arquivados” com contagem `(n)` na mesma linha, hierarquia tipográfica forte. |
| `.archived-page__subtitle` | Frase explicativa curta; copiar intenção do protótipo, ajustar copy ao produto se necessário. |
| `.archived-panel` + `.archived-panel__header` | Painel com borda/sombra; cabeçalho com label tipo “Histórico neste quadro”. |
| `.archived-list` / `.archived-row` | Lista; cada linha em **grid** conteúdo + ações; hover na borda da linha. |
| `.archived-row__title` + `.archived-row__meta` | Título do card; meta com “Coluna: [label]” e data/“Sem data de arquivamento” (`.archived-row__meta-dot` para o segundo fragmento). |
| `.archived-actions` + `.btn--primary` / `.btn--ghost-danger` | Restaurar sólido accent; Excluir ghost com contorno destrutivo. |
| `.archived-empty` / `.archived-loading` | Estados vazio e a carregar com mensagens e, no carregamento, barra de *shimmer* (`.archived-loading__bar`) e `role="status"` / `aria-live` conforme protótipo. |
| `proto-demo`, `proto-shell__bar`, fontes Google no `<head>` | **Não** portar: são só para demonstração. Tipografia: usar famílias e escala já definidas no app (`index.css` / variáveis); aproximar pesos e tamanhos ao protótipo com CSS da página. |

**Tokens no protótipo vs app:** o HTML demo define `:root` com cores oklch/rgba próprias. Na implementação, **replicar relações visuais** (superfície, borda, accent, perigo) com `--bg-*`, `--border-*`, `--accent*`, `--danger-*`, `--text-*` já existentes no FlowBoard, sem adicionar dependência de fontes externas salvo ADR/escopo de produto.

**Abrir o protótipo:** ficheiro estático no repo — abrir no browser para *pixel-approximate* e revisão de estados (com/sem itens, vazio, carregando).

---

## 3. DEFINIÇÃO DE PRONTO (DoD)

A task está **COMPLETA** apenas quando:

- [ ] **Funcional + UI:** Cada linha arquivada mostra **título** + **label da coluna** resolvida por `doc.columns.find(c => c.columnId === card.columnId)?.label` (com fallback documentado na Sec. 7) e **data de arquivamento** formatada em pt-BR quando `archivedAt` estiver definido; cabeçalho com título proeminente e contagem; link ou botão explícito “voltar ao quadro” para `/`; Restaurar visualmente mais forte que Excluir; estados sem board / carregando / vazio / erro mantêm `data-testid="archived-page"` e mensagens claras. **A estrutura (toolbar, painel, linhas, CTAs) e estados vazio/carregando seguem Sec. 2.5 (protótipo HTML), com tokens do app.**
- [ ] **Compilação:** `cd apps/flowboard && pnpm build` sem erros.
- [ ] **Testes existentes:** `cd apps/flowboard && pnpm test` sem regressões.
- [ ] **E2E:** `card-archive.spec.ts` atualizado se cópia ou estrutura quebrarem asserções; preferir `data-testid` estáveis (ex.: novo `archived-back-to-board`) em vez de texto frágil onde fizer sentido.
- [ ] **Lint:** `cd apps/flowboard && pnpm lint` sem novos erros introduzidos pela mudança.
- [ ] **Edge cases:**
  - [ ] `columnId` não encontrado em `doc.columns` → fallback acordado (Sec. 7) visível e acessível.
  - [ ] `archivedAt` ausente → omitir data ou mostrar “—” sem quebrar layout.
  - [ ] `archivedAt` inválido → não lançar; mostrar fallback seguro ou omitir.
  - [ ] `boardId` null → mensagem atual preservada; sem link quebrado para quadro.
  - [ ] `saving === true` → botões permanecem `disabled` como hoje.

---

## 4. ESPECIFICAÇÃO DE IMPLEMENTAÇÃO

### 4.1 Contrato da Feature (UI / comportamento)

**INPUT (dados já carregados):**  
`doc: BoardDocumentJson | null`, `archivedList: Card[]` derivado como hoje (`filter(isCardArchived)` + `sortArchivedByDefault`).

**OUTPUT (UI):**

- Cabeçalho da página/secção: título forte (ex. “Arquivados”) + contagem `(n)` coerente com `archivedList.length`.
- Ação de navegação: elemento focável que leva ao Kanban (`/`). Quando não há `boardId`, não mostrar atalho enganoso ou usar `disabled` + explicação.
- Por item: título; metadados: nome da coluna; se `archivedAt` presente, texto formatado pt-BR (data e, se útil, hora — ver assunção A2).
- Ações: “Restaurar” com estilo primário/accent; “Excluir” destrutivo, menor peso visual, mantendo `confirm` existente.

**Validações:** Nenhuma alteração ao payload persistido; apenas leitura.

### 4.2 Fluxo de Execução (implementação)

```
0. Abrir e manter visível o protótipo `prototype-archived-page.html` como checklist visual (toolbar, painel, linhas, botões, empty/loading). Nomear classes BEM/Prefixo do app de forma a espelhar a intenção das classes do demo (p.ex. `fb-archived__toolbar`, `fb-archived__panel`, …) sem copiar o prefixo `proto-*`.
1. Construir `Map<string, string>` ou função `getColumnLabel(columns, columnId)` a partir de `doc.columns` quando `doc` existe.
2. Adicionar helper local `formatArchivedAtForDisplay(iso?: string): string | null` usando Intl ou Date + pt-BR, com guard para ISO inválido.
3. Reestruturar JSX:
   a. Bloco superior: título + contagem + `Link` (ou `NavLink`) para "/" com copy tipo "Voltar ao quadro" e `data-testid="archived-back-to-board"` quando `boardId` presente.
   b. Lista: cada `li` com região de conteúdo (título + meta) e região de ações.
4. Ajustar CSS: espelhar densidade, painel e hierarquia do protótipo (Sec. 2.5); largura útil (ex. `max-width` alinhada ao conteúdo do main / ~1120px no demo como teto de referência, sem quebrar AppShell), grid/flex para meta em linha secundária, classes `fb-archived__btn--primary` (accent) vs estilo ghost/destrutivo para excluir.
5. Rodar lint, unit tests, build; atualizar E2E se necessário.
6. (Opcional / fora do caminho crítico) Filtro local por título — só se couber sem atrasar entrega; senão listar em “Sugestões fora de escopo”.
```

### 4.3 Mapa de Alterações

| Ação | Arquivo | O que muda | Motivo |
|---|---|---|---|
| MODIFICAR | `apps/flowboard/src/features/board/ArchivedCardsPage.tsx` | Helpers de label/data; header com hierarquia; `Link` para `/`; markup de cada row com meta; classes nos botões (Restaurar primário) | AC de UX, metadados, navegação |
| MODIFICAR | `apps/flowboard/src/features/board/ArchivedCardsPage.css` | Tipografia cabeçalho; layout lista; largura útil; estilos botão primário vs perigo; possível subtexto meta | Alinhamento tech-dark / hierarquia |
| MODIFICAR | `apps/flowboard/tests/e2e/card-archive.spec.ts` | Asserções ou seletores se heading/texto mudarem; opcional smoke do link voltar | Estabilidade CI |
| NÃO TOCAR | `apps/flowboard/src/features/app/AppShell.tsx` | — | Navegação pode viver na página; tab já existe |
| NÃO TOCAR | `apps/flowboard/src/infrastructure/persistence/types.ts` (e repo) | — | Proibição de novo schema |
| NÃO TOCAR | `apps/flowboard/src/domain/cardArchive.ts` | — | Ordenação/filtro arquivados já corretos |
| NÃO TOCAR | `apps/flowboard/src/App.tsx` | — | Rota `*` já cobre `/archived` via AppShell |

> ⚠️ Qualquer arquivo **não listado** como MODIFICAR **não deve ser alterado** salvo correção de bug bloqueante descoberta na execução (registar no relatório do executor).

### 4.4 Dependências

```json
{
  "novas_libs": [],
  "libs_existentes_usadas": ["react@^19", "react-router-dom@^6.30.3"],
  "migrations_necessarias": false,
  "variaveis_de_ambiente_novas": []
}
```

---

## 5. GUARDRAILS DE IMPLEMENTAÇÃO

- ❌ Adicionar campos a `Card`, `BoardDocumentJson` ou contratos de persistência.
- ❌ Implementar arquivar/excluir em massa ou etiquetas/tags.
- ❌ Usar `any` ou ignorar erros de tipo para “facilitar” formatação de datas.
- ❌ Mudar ordem ou regras de `sortArchivedByDefault` / `isCardArchived` sem motivo de bug.
- ❌ Modificar ficheiros fora do Mapa de Alterações (Sec. 4.3).
- ❌ Remover ou renomear `data-testid` existentes (`archived-page`, `archived-row-*`, `archived-restore-*`, `archived-delete-*`) sem atualizar E2E na mesma entrega.
- ❌ Depender de texto visível como único seletor E2E para fluxos críticos — preferir `data-testid` para o link “voltar ao quadro”.

---

## 6. TESTES A IMPLEMENTAR / AJUSTAR

**E2E (Playwright) — ficheiro real:** `apps/flowboard/tests/e2e/card-archive.spec.ts`

- Manter fluxo atual: criar card → arquivar → `nav-archived` → visibilidade de `archived-row-${cardId}` com título.
- Se o heading “Arquivados (n)” ou estrutura interna mudar, atualizar localizadores para não depender de texto frágil onde houver alternativa (`getByTestId`).
- **Sugerido:** após navegar para `/archived`, asserção leve de que `archived-back-to-board` existe e é visível (quando board selecionado no teste — já há board no fluxo).
- **Opcional:** clicar em “voltar ao quadro” e verificar URL `/` (smoke de navegação).

**Unit:** Não obrigatório para esta TASK se helpers forem triviais; se extrair `formatArchivedAtForDisplay` para módulo testável, adicionar 1–2 casos Vitest (válido / inválido / undefined).

---

## 7. RISCOS, ASSUNÇÕES E PONTOS DE ATENÇÃO

### 7.1 Riscos e Pontos de Atenção

- **Regressão E2E por copy/DOM** → mitigação: `data-testid` no link de retorno; rerun `pnpm test:e2e:raw` após auth local conforme projeto.
- **Largura vs AppShell** → `.fb-main` sem `--kanban` usa padding `space-3`; evitar overflow horizontal ao expandir `max-width` da página de arquivados.

### 7.2 Assunções Não-Bloqueantes

| # | Assunção residual | Default adotado | Justificativa | Impacto se estiver errada |
|---|---|---|---|---|
| A1 | Coluna desconhecida | Mostrar `columnId` cru ou rótulo curto tipo “Coluna removida” | Evita campo novo; AC pede label quando mapeamento existe | Ajustar copy com PM se preferirem só ID |
| A2 | Formato de `archivedAt` na UI | Data+hora curtas pt-BR via `Intl` (ou só data se espaço limitado) | Consistência com resto do app | Refinar granularidade (só data) |
| A3 | Filtro local por título | **Fora do caminho crítico** — implementar só se sobra tempo | `state.yaml` marca como opcional | Omitir sem bloquear entrega |

**Fora de escopo explícito (não implementar nesta TASK):**

- Arquivamento ou exclusão em **massa**.
- Novos campos em `Card` / documento do board / alteração de `BoardDocumentJson`.
- Etiquetas/tags (não existem no modelo).
- Mudanças de rota em `App.tsx` ou nova rota além de `/archived` existente.

---

## 8. PROTOCOLO DE AUTO-CORREÇÃO

```
VERIFICAÇÃO 1 — Compilação
  → `pnpm build` no pacote flowboard passa?

VERIFICAÇÃO 2 — Contratos
  → Props de ArchivedCardsPage e tipos Card/Column inalterados para persistência?

VERIFICAÇÃO 3 — Escopo
  → Apenas ficheiros do Mapa 4.3 alterados?

VERIFICAÇÃO 4 — DoD
  → AC do state.yaml e checklist Sec. 3 satisfeitos?
  → E2E card-archive verde?
```

---

## 9. FORMATO DE ENTREGA DO EXECUTOR

O executor deve finalizar com:

```
## Arquivos Gerados/Modificados
- [lista com caminhos absolutos ou relativos ao repo]

## Decisões de Design Tomadas
- [ex.: fallback de label de coluna; formato exato de data; como o markup/CSS aproximou o protótipo `prototype-archived-page.html` com tokens do app]

## Sugestões Fora de Escopo (não implementadas)
- [ex.: bulk archive; tags]

## Checklist DoD
- [x] / [ ] itens da Sec. 3
```

---

## 10. METADADOS

| Campo | Valor |
|---|---|
| Confiança do Plano | 92/100 |
| Track da Squad | TASK |
| Slug da Task | archived-page-ui-improvement |
| Subtask ID | null |
| Artefato Canônico | `.memory-bank/specs/archived-page-ui-improvement/planner-TASK.md` |
| Complexidade Estimada | S |
| Módulo de Referência | `prototype-archived-page.html` (UI), `ReleaseNotesPage.tsx`, `HoursView.tsx`, `LoginView.css` |
| Total de Arquivos Impactados | 3 (TSX, CSS, E2E) |
| Requer Migration de Banco | Não |
| Decisões Bloqueantes em Aberto | 0 |
| Assunções Não-Bloqueantes Documentadas | 3 |
| Versão do IPD | v1.1 |
| Autor | planner (CodeSteer) |

### Decision Register (resumo)

- Itens consequenciais: **0** em aberto (fallbacks A1–A3 são defaults seguros documentados).
- Exploração confirmou existência de: `ArchivedCardsPage.tsx`, `ArchivedCardsPage.css`, `AppShell.tsx`, `card-archive.spec.ts`, tipos `Card`/`Column`, padrão `Link` e datas pt-BR.

---

### Metadata JSON (handoff orquestrador)

```json
{
  "agent": "planner",
  "status": "success",
  "slug": "archived-page-ui-improvement",
  "track": "TASK",
  "subtask_id": null,
  "confidence_score": 92,
  "artifact_path": ".memory-bank/specs/archived-page-ui-improvement/planner-TASK.md",
  "files_to_create": 0,
  "files_to_modify": 3,
  "files_not_touch": 5,
  "blocking_decisions_count": 0,
  "non_blocking_assumptions_count": 3,
  "assumptions_documented": true,
  "complexity": "S",
  "migrations_needed": false,
  "ui_reference_path": ".memory-bank/specs/archived-page-ui-improvement/prototype-archived-page.html",
  "ipd_version": "1.1"
}
```

### Próximos passos sugeridos

1. Implementer: seguir Sec. 4.2 com o protótipo aberto; comparar estados (lista, vazio, carregando) com o HTML de referência.  
2. Após merge, smoke manual: tema claro/escuro, lista longa, card com/sem `archivedAt`, coluna removida do board (edge); confronto visual rápido com `prototype-archived-page.html`.
