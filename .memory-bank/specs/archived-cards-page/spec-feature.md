# TSD: Página dedicada de cards arquivados (fora do quadro Kanban) — v1.1

> **Status:** Draft (remediação pós spec-reviewer)  
> **Autor:** spec v1.1 | **Data:** 2026-04-22  
> **Confiança:** 87/100 | **Complexidade:** M

**Delta em relação a:** TSD *Arquivar card — área de arquivados e busca* (card-archive) — comportamento de domínio, persistência, busca e motor de tempo **permanecem** conforme documento de referência; esta especificação restringe-se à **navegação**, **superfície de listagem** e **remoção da área inline** no canvas do quadro.

**Delta v1.0 → v1.1:** Formato obrigatório de migração (§6.3); remoção de identificadores de implementação da narrativa principal (checklist C1.14); handoff com lista RF e campo de migração; FE com motivo; typo **[L01]**; nota de idempotência HTTP N/A (§5.4).

---

## 1. VISÃO GERAL

**Problema que resolve:**  
Após card-archive, os cards arquivados deixam o Kanban mas continuam a ser geridos numa **secção colapsável** no próprio canvas do quadro. Isso desvia foco do fluxo de colunas, ocupa espaço vertical e mistura “gestão de arquivo” com “trabalho no quadro”. O produto pretende **separar** a gestão de arquivados numa **página dedicada (rota)** e deixar o quadro **apenas** com colunas e cards ativos.

**Comportamento principal:**  
- O sistema oferece uma **rota** onde o utilizador vê, para o **quadro ativo**, apenas os cards **marcados como arquivados** no documento JSON do quadro (flag de arquivamento verdadeira, no sentido do TSD card-archive), ordenados pela **regra padrão de arquivados** desse TSD (data de arquivamento descendente e desempates já definidos lá).  
- Na mesma superfície, o utilizador pode **restaurar** e **excluir** arquivados com o **mesmo efeito em documento e tempo** que hoje (ver §4 e TSD card-archive).  
- A **vista Kanban (canvas)** deixa de renderizar qualquer secção visual de listagem de arquivados abaixo ou junto das colunas (incluindo área colapsável e controlo de expansão que existiam na linha de base); o quadro exibe somente colunas, DnD e cards não arquivados.  
- A **navegação** da aplicação expõe de forma **explícita** o acesso a essa página **quando existir contexto de quadro aplicável** (quadro selecionado / ativo no modelo atual de seleção).

**Ator principal:**  
Utilizador autenticado com sessão GitHub já existente, com o mesmo modelo de autorização de escrita no repositório do quadro (TSD card-archive **[A01]**).

---

## 2. CONTEXTO DO SISTEMA

### 2.1 Entidades e regras herdadas (sem alteração de modelo)

| Entidade / conceito | Papel nesta feature |
|---------------------|----------------------|
| Card arquivado (flag + instante de arquivamento) | Inalterado; arquivados permanecem no conjunto de cards do documento do quadro. |
| Documento JSON do quadro | Documento único por quadro; leitura/gravação via repositório já existente. |
| Critério “está arquivado” e ordenação padrão da lista de arquivados | **Referência de verdade** no TSD e domínio card-archive; esta spec exige **paridade de filtro e ordenação** com esse comportamento. |
| Operações de domínio de arquivar, restaurar, excluir, tempo | Definidas no TSD card-archive (§4, §5, §6); **reutilização obrigatória** das mesmas invariantes ao persistir. |
| Resultado de busca com indicação de arquivado e modal de busca | Comportamento de inclusão de arquivados na pesquisa e **badge** “Arquivado” mantém-se; ver §3 e §5.3. |

**Desambiguação:** o campo de “arquivado” no **catálogo de quadros** (nível de entrada do catálogo) continua independente do **arquivamento de card** dentro do documento do quadro.

### 2.2 Estado de produto hoje (linha de base)

- A secção de arquivados no canvas lista os cards arquivados do documento, na **ordem padrão de arquivados** do domínio, e oferece Restaurar / Excluir com o mesmo tipo de efeito que noutros pontos do quadro.  
- A shell da aplicação mantém **quadro selecionado** persistido por repositório; o canvas Kanban **não** monta a vista de quadro se não houver quadro selecionado.  
- A busca global carrega o documento do quadro ativo; sem quadro, mostra mensagem de estado vazio. Ao selecionar um resultado, o fluxo atual **abre o modal de edição de tarefa** (incluindo para hits arquivados).

