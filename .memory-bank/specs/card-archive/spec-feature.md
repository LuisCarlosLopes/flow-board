# TSD: Arquivar card — área de arquivados e busca — v1.0

> **Status:** Draft  
> **Autor:** spec v1.0 | **Data:** 2026-04-22  
> **Confiança:** 88/100 | **Complexidade:** M

---

## 1. VISÃO GERAL

**Problema que resolve:**  
Cards concluídos ou irrelevantes para o fluxo atual permanecem nas colunas do Kanban, poluindo a visão e a ordenação, sem uma forma de “retirar do quadro” sem perder o histórico nem a capacidade de localizar a tarefa depois.

**Comportamento principal:**  
O usuário pode **arquivar** um card: ele deixa de aparecer nas colunas do Kanban (e na lógica de arrastar/ordenar), passa a ser listado numa **área de arquivados** do quadro ativo, onde pode **restaurar** ou **excluir**. A **busca** existente (modal, atalho `/`) continua a encontrar cards arquivados pelos mesmos critérios já usados hoje (título, descrição, data planejada, horas planejadas, etc.). O estado é persistido no **JSON do quadro** (`BoardDocumentJson`), com **compatibilidade retroativa** para documentos sem os novos campos.

**Ator principal:**  
Usuário autenticado com acesso ao repositório GitHub do FlowBoard (mesmo modelo de sessão/PAT já usado pelo app).

---

## 2. CONTEXTO DO SISTEMA

> Ponte entre esta spec e o código atual. Terminologia alinhada ao repositório.

### 2.1 Entidades existentes relevantes

| Entidade | Campos / estrutura relevantes | Papel na feature |
|----------|-------------------------------|------------------|
| `Card` | `cardId`, `title`, `columnId`, `description?`, `plannedDate?`, `plannedHours?`, `createdAt?`, `attachments?` | **Modificada** — flags/timestamps de arquivamento (ver §6). |
| `BoardDocumentJson` | `schemaVersion`, `boardId`, `title`, `workingHours?`, `columns[]`, `cards[]`, `timeSegments[]`, `cardTimeState` | **Modificada** — `cards[]` inclui arquivados no mesmo array; tempo já persistido nos campos citados. |
| `CatalogEntryJson` | `boardId`, `title`, `dataPath`, `archived?` | **Desambiguação** — `archived` aqui é **quadro** no catálogo (ADR-002), **não** arquivamento de card. |
| Resultado de busca (`CardSearchResult`) | `cardId`, `title`, `description?`, `columnId`, `score`, `plannedDate?`, `plannedHours?`, `createdAt?` | **Estendida** (opcional) para UX — indicador de hit arquivado (ver §5). |
| Estado de tempo (`CardTimeState`, `TimeBoardState`) | Segmentos fechados; trabalho aberto em coluna de papel “em progresso” | **Afetada** — arquivamento respeita invariantes de tempo (ver §4.2). |

*Rastreabilidade a ficheiros e módulos: ver **§12.2 Anexo**.*

### 2.2 Persistência e carregamento

| Peça | O que faz | Impacto desta feature |
|------|-----------|------------------------|
| Repositório de quadro (cliente) | Lê/escreve JSON do board por identificador, com controlo de versão (SHA; ADR-005) | Sem mudança de rota; elementos de `cards[]` ganham campos opcionais por card. |
| Validação / parse do documento | Exige `schemaVersion`, `columns`, `cards`, `timeSegments`, `cardTimeState` | Válido com campos **opcionais** nos objetos de `cards[]`. |
| Layout de repositório (ADR-002) | Catálogo + um blob JSON por quadro | Extensão não destrutiva; ADR-008 (campos opcionais em `Card` sem bump obrigatório de `schemaVersion`). |

### 2.3 Superfícies de produto tocadas (comportamento hoje)

