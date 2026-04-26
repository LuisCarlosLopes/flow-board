# TSD — Exportar apontamentos para CSV

| Campo | Valor |
|--------|--------|
| Slug | `export-apontamentos-csv` |
| Track | FEATURE |
| Data | 2026-04-26 |
| Confiança (escopo O QUÊ) | **89** — baseline de domínio, filtros de período e contrato de catálogo inspecionados; decisões de contrato externo fechadas nesta spec sem ambiguidade material remanescente. |

## 1. Visão e problema

A vista **Horas no período** já consolida apontamentos por tarefa dentro de um período civil local, mas hoje não oferece uma forma de **extrair esse resultado em CSV** para uso externo. O objetivo desta feature é permitir que o usuário gere um ficheiro CSV com os apontamentos do período, filtrando por **tipo de período + data de referência** e por **um ou mais quadros**, com semântica de inclusão idêntica à visão existente.

O ator principal é o **usuário autenticado da SPA**, operando sobre os dados já persistidos no repositório GitHub configurado na sessão.

## 2. Glossário

| Termo | Definição |
|--------|------------|
| **Apontamento** | Tempo concluído de uma tarefa, derivado de um ou mais segmentos encerrados. |
| **Segmento concluído** | Intervalo com `startMs` e `endMs`; só conta para horas no período quando o instante de conclusão cai dentro do intervalo filtrado. |
| **Período ativo** | Recorte temporal civil local definido por `Dia`, `Semana` ou `Mês`, combinado com uma data de referência. |
| **Linha agregada** | Resultado único por par `(boardId, cardId)`, contendo a soma das durações elegíveis daquela tarefa naquele quadro. |
| **Quadro elegível** | Quadro presente no catálogo e não marcado como arquivado. |
| **Tarefa arquivada** | Tarefa mantida no documento do quadro com marcação de arquivamento, mas cujo histórico de tempo continua existindo. |

## 3. Contexto do sistema

- O domínio atual de horas opera sobre **segmentos concluídos** e já define a regra de inclusão do período pela **data/hora de conclusão** do segmento.
- A visão atual de horas já suporta:
  - período `day | week | month`;
  - data de referência (âncora);
  - escopo simplificado de boards: quadro ativo ou todos.
- O catálogo de quadros já distingue boards arquivados por um marcador opcional e a vista atual de horas já exclui boards arquivados da carga.
- O resultado hoje apresentado ao usuário é **agregado por tarefa**, não por segmento individual.

## 4. Decisões de contrato fechadas nesta spec

### DC-01 — Granularidade do export

O export deve gerar **uma linha por `(quadro, tarefa)` com horas totais no período**, e **não** uma linha por segmento.

**Justificativa:** esta é a unidade já compreensível para o usuário na vista existente, evita inflar o ficheiro com detalhes operacionais de baixo valor para o objetivo descrito ("apontamentos por tarefa no período") e mantém correspondência direta entre o que o usuário filtra/visualiza e o que ele exporta.

### DC-02 — Regra de inclusão de tempo

O export deve usar a **mesma semântica da agregação atual**: um segmento entra no período quando seu `endMs` estiver dentro do intervalo filtrado; quando entra, conta-se a **duração integral** do segmento.

### DC-03 — Delimitador e encoding

O ficheiro exportado deve usar:

- delimitador de campos `;`;
- encoding **UTF-8 com BOM**;
- quebra de linha **CRLF**.

**Justificativa:** o objetivo principal do CSV aqui é interoperar bem com planilhas usadas por usuários de língua portuguesa e preservar acentos de forma confiável.

### DC-04 — Política decimal

O campo de horas deve ser exportado como **decimal textual com vírgula** e **duas casas decimais**, sem separador de milhar.

Exemplos válidos:

- `0,00`
- `1,50`
- `12,25`

**Justificativa:** o delimitador já é `;`, então a vírgula decimal não conflita com o parsing do CSV e melhora a legibilidade em contexto `pt-BR`.

## 5. Requisitos funcionais

### RF-01 — Disponibilidade da ação

- A área de **Horas no período** deve disponibilizar uma ação explícita de exportação para CSV.
- A ação deve refletir os filtros efetivos que determinam o dataset exportado.