### 2.3 Dependência

- **Pré-requisito:** TSD e implementação **card-archive** concluídos; alterações desta spec são puramente de **superfície e navegação** sobre o mesmo contrato de dados e operações.

---

## 3. REQUISITOS FUNCIONAIS

**RF01 — Remover a área inline de arquivados do canvas Kanban**  
O sistema **não** deve apresentar, na vista de quadro que mostra as colunas Kanban, a secção colapsável/expandível de “Arquivados” nem listagem de linhas de cards arquivados nesse canvas. O utilizador percebe o quadro como **só** colunas + cards ativos (e overlays/modais que já existam para criação/edição).

**RF02 — Página dedicada de arquivados**  
O sistema deve disponibilizar uma **rota** de aplicação que constitui a **visão principal** para listar e gerir cards arquivados do **quadro ativo** (o mesmo quadro selecionado no restante do app, sem selecção multi-quadro na URL nesta versão).

**RF03 — Conteúdo da lista**  
A página deve listar **apenas** cards com arquivamento verdadeiro (no sentido do TSD card-archive) pertencentes ao documento do quadro ativo, com **ordenação indistinguível** para o utilizador da ordenação padrão de arquivados já definida no TSD card-archive.

**RF04 — Ações de restaurar e excluir**  
Na página dedicada, **restaurar** e **excluir** devem produzir o **mesmo** tipo de efeito no documento e no estado de tempo que a secção removida produzia no canvas (incluindo confirmação de exclusão, higiene de anexos, tratamento de conflito 409, fecho/reconciliação de tempo após restaurar, conforme TSD card-archive e regras **[V01]–[V03]** e §4.2 de referência).

**RF05 — Navegação explícita**  
O sistema deve oferecer **pelo menos um** caminho de navegação claro (ex.: controlo na barra superior, na barra de quadro ou equivalente) para a página de arquivados, **visível e aplicável** quando houver **quadro selecionado**. Quando **não** houver quadro selecionado, o acesso direto à página deve resultar em **estado vazio explicativo** (mensagem a orientar a selecção de um quadro), alinhado ao padrão já usado na busca sem quadro.

**RF06 — Acesso ao arquivar a partir do Kanban**  
A ação de **arquivar** a partir de um card no Kanban (ou equivalente já existente) **permanece**; o texto de confirmação ou microcopy que referia destino em “Arquivados” no quadro deve permanecer **semanticamente correcto** (ex.: indicar que o card passa a ser gerido na **lista/página de arquivados** em vez de uma zona no canvas).

**RF07 — Continuidade da busca e modal**  
A **busca global** deve manter: inclusão de arquivados na pesquisa, ordenação por relevância do domínio, e **badge** de arquivado nos resultados. A **seleção** de um resultado (activo ou arquivado) mantém o comportamento de **abrir o fluxo de edição/visualização** (modal de tarefa) **sem** exigir, nesta versão, navegação automática para a nova rota (ver §5.3).

**RF08 — Coerência com abas “Quadro” / “Horas”**  
A página de arquivados é uma **rota** distinta; entrar nela **não** altera por si só as regras do relatório de horas nem os dados agregados de tempo, sem acção explícita do utilizador nesse módulo. O utilizador pode regressar ao canvas Kanban pela navegação existente. (Comportamento exacto de realce de aba na barra — *Quadro* vs *Horas* — segue a decisão de UX de não bloquear: ver §10.)

---

## 4. REGRAS DE NEGÓCIO E INVARIANTES

### 4.1 Herdadas (card-archive) — manter

- Invariantes de **tempo** ao arquivar (segmento aberto em coluna *in progress*), **idempotência** de arquivar/restaurar no sentido já definido no TSD card-archive (persistência via GitHub, não API REST própria), **exclusão** com limpeza de estado, **R-SEARCH01** (badge em busca), e **[A01]** (mesmo modelo de permissão).  
- **[R-UX01]** (contagens por coluna excluem arquivados) permanece; a nova listagem **não** deve ser usada para inflar contagens de coluna.

