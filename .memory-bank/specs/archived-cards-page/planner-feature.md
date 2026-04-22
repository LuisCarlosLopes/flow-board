# IPD: Página dedicada de cards arquivados (fora do canvas Kanban) — v1.0

> **Confiança: 86/100** | **Complexidade: M** | **Data:** 2026-04-22  
> **Track da Squad:** FEATURE | **Slug:** `archived-cards-page` | **Subtask ID:** null  
> **Artefato canônico:** `.memory-bank/specs/archived-cards-page/planner-feature.md`  
> **TSD de referência:** `spec-feature.md` v1.1 (sem delta de JSON / schema)  
> **Baseline de código:** `state.yaml` → `214a6bb9a740b58c1968bf10785196f434c236a7` (contexto; validar padrões no repo)

---

## 1. Missão

**Objetivo:**  
Retirar a listagem de cards arquivados do canvas do Kanban (`BoardView`) e oferecer uma **rota dedicada** (URL estável) para listar, **restaurar** e **excluir** arquivados do **quadro ativo** na shell, com **paridade de efeito** com o comportamento actual da secção colapsável a remover. A navegação deve ser **explícita** quando houver quadro seleccionado; com **nenhum** quadro, a rota apresenta **estado vazio** orientativo. A **busca global** (`SearchModal`) e o fluxo de abertura do **modal de tarefa** permanecem **sem** exigência de redireccionamento forçado para a nova página (TSD §5.3, RF07).

**Critério de sucesso (sumário):**  
Canvas sem secção de arquivados; `/archived` (ou path final acordado no implementador) funcional, lista filtrada e ordenada como `sortArchivedByDefault` + `isCardArchived`; acções alinhadas a `handleUnarchiveCard` / `handleDeleteCard` actuais; CAs e RF01–RF08 do TSD v1.1 verificáveis; testes actualizados (E2E smoke existente, mais regressão da remoção da secção).

---

## 2. Estado do Sistema

### 2.1 Stack e framework

| Dimensão | Valor (repo) |
|----------|----------------|
| App | `apps/flowboard` — React 19, Vite, TypeScript |
| Rotas | `react-router-dom` ^6.30; `App.tsx` usa `BrowserRouter`, `Route` `/releases` + `path="*"` → Login ou `AppShell` |
| Shell | `AppShell.tsx` — `mainView: 'kanban' \| 'hours'`, `selectedBoardId`, `BoardView` + `HoursView` + `SearchModal` |
| Domínio | `cardArchive.ts` — `isCardArchived`, `sortArchivedByDefault` (já a usar em `BoardView` para `archivedList`) |
| Testes | Vitest + Testing Library; Playwright E2E em `apps/flowboard/tests/e2e/` (ex.: `card-archive.spec.ts` depende de `archived-section-toggle`) |

### 2.2 Zona de trabalho (módulos afetados)

- `features/app/` — orquestração, navegação, conteúdo de `<main>`.
- `features/board/` — `BoardView` (remover UI inline), novo componente de página, possível extracção de lógica de persistência.
- `tests/e2e/` — actualizar fluxo pós-remoção da secção.
- `App.tsx` — **possivelmente** inalterado se a rota `/archived` for servida pelo mesmo `path="*"` (ver §4.2).

### 2.3 Contratos que NÃO podem quebrar

- **Modelo de dados / JSON:** nenhum campo novo; nenhuma migração (TSD §6, `state.yaml` scope.out).
- **Domínio card-archive / tempo / 409:** mesmas sequências que `BoardView` usa em `handleArchiveCard`, `handleUnarchiveCard`, `handleDeleteCard` (confirmação, anexos, `GitHubHttpError` 409, `reconcileBoardTimeState`, `appendNewSegments`, `writeTimeBoardStateToDoc` conforme ficheiro actual).
- **Busca:** `SearchModal` e `cardSearch` — inclusão de arquivados, badge “Arquivado”, `onSelectResult` → abrir `cardToEditId` (sem obrigar navegação para `/archived`).
- **Catálogo vs card:** `CatalogEntryJson.archived` (quadro) permanece independente de `card.archived` (TSD §2.1).