### RF-02 — Filtro de período obrigatório

- O usuário deve poder definir o período exportado usando a mesma semântica já existente na vista:
  - tipo de período: `Dia`, `Semana` ou `Mês`;
  - data de referência.
- O arquivo exportado deve refletir exatamente o período ativo no momento da confirmação da exportação.

### RF-03 — Filtro multi-board obrigatório

- O usuário deve poder selecionar **um ou mais** quadros para a exportação.
- O conjunto ofertado no filtro deve conter **apenas boards não arquivados** presentes no catálogo.
- O filtro deve permitir escolher um subconjunto arbitrário do catálogo elegível, sem limitar a escolha ao quadro ativo.
- A exportação não pode ser concluída com **zero** boards selecionados.

### RF-04 — Coerência entre filtro e dataset

- Cada linha exportada deve corresponder a uma tarefa pertencente a um dos boards selecionados.
- Boards fora da seleção não podem contribuir com linhas nem horas.
- Caso exista pré-visualização na própria vista, ela deve permanecer semanticamente alinhada ao mesmo recorte de período e boards usado para exportar.

### RF-05 — Conteúdo exportado

- O CSV deve conter:
  - contexto do período exportado em cada linha;
  - identificação do quadro;
  - identificação da tarefa;
  - indicador se a tarefa está arquivada;
  - horas totais agregadas no período.
- Tarefas diferentes com o mesmo título, mas em boards distintos, devem permanecer em linhas distintas.

### RF-06 — Resultado sem dados

- Se, após aplicar período e boards, não existir nenhuma linha agregada elegível, o sistema deve **informar claramente que não há dados para exportar**.
- Neste cenário, o sistema **não deve gerar ficheiro vazio** como resultado final da ação.

### RF-07 — Integridade da exportação

- A exportação deve ser **atômica no ponto de vista do usuário**: ou o ficheiro representa com sucesso todos os boards selecionados, ou a operação falha com erro explícito.
- Não é permitido gerar ficheiro parcial silenciosamente quando um dos boards selecionados não puder ser carregado.

### RF-08 — Nome e idioma do contrato público

- Os cabeçalhos do CSV devem ser estáveis e documentados.
- O conteúdo textual exportado deve preservar os títulos originais dos boards e das tarefas, inclusive acentos e quebras de linha quando existirem.

## 6. Regras de negócio

### RNB-01 — Semântica do período

- `Dia` corresponde ao dia civil local completo.
- `Semana` corresponde à semana civil local de **segunda-feira a domingo** que contém a data de referência.
- `Mês` corresponde ao mês civil local que contém a data de referência.

### RNB-02 — Critério de inclusão de segmento

- Um segmento concluído pertence ao período quando `endMs` estiver dentro de `[period.startMs, period.endMs]`.
- Um segmento iniciado fora do período, mas concluído dentro dele, **entra por inteiro** no total.
- Um segmento concluído fora do período, mesmo que iniciado dentro dele, **não entra**.

### RNB-03 — Critério de agregação

- A agregação é feita por par `(boardId, cardId)`.
- O total da linha é a soma das durações de todos os segmentos elegíveis daquele par.

### RNB-04 — Seleção de boards

- O filtro multi-board só considera boards não arquivados do catálogo.
- O quadro ativo da navegação pode ser usado como contexto de conveniência, mas **não substitui** a seleção explícita exigida para o export.
- Se um board previamente selecionado deixar de ser elegível antes da exportação, a operação deve ser invalidada e o usuário deve ser informado para revisar a seleção.

### RNB-05 — Tarefas arquivadas

- Tarefas arquivadas **continuam elegíveis** para exportação se tiverem horas no período e pertencerem a um board selecionado.
- O CSV deve sinalizar essa condição por coluna dedicada, para que o histórico não seja confundido com tarefas ativas.

### RNB-06 — Ordem e estabilidade

- A ordem das linhas exportadas deve seguir a ordenação do dataset agregado exibido ao usuário no momento da exportação.
- A semântica do arquivo não depende da ordem; o significado do conteúdo é dado pelos campos exportados.

