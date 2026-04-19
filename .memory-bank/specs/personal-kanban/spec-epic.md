# TSD — FlowBoard (Kanban pessoal + tempo) — v1.0

> **Status:** Draft  
> **Produto:** FlowBoard  
> **Autor:** spec (EPIC) | **Data:** 2026-04-19  
> **Base:** `personal-kanban-dev-v1.0.prd.md` v1.3  
> **Confiança:** 88/100 | **Complexidade:** XL  
> **Exploração de repositório:** greenfield — sem domínio Kanban/GitHub pré-existente no codebase; especificação derivada do PRD e decisões D1–D14 abaixo.  
> **Protótipo de referência (UI/fluxo):** `.memory-bank/specs/personal-kanban/prototypes/index.html` — o **spec-reviewer** deve cruzar este artefato com o TSD e o PRD; **architect** e **planner** devem considerá-lo quando relevante.

---

## 1. VISÃO GERAL

**Problema que resolve:**  
Desenvolvedores em uso individual precisam separar contextos de trabalho (vários quadros), acompanhar fluxo no estilo Kanban e saber **quanto tempo** dedicaram a cada tarefa, sem depender de backend gerenciado pelo fornecedor do app — usando **repositório GitHub privado** como fonte de verdade versionada.

**Comportamento principal:**  
O sistema **FlowBoard** autentica o usuário com **URL de repositório GitHub** + **PAT**, persiste quadros, colunas, cards e segmentos de tempo em **JSON** via **GitHub API**, permite editar colunas respeitando papéis semânticos (Backlog / Em progresso / Concluído), move cards entre colunas acionando regras de tempo automáticas, exibe totais por atividade e oferece **tela de monitoramento** com filtros de período e escopo de quadro.

**Ator principal:**  
Desenvolvedor autenticado (single-user), interagindo pelo navegador desktop-first.

---

## 2. CONTEXTO DO SISTEMA

### 2.1 Entidades existentes relevantes

N/A — projeto **greenfield**; não há entidades de domínio pré-existentes no repositório além do que for introduzido para esta entrega.

### 2.2 “Endpoints” e integrações externas

| Sistema | Papel | Impacto |
|--------|--------|--------|
| **GitHub REST API** (Contents, refs opcional) | Leitura/escrita de blobs JSON, commits | Contrato obrigatório: autenticação Bearer PAT, uso de SHA em atualizações, tratamento de 401/403/404/409 e rate limit |
| **api.github.com** | Disponibilidade | App **online-first** no MVP; indisponibilidade deve ser comunicada sem mentir estado local |

### 2.3 Regras de negócio já implementadas no código

Nenhuma regra de negócio existente identificada no domínio — baseline definida por este TSD e pelo PRD.

---

## 3. REQUISITOS FUNCIONAIS

**RF01 — Identidade do produto**  
O sistema deve exibir o nome **FlowBoard** na identidade principal da aplicação (cabeçalho, título de documento ou equivalente) de forma consistente no MVP.

**RF02 — Login com repositório + PAT**  
O sistema deve oferecer tela de entrada com campos obrigatórios **URL do repositório** e **PAT** (campo secreto), ação de conectar e validação contra a GitHub API; deve comunicar erros compreensíveis (URL inválida, 401, 403, repositório inacessível).

**RF03 — Sessão e logout**  
O sistema deve manter em sessão a associação **PAT + resolução de repositório** (owner, repo, host API) após login bem-sucedido; deve oferecer **logout** que remove credenciais da sessão local; o PAT não deve aparecer em URL, query string ou ser persistido dentro dos JSON de dados do repositório.

**RF04 — Trocar repositório**  
O sistema deve tratar troca de repositório como **encerramento de sessão** e novo fluxo de credenciais (equivalente a logout + login com nova URL), sem manter dados de dois repositórios na mesma sessão.

**RF05 — Múltiplos quadros**  
O sistema deve permitir **listar**, **criar**, **renomear**, **selecionar quadro ativo** e **excluir quadro** (com confirmação quando houver risco de perda). Cada quadro possui conjunto próprio de colunas, cards e histórico de tempo; não existe card “global” entre quadros.