### 4.2 Novas ou reforçadas para esta feature

- **[INV-NAV01]** A lista na página dedicada mostra **exclusivamente** arquivados do quadro atualmente selecionado na aplicação; trocar o quadro seleccionado **actualiza** a lista após carregamento (sem misturar cards de outros quadros).  
- **[INV-UI01]** O canvas Kanban **não** contém listagem de arquivados; a gestão de restaurar/excluir a partir de uma lista “tipo secção de arquivo” concentra-se na **nova rota** (o modal de tarefa e a busca podem continuar a permitir ações coerentes com card-archive).  
- **[R-COPY01]** Textos de produto que mencionem “área de arquivados” no canvas devem ser actualizados para não sugerir uma secção **abaixo** das colunas, se ainda existirem.  

### 4.3 Autorização e limites

- **[A01]** Inalterada — mesma política de escrita no repositório.  
- **[L01]** (sem arquivamento em massa, etc.) inalterada; fora de escopo da página dedicada aprofundar filtros (ver §8).

---

## 5. CONTRATOS DE INTERFACE (observáveis)

> Sem API REST da aplicação; contrato = **comportamento de UI**, **rotas** e **estado de documento** após acções.

### 5.1 Rota e contexto

| Aspecto | Comportamento esperado |
|--------|------------------------|
| Identificação do quadro | A página de arquivados opera no **mesmo** quadro activo que o resto da shell (não se introduz identificador de quadro no URL nesta versão, salvo decisão futura fora de escopo). |
| Bookmark | O URL da rota é **estável e bookmarkável**; o conteúdo listado depende do quadro activo e da sessão ao carregar. |
| Sem quadro seleccionado | Deve exibir **estado vazio** com instrução para seleccionar um quadro (coerente com a busca sem quadro activo). |
| Carregamento / erro | Erros de leitura do documento (quadro inexistente, rede) seguem padrão de feedback já usado no quadro (mensagem de erro, sem corrupção de estado). |

### 5.2 Operações na página (paridade com a secção removida)

| Operação | Pré-condição | Efeito esperado (resumo) |
|----------|--------------|--------------------------|
| Restaurar | Card arquivado no documento do quadro ativo | Igual a **restaurar** no TSD card-archive (limpar flags de arquivamento, reconciliar tempo). |
| Excluir | Card na lista de arquivados (pré-condição operacional da página) | **Paridade** com a exclusão já suportada para cards arquivados no fluxo actual (confirmação, higiene de anexos e estado); o planner confirma alinhamento com o fluxo único de exclusão do produto. |

*Nota:* A implementação pode factorizar lógica partilhada com o quadro; a spec exige **paridade de efeito**, não duplicação de bugs.

### 5.3 Busca global e “deep link”

| Comportamento | Decisão para v1.0 |
|--------------|-------------------|
| Resultados e badge | **Mantém-se** o comportamento descrito no TSD card-archive (incluir arquivados, mostrar “Arquivado”). |
| Ao clicar num resultado | **Mantém-se** o fluxo actual: fechar o modal de busca e abrir a **tarefa** (modal) com o card, incluindo arquivados. |
| Navegação automática para a página de arquivados ao seleccionar um hit arquivado | **Não** é requisito de v1.0; **não** substitui o modal. Uma evolução futura pode acrescentar acção secundária “Ver na lista de arquivados” (fora de escopo aqui, ver §10). |

### 5.4 Idempotência de escrita HTTP

**N/A** — não há endpoints HTTP novos da aplicação; idempotência e reconciliação de persistência seguem o TSD card-archive e invariantes em §4.1.

---

## 6. MODELO DE DADOS

**N/D — sem delta.**  
Não se introduzem campos novos em card, documento do quadro nem no catálogo. A feature é **não destrutiva** ao JSON.

**Migração de dados / schema (resumo):** nenhuma alteração estrutural; ver §6.3.

### 6.3 Migração obrigatória (checklist)

- [x] **Não** — sem alteração de schema nem migração obrigatória de dados; delta apenas de UI, rota e navegação sobre o contrato existente de card-archive.

---

## 7. CRITÉRIOS DE ACEITE

Mapeamento aos critérios de aceite do `state.yaml` e reforços de teste.

### 7.1 Caminho feliz