### 2.4 Módulo de referência (padrão a seguir)

- **Lista e ordem:** `archivedList` em `BoardView.tsx` (useMemo: `doc.cards.filter(isCardArchived)` + `sortArchivedByDefault`).
- **Persistência e erros:** `saveDocument` + `reload` + mensagens PT e tratamento 409 no mesmo ficheiro.
- **E2E:** `card-archive.spec.ts` — reescrever passos que usam `archived-section-toggle` e `archived-row-*` para a nova superfície (navegação + testids coerentes).

---

## 3. Definition of Done (DoD)

- [ ] **RF01 / INV-UI01:** `BoardView` **não** renderiza a secção `fb-archived`, nem `archivedExpanded` / toggle / lista; canvas mantém colunas, DnD, cartões activos, modais e cartões de overlay.
- [ ] **RF02–RF04:** Rota de arquivados acessível com URL estável; lista só arquivados do **quadro activo**; restaurar e excluir com **paridade** com a lógica actual de `handleUnarchiveCard` e `handleDeleteCard` (incl. confirmação de exclusão).
- [ ] **RF05:** Com quadro seleccionado, existe **navegação explícita** (link ou botão) para a página; **sem** quadro, estado vazio explicativo na rota, alinhado ao padrão de “sem contexto” usado na busca (TSD, CA-AC06).
- [ ] **RF06 / R-COPY01:** Cópia de confirmação de arquivar deixa de referir destino em “zona” no canvas; indica gestão na **página/lista de arquivados** (texto no `window.confirm` em `handleArchiveCard` e revisão de strings relacionadas).
- [ ] **RF07 / CA-AC05:** Busca: sem mudança de contrato; selecção de resultado abre modal de tarefa — **não** implementar redirecção obrigatória busca → página.
- [ ] **RF08 / CA-AC11:** Só visitar a rota de arquivados **não** altera agregados de horas; sem acção em `HoursView`.
- [ ] **INV-NAV01:** Trocar o quadro no selector com a rota de arquivados aberta **actualiza** a lista após carga.
- [ ] **Build e qualidade:** `npm run build` e `npm run lint` no pacote `flowboard` sem regressões introduzidas no escopo; testes afectados a verde.
- [ ] **Acessibilidade (TSD §9):** região de lista com nome acessível; botões de acção com `disabled` coerente com `saving` / persistência.

---

## 4. Especificação Técnica

### 4.1 Contrato de “API” (UI e estado)

| Superfície | Entrada | Saída / efeito |
|------------|---------|----------------|
| Rota (ex. `/archived`) | Sessão GitHub, `selectedBoardId` no estado da shell | Renderiza lista ou empty state; leitura do documento via `createBoardRepository` + `loadBoard` (mesmo padrão que `BoardView`) |
| Restaurar | Card arquivado no `doc` do quadro activo | Mesmo efeito que `handleUnarchiveCard` actual |
| Excluir | Card na lista (arquivado) | Mesmo efeito que `handleDeleteCard` actual (incl. async de anexos) |
| Navegação | Quadro seleccionado | Controlo visível; sem quadro, controlo inexistente ou desactivado com explicação (produto: preferir alinhar a RF05) |

Nenhum HTTP novo da aplicação; persistência continua a ir para GitHub via repositório existente.

### 4.2 Fluxo de execução (lógica recomendada)

1. **Entrada na rota de arquivados**  
   - Se `!selectedBoardId` → apresentar empty state (mensagem para seleccionar um quadro; não listar cards de outro contexto).  
   - Se `selectedBoardId` → carregar documento (reutilizar padrão `reload` / estados de loading e erro de `BoardView`).

2. **Renderização da lista**  
   - A partir de `doc.cards`, filtrar `isCardArchived`; ordenar com `sortArchivedByDefault`.  
   - Não incrementar contagens de coluna (R-UX01 / TSD).

3. **Restaurar / Excluir**  
   - Reutilizar a **mesma** lógica de negócio e persistência que o quadro: preferencialmente **factorizar** funções partilhadas (hook ou módulo) alimentado por `doc`/`timeState`/`saveDocument` para evitar drift (TSD §5.2 nota de paridade).