**RF06 — Colunas e preset**  
O sistema deve criar novo quadro com três colunas na ordem **Todo → Working → Done** com papéis **Backlog**, **Em progresso**, **Concluído** respectivamente. O usuário deve poder **renomear**, **reordenar**, **adicionar** e **remover** colunas respeitando as regras de validação da seção 4.

**RF07 — CRUD de cards**  
O sistema deve permitir criar, editar título e excluir cards no quadro ativo; exclusão exige confirmação.

**RF08 — Movimentação de cards**  
O sistema deve permitir mover cards entre colunas por interação direta no quadro (e equivalente por teclado/acessível quando aplicável).

**RF09 — Rastreamento de tempo por segmentos**  
O sistema deve registrar **segmentos** de tempo conforme regras de negócio: início ao entrar na coluna com papel **Em progresso**, encerramento ao entrar na coluna com papel **Concluído**, soma de múltiplos segmentos por card.

**RF10 — Totais por atividade**  
O sistema deve exibir no contexto do card (ou painel associado) o **total de horas** da atividade como soma dos segmentos **válidos** (definição na seção 4). Sem segmentos concluídos, deve mostrar **zero** de forma explícita.

**RF11 — Tela de monitoramento**  
O sistema deve oferecer tela dedicada com filtro de período **dia**, **semana** e **mês**, e **totais por tarefa** no período. Escopo mínimo: **quadro selecionado** (quadro atual ou escolha explícita na tela).

**RF12 — Agregação multi-quadro (MVP)**  
O sistema **deve** permitir filtrar o monitoramento pelo quadro atual; a opção **“Todos os quadros”** no mesmo período é **requerida no MVP** se o custo de implementação for marginal (agregação dos mesmos segmentos já carregados por `boardId`); caso a equipe avalie custo não marginal durante o planejamento, esta capacidade pode ser explicitamente movida para **Fase 1.1** com registro no IPD (decisão de corte, não ambiguidade de produto).

**RF13 — Persistência GitHub**  
O sistema deve persistir todo estado de domínio relevante em **JSON** no repositório configurado, usando GitHub API com escrita baseada em conteúdo atual (SHA) e tratamento de conflito conforme seção 4.

**RF14 — Documentação in-app mínima de segurança**  
O sistema deve orientar o usuário sobre **PAT poderoso**, **escopo mínimo**, **rotação** e **não commitar token** em arquivos de dados.

---

## 4. REGRAS DE NEGÓCIO

### 4.1 Papéis de coluna (invariantes)

- **[P01]** Em cada quadro existe **no máximo uma** coluna com papel **Em progresso** e **no máximo uma** com papel **Concluído**.  
- **[P02]** Existe **pelo menos uma** coluna com papel **Backlog** e o quadro tem **no mínimo três** colunas no total.  
- **[P03]** Colunas adicionais além das três iniciais entram como **Backlog** por padrão até o usuário ajustar papéis respeitando P01–P02.  
- **[P04]** Identificadores de coluna (`columnId`) são estáveis no armazenamento; rótulos são apenas exibição. Regras de tempo referenciam **papel** e/ou **columnId** conforme contrato de dados.

### 4.2 Validação de edição de colunas

- **[V01]** Operação que violar P01–P02 ou deixar o quadro inválido deve ser **rejeitada** com mensagem clara e **sem persistir** estado intermediário inválido.  
- **[V02]** Remoção de coluna só é permitida se, após migração de cards (ver **[R10]**), o quadro continuar válido e com ≥3 colunas.

### 4.3 Definição de segmento válido (totais)