- **[CA-AC01]** O canvas Kanban **não** exibe a secção colapsável de arquivados; apenas colunas e cards ativos (mais estruturas de UI já existentes como overlays).  
- **[CA-AC02]** Existe **navegação explícita** para a página de arquivados quando há **quadro seleccionado**.  
- **[CA-AC03]** A página lista **somente** cards arquivados do documento do quadro activo, na **ordem padrão de arquivados** do TSD card-archive.  
- **[CA-AC04]** **Restaurar** e **excluir** na página persistem o documento com as **mesmas** invariantes de tempo e domínio descritas no TSD card-archive (incluindo CA de conflito 409 e reconciliação).  
- **[CA-AC05]** A busca global e o badge de arquivado mantêm o comportamento de card-archive; a selección de um resultado abre o modal de tarefa; **não** se exige deep-link automático da busca para a nova página (ver §5.3).

### 7.2 Erros e bordas

- **[CA-AC06]** Sem quadro seleccionado: a página de arquivados não apresenta lista de cards de um quadro “implícito”; apresenta **empty state** coerente.  
- **[CA-AC07]** Com quadro seleccionado mas falha de carregamento: mensagem de erro ou retry alinhada ao padrão do app, **sem** perda silenciosa de dados.  
- **[CA-AC08]** Trocar de quadro (selector na barra) enquanto a rota de arquivados está aberta: a lista **reflecte** o novo quadro após carga.  
- **[CA-AC09]** Arquivar um card a partir do Kanban após a remoção da secção: o utilizador consegue **encontrar** o card arquivado via **navegação** para a nova página (e continua a encontrar na busca).  
- **[CA-AC11]** Com quadro seleccionado, após visitar só a rota de arquivados (sem acções no módulo de horas), **nenhum dado agregado de relatório de horas é alterado** sem acção explícita do utilizador nesse módulo — paridade com RF08.

### 7.3 Edge cases e verificação (teste)

- **[CA-AC10]** Cobertura: domínio já coberto por testes existentes; **UI/E2E** conforme avaliação de risco (presença da rota, paridade de acções, remoção da secção do canvas), sem duplicar toda a matriz de tempo do card-archive se já garantida a nível de domínio.

---

## 8. FORA DE ESCOPO

- **[FE01]** Novos campos no modelo JSON, novos estados de card ou versão de schema obrigatória — **evita drift de persistência** fora do card-archive.  
- **[FE02]** Filtros avançados, ordenação customizável, selecção multi-quadro na mesma página, arquivar/restaurar em lote — **fora do pedido de produto**.  
- **[FE03]** Backend fora do fluxo GitHub/Contents já existente — **mantém MVP**.  
- **[FE04]** Deep-link com quadro no URL, partilha de URL com quadro embutido, ou notificações — **explicitamente excluído** desta versão.  
- **[FE05]** Redesenho completo da shell além do necessário para rota, navegação e estados vazios descritos — **limita superfície de mudança**.  
- **[FE06]** Obrigação de **substituir** o modal de tarefa pela página de arquivados ao seleccionar um resultado de busca arquivado — **mantém fluxo de edição rápida**.

---

## 9. REQUISITOS NÃO-FUNCIONAIS

- **Performance:** Uma leitura do documento do quadro por carga de página (alinhada ao Kanban e à busca); listagem em memória sobre a coleção de cards.  
- **Segurança:** Patente com o modelo actual (PAT, permissões de repo).  
- **Acessibilidade:** A nova página deve suportar rotular a lista (região com nome acessível equivalente semântico à secção removida) e botões de acção com estados *disabled* durante persistência, em linha com o restante do app.  
- **I18N:** Manter o idioma e tom dos strings existentes (PT no UI actual).

---

## 10. PERGUNTAS EM ABERTO (não bloqueantes)

| # | Tema | Default adoptado | Impacto se mudar |
|---|------|-----------------|------------------|
| Q1 | Sublinhar a aba “Quadro” vs manter realce noutro controlo ao visitar a rota de arquivados | Não prescrito: a rota é independente; a aba “Quadro” pode permanecer como **navegação separada** (utilizador usa “Voltar”/link explícito). | Ajuste visual apenas. |
| Q2 | Link secundário na busca “Abrir na lista de arquivados” | **Fora** de v1.0; apenas documentado como melhoria. | UX extra. |
| Q3 | Texto exacto do controlo de navegação (“Arquivados”, “Cards arquivados”, ícone) | Deixado ao *design* coerente com a topbar; requisito é **clareza** e visibilidade com quadro activo. | Wording. |