| Superfície | Comportamento relevante |
|------------|-------------------------|
| Busca global do quadro | Carrega documento do quadro ativo e filtra/pontua cards sobre o array `cards` completo. Deve **continuar** a incluir arquivados na coleção pesquisada. |
| Vista Kanban | Monta listas por coluna a partir de `columns` e `cards`; editar e excluir. Deve **excluir** arquivados das colunas e do arrastar-soltar; integrar **arquivar** e área **Arquivados**. |
| Relatório / agregação de horas | Usa todos os `cards` e `timeSegments`. Horas já registadas para cards que passam a arquivados **permanecem** no relatório. |
| Motor de tempo (domínio) | Transições entre colunas e papéis; reconciliação de segmento aberto vs. papel da coluna | **Referencial** para fechar trabalho contável ao arquivar com timer aberto (ver §4.2). |

### 2.4 Regras de negócio já existentes que interagem com a feature

- **Coluna de papel “em progresso”:** Card fora desse papel não deve manter início de segmento aberto contável (`activeStartMs`) após reconciliação.
- **Listagem Kanban:** Todas as entradas cujo `columnId` coincide com a coluna entram na lista da coluna; arquivados devem ser **excluídos** antes de alimentar colunas e DnD.
- **Exclusão de card:** Remove o card do documento, limpa estado de tempo associado e política de anexos — referência para **excluir** arquivado com a mesma higiene.
- **Busca:** Pontuação atual não filtra por coluna nem por flags; critérios são substring case-insensitive em título, descrição, data planejada, horas planejadas.

_Se não houver regra explícita no código para “arquivar”, ela é introduzida por esta spec; as linhas acima são as que mais impactam o desenho._

---

## 3. REQUISITOS FUNCIONAIS

**RF01 — Arquivar a partir do quadro**  
O sistema deve permitir que o usuário **arquive** um card por uma **ação explícita e acessível** na UI do quadro (mesmo quadro ativo), de forma equivalente a uma intenção clara de “retirar do Kanban sem apagar”.

**RF02 — Ocultar do Kanban e do DnD**  
O sistema deve garantir que cards arquivados **não** apareçam nas colunas do Kanban, **não** entrem nas listas usadas para **ordenação ou arrastar e soltar** entre colunas, e **não** ocupem slot visível na coluna.

**RF03 — Área de arquivados**  
O sistema deve oferecer uma **área ou visão de “Arquivados”** no contexto do **quadro ativo**, listando os cards arquivados desse quadro, permitindo ao usuário **restaurar** (desarquivar) e **excluir** conforme as regras desta spec.

**RF04 — Busca inclui arquivados**  
O sistema deve manter o comportamento da busca modal (`SearchModal` + domínio `cardSearch`) tal que consultas não vazias **continuem a retornar** cards arquivados quando houver match nos **mesmos campos** já considerados por `scoreCard` (título, descrição, data planejada, horas planejadas).

**RF05 — Abrir card a partir da busca**  
O sistema deve permitir que, ao selecionar um resultado de busca que seja um card arquivado, o fluxo de **edição/visualização** do card (ex.: modal de tarefa) **continue funcional**, coerente com o estado arquivado (ações disponíveis conforme §4).

**RF06 — Persistência compatível**  
O sistema deve persistir o estado de arquivamento no **documento JSON do quadro** (`BoardDocumentJson`), em conformidade com ADR-002, de modo que **boards existentes** sem os novos campos continuem válidos após leitura (migração implícita / defaults — ver §6).

**RF07 — Tempo rastreado ao arquivar**  
O sistema deve aplicar o **comportamento de tempo** definido em §4.2 ao arquivar (incluindo persistência coerente em `cardTimeState` / `timeSegments` quando houver segmento aberto em `in_progress`).

**RF08 — Restaurar**  
O sistema deve permitir **desarquivar** um card a partir da área de arquivados, voltando a exibi-lo nas colunas conforme seu `columnId` **preservado**, e limpando os campos de arquivamento definidos em §6.

**RF09 — Excluir arquivado**  
O sistema deve permitir **excluir** um card arquivado com as **mesmas garantias** de exclusão já esperadas para um card no quadro (remoção do card do documento, limpeza de estado de tempo associado ao card e política de anexos alinhada ao fluxo atual de exclusão).

---

## 4. REGRAS DE NEGÓCIO

### 4.1 Validações