- **[R01] Segmento concluído:** intervalo que começa quando o card **entra** na coluna com papel **Em progresso** e **termina** quando o card **entra** na coluna com papel **Concluído** na sequência desse ciclo, **sem** um encerramento intermediário que descarte o segmento aberto (ver **[R03]**).  
- **[R02]** O **total de horas** do card é a **soma** das durações de todos os segmentos concluídos **[R01]** daquele card.  
- **[R03] Interrupção: Em progresso → Backlog (ou coluna Backlog) sem passar por Concluído:** o segmento aberto é **descartado para fins de totais** (não gera segmento concluído, não acumula tempo). Ao entrar novamente em **Em progresso**, inicia-se **novo** segmento aberto.  
- **[R04] Transição Backlog → Concluído direta:** **não** cria segmento **[R01]**; não incrementa totais por tempo nessa transição.  
- **[R05] Reentrada Concluído → Em progresso:** inicia **novo** segmento aberto (novo ciclo).  
- **[R06] Reordenar cards apenas dentro da coluna Em progresso:** **não** reinicia o segmento nem cria novo segmento; **não** altera instante de início do segmento aberto.

### 4.4 Relógio e fechamento de segmento

- **[R07]** Timestamps de eventos usam **relógio do dispositivo** como fonte (epoch ms ou ISO 8601 com offset).  
- **[R08]** Ao suspender máquina ou fechar aba: segmento aberto permanece **aberto** até uma transição de coluna que aplique **[R03]** ou conclusão **[R01]**; não há “fechamento automático” por idle no MVP.

### 4.5 Monitoramento — o que entra no período

- **[R09]** Para filtros **dia / semana / mês**, um segmento concluído entra no período se o instante de **conclusão** (entrada em **Concluído** que fecha o segmento) cair no intervalo do período no **fuso configurado** (ver **[D4]** na seção 7).  
- **[R10]** A tela de monitoramento no MVP **deve** apresentar **totais por tarefa**; **lista explícita de segmentos** ou linha do tempo de transições fica **fora do MVP** (Fase 1.1), salvo decisão contrária no IPD por esforço trivial.

### 4.6 Remoção de coluna com cards (**D6**)

- **[R11]** Se a coluna removida contiver cards, o sistema deve **bloquear** a remoção **ou** **migrar** todos os cards para uma coluna válida (padrão: coluna **Backlog** escolhida pelo usuário ou a primeira coluna Backlog na ordem) **antes** de remover. Nunca eliminar cards sem confirmação explícita.

### 4.7 Concorrência e persistência (**D10**)

- **[R12]** Toda escrita que substitui um documento JSON deve usar o **SHA** atual retornado pela API.  
- **[R13]** Em **409 Conflict** / conteúdo alterado remotamente: estratégia padrão — **recarregar** o arquivo afetado, **reaplicar** a mudança de domínio sobre o estado novo; se impossível reconciliar automaticamente, **notificar** o usuário e solicitar retry ou refresco. Para arquivos **por quadro**, o conflito é isolado ao quadro.  
- **[R14]** Modelo lógico preferencial: **catálogo + um documento de dados por quadro** (ver seção 5.3) para reduzir colisões entre quadros.

### 4.8 Limites operacionais (MVP)

- **[L01]** Uso típico: até **centenas de cards por quadro**; operações devem permanecer usáveis com feedback de carregamento quando aplicável.  
- **[L02]** Título de card e nome de quadro: limites superiores razoáveis (ex.: 500 e 200 caracteres) definidos no IPD para evitar blobs excessivos — valores exatos são responsabilidade do planner/implementação, não bloqueiam esta spec.

---

## 5. CONTRATO DE INTERFACE

> Contratos lógicos: comandos de UI, sessão e **formato de dados** persistido. Não descreve arquivos de código.

### 5.1 Comandos de autenticação

| Comando | Entrada | Resultado esperado | Erros |
|--------|---------|-------------------|--------|
| `ConnectRepository` | `repoUrl`, `pat` | Sessão válida; resolve `owner`, `repo`, `apiBase` | URL inválida, auth falhou, sem permissão de conteúdo |
| `Logout` | — | Sessão encerrada; PAT removido do armazenamento local da app | — |

**Normalização de URL ([D14]):** aceitar `https://github.com/owner/repo`, `owner/repo` e `https://www.github.com/...`; rejeitar formatos que não permitam resolver owner/repo de forma inequívoca; `git@github.com:owner/repo.git` **pode** ser suportado na mesma normalização se o IPD assim definir.

### 5.2 Comandos de quadro e card (exemplos)

