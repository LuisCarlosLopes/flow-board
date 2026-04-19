# PRD — Kanban pessoal com rastreamento de tempo para desenvolvedores

**Versão:** 1.3  
**Contexto:** Greenfield (produto novo)  
**Público-alvo:** Desenvolvedores de software (uso individual)  
**Plataforma:** Aplicação web com foco em desktop (navegador em tela ampla)  
**Armazenamento (decisão):** **GitHub API** com **Personal Access Token (PAT)** e **repositório privado** contendo **arquivos JSON**; **acesso ao app** via **tela de login** com **URL do repositório** + **PAT** (ver seção 9 e US-9).

---

## 1. Declaração do problema e objetivos

### Problema

Desenvolvedores frequentemente gerenciam trabalho fragmentado (tarefas, bugs, estudos) com ferramentas genéricas ou anotações soltas, o que dificulta ver **o que está em andamento**, **o que já foi concluído** e **quanto tempo real foi dedicado** a cada atividade. O mesmo profissional costuma separar mentalmente **contextos** (ex.: **empresa** vs **pessoal**); misturar tudo num único quadro aumenta ruído e reduz confiança nos totais de tempo. Sem um vínculo claro entre estado do trabalho (ex.: “em progresso”) e tempo gasto, relatórios manuais ou estimativas ficam imprecisos e consomem energia cognitiva.

### Objetivos de produto

1. **Clareza de fluxo:** Oferecer **múltiplos quadros Kanban** independentes (ex.: “Empresa”, “Pessoal”), cada um com **colunas editáveis** (nome, ordem, inclusão e exclusão), preservando **papéis semânticos** para o tempo (Backlog / Em progresso / Concluído) e um **preset** Todo → Working → Done para cada novo quadro.
2. **Tempo alinhado ao fluxo:** Iniciar e encerrar o rastreamento de tempo automaticamente com as transições de coluna relevantes, registrando **segmentos** de tempo reproduzíveis **no escopo do quadro ativo** (cada card pertence a um único quadro).
3. **Visibilidade de esforço:** Exibir **horas totais por atividade** e uma **visão dedicada** de horas por período (dia/semana/mês), com capacidade de **filtrar por quadro** e, quando aplicável, ver **agregado entre quadros** (ver RF-12 e D9).
4. **Foco no indivíduo e dados sob controle:** Manter uso **single-user** (um humano, sem equipe colaborativa no produto). **Persistência** em **repositório GitHub privado** via **API**, com arquivos **JSON**, de forma que o usuário **possua** o repositório e possa reutilizar o mesmo backend em **mais de um dispositivo** desde que use o mesmo token/repo (sem produto multi-tenant).

### Não-objetivos (neste documento)

- Definir **stack de frontend** ou bibliotecas específicas.
- Detalhar **schema JSON** final, nomes de arquivos, estratégia de **commit**, **merge** e tratamento de **conflitos** no Git (isso é da especificação técnica; o PRD apenas fixa **GitHub + PAT + repo privado + JSON**).
- Substituir ferramentas de equipe (sprints, permissões, relatórios gerenciais) ou integrar **Issues/PRs/Actions** do GitHub como fluxo de trabalho.

---

## 2. Personas (breves, foco em dev)

| Persona | Contexto | Dor principal | Ganho esperado |
|--------|----------|---------------|----------------|
| **Dev individual focado em entregas** | Mantém lista de tarefas técnicas e correções no dia a dia | Perde noção de tempo real em cada item; mistura “trabalhando” com “parado” | Quadro simples + tempo ligado às colunas **Em progresso** / **Concluído** sem planilha |
| **Dev que estuda ou faz side projects** | Alterna projetos e quer ver esforço acumulado | Difícil consolidar horas por tema ao longo da semana/mês | Relatório por período com totais por tarefa (e visão de transições quando útil) |
| **Dev pragmático (MVP)** | Quer algo rápido no navegador, sem onboarding longo | Abandona ferramentas com muitos passos ou campos obrigatórios | Fluxo mínimo: escolher/criar quadro → criar card → mover colunas → ver horas no card e na tela de monitoramento |
| **Dev com dois contextos** | Trabalho remunerado e projetos pessoais no mesmo dia | Um quadro só mistura prioridades e distorce relatório de horas | Dois ou mais quadros persistidos, troca rápida e relatório por quadro ou consolidado |

