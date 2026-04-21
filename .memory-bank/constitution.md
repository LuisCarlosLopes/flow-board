# FlowBoard — Constitution

Este repositório reúne o aplicativo **FlowBoard** (quadro pessoal com persistência em repositório GitHub do usuário) e a **memory-bank** do CodeSteer (especificações, planos e ADRs). Esta Constitution fixa prioridades estáveis; detalhes de implementação vigentes estão em ADRs sob `.memory-bank/adrs/` e em especificações ativas sob `.memory-bank/specs/`.

## Core Principles

### I. Domínio puro para regras de negócio

Regras que governam quadro, colunas, cards, tempo e invariantes do produto devem existir como **lógica testável isolada da UI** (camada de domínio), não apenas em componentes ou hooks. A UI orquestra; o domínio decide e valida.

### II. Persistência exclusiva via GitHub no MVP

Dados de domínio do FlowBoard persistem **somente** no repositório GitHub configurado na sessão, via **GitHub API** a partir do cliente, **sem** backend de dados próprio do produto no escopo MVP, salvo caches transitórios explicitamente permitidos por ADR.

### III. Credenciais e sessão com superfície mínima

Tokens e sessão seguem as decisões vigentes em ADR (armazenamento aprovado, ausência de credenciais em URL ou em artefatos JSON de dados, logout que limpa estado). Mudanças no tratamento de PAT ou sessão exigem **ADR atualizado** antes de merge.

### IV. Escopo MVP explícito

Elementos de protótipo ou mockups que **não** estiverem no PRD/escopo aprovado **não** recebem rota, estado persistente nem integração, até nova decisão de produto documentada (PRD/spec) e, quando arquitetural, **ADR**.

### V. Decisões arquiteturais registradas

Conflitos entre conveniência local e decisão já registrada resolvem-se **a favor do ADR/spec ativo**. Nova direção arquitetural materializa-se em ADR ou atualização de spec, não só em código.

### VI. Mudanças de comportamento exigem evidência

Alterações que mudem comportamento observável do produto devem ser **verificáveis**: testes automatizados (prioritariamente no domínio), lint limpo onde aplicável, e tratamento explícito de erros em integrações críticas (ex.: GitHub), conforme contratos descritos na especificação técnica.

### VII. Economia de contexto nas saídas

Comunicação no âmbito deste repositório (agentes, revisões, PRs, tarefas) deve **priorizar informação acionável e estado novo**. É proibido como padrão: recapitular o pedido original sem agregar decisão; produzir “relatórios de progresso” ou sumários do processo quando o leitor já tem o histórico; narrar passos triviais de execução; ou meta-comentários que não mudem governança, contrato ou próximo passo. **Sumários só são obrigatórios** quando consolidarem decisão, versão, critério de aceite ou checklist que impacte trabalho futuro — e ainda assim no menor volume necessário.

## Arquitetura, stack e limites

- **Stack principal do app:** TypeScript, React, Vite; testes com a stack definida no pacote da aplicação (ex.: Vitest).
- **Organização:** separação disciplinada entre domínio, features de UI e infraestrutura (ex.: cliente GitHub), conforme ADRs de arquitetura.
- **Monorepo / workspace:** novos pacotes ou apps devem integrar-se a este modelo sem violar os princípios I–II sem ADR.
- **Dependência de plataforma:** limites de taxa, disponibilidade e políticas da API GitHub são aceitos como restrição externa; o código deve falhar de forma clara e recuperável quando possível.

## Workflow, qualidade e revisão

- **Saídas enxutas (alinhado ao princípio VII):** na conclusão de uma tarefa, priorizar o que mudou, impacto e como validar; omitir “executei X, depois Y” quando não for necessário ao revisor. Evitar listas de “o que foi feito” que duplicam o diff ou o pedido.
- **Antes de concluir trabalho:** executar verificações locais previstas no pacote afetado (ex.: `lint`, `test`, `build` onde existirem).
- **Revisão:** mudanças que alterem persistência, segurança de sessão, contratos de dados ou regras de domínio devem ser revisadas com **referência explícita** ao trecho de spec ou ADR correspondente.
- **Idioma e Padrões:** O desenvolvimento segue o padrão de código em **Inglês** (nomenclatura de variáveis, funções, arquivos), com comentários internos ao código, documentação técnica (especificações, ADRs), planos de implementação e tarefas sempre em **Português**.
- **Documentação viva:** quando uma mudança invalidar um ADR, o fluxo esperado é **deprecar ou substituir** o ADR com status e data, não deixar decisões contraditórias sem resolução.

## Governance

- Esta Constitution **prevalece** sobre convenções informais do repositório quando houver conflito.
- **Emendas** alteram este arquivo, incrementam a versão de forma coerente com o impacto e atualizam `Last Amended`.
- O conjunto **ADR + specs ativas + esta Constitution** forma a hierarquia de governança técnica do workspace; implementação deve ser rastreável até um desses artefatos para decisões não triviais.

**Version**: 1.0.2 | **Ratified**: 2026-04-19 | **Last Amended**: 2026-04-21