### RNB-07 — Falhas de carregamento

- Erro de autenticação, permissão, rede, board inexistente ou conflito de leitura impedem a geração do ficheiro.
- O erro apresentado deve deixar claro que o export não foi concluído com sucesso.

## 7. Contrato de dados do CSV

### 7.1 Cabeçalho obrigatório

O CSV deve conter exatamente as colunas abaixo, nesta ordem:

| Coluna | Tipo lógico | Formato / domínio | Obrigatório | Observações |
|--------|-------------|-------------------|-------------|-------------|
| `periodo_tipo` | enum textual | `day` \| `week` \| `month` | Sim | Valor técnico estável do tipo de período. |
| `periodo_inicio` | data textual | `YYYY-MM-DD` | Sim | Data civil local de início do período. |
| `periodo_fim` | data textual | `YYYY-MM-DD` | Sim | Data civil local de fim do período. |
| `board_id` | texto | string não vazia | Sim | Identificador estável do quadro. |
| `board_titulo` | texto | string | Sim | Título atual do quadro no momento do export. |
| `card_id` | texto | string não vazia | Sim | Identificador estável da tarefa. |
| `card_titulo` | texto | string | Sim | Título atual da tarefa no momento do export. |
| `card_arquivado` | boolean textual | `true` \| `false` | Sim | `true` quando a tarefa estiver arquivada. |
| `horas_totais` | decimal textual | vírgula decimal, 2 casas, sem milhar | Sim | Total agregado da linha no período. |

### 7.2 Exemplo ilustrativo

```text
periodo_tipo;periodo_inicio;periodo_fim;board_id;board_titulo;card_id;card_titulo;card_arquivado;horas_totais
week;2026-04-20;2026-04-26;b-1;Produto;c-10;Fechar relatório;false;3,50
week;2026-04-20;2026-04-26;b-2;"Operação; suporte";c-44;"Ajustar ""SLA""";true;1,25
```

Observação: o exemplo acima ilustra quoting/escaping com `;` e aspas. Quebras de linha reais em campos textuais também devem permanecer dentro de aspas duplas, sem quebrar o contrato de colunas.

### 7.3 Regras de serialização

- Delimitador de campo: `;`
- Delimitador de linha: `CRLF`
- Encoding: `UTF-8 com BOM`
- Qualificador textual: `"`
- Escape de aspas duplas dentro de um campo: `""`

Um campo **deve** ser envolvido por aspas duplas quando contiver qualquer um dos itens abaixo:

- `;`
- `"`
- `\r`
- `\n`

Também é permitido citar campos sem necessidade sem quebrar o contrato, desde que o conteúdo resultante seja equivalente.

### 7.4 Política decimal

- `horas_totais` é serializado como texto decimal com duas casas.
- O separador decimal é sempre `,`.
- Não há separador de milhar.
- O valor `0` deve sair como `0,00`.

## 8. Critérios de aceite verificáveis

### CA-01 — Export de subconjunto de boards

Dado um catálogo com múltiplos boards ativos, quando o usuário selecionar apenas parte deles e confirmar a exportação, então o CSV deve conter linhas exclusivamente desses boards.

### CA-02 — Bloqueio com zero boards

Quando nenhum board estiver selecionado, a exportação não deve prosseguir e o sistema deve exigir pelo menos um board.

### CA-03 — Regra R09 preservada

Dado um segmento iniciado antes do período e concluído dentro dele, então sua duração integral deve aparecer na linha agregada exportada.

### CA-04 — Segmento fora do período excluído

Dado um segmento concluído fora do período, então ele não deve contribuir para nenhuma linha do CSV, mesmo que tenha começado dentro do intervalo.

### CA-05 — Tarefas arquivadas sinalizadas

Se uma tarefa arquivada possuir horas elegíveis no período, então ela deve aparecer no CSV com `card_arquivado=true`.

### CA-06 — Compatibilidade com texto livre

Se o título do quadro ou da tarefa contiver `;`, aspas duplas ou quebra de linha, então o campo exportado deve obedecer às regras de quoting/escaping sem deslocar colunas.

### CA-07 — Sem dados