---

## 3. User stories e critérios de aceite

### US-1 — Quadro Kanban com preset e papéis de coluna

**Como** desenvolvedor, **quero** um quadro que comece com Todo, Working e Done **para** começar rápido, sabendo que posso ajustar nomes e estrutura depois.

**Critérios de aceite**

- **Dado** que **crio um novo quadro** ou abro um quadro existente **quando** visualizo o canvas **então** esse quadro apresenta colunas conforme persistido; se for **novo**, vejo três colunas na ordem padrão com rótulos **Todo**, **Working** e **Done**, com papéis semânticos respectivos **Backlog**, **Em progresso** e **Concluído** (ver glossário abaixo).
- **Dado** que crio um card na coluna com papel Backlog **quando** salvo **então** o card aparece nessa coluna com título visível.
- **Dado** um card em qualquer coluna **quando** arrasto ou uso a ação equivalente para mover **então** o card muda para a coluna de destino e o estado exibido reflete o destino.

**Glossário de papel de coluna (independente do rótulo exibido)**

| Papel | Comportamento de tempo (alinhado a US-2 e US-3) |
|--------|--------------------------------------------------|
| **Backlog** | Não inicia segmento ativo por si só; card pode existir aqui sem cronômetro ligado. |
| **Em progresso** | Existe **no máximo uma** coluna com este papel no quadro; entrada nesta coluna aplica a regra de início de rastreamento (US-2). |
| **Concluído** | Existe **no máximo uma** coluna com este papel; entrada nesta coluna aplica encerramento de segmento (US-3). |

### US-7 — Editar colunas do Kanban

**Como** desenvolvedor, **quero** renomear, reordenar, adicionar e remover colunas **para** adaptar o fluxo ao meu contexto (ex.: “Inbox”, “Review”, “Shipped”) sem perder o rastreamento de tempo.

**Critérios de aceite**

- **Dado** o quadro **quando** edito o **rótulo** de uma coluna **então** o nome exibido atualiza e o **papel** (Backlog / Em progresso / Concluído) permanece até eu alterá-lo explicitamente, se a UI permitir mudança de papel.
- **Dado** duas ou mais colunas **quando** **reordeno** as colunas **então** a nova ordem é persistida e os cards permanecem nas colunas corretas.
- **Dado** que preciso de mais etapas **quando** **adiciono** uma coluna **então** defino seu **papel** respeitando: no máximo uma coluna **Em progresso** e no máximo uma **Concluído** no quadro inteiro.
- **Dado** uma coluna vazia ou após realocar os cards **quando** **removo** uma coluna **então** a operação só é permitida se o quadro permanecer **válido**: **exatamente uma** coluna **Em progresso**, **exatamente uma** **Concluído**, **pelo menos uma** coluna **Backlog**, e **mínimo de três colunas** no total (ver D6 para migração quando a coluna removida tinha cards).
- **Dado** tentativa de violar a regra de unicidade de papéis **quando** salvo a configuração **então** o sistema bloqueia com mensagem clara e não corrompe o estado anterior.

### US-2 — Início do tempo ao entrar na coluna “Em progresso”

**Como** desenvolvedor, **quero** que o tempo comece a contar quando movo um card para a coluna com papel **Em progresso** **para** não precisar iniciar um cronômetro manual.

**Critérios de aceite**

- **Dado** um card que não está na coluna **Em progresso** **quando** movo o card para essa coluna **então** o sistema inicia o rastreamento de tempo para essa atividade a partir desse momento.
- **Dado** um card já na coluna **Em progresso** **quando** não movo o card para fora dela **então** o rastreamento continua coerente com a regra de segmentos (sem “reinício” só por reordenar dentro da coluna, se houver essa interação — ver D5).