4. **Navegação cruzada**  
   - Link “Arquivados” (ou rótulo equivalente) visível com quadro activo; ao mudar o selector de quadro, a lista recarrega para o novo `boardId` (INV-NAV01).

5. **Abas Quadro / Horas vs rota**  
   - Definição mínima: ao escolher “Quadro” ou “Horas”, o utilizador regresso ao conteúdo principal em `/` (ou path base); **não** é obrigatório realce métrico de aba na rota de arquivados (TSD §10 Q1 — ajuste visual opcional).  
   - Implementação sugerida: `useLocation().pathname` na shell; se `pathname === '/archived'`, o `<main>` mostra a página de arquivados; caso contrário, mantém a lógica actual `mainView` + `BoardView`/`HoursView`. Ao clicar nas abas “Quadro”/“Horas”, usar `navigate('/')` (ou `useNavigate` para o index) **se** a URL for `/archived`, para evitar manter a shell num estado ambíguo.

6. **Reconciliação de tempo (intervalo 60s)**  
   - `BoardView` mantém `useEffect` com intervalo e `reconcileBoardTimeState` que pode persistir. A nova página, se reutilizar o **mesmo** documento/quadro, deve **não** deixar o tempo incoerente: **assunção segura (default):** factorizar o bloco de reload + tick num hook partilhado **ou** documentar que a página de arquivados chama a mesma função de “tick” se o `doc` estiver montado — alinhado ao TSD (uma leitura por carga + consistência de estado).

### 4.3 Mapa de alterações (CRIAR / MODIFICAR / NÃO TOCAR)

**CRIAR (verificados: repo não contém ainda estes ficheiros — nomes concretos escolhidos pelo implementador):**

| Ficheiro | Conteúdo |
|----------|----------|
| `apps/flowboard/src/features/board/ArchivedCardsPage.tsx` | Componente de página: props `session`, `boardId`, `onBoardPersisted?` (espelhar necessidades de `SearchModal` / geração); estados `doc`/`sha`/`timeState`/`loadError`/`persistError`/`saving` alinhados a `BoardView`; lista + botões Restaurar/Excluir; região com `aria-label` adequado. |
| Opcional: `apps/flowboard/src/features/board/useBoardDocumentForBoard.ts` (ou nome equivalente) | Se o implementer extrair `reload`, `saveDocument`, refs, intervalo de tempo e handlers de eliminar/restaurar para **reuso** entre `BoardView` e `ArchivedCardsPage`, reduz duplicação e risco de paridade. **Não obrigatório** se a duplicação for controlada e testada, mas **recomendado** (TSD “factorizar lógica partilhada”). |
| Opcional: `apps/flowboard/src/features/board/ArchivedCardsPage.css` | Estilos da lista, se os estilos `fb-archived` forem **movidos** de `BoardView.css` (evitar CSS morto). |

**MODIFICAR:**

| Ficheiro | Alteração |
|----------|------------|
| `apps/flowboard/src/features/app/AppShell.tsx` | Importar `useLocation`, `useNavigate` (e `Link` se aplicável). Ramificar o conteúdo de `<main>`: rota de arquivados → `ArchivedCardsPage`; caso contrário, manter `BoardView` / `HoursView` condicionados a `mainView` e `selectedBoardId`. Inserir **navegação explícita** para a rota de arquivados na `fb-board-bar` ou topbar, **visível quando** `selectedBoardId` (ex.: `Link to="/archived"` com texto claro, `data-testid` estável para E2E). Ao aceder às abas Kanban/Horas, garantir `navigate('/')` se `pathname` for `/archived`, para o utilizador sair da rota. Manter `SearchModal` e `onSelectResult` **inalterados** no contrato. |
| `apps/flowboard/src/features/board/BoardView.tsx` | Remover `archivedExpanded`, toda a secção `section.fb-archived` (linhas ~605–645 na baseline), e o `useMemo` **apenas** se deixar de ser necessário per si (o `archivedList` pode ser removido se nenhum uso restar; verificar referências). **Manter** `handleUnarchiveCard`, `handleDeleteCard`, `handleArchiveCard` para colunas, modal e fluxos. Actualizar string do `confirm` em `handleArchiveCard` (RF06). |
| `apps/flowboard/src/features/board/BoardView.css` | Remover ou relocalizar regras `.fb-archived*` de acordo com o destino da lista na nova página. |
| `apps/flowboard/tests/e2e/card-archive.spec.ts` | Substituir interacção com `archived-section-toggle` por navegação para `/archived` (ou URL final) e asserções na nova lista (`archived-row-*` ou novos `data-testid` expostos em `ArchivedCardsPage`). Garantir que o smoke continua a cobrir: arquivar → ver na lista → busca com badge → modal → restaurar → card de volta no quadro. |
| `apps/flowboard/src/App.tsx` | **Default:** nenhuma alteração se o `path="*"` continuar a servir `AppShell` para `/` e `/archived` (comportamento actual do React Router 6 com splat). Se o implementer optar por rotas aninhadas com `Outlet`, aí sim ajustar — documentado como **alternativa**; evitar **duas** instâncias de `AppShell` sem `Outlet` (perda de estado e `mainView`). |