Se o recorte de período + boards não produzir nenhuma linha agregada, então o sistema deve informar ausência de dados e não deve entregar um ficheiro como se o export tivesse sido bem-sucedido.

### CA-08 — Falha total em erro de carregamento

Se pelo menos um dos boards selecionados não puder ser carregado, então o export inteiro deve falhar sem gerar CSV parcial.

### CA-09 — Contrato do cabeçalho

O cabeçalho do CSV gerado deve corresponder exatamente às colunas e à ordem descritas na seção 7.1.

## 9. Casos de borda

| # | Cenário | Comportamento esperado |
|---|---------|------------------------|
| E1 | Board selecionado é arquivado ou removido entre a seleção e a confirmação | Export é invalidado; usuário recebe mensagem para revisar a seleção. |
| E2 | Dois boards diferentes possuem tarefas com mesmo `cardId` ou mesmo título | As linhas permanecem separadas por `(board_id, card_id)`. |
| E3 | Título contém `;`, aspas ou quebra de linha | Campo é serializado com quoting/escaping compatível com o contrato. |
| E4 | Há boards válidos, mas nenhuma tarefa tem horas no período | Não gera ficheiro; sistema informa ausência de dados. |
| E5 | Um segmento cruza a fronteira do período e termina dentro dele | Conta integralmente para a linha agregada. |
| E6 | Um segmento termina um milissegundo após o fim do período | Não conta para a exportação. |
| E7 | Uma tarefa foi arquivada após registrar tempo | Continua aparecendo, marcada em `card_arquivado`. |
| E8 | Um dos boards selecionados falha por erro de rede ou permissão | Export falha integralmente, sem resultado parcial silencioso. |

## 10. Fora de escopo (MVP)

- Exportar uma linha por segmento individual.
- Exportar em formatos diferentes de CSV, como XLSX, PDF ou JSON.
- Permitir escolher boards arquivados como fonte do export.
- Mudar a regra de inclusão temporal hoje baseada na conclusão do segmento.
- Introduzir backend próprio, fila assíncrona ou processamento fora do cliente para esta feature.
- Permitir edição de colunas, normalização de texto ou enriquecimento manual do CSV antes da geração.

## 11. Não objetivos

- Esta feature não pretende transformar o CSV em formato contábil oficial, fiscal ou de folha de pagamento.
- Esta feature não pretende introduzir reconciliação histórica entre snapshots antigos de títulos de board/tarefa; o arquivo reflete o estado nominal atual dos objetos no momento do export.
- Esta feature não pretende redefinir a navegação principal por quadro nem substituir o conceito de quadro ativo em outras áreas da aplicação.

## 12. Requisitos não funcionais

- O arquivo deve ser legível por planilhas comuns sem perda de acentuação.
- O contrato deve ser estável o suficiente para consumo manual e automações simples de importação.
- A operação deve respeitar a Constitution do projeto: dados continuam sendo lidos do repositório GitHub configurado na sessão, sem backend de dados próprio.
- O export não pode produzir resultado silenciosamente inconsistente com os filtros ativos.

## 13. Perguntas em aberto

Nenhuma pergunta bloqueante permaneceu em aberto nesta versão da spec.

## 14. Handoff para o planner

- Preservar integralmente a semântica atual de período civil local e inclusão por conclusão do segmento.
- Garantir que a seleção multi-board opere somente sobre boards não arquivados do catálogo e exija pelo menos um item selecionado.
- Materializar o CSV exatamente com o contrato público descrito na seção 7, incluindo encoding, delimitador, quoting e política decimal.
- Cobrir explicitamente os critérios de aceite e os casos de borda desta spec.

## 15. Resumo de decisões e confiança

- **Decisões bloqueantes resolvidas:** 3
  - granularidade agregada por `(quadro, tarefa)`;
  - contrato CSV (`;`, UTF-8 com BOM, CRLF);
  - política de horas com vírgula decimal e duas casas.
- **Assunções não bloqueantes documentadas:** 1
  - o quadro ativo pode servir como conveniência de contexto, mas não substitui a seleção explícita de boards para o export.
- **Complexidade funcional estimada:** M