### US-3 — Parada do segmento e registro ao ir para “Concluído”

**Como** desenvolvedor, **quero** que o tempo pare e fique registrado quando movo o card para a coluna com papel **Concluído** **para** fechar o segmento (equivalente ao antigo Working → Done).

**Critérios de aceite**

- **Dado** um card na coluna **Em progresso** com rastreamento ativo **quando** movo o card para a coluna **Concluído** **então** o rastreamento atual é interrompido e é registrado um **segmento** que representa o intervalo desde a entrada em **Em progresso** até a chegada em **Concluído**.
- **Dado** que o card chegou na coluna **Concluído** **quando** consulto o histórico ou totais da atividade **então** o segmento entra no cálculo de horas totais dessa atividade.

### US-4 — Reentrada em “Em progresso” e soma de segmentos

**Como** desenvolvedor, **quero** que, se a tarefa voltar à coluna **Em progresso** depois de **Concluído** (ou após nova pausa), o tempo seja somado **para** refletir ciclos reais de trabalho.

**Critérios de aceite**

- **Dado** um card que já completou ao menos um ciclo **Em progresso → Concluído** **quando** movo o card novamente para **Em progresso** **então** inicia-se um **novo** segmento de tempo.
- **Dado** múltiplos segmentos concluídos (**Em progresso → Concluído**) para a mesma atividade **quando** visualizo o total de horas **então** o valor exibido é a **soma** de todos os segmentos concluídos dessa atividade.

### US-5 — Total de horas por atividade no card

**Como** desenvolvedor, **quero** ver o total de horas gastas em cada atividade **para** comparar esforço sem abrir outra ferramenta.

**Critérios de aceite**

- **Dado** uma atividade com segmentos registrados **quando** abro o card ou a visão resumida do card **então** vejo o **total de horas** (agregado dos segmentos) de forma explícita.
- **Dado** uma atividade sem nenhum segmento concluído **quando** visualizo o card **então** o total aparece como zero ou equivalente claro (sem valores enganosos).

### US-6 — Tela de monitoramento de horas por período

**Como** desenvolvedor, **quero** uma tela dedicada para ver horas em um período (dia/semana/mês) **para** revisar meu esforço e totais por tarefa (e transições quando aplicável).

**Critérios de aceite**

- **Dado** que acesso a tela de monitoramento **quando** escolho um período (ex.: dia, semana, mês) **então** vejo os totais **filtrados** a esse intervalo.
- **Dado** o período selecionado **quando** escolho um **quadro** (ou “Todos os quadros”, se disponível no MVP — ver D9) **então** os totais refletem **apenas** as tarefas/segmentos daquele escopo.
- **Dado** o período e o escopo de quadro selecionados **quando** a tela carrega **então** vejo **totais por tarefa** que tiveram segmentos concluídos ou tempo contabilizado de forma consistente com as regras de segmento dentro do período.
- **Dado** a necessidade de inspecionar movimentação **quando** uso a funcionalidade de detalhe (se presente no MVP ou mínimo viável) **então** consigo relacionar totais a **transições de coluna** (ex.: conclusões **Em progresso → Concluído**) de maneira compreensível — ver escopo MVP na seção 7.

### US-8 — Múltiplos quadros Kanban

**Como** desenvolvedor, **quero** criar e alternar entre vários quadros (ex.: “Empresa”, “Pessoal”) **para** separar contextos sem misturar cards nem totais de tempo.

**Critérios de aceite**

- **Dado** que concluí o **login** (URL do repo + PAT válidos) **quando** acesso a lista de quadros **então** vejo **todos os quadros** persistidos naquele repositório e posso **selecionar** um como ativo.
- **Dado** que preciso de um novo contexto **quando** **crio um quadro** informando nome (e opcionalmente descrição/cor — se a spec prever) **então** o quadro é persistido e passa a aparecer na lista com **colunas padrão** Todo / Working / Done (papéis como em US-1).
- **Dado** um quadro existente **quando** **renomeio** ou **arquivo/excluo** (se permitido no MVP) **então** a ação reflete no armazenamento e a UI não deixa estados órfãos sem confirmação quando houver risco de perda.
- **Dado** dois quadros distintos **quando** alterno entre eles **então** os **cards e tempos** exibidos correspondem **somente** ao quadro selecionado (sem vazamento cruzado na UI).
- **Dado** um card **quando** é criado em um quadro **então** ele **permanece** associado a esse quadro (não há “card global” compartilhado entre quadros no MVP).