- **[V01]** Só é possível arquivar um card que **existe** no `cards[]` do quadro e **não** está já arquivado — se já arquivado, a ação repetida é **idempotente** (sem erro obrigatório ao usuário; nenhum efeito colateral adicional exigido além do estado já arquivado).
- **[V02]** Restaurar só aplica a cards com flag de arquivado verdadeira; restaurar um card não arquivado é **idempotente** ou no-op coerente.
- **[V03]** `archivedAt`, quando presente, deve ser **ISO 8601** (consistente com `createdAt` em `Card`).

### 4.2 Regras de estado (Kanban × arquivado × tempo)

```
Não arquivado (implícito ou archived=false) → Arquivado : ação explícita "Arquivar"
Arquivado → Não arquivado : ação explícita "Restaurar"
Arquivado → removido do documento : ação "Excluir" (irreversível no JSON)
```

**Tempo ao arquivar (invariante de produto):**

- Se o card **não** está em coluna com `role === 'in_progress'` **ou** não possui `activeStartMs` definido no estado de tempo reconciliado, o arquivamento **não** deve inventar segmentos novos; apenas marca arquivamento e metadados.
- Se o card está em coluna de papel **em progresso** **e** possui **segmento aberto** (`activeStartMs`), ao arquivar o sistema deve **fechar o trabalho contável** até o instante do arquivamento: materializar intervalos fechados **com as mesmas regras de jornada** já usadas ao fechar trabalho em progresso para coluna de papel **concluído** (incluindo calendário de `workingHours` / particionamento já aplicado nessa transição no motor de tempo), **acumulando** em `completed` e gravando entradas correspondentes em `timeSegments` como nas transições que fecham segmento, **sem** perder o tempo já acumulado.
- Após fechar (se aplicável), `activeStartMs` do card deve ficar **indefinido** no estado persistido para esse `cardId`.
- **Justificativa:** Descartar o segmento aberto (como em algumas saídas de “em progresso” para papéis que não são “concluído”) **não** é aceitável ao arquivar, pois o utilizador espera preservar horas trabalhadas; o relatório de horas depende de `timeSegments`.

**Após restaurar:**  
O card volta ao Kanban; a reconciliação existente de estado de tempo do quadro (com `cards` e definição de colunas) deve continuar a garantir consistência de `activeStartMs` com o **papel** da coluna atual (ex.: não manter timer aberto se o card não está em coluna de papel “em progresso”).

### 4.3 Autorização

- **[A01]** Segue o **mesmo modelo** já vigente: quem pode salvar o quadro no repositório pode arquivar/restaurar/excluir; não há perfis adicionais nesta spec.

### 4.4 Limites

- **[L01]** Nenhum limite obrigatório de quantidade de arquivados nesta versão (alinhado a “fora de escopo” para operações em massa).
- **[L02]** Tamanhos de título/descrição permanecem os já suportados pelo domínio; arquivamento não altera limites.

### 4.5 Regras de apresentação e consistência

- **[R-UX01]** Contagens de cards **por coluna** usadas para confirmações ou resumos (ex.: editor de colunas) devem **excluir** cards arquivados, para não distorcer o número de itens “no Kanban”.
- **[R-SEARCH01]** Nos resultados da busca, o sistema deve deixar claro visualmente quando o card é **arquivado** (ex.: rótulo/badge), **além** da informação de coluna/origem já exibida, para evitar ambiguidade com cards ativos.

---

## 5. CONTRATO DE INTERFACE

> FluxBoard MVP **não** expõe API REST própria; o contrato é **documento JSON + operações de domínio observáveis** e, onde fizer sentido, **extensão do resultado de busca**.

### 5.1 Operações observáveis (produto)

| Operação | Pré-condição | Efeito no documento (resumo) | Falha lógica (referência CA) |
|----------|--------------|------------------------------|------------------------------|
| Arquivar card | Card existe, não arquivado | Marcar arquivado, registrar `archivedAt`, aplicar §4.2; card some do Kanban. | Card inexistente → CA06 |
| Restaurar card | Card arquivado | Limpar arquivamento; card volta ao Kanban no `columnId` salvo. | Conflito de gravação → CA07 |
| Excluir card arquivado | Card arquivado | Remover card e estado associado como na exclusão já existente. | Idem CA06/CA07 |