**NÃO TOCAR (excepto ajuste indirecto de imports se a build exigir):**

| Ficheiro / área | Motivo |
|-----------------|--------|
| `apps/flowboard/src/domain/cardArchive.ts` | Sem alteração de contrato; reutilizar funções. |
| `apps/flowboard/src/infrastructure/persistence/types.ts` | Sem delta de schema. |
| `apps/flowboard/src/features/app/SearchModal.tsx` | RF07: sem deep-link forçado. |
| `apps/flowboard/src/domain/cardSearch.ts` | Fora do escopo. |

### 4.4 Dependências (libs e ambiente)

- Reutilizar dependências existentes: `@` domínio, `createClientFromSession`, `createBoardRepository`, `timeBridge`, `attachmentSync` como hoje no `BoardView` nas operações que persistem.  
- **Nenhuma** dependência npm nova prevista.

---

## 5. Guardrails

- **Não** introduzir campos no JSON do quadro ou do card.  
- **Não** duplicar a lógica de exclusão / restaurar / tempo de forma que diverja silenciosamente de `BoardView` — se não extrair hook, **sincronizar** manualmente e cobrir com E2E.  
- **Não** alterar o `SearchModal` para navegar automaticamente para arquivados ao clicar num resultado.  
- **Específico do projeto:** manter padrão de `GitHubHttpError` 409 com reload e mensagens em português, como em `saveDocument` actual.  
- **Não** remover `data-testid` usados noutros testes sem actualizar as referências (grep em `apps/flowboard/tests`).

---

## 6. Testes

### 6.1 Estratégia

- **E2E (obrigatório a actualizar):** `card-archive.spec.ts` — substituir dependência da secção colapsável; validar rota, lista e fluxo de busca + modal.  
- **Unitário / componente (opcional, risco médio):** se `ArchivedCardsPage` for fino e depender de hook testado, testar empty state e uma linha de lista com `@testing-library` **se** o time quiser reforçar; o TSD (CA-AC10) aceita concentração de risco no E2E.  
- **Domínio:** `cardArchive.test.ts` — **não** requer alteração salvo regresso involuntário.

### 6.2 Casos a cobrir

| Tipo | Caso |
|------|------|
| Happy path E2E | Arquivar no Kanban → navegar para arquivados → card listado → busca e badge → abrir modal → restaurar → card visível no quadro |
| Negativo / empty | Aceder a `/archived` sem quadro seleccionado → mensagem (sem lista “fantasma”) |
| Borda | Erro de carga (se reproduzível em teste ou manual documentado) alinhado ao padrão do board |
| Regressão | Não existe `archived-section-toggle` no canvas após a mudança |

### 6.3 Comandos (pacote `apps/flowboard`)

- `npm run test` (Vitest)  
- `npm run test:e2e:raw` ou script do projeto com auth E2E, conforme `playwright.config.ts` e `card-archive` suite.

---

## 7. Riscos, assunções e pontos de atenção