### US-9 — Tela de login = URL do repositório + PAT

**Como** desenvolvedor, **quero** uma **tela de login** onde informo apenas a **URL do repositório** (privado) e o **Personal Access Token** **para** me autenticar no backend e abrir meus quadros sem conta própria do produto.

**Critérios de aceite**

- **Dado** que abro o aplicativo sem sessão válida **quando** vejo a tela inicial **então** ela funciona como **login**: campos obrigatórios **URL do repositório** (ex.: `https://github.com/owner/repo` ou equivalente aceito pela spec) e **PAT** (entrada mascarada, tipo password), mais ação **Entrar** / **Conectar**.
- **Dado** que preencho URL e PAT **quando** confirmo o login **então** o produto **valida** credenciais contra a GitHub API (permissão de leitura no mínimo; escrita para persistir — ver spec de escopos, típico `repo` em PAT clássico) e exibe **feedback claro** de sucesso ou erro (repo inexistente, 401, 403, URL inválida).
- **Dado** login bem-sucedido **quando** sou redirecionado **então** acesso a **lista de quadros** e o restante do app; a **URL do repo** e o escopo de dados ficam implícitos na sessão (trocar de repo exige **novo login** ou fluxo explícito “Sair / trocar repositório” — ver D13).
- **Dado** configuração válida em sessão **quando** uso o produto **então** alterações são **refletidas nos arquivos JSON** do repositório informado na URL (via GitHub API), sem exigir Git manual para operações normais.
- **Dado** falha de rede ou API **quando** uma gravação não completa **então** o produto informa o erro, evita estado “mentiroso” na UI quando possível e permite retry (detalhe de concorrência em D10/D11).
- **Dado** preocupação com segurança **quando** uso o produto **então** o PAT **não** aparece em barra de endereço ou links compartilháveis, **não** é commitado nos JSON de dados, e a documentação orienta **rotação** e **escopo mínimo** do token.

---

## 4. Requisitos funcionais (numerados)