Nenhum item **bloqueia** o handoff; defaults são seguros.

---

## 11. HANDOFF PARA O PLANNER

```
Escopo para planejamento:

Feature: Página dedicada de cards arquivados + remoção da secção inline no canvas
TSD: v1.1
Bloqueios: 0
Migration necessária: Não (§6.3)

RFs (rastreio explícito):
- RF01: Remover área inline de arquivados do canvas Kanban
- RF02: Rota/página dedicada de arquivados
- RF03: Lista só arquivados do quadro ativo, ordenação padrão card-archive
- RF04: Restaurar/excluir com paridade de efeito com a linha de base
- RF05: Navegação explícita + empty state sem quadro
- RF06: Arquivar do Kanban permanece; microcopy coerente com página dedicada
- RF07: Busca e modal inalterados quanto a deep-link obrigatório
- RF08: Rota não altera relatório de horas por si só

O quê entregar (comportamento):
- Remover da vista Kanban qualquer listagem/área colapsável de arquivados; canvas só colunas + ativos
- Adicionar rota dedicada: filtro arquivados, ordenação padrão, restaurar/excluir com paridade
- Navegação explícita com quadro selecionado; empty state sem quadro
- Manter busca, badge e abertura de modal; sem deep-link obrigatório busca → página
- Atualizar copy que referia “Arquivados” no canvas
- Testes: UI/E2E conforme risco + regressão de remoção da secção e atualização de seletores de teste se aplicável

Contrato de dados: NENHUM delta (reuso card-archive)
Restrições: Não quebrar invariantes de tempo/exclusão; não confundir “quadro arquivado no catálogo” com “card arquivado”
Fora: FE01–FE06
Próximo passo: plano de implementação (IPD) e task-breakdown
```

---

## 12. METADADOS

| Campo | Valor |
|-------|--------|
| Confiança | **87/100** |
| Complexidade | M |
| TSD | v1.1 |
| RFs (esta spec) | 8 |
| Regras / invariantes novas | 3 (+ herdadas) |
| Delta modelo de dados | Nenhum |
| Endpoints HTTP novos | 0 |

### 12.1 Justificativa do score (87)

- **Fortes:** Escopo e baseline em `state.yaml` claros; linha de base do código confirma ordenação padrão de arquivados, secção colapsável no canvas, shell com quadro seleccionado e busca sem deep-link. Paridade de acções documentada.  
- **Reserva (~13):** pormenor de *qual* controlo de navegação e realce de abas fica em Q1; não afecta contrato de dados.

### 12.2 JSON (pipeline)

```json
{
  "agent": "spec",
  "status": "success",
  "confidence_score": 87,
  "tsd_path": ".memory-bank/specs/archived-cards-page/spec-feature.md",
  "rfs_count": 8,
  "rules_count": 6,
  "blocking_decisions_count": 0,
  "non_blocking_assumptions_count": 3,
  "assumptions_documented": true,
  "open_questions_blocking": 0,
  "complexity": "M"
}
```

### 12.3 Rastreabilidade conceitual (terminologia do repositório)

> Apenas alinhamento de vocabulário com a linha de base de código; **não** fixa nomes de ficheiros ou símbolos na spec principal.

| Ideia na spec | Onde o comportamento base existe hoje (linha de base) |
|---------------|------------------------------------------------------|
| Secção a remover | Canvas do quadro com área de arquivados colapsável e atributos de teste de toggle/linhas |
| Ordenação de arquivados | Domínio: ordenação padrão por instante de arquivamento e desempates |
| Shell / quadro activo | Estado de selecção persistido por sessão de repositório; canvas condicionado a quadro seleccionado |
| Busca | Modal de busca: documento em cache, resultados com metadata de arquivado |
| Restaurar / excluir / arquivar | Fluxo do quadro e modal de tarefa; persistência e tempo alinhados ao TSD card-archive |

---

*Fim do TSD v1.1 — Página dedicada de cards arquivados.*