**Idempotência:** reenvio lógico de “arquivar” no estado já arquivado não deve corromper dados nem duplicar segmentos de tempo.

**Nota:** N/A — API REST da aplicação; contrato observável = documento JSON persistido + operações de domínio acima (alinhado a CAs §7.2).

### 5.2 Extensão opcional do resultado de busca

Para suportar **[R-SEARCH01]** sem mudar a fórmula de pontuação:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `archived` | `boolean` | Não | `true` se o card correspondente estiver arquivado; ausente pode ser tratado como `false` em consumidores. |

O pipeline de busca continua a receber a lista completa de `Card` (incluindo arquivados); apenas o **mapeamento** para `CardSearchResult` passa a poder incluir essa bandeira.

### 5.3 Endpoints HTTP novos

**N/A** — persistência continua via GitHub Contents API e tipos já existentes no cliente.

---

## 6. MODELO DE DADOS (delta)

### 6.1 Alteração de endpoints existentes

**N/A** — sem API REST de aplicação.

### 6.2 Novos campos em entidades existentes

| Entidade | Campo | Tipo | Obrigatório | Descrição / Regra |
|----------|-------|------|-------------|-------------------|
| `Card` | `archived` | `boolean` | Não | Se `true`, card está arquivado. **Ausente** ou `false`: tratado como não arquivado (compatível com JSON legado). |
| `Card` | `archivedAt` | `string` (ISO 8601) | Não | Momento do arquivamento; deve existir quando `archived === true` após a primeira operação bem-sucedida; em legado ausente com `archived` implícito, não aplicável. |

**Decisão de modelagem:** Manter arquivados no **mesmo** array `BoardDocumentJson.cards` (em vez de array separado) para:

- Reutilizar `searchCards` sem concatenação de fontes;
- Manter `cardId` único no documento;
- Simplificar exclusão/restauração sem mover estruturas entre arrays.

**Desambiguação:** `CatalogEntryJson.archived` refere-se ao **quadro** no catálogo global, **não** ao card.

### 6.3 Necessidade de migration

- [x] **Sim** — *no sentido de* **migração de leitura / default seguro** (não necessariamente script ETL).
- [ ] **Não** — *apenas* se nenhum campo novo existisse (não é o caso).

**Detalhe:** Boards existentes sem `archived` / `archivedAt` nos cards: interpretar como **não arquivados**. O `parseBoard` atual não valida forma de cada card além da estrutura mínima do array; campos extras opcionais em objetos card são aceitáveis no ecossistema já adotado (vide padrão de `attachments?`). **Bump de `schemaVersion`** não é obrigatório para esta extensão, desde que o loader continue aceitando o documento — alinhado a ADR-002/ADR-008 e à prática já documentada para campos opcionais em `Card`.

---

## 7. CRITÉRIOS DE ACEITE

### 7.1 Caminho feliz

- **[CA01]** Deve remover o card de **todas as colunas** do Kanban (qualquer coluna em que estivesse listado) após arquivar, mantendo-o na área **Arquivados** do mesmo quadro — sem assumir número fixo de colunas além das regras de layout já vigentes.
- **[CA02]** Deve permitir **restaurar** um card arquivado e voltá-lo à coluna correspondente ao `columnId` persistido, na ordem coerente com o algoritmo atual de lista por coluna (ex.: no fim da coluna ou regra única definida na implementação, desde que consistente e documentada em teste).
- **[CA03]** Deve manter a busca modal retornando o card arquivado quando a query casa com **título** ou **descrição** (e demais campos já cobertos pela pontuação de relevância existente).
- **[CA04]** Deve, ao arquivar um card em `in_progress` com timer aberto, **persistir** tempo fechado até o instante do arquivamento de forma refletida em `timeSegments` / `cardTimeState` coerente com o relatório de horas.
- **[CA05]** Deve excluir um card arquivado e remover seu rastro do quadro e da área de arquivados, com política de anexos alinhada ao fluxo de exclusão já existente.