1. O produto deve apresentar um **quadro Kanban** cujo estado inicial é três colunas **Todo**, **Working** e **Done** com papéis **Backlog**, **Em progresso** e **Concluído**; o usuário deve poder **editar colunas**: **renomear**, **reordenar**, **adicionar** e **remover**, respeitando sempre **no máximo uma** coluna **Em progresso** e **no máximo uma** **Concluído**, **pelo menos uma** coluna **Backlog**, **mínimo de três colunas** no quadro, e demais colunas adicionais como **Backlog** (detalhes de migração na spec).
2. O usuário deve poder **criar, editar título e excluir** cards (exclusão com confirmação para evitar perda acidental).
3. O usuário deve poder **mover cards** entre colunas por interação direta no quadro.
4. Ao mover um card **para a coluna com papel Em progresso**, o sistema deve **iniciar** o rastreamento de tempo da atividade correspondente, conforme regras de segmento acordadas com a spec.
5. Ao mover um card **da coluna Em progresso para a coluna Concluído**, o sistema deve **encerrar** o segmento atual e **registrá-lo** como intervalo **Em progresso → Concluído**.
6. Se um card na coluna **Concluído** for movido de volta para uma coluna **Backlog** ou para **Em progresso**, o sistema deve permitir novo ciclo; ao reentrar em **Em progresso**, deve iniciar **novo** segmento de tempo quando aplicável.
7. O sistema deve calcular e exibir **horas totais por atividade** como **soma de todos os segmentos Em progresso → Concluído** concluídos para essa atividade.
8. Deve existir uma **tela dedicada** para **monitoramento de horas** com filtro de período **pelo menos**: dia, semana e mês (referência de “dia” alinhada ao fuso do usuário ou padrão definido na spec).
9. Na tela de monitoramento, o usuário deve ver **totais por tarefa** no período selecionado; **opcional no MVP mas desejável:** detalhamento por **evento de transição** ou lista de segmentos — se não no MVP, ficar explícito na seção 7.
10. O produto deve ser **single-user**: não há contas de equipe, papéis ou compartilhamento de quadro no MVP; **vários quadros** pertencem ao **mesmo usuário** e ao **mesmo repositório** configurado.
11. Os dados são **pessoais** e **isolados por quadro** no modelo lógico; a **fonte de verdade** é o **repositório GitHub privado** indicado na configuração.
12. O usuário deve poder **criar, renomear, listar e alternar** entre **múltiplos quadros**; cada quadro tem seu próprio conjunto de **colunas**, **cards** e **histórico de tempo** associado.
13. O produto deve **persistir** leituras e gravações usando a **GitHub API** autenticada com **PAT** fornecido pelo usuário, em um **repositório privado** da conta do usuário (ou organização acessível pelo token), armazenando o estado em **um ou mais arquivos JSON** (particionamento na spec).
14. A **tela de monitoramento de horas** deve permitir **restringir** os totais ao **quadro atual**; **agregação “todos os quadros”** no mesmo período é **desejável no MVP** se o custo for baixo — caso contrário, ficar explícito como **Fase 1.1** (ver D9).
15. A **entrada no produto** é uma **tela de login** com **URL do repositório** + **PAT**; após validação bem-sucedida, o usuário acessa o app. Campos opcionais adicionais (ex.: **branch**, prefixo de pasta) podem existir em **configurações avançadas** na spec, mas o MVP deve permitir operar só com URL + PAT quando valores padrão forem aceitáveis (`main`, caminho fixo, etc.).
16. O PAT deve ser tratado como **segredo**: não registrar em telemetria, não incluir em URLs públicas, orientar o usuário a **escopos mínimos** e **revogação**; onde o token for armazenado localmente (ex.: navegador), a spec deve documentar riscos e mitigação (criptografia opcional, bloqueio de extensões, etc.).

---

## 5. Requisitos não funcionais

| Área | Requisito |
|------|-----------|
| **Desempenho** | Interações de mover card, **trocar de quadro** e filtrar período na tela de monitoramento devem permanecer fluidas em uso típico pessoal (dezenas a poucos centenas de cards **por quadro**); tempos de espera perceptíveis devem ter feedback de carregamento. |
| **Confiabilidade do tempo** | Relógio do dispositivo é a fonte de tempo; comportamento com alteração de horário do sistema ou suspensão do equipamento deve ser tratado na spec (sem definir implementação no PRD). |
| **Confiabilidade GitHub** | Operações de escrita devem respeitar **limites de taxa** da API e **integridade** dos commits (ex.: uso de **SHA** atual ao atualizar conteúdo); conflitos entre duas sessões editando o mesmo arquivo devem ter comportamento definido na spec (ver D10). |
| **Offline** | **Opcional no MVP:** leitura cacheada ou fila local; se não for MVP, uso **online-first** com mensagens claras quando `api.github.com` estiver indisponível. |
| **Privacidade e dados pessoais** | Dados residem em **repositório privado** do usuário; o produto deve deixar explícito que o **PAT** é poderoso e que o **conteúdo JSON** segue a política de visibilidade do GitHub; não há processamento multi-tenant por terceiros no escopo do MVP. |
| **Segurança do token** | PAT com **escopo mínimo** (`repo` para repositório privado sob controle do usuário, salvo modelo fine-grained definido na spec); instruções para **rotação** e nunca commitar token no repositório de dados. |
| **Acessibilidade** | Contraste legível e operações principais utilizáveis por teclado onde aplicável (detalhe na spec). |
| **Plataforma** | **Desktop-first:** layout otimizado para telas largas; visualização em telas menores pode ser degradada no MVP. |

---