| Comando | Pré-condição | Efeito |
|--------|--------------|--------|
| `CreateBoard` | Sessão válida | Novo `boardId`, colunas preset Todo/Working/Done |
| `SelectBoard` | Sessão válida | Quadro ativo; UI só mostra dados desse quadro |
| `MoveCard` | Card do quadro ativo | Transição de coluna; aplica regras **[R01–R06]** |
| `UpdateColumns` | Quadro válido | Persiste nova configuração ou rejeita com **[V01]** |

### 5.3 Contrato de dados persistidos (JSON)

Estrutura lógica mínima (nomes de campos podem ser ajustados pelo planner desde que mapeados 1:1 semanticamente):

**Catálogo de quadros (documento raiz ou índice)**  
- `version`: número inteiro de esquema  
- `boards`: lista de `{ boardId, title, archived?, contentPath? }` — referência a dados detalhados por quadro  

**Documento de quadro (um por `boardId`)**  
- `boardId`, `title`, `columns`: lista ordenada `{ columnId, label, role: Backlog | InProgress | Done }`  
- `cards`: lista `{ cardId, title, columnId }`  
- `timeSegments`: lista `{ segmentId, cardId, boardId, startedAt, endedAt?, discarded?: boolean }` — segmentos **concluídos** com `endedAt` ao fechar em **Concluído**; segmentos descartados por **[R03]** podem ser omitidos ou marcados `discarded` conforme decisão de armazenamento no IPD  

**Invariante:** todo evento persistido que afeta tempo carrega **`boardId`**.

### 5.4 GitHub API (comportamento esperado)

- Autenticação: header `Authorization: Bearer <PAT>`  
- Leitura/escrita de conteúdo textual JSON no path acordado pelo IPD; escrita com SHA  
- Tratamento obrigatório: **401/403/404**, **409**, **rate limit** (retry com backoff alinhado aos headers da API quando presentes)

---

## 6. MODELO DE DADOS (LÓGICO)

| Entidade | Identidade | Relações | Notas |
|----------|------------|----------|--------|
| **Sessão** | implícita | PAT + repo | Não persiste em Git |
| **Board** | `boardId` | 1:N Column, Card | Isolamento estrito |
| **Column** | `columnId` | N:1 Board | Papéis únicos por P01–P02 |
| **Card** | `cardId` | N:1 Board, N:1 Column atual | — |
| **TimeSegment** | `segmentId` | N:1 Card, N:1 Board | Somados por **[R02]** |

---

## 7. DECISÕES (FECHAMENTO PRD D1–D14)

| ID | Decisão |
|----|---------|
| **D1** | MVP do monitoramento: **totais por tarefa** obrigatórios; **detalhe por segmento/transição** → **Fase 1.1** ([R10]). |
| **D2** | Em progresso → Backlog (sem Concluído): **segmento aberto descartado** para totais ([R03]). |
| **D4** | Limites de “dia”: fuso **do sistema (browser)** como padrão; opção futura de fuso fixo é Fase 2. |
| **D5** | Reordenar dentro de **Em progresso**: **não** reinicia cronômetro ([R06]). |
| **D6** | Remoção de coluna: migração obrigatória ou bloqueio ([R11]). |
| **D7** | Backlog → Concluído direto: **sem** segmento de tempo ([R04]). |
| **D8** | Particionamento: **índice + arquivo/documento por quadro** para limitar conflitos ([R14]). |
| **D9** | “Todos os quadros”: **deve** ser entregue no MVP se esforço marginal; senão **corte explícito** para 1.1 documentado no IPD ([RF12]). |
| **D10** | Conflitos: **SHA + retry**; reconciliação **[R13]** ([R12]). |
| **D11** | Branch padrão **`main`**; branch configurável em **configurações avançadas** (fora do fluxo mínimo URL+PAT). |
| **D12** | Exclusão de quadro: **remoção com confirmação** e **arquivo movido para namespace de arquivo/arquivamento lógico** no repositório (ex.: prefixo `archive/`) para reduzir perda acidental — detalhe de path no IPD. |
| **D13** | Trocar repo: **logout + novo login** ([RF04]). |
| **D14** | URLs: normalização mínima **HTTPS github.com** + forma curta `owner/repo` ([5.1]). |