| Item | Tipo | Mitigação |
|------|------|-----------|
| Duplicação de `saveDocument` + handlers | Risco de drift | Preferir extracção mínima comum; code review a paridade linha-a-linha |
| Intervalo 60s de reconciliação só em `BoardView` | Possível inconsistência de tempo se o utilizador ficar **só** em arquivados | Partilhar hook ou replicar o efeito necessário (ver §4.2 passo 6) |
| Duas instâncias de `AppShell` com rotas irmãs | Perda de `mainView` / estado | Usar `path="*"` + `useLocation` **ou** um único layout com `Outlet` |
| E2E frágil (GitHub real) | Já inerente à suite | Manter timeouts e títulos únicos; actualizar selectores removidos |
| Q3 (TSD): texto exacto do link | Não bloqueante | Cópia clara “Arquivados” / equivalente, consistente com topbar em PT |

**Assunções não bloqueantes (defaults):**

- **A1:** O path público final será literalmente `/archived` (alinhado ao TSD e ao handoff). Se o implementer usar outro path, manter Uma rota **bookmarkable** e actualizar E2E + links.  
- **A2:** O controlo de navegação para arquivados pode viver na `fb-board-bar` junto ao selector de quadros, desde que “explícito” e com quadro activo.  
- **A3:** O `clearSearchModalBoardCache` e `onBoardPersisted` devem ser chamados após persistência na nova página com a mesma frequência de necessidade que `BoardView` (invalidar busca após gravação).

---

## 8. Protocolo de auto-correção (executor)

1. Após a primeira compilação, abrir o quadro, arquivar um card, confirmar que **não** há secção colapsável no `data-testid="board-canvas"`.  
2. Navegar para `/archived` e verificar paridade de lista e acções.  
3. Reexecutar E2E `card-archive` e Vitest afectados.  
4. Se 409: confirmar que a mensagem e o reload ainda ocorrem.  
5. Grep `archived-section-toggle` e `fb-archived` no `BoardView` — deve retornar vazio (excepto CSS se movido, não deixar referências órfãs no canvas).

---

## 9. Formato de entrega do executor

- PR descrita com: remoção da secção no canvas, nova rota, localização do link, actualização de E2E.  
- Lista de ficheiros tocados = mapa de alterações; **não** incluir documentação além do necessário.  
- Se extrair hook, **uma** frase no PR sobre localização e contrato.

---

## 10. Metadados e decisão interna (Decision Register resumida)

| Decisão | Tipo | Resolução no IPD |
|--------|------|------------------|
| Abordagem de rota sem remount | Implementação | **Default:** `useLocation` + condicional em `AppShell` com `path="*"` inalterado; alternativa: `Outlet` com rotas aninhadas |
| Factorização de persistência | Implementação / paridade | **Recomendada:** hook partilhado; não bloqueia se o executor duplicar com testes e revisão |
| Realce de aba Quadro/Horas na rota arquivados | Produto (Q1) | Não prescrito; mínimo: navegação de retorno a `/` |

**Decisões bloqueantes resolvidas no TSD v1.1:** 0.  
**Assunções documentadas acima (A1–A3).**

**Complexidade:** M.  
**Migrações de dados:** Não.

**JSON (pipeline / metadata):**

```json
{
  "agent": "planner",
  "status": "success",
  "slug": "archived-cards-page",
  "track": "FEATURE",
  "subtask_id": null,
  "confidence_score": 86,
  "artifact_path": ".memory-bank/specs/archived-cards-page/planner-feature.md",
  "files_to_create": 1,
  "files_to_modify": 4,
  "files_not_touch": 5,
  "blocking_decisions_count": 0,
  "non_blocking_assumptions_count": 3,
  "assumptions_documented": true,
  "complexity": "M",
  "migrations_needed": false
}
```

*Nota:* `files_to_create` mínimo = 1 componente de página; entradas “opcionais” (hook, CSS) podem subir a 2–3.

---

**Próximos passos sugeridos:** fase `plan-reviewer` (se aplicável) → `task-breakdown` → implementer → tester.

**Fecho:** IPD v1.0, narrativa em português, mapa de ficheiros alinhado ao repositório verificado; **confiança 86/100** (reserva: factorização de persistência e intervalo de tempo entre vistas).

**Ficheiro guardado em:** `.memory-bank/specs/archived-cards-page/planner-feature.md`