## 6. Métricas e critérios de sucesso

| Métrica | Baseline | Meta (pós-MVP inicial) | Como medir |
|---------|----------|-------------------------|------------|
| **Ativação do fluxo principal** | Não existe ainda (0) | ≥ 70% dos novos usuários criam ≥ 1 card e movem para **Em progresso** e depois **Concluído** em até 7 dias | Funil in-produto (eventos de produto) |
| **Uso do rastreamento automático** | Não existe ainda (0) | ≥ 60% dos usuários ativos na semana completam ≥ 1 segmento **Em progresso → Concluído** por semana | Eventos de transição e segmento concluído |
| **Personalização do quadro** | Não existe ainda (0) | ≥ 25% dos usuários ativos semanais alteram colunas (nome, ordem ou quantidade) ≥ 1 vez no mês | Eventos de configuração de coluna |
| **Uso de múltiplos quadros** | Não existe ainda (0) | ≥ 35% dos usuários ativos criam ≥ 2 quadros ou alternam entre ≥ 2 quadros na semana | Eventos de criação/seleção de quadro |
| **Login (URL + PAT) concluído** | Não existe ainda (0) | ≥ 80% dos usuários que iniciam o login completam validação sem abandono | Funil: tela de login → app |
| **Uso da tela de monitoramento** | Não existe ainda (0) | ≥ 40% dos usuários ativos semanais abrem a tela de monitoramento ≥ 1 vez por semana | Evento de visualização da tela |
| **Satisfação percebida (proxy)** | Não existe ainda | NPS ou escala curta ≥ 30 entre usuários que completaram onboarding leve (amostra) | Pesquisa in-app opcional |

**Definição de sucesso do MVP:** um desenvolvedor consegue, sem suporte externo, **fazer login com URL do repositório + PAT**, **criar e alternar entre múltiplos quadros**, criar tarefas, **ajustar colunas** (mantendo papéis válidos), mover entre colunas respeitando **Em progresso** e **Concluído**, ver totais de horas por tarefa (por quadro) e usar a tela de período com filtros dia/semana/mês.

---

## 7. Escopo MVP vs Fase 2

### MVP (entregar primeiro)

- **Tela de login** com **URL do repositório** + **PAT**, validação na GitHub API, **logout** e redirecionamento para o app quando a sessão for válida (D13, D14).
- **Persistência** via **GitHub API** + **PAT** + **repositório privado** + arquivos **JSON** (layout dos arquivos na spec).
- **Múltiplos quadros** por usuário (criar, listar, renomear, alternar; exclusão conforme D12).
- Cada quadro: preset **Todo / Working / Done** na criação e **edição de colunas** (renomear, reordenar, adicionar, remover) com **papéis** Backlog / Em progresso / Concluído e regras de unicidade.
- CRUD mínimo de cards e movimentação entre colunas **dentro do quadro ativo**.
- Regras de tempo: início ao entrar em **Em progresso**, parada e registro de segmento ao entrar em **Concluído**, soma de segmentos por reentrada.
- Exibição de **total de horas** por atividade no contexto do card (ou painel associado).
- **Tela de monitoramento** com filtro **dia / semana / mês**, totais **por tarefa** e **escopo por quadro** (agregado multi-quadro: ver D9).
- **Single-user**, foco desktop web.

### Fase 2 (após validação)

- **Offline-first** / fila de sincronização robusta e resolução avançada de conflitos Git.
- Fluxos mais ricos (ex.: **múltiplas colunas “em progresso”**, swimlanes, **templates** de quadro).
- Relatórios avançados (exportação CSV/ICS, etiquetas, projetos), integrações (calendário, IDE), **colaboração multi-usuário** (fora do escopo atual).
- Suporte a **GitHub App** ou **OAuth** em vez de PAT manual, se houver demanda.

### Explícito — fora do MVP