### 7.2 Erros e validação

- **[CA06]** Deve impedir ou tratar de forma segura tentativa de operações em card inexistente (mensagem ou no-op conforme padrão do app), sem corromper o JSON.
- **[CA07]** Em conflito de gravação (409), deve preservar o comportamento já estabelecido no app (retry/recarregar), sem perda silenciosa da intenção — sem introduzir novo tipo de falha específica só de arquivamento além do fluxo de persistência existente.

### 7.3 Edge cases

- **[CA08]** Arquivar um card **já arquivado** não deve duplicar entradas em `timeSegments` nem alterar `archivedAt` de forma inconsistente (idempotência).
- **[CA12]** Restaurar um card **não** arquivado deve ser **idempotente** (no-op seguro), alinhado a **[V02]**.
- **[CA13]** Abrir um documento de quadro persistido **sem** `archived` / `archivedAt` nos cards deve tratar todos como não arquivados e permitir gravação sem erro (compatibilidade legado), alinhado a **RF06**.
- **[CA09]** Card arquivado **não** deve aparecer nas listas por coluna nem nas listas usadas para DnD; arrastar não deve poder iniciar a partir de um card arquivado.
- **[CA10]** O relatório de horas do quadro deve continuar a reportar segmentos históricos de cards arquivados **se** os segmentos existirem em `timeSegments` (histórico preservado).
- **[CA11]** Abrir busca, encontrar card arquivado e selecionar deve abrir o modal de tarefa com estado coerente (arquivado) e ações permitidas pela spec (restaurar/excluir/editar conforme decisão de UX mínima: pelo menos restaurar e excluir acessíveis a partir da área de arquivados; edição a partir do modal pode permanecer se já existir, desde que não viole RF02).

---

## 8. FORA DE ESCOPO

- **[FE01]** Arquivamento em massa, filtros avançados na área de arquivados, ordenação custom complexa — **fora** do MVP desta spec (salvo ordenação simples por `archivedAt` descendente como default opcional na implementação).
- **[FE02]** Sincronização multi-dispositivo além do commit Git já existente.
- **[FE03]** Notificações, automações externas, webhooks.
- **[FE04]** Arquivar **quadro** inteiro — já é conceito separado em `CatalogEntryJson.archived`.
- **[FE05]** Política de retenção/legal hold ou exportação dedicada de arquivados.

---

## 9. REQUISITOS NÃO-FUNCIONAIS

### 9.1 Performance

- Seguir o desempenho já esperado para um único `BoardDocumentJson` em memória (busca linear em `cards` como hoje); arquivados não devem exigir segunda leitura de rede só para busca no mesmo quadro.

### 9.2 Segurança

- Seguir modelo atual: sem PAT em JSON commitado; mesmas permissões de escrita no repositório.

### 9.3 Retenção e auditoria

- `archivedAt` fornece trilha mínima de **quando** foi arquivado; não exige log de auditoria separado nesta spec.

---

## 10. PERGUNTAS EM ABERTO

> Residuais não bloqueantes; cada uma com default adotado para o planner.

| # | Dúvida residual | Default adotado | Justificativa | Impacto se estiver errado | Responsável |
|---|-----------------|-----------------|---------------|---------------------------|-------------|
| Q1 | Ordenação padrão na lista de arquivados | Por `archivedAt` descendente (mais recente primeiro); se `archivedAt` ausente, fallback por `createdAt` ou `cardId` | Previsível e barato | Reordenar UI | PO |
| Q2 | Arquivar também a partir do **modal** de edição vs. só no cartão | Ambos permitidos se a ação for a mesma operação de domínio | Melhora acessibilidade da ação explícita | Remover duplicidade de botão | PO |
| Q3 | Edição de campos (título, etc.) enquanto arquivado | Permitida se o modal já suporta edição de card existente; card permanece fora do Kanban até restaurar | Consistência com RF05 | Restringir campos no modal se PO quiser “somente leitura” | PO |

**Nenhuma decisão 🔴 bloqueante** identificada para handoff.

---

## 11. HANDOFF PARA O IMPL-PLANNER