---

## 8. RISCOS

| Risco | Impacto | Mitigação no MVP |
|-------|---------|------------------|
| Exposição de PAT em dispositivo comprometido | Alto | Não colocar PAT em URLs/JSON; orientação de escopo mínimo e rotação; armazenamento local com consciência de risco (detalhe no IPD) |
| Conflito multi-dispositivo no mesmo JSON | Médio | Particionamento por quadro [D8]; retry e reconciliação [D10] |
| Rate limit GitHub | Médio | Debounce de escrita, mensagens claras, backoff |
| Relógio do sistema alterado | Baixo/Médio | Regras explícitas [R07–R08]; não corrigir NTP no MVP |
| Escopo “Todos os quadros” atrasar MVP | Baixo | Corte documentado [D9] |

---

## 9. CRITÉRIOS DE ACEITE (TESTÁVEIS)

1. Login com URL+PAT válidos leva à lista de quadros; PAT não aparece na barra de endereços.  
2. Criar quadro mostra Todo / Working / Done com papéis corretos.  
3. Mover card para **Em progresso** inicia medição; mover para **Concluído** fecha segmento e total do card reflete soma.  
4. Em progresso → Backlog descarta segmento aberto; totais não incluem tempo descartado.  
5. Edição de colunas inválida é bloqueada sem corromper estado.  
6. Monitoramento: dia/semana/mês filtram por instante de conclusão do segmento; totais por tarefa coerentes com [R09].  
7. Logout remove sessão; novo login necessário para outro repositório.  
8. Operação de escrita com conflito não silencia falha — usuário recebe feedback e caminho de retry.

---

## 10. FORA DE ESCOPO (MVP)

- Colaboração multi-usuário, permissões de equipe, Issues/PRs como fonte de cards  
- Offline-first robusto, merge semântico avançado entre JSON  
- Lista de segmentos na UI de monitoramento (Fase 1.1, salvo exceção no IPD)  
- Apps mobile nativos, billing  
- Mais de uma coluna **Em progresso** ou **Concluído** no mesmo quadro  

---

## 11. REQUISITOS NÃO FUNCIONAIS (SÍNTESE)

- **Performance:** interações principais fluidas para centenas de cards/quadro com feedback de espera quando necessário.  
- **Acessibilidade:** operações principais utilizáveis por teclado; contraste legível (detalhamento no IPD).  
- **Segurança:** PAT como segredo; sem vazamento em artefatos de dados versionados.  
- **Disponibilidade:** dependência de `api.github.com`; mensagens claras quando indisponível.

---

## 12. PERGUNTAS EM ABERTO

| ID | Status | Nota |
|----|--------|------|
| Tonalidade exata de cópias de erro (PT/EN) | 🟡 | Não bloqueia arquitetura |
| Limites numéricos exatos de caracteres (título card/quadro) | 🟡 | Fechar no IPD |

Nenhuma questão 🔴 remanescente para avançar à revisão de spec — decisões D1–D14 estão fechadas neste documento.

---

## 13. HANDOFF PARA O PLANNER

1. Fixar **paths lógicos** dos documentos JSON no repositório e convenção de nomes compatível com GitHub Contents.  
2. Escolher stack frontend e biblioteca HTTP; implementar normalização [D14] e fluxo [D13].  
3. Implementar **máquina de transição de card** e persistência alinhada a **[R01–R14]**.  
4. Definir testes de integração contra API GitHub (mock ou sandbox) e critérios de “marginal” para [RF12].  
5. Após IPD, o **task-breakdown** deve refletir partições (auth, board CRUD, column rules, time engine, monitoring, persistence).

---

## Metadata

```json
{
  "agent": "spec",
  "status": "success",
  "confidence_score": 88,
  "tsd_path": ".memory-bank/specs/personal-kanban/spec-epic.md",
  "product": "FlowBoard",
  "prd_reference": ".memory-bank/specs/personal-kanban/personal-kanban-dev-v1.0.prd.md",
  "notes": "Greenfield: sem entidades pré-existentes no repo; decisões D1-D14 incorporadas ao TSD."
}
```