1. **Mais de uma** coluna com papel **Em progresso** ou **Concluído** no mesmo quadro; **swimlanes**; **templates** salvos e compartilháveis entre usuários.
2. Times, permissões, comentários em tempo real ou menções.
3. Integração com **GitHub Issues, Pull Requests, Projects ou Actions** como fonte de tarefas (o uso de GitHub aqui é **somente armazenamento de JSON**, não automação de dev).
4. **Produto multi-tenant** ou hospedagem dos dados do usuário em servidores do fornecedor do app (o backend é o **repo do próprio usuário**).
5. Aplicativo mobile nativo (foco desktop web no MVP).
6. Faturamento, cobrança ou planos pagos (a menos que o produto mude de hipótese — hoje assume uso pessoal gratuito ou modelo indefinido).

---

## 8. Questões em aberto, decisões e premissas

| ID | Tema | Descrição | Severidade | Owner sugerido | Prazo sugerido |
|----|------|-----------|------------|----------------|----------------|
| D1 | Granularidade na tela de monitoramento | MVP traz só totais por tarefa ou já inclui lista de segmentos / transições? | Alta | Product Owner | Antes do kickoff de especificação |
| D2 | Card em **Em progresso** sem ir a **Concluído** | Se o usuário move Backlog → **Em progresso** → Backlog sem passar por **Concluído**, como conta-se tempo (descartar segmento, pausar, ou outro)? | Alta | Product Owner + especificação | Antes dos critérios de aceite finais |
| D3 | Modelo de implantação | **Resolvido:** backend padrão é **GitHub privado + JSON**; **entrada** é **login** com **URL do repo + PAT**; variações (ex.: fork self-hosted) ficam fora do MVP. | — | — | — |
| D4 | Fuso e “dia” | Definir ancoragem do filtro “dia” (timezone do SO vs fixo UTC) para relatórios. | Média | Especificação comportamental | Com a spec |
| D5 | Reordenar cards só dentro da coluna **Em progresso** | Não deve reiniciar o cronômetro — confirmar como regra de produto. | Baixa | Product Owner | Sprint de refinamento |
| D6 | Mínimo de colunas e migração ao remover | Ao remover colunas, número mínimo (ex.: 2 ou 3) e o que acontece com cards da coluna removida (mover para Backlog adjacente, bloquear até esvaziar). | Alta | Product Owner + especificação | Antes da spec de dados/UI |
| D7 | Transição direta Backlog → Concluído | Permitir fechar segmento sem passar por **Em progresso** ou exigir passagem obrigatória pela coluna de progresso. | Média | Product Owner | Refinamento |
| D8 | Particionamento JSON | Um arquivo por quadro vs índice + N arquivos vs monólito versionado — impacta conflitos e performance. | Alta | Engenharia + PO | Antes da spec de dados |
| D9 | Relatório multi-quadro | “Todos os quadros” agrega segmentos de **todos** os boards no período ou fica para v1.1? | Média | Product Owner | Refinamento |
| D10 | Concorrência / dois dispositivos | Duas instâncias gravando o mesmo JSON: **último commit vence**, **merge** automático, ou bloqueio otimista com retry? | Alta | Engenharia | Spec técnica |
| D11 | Branch padrão | Sempre `main` vs branch configurável; criar commits em nome de quem (autor do commit API). | Baixa | Engenharia | Spec técnica |
| D12 | Exclusão de quadro | Arquivar (soft) vs apagar JSON vs mover para `/archive` no repo. | Média | Product Owner | Refinamento |
| D13 | Trocar repositório | Exige **logout** e novo login com outra URL ou wizard “Trocar repo” que limpa sessão e revalida. | Média | Product Owner | Spec de fluxo |
| D14 | Formato da URL | Aceitar só `https://github.com/owner/repo`, também `git@github.com:owner/repo.git`, ou só `owner/repo` com host fixo GitHub.com. | Média | Engenharia | Spec técnica |

**Premissas aceitas neste PRD**