```
Escopo para planejamento:

Feature: Arquivar card — área de arquivados e busca
TSD versão: v1.0
Perguntas bloqueantes: 0 — decisões consequenciais resolvidas antes do handoff
Assunções não bloqueantes documentadas: 3 (Q1–Q3 em §10)

O que deve ser implementado:
- RF01–RF03: UI de arquivar, ocultar do Kanban/DnD, área Arquivados com restaurar e excluir
- RF04–RF05: Busca inalterada na cobertura de campos; resultados indicam arquivado; seleção abre fluxo de card
- RF06–RF07: Campos opcionais em Card + defaults para JSON legado; fechamento de tempo ao arquivar com preservação de horas
- RF08–RF09: Restaurar e excluir com mesma higiene de dados que exclusão atual

Novos contratos de interface:
- N/A (API REST); extensão opcional de CardSearchResult com archived: boolean; novos campos em Card conforme §6

Delta de modelo de dados:
- Card: archived?: boolean, archivedAt?: string (ISO 8601)
- Migration necessária: Sim (leitura com default implícito; sem bump obrigatório de schemaVersion se loader permanecer tolerante)

Restrições para o planejamento (regras de negócio obrigatórias):
- Arquivados permanecem em cards[]; filtrar na montagem do Kanban e no DnD
- Ao arquivar com timer aberto em in_progress, fechar segmento contável como na transição para done (materialização com working hours)
- Busca deve incluir arquivados; não excluir do array pesquisado
- Não confundir CatalogEntryJson.archived com card arquivado

Fora de escopo (não implementar):
- FE01–FE05 conforme §8
```

---

## 12. METADADOS

| Campo | Valor |
|-------|-------|
| Confiança da Spec | 88/100 |
| Complexidade Estimada | M |
| Entidades Impactadas | `Card`, `BoardDocumentJson`, `CardSearchResult` (opcional), estado de tempo / `timeSegments` |
| Novos Endpoints | 0 |
| Requer Migration | Sim (defaults de leitura; opcionais no JSON) |
| Decisões Bloqueantes em Aberto | 0 |
| Assunções Não-Bloqueantes Documentadas | 3 |
| Versão do TSD | v1.0 |
| Autor | spec v1.0 |

### 12.1 Nota sobre o score de confiança

- **Fortes:** objetivo alinhado ao modelo de dados e às superfícies já existentes (busca, Kanban, tempo, persistência JSON); ADR-002 e padrão de campos opcionais em `Card` já estabelecido no projeto. Evidência de módulos: **§12.2**.
- **Reserva (~12 pontos):** detalhes finos de UX (ordenação exata na lista de arquivados, duplicação de botão no modal) ficaram como defaults em §10; não alteram contrato de dados nem RFs principais.

### 12.2 Anexo — rastreabilidade ao repositório

> Somente para implementação e planner; não faz parte do contrato observável do produto.

| Conceito na spec | Localização no repositório |
|------------------|----------------------------|
| Tipo `Card`, estado de tempo | `apps/flowboard/src/domain/types.ts` |
| `BoardDocumentJson`, `CatalogEntryJson` | `apps/flowboard/src/infrastructure/persistence/types.ts` |
| Busca / pontuação | `apps/flowboard/src/domain/cardSearch.ts` |
| Modal de busca | `apps/flowboard/src/features/app/SearchModal.tsx` |
| Vista quadro / colunas | `apps/flowboard/src/features/board/BoardView.tsx` |
| Layout por coluna (`buildItemsRecord`) | `apps/flowboard/src/domain/boardLayout.ts` |
| Load/save/parse board | `apps/flowboard/src/infrastructure/persistence/boardRepository.ts` |
| Motor de tempo | `apps/flowboard/src/domain/timeEngine.ts` |
| Relatório de horas | `apps/flowboard/src/features/hours/HoursView.tsx` |
| Regras de layout mínimo de colunas | `apps/flowboard/src/domain/boardRules.ts` |
| ADRs citados | `.memory-bank/adrs/002-flowboard-json-repository-layout.md`, `005-*`, `008-*` (conforme inventário do projeto) |