- Um **segmento** válido para soma no total é aquele **encerrado** ao chegar na coluna com papel **Concluído** após ter estado em **Em progresso** no mesmo ciclo; políticas para outros caminhos são decididas em D2 e D7.
- **Multi-usuário colaborativo** não faz parte do MVP; **vários quadros** são do **mesmo indivíduo**. Uso em **dois dispositivos** é **possível** indiretamente via **mesmo repositório + PAT**, sujeito a D10.
- O público é **desenvolvedor** e consegue criar um **repositório privado** e um **PAT**; o produto **não** substitui o GitHub como ferramenta de código.

---

## 9. Armazenamento (backend): GitHub API + JSON

### 9.1 Princípios de produto

- O usuário **possui** os dados: eles residem em um **repositório GitHub privado** sob sua conta (ou org com permissão do PAT).
- O aplicativo usa a **GitHub REST API** (ou GraphQL, decisão de engenharia) com **Personal Access Token** para **ler e escrever** arquivos JSON que representam **quadros**, **colunas**, **cards** e **eventos/segmentos de tempo** (schema na spec).
- Não há, no MVP, **banco gerenciado pelo fornecedor** do app: o “banco” é o **histórico Git** + **conteúdo dos arquivos**.

### 9.2 Requisitos de alto nível (API)

- **Tela de login:** o usuário informa **URL do repositório** + **PAT**; o produto deriva `owner`, `repo` e host da API a partir da URL (normalização em D14) e associa o PAT à sessão.
- Autenticação: **PAT** armazenado conforme modelo de risco aceito após o login (ex.: memória de sessão, `localStorage` cifrado — spec); **logout** remove credenciais da sessão local.
- Repositório: esperado **privado**; produto deve **falhar de forma clara** se o token não tiver permissão de leitura/escrita de conteúdo.
- Formato: **JSON** textual no repositório; mudanças persistidas como **commits** (autor/mensagem podem ser padronizados — D11).
- Idempotência e concorrência: toda escrita que substitui arquivo deve usar **SHA** atual do blob (padrão da API de Contents) e tratar **409** / conflito conforme D10.

### 9.3 Implicações para o usuário final

- **Vantagens:** backup versionado, inspeção manual no GitHub, possível clonar localmente, reutilização do mesmo repo em outro ambiente.
- **Riscos:** exposição do PAT se o dispositivo for comprometido; necessidade de entender **rate limit**; conflitos se editar manualmente os JSON no GitHub enquanto usa o app.

---

## Escopo para engenharia (handoff)

Para a especificação técnica, detalhar sem ambiguidade:

- Modelo de **quadro** (id, nome, metadados) e relação com arquivos JSON (D8).
- Modelo de **coluna** (id, rótulo, ordem, papel) e validações ao **editar/remover**; migração de cards quando uma coluna some (D6).
- Máquina de estados do card e **definição formal de segmento** de tempo (referência por **id de coluna** ou papel, para sobreviver a renomeações); **escopo `boardId`** em todo evento persistido.
- Regras para **interrupções** (mover para fora de **Em progresso** sem **Concluído**, fechar app, suspender máquina).
- Comportamento da **tela de monitoramento**: o que entra em cada período (data de conclusão do segmento vs intervalo que cruza meia-noite); **filtro por quadro** e agregação (D9).
- **Integração GitHub:** parsing e validação da **URL do repo** na tela de login (D14), endpoints usados, escopos do PAT, estratégia de commit, tratamento de rate limit, erros e retry, fluxo **logout** e troca de repo (D13), **testes de carga mínimos** esperados para uso pessoal.
- **Persistência** e limites de dados (tamanho de JSON, número de quadros, retenção) para uso prolongado.

---

**Hipóteses críticas não validadas**

- Desenvolvedores adotarão rastreamento **automático** por coluna em vez de timer manual (validar com uso).
- O valor da **tela de período** compensa o esforço de construção no MVP frente a export simples.
- Usuários aceitarão **fricção do login** (URL do repo + PAT) em troca de **controle e versionamento** dos dados.

**Próximo passo sugerido:** acionar a especificação técnica usando as seções **Requisitos funcionais**, **User stories**, **Decisões D1–D2, D8–D14**, **Seção 9** e **Escopo para engenharia** como base para contratos de comportamento e critérios de aceite detalhados.
