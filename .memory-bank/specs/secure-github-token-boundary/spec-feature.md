# TSD: Fronteira segura para token GitHub — v1.1

> **Status:** Draft revisado para `spec-reviewer`  
> **Autor:** spec v1.1 | **Data:** 2026-04-24  
> **Slug:** `secure-github-token-boundary`  
> **Track:** FEATURE  
> **Confiança:** 88/100 | **Complexidade:** L

---

## 1. Visão Geral

**Problema que resolve:**  
O FlowBoard hoje usa o Personal Access Token (PAT) GitHub diretamente no browser para autenticar chamadas à API GitHub. Além disso, a sessão persistida no browser contém `pat`, o que amplia a exposição em caso de XSS, inspeção de storage ou reutilização indevida do estado de sessão.

**Comportamento principal:**  
O FlowBoard deve passar a operar com uma fronteira segura para credenciais GitHub: o usuário ainda pode informar repositório e PAT para iniciar a conexão, mas a sessão persistida e o modelo de sessão exposto ao JavaScript da aplicação não devem conter PAT, token GitHub bruto, `Authorization: Bearer <PAT>` nem segredo equivalente. Após a conexão, leituras e escritas autenticadas no GitHub devem ocorrer por meio dessa fronteira segura, mantendo os dados de domínio do FlowBoard no repositório GitHub configurado pelo usuário.

**Ator principal:**  
Usuário do FlowBoard que conecta um repositório GitHub privado e depois usa quadros, cards, horas, busca, anexos e demais fluxos que dependem de leitura/escrita autenticada no GitHub.

---

## 2. Contexto do Sistema

### 2.1 Entidades Existentes Relevantes

| Entidade | Campos Relevantes | Papel na Feature |
|---|---|---|
| Sessão FlowBoard atual | `pat: string`, `repoUrl: string`, `owner: string`, `repo: string`, `apiBase: string`, `webUrl: string` | Deve ser substituída por uma sessão sem PAT ou segredo GitHub exposto ao cliente. |
| Resolução de repositório | `owner: string`, `repo: string`, `apiBase: string`, `webUrl: string` | Continua necessária para identificar o repositório de dados do usuário. |
| Seleção ativa de board | Chave derivada de `owner/repo`, valor com `boardId` | Continua podendo ser persistida por repositório porque não contém segredo. |
| Cliente GitHub autenticado atual | `token`, `owner`, `repo`, `apiBase` | O contrato de chamadas autenticadas deve deixar de depender de token GitHub disponível no JavaScript da SPA. |
| Documentos de domínio FlowBoard | Catálogo, boards, cards, horas, anexos e blobs sob o namespace de dados FlowBoard no repositório GitHub | Permanecem como fonte de verdade dos dados de produto. |

### 2.2 Endpoints Existentes Relacionados

Não há endpoints próprios do FlowBoard no estado atual; a SPA chama diretamente a GitHub REST API. As operações externas relevantes existentes são:

| Operação Externa | O que faz hoje | Impacto da Feature |
|---|---|---|
| Verificar acesso ao repositório | Confirma se o PAT lê o repositório configurado. | Deve passar pela fronteira segura durante o estabelecimento ou validação da sessão. |
| Ler JSON ou blob do repositório | Carrega catálogo, boards e anexos. | Deve ser autenticada sem PAT exposto ao JavaScript da SPA. |
| Escrever JSON ou blob no repositório | Persiste catálogo, boards e anexos usando SHA quando aplicável. | Deve preservar semântica de SHA/conflito, mas sem envio direto de PAT pela SPA ao GitHub. |
| Excluir arquivo do repositório | Remove blobs de anexos quando aplicável. | Deve manter autorização e tratamento de erro sem vazar segredo. |

### 2.3 Regras de Negócio Existentes no Domínio

- **Persistência exclusiva de domínio no GitHub:** dados de domínio do FlowBoard continuam no repositório GitHub configurado pelo usuário. Esta feature não autoriza mover boards, cards, horas, catálogo ou anexos para outro armazenamento de produto.
- **Somente GitHub oficial no MVP:** repositórios aceitos continuam restritos a `github.com`; `apiBase` customizado e GitHub Enterprise seguem fora de escopo.
- **Segredos fora dos dados versionados:** PAT ou credenciais não podem aparecer em JSON de domínio, blobs, URLs públicas, query string, fragment, mensagens de erro, logs ou documentação versionada.
- **Concorrência por SHA:** conflitos GitHub continuam observáveis como conflito de escrita e devem preservar a recuperação já esperada pelo produto.
- **Logout limpa estado de sessão:** o logout já deve remover estado local conhecido; nesta feature também deve invalidar qualquer credencial transitiva associada à sessão segura.
- **Governança:** mudanças materiais no tratamento de PAT/sessão exigem atualização, substituição ou depreciação nominal de `ADR-001` e `ADR-004` antes de merge.

---

## 3. Requisitos Funcionais

**RF01 — Sessão persistida sem segredo GitHub**  
O sistema deve persistir no browser apenas metadados não secretos da sessão, como identificação do repositório e estado suficiente para restaurar a experiência. A sessão persistida não deve conter `pat`, token GitHub bruto, header `Authorization`, refresh token GitHub, segredo cifrado reversível pelo JavaScript da SPA ou qualquer equivalente utilizável para chamar a API GitHub diretamente.

**RF02 — Modelo de sessão exposto sem PAT**  
O sistema deve expor às telas autenticadas uma sessão sem PAT. Componentes e fluxos de produto devem conseguir operar usando metadados de repositório e estado autenticado, sem ler ou receber o token GitHub.

**RF03 — Estabelecimento de sessão segura**  
O sistema deve permitir que o usuário conecte o FlowBoard informando URL do repositório GitHub e PAT, validar acesso ao repositório e inicializar os dados FlowBoard necessários. Após sucesso, o PAT deve sair do estado controlado da UI e não deve ser persistido no browser.

**RF04 — Chamadas GitHub autenticadas por fronteira segura**  
O sistema deve executar leituras, escritas e exclusões autenticadas no GitHub por meio de uma fronteira segura que detenha ou resolva a credencial GitHub fora do modelo de sessão acessível ao JavaScript da SPA.

**RF05 — Ausência de PAT em chamadas diretas da SPA para GitHub**  
Depois da sessão estabelecida, a SPA não deve enviar `Authorization: Bearer <PAT>` diretamente para `https://api.github.com` ou para qualquer origem GitHub. Chamadas necessárias para dados FlowBoard devem usar apenas o contrato da fronteira segura.

**RF06 — Restauração após reload**  
Após reload da página, o usuário deve permanecer autenticado somente se a sessão segura ainda for válida. A restauração não deve depender de PAT salvo em `localStorage`, `sessionStorage` ou storage equivalente acessível a JavaScript.

**RF07 — Logout com invalidação completa**  
O sistema deve limpar a sessão local não secreta e invalidar qualquer sessão, credencial transitiva ou referência autenticável mantida pela fronteira segura. Repetir logout deve ser seguro e não deve causar erro visível.

**RF08 — Migração fail-closed de sessões legadas**  
Ao detectar sessão legada contendo PAT em `localStorage` ou `sessionStorage`, o sistema deve remover o PAT e tratar a sessão como não autenticada, exigindo nova conexão segura. Esta é uma assunção segura para a primeira entrega: não haverá troca silenciosa de PAT legado por sessão segura.

**RF09 — Mensagens de autenticação e autorização sem vazamento**  
O sistema deve continuar apresentando erros claros para credencial inválida, falta de permissão, repositório inexistente, sessão expirada, conflito e limite de taxa, sem exibir PAT, fragmentos de token, headers de autenticação, payloads sensíveis ou stack traces com segredo.

**RF10 — Compatibilidade dos dados de domínio**  
A feature não deve alterar o contrato funcional dos documentos de domínio do FlowBoard. Boards, cards, horas, catálogo e anexos existentes devem continuar legíveis e graváveis no repositório GitHub configurado.

**RF11 — Evidência automatizada de segurança de storage**  
O sistema deve ter verificação automatizada cobrindo que o storage do browser não contém PAT após login bem-sucedido, reload, migração de sessão legada e logout.

**RF12 — Evidência automatizada da fronteira de chamadas**  
O sistema deve ter verificação automatizada cobrindo que, após login, chamadas autenticadas de dados não enviam PAT diretamente da SPA para a GitHub API.

**RF13 — ADRs alinhadas antes de merge**  
O sistema deve ter a governança atualizada antes de merge, registrando a nova fronteira de segurança e deprecando ou substituindo decisões que autorizavam PAT persistido ou chamadas GitHub diretas a partir do browser.

---

## 4. Regras de Negócio

### 4.1 Validações de Entrada

- **V01 — URL de repositório obrigatória:** a URL ou identificador do repositório deve ser informado e resolver para `owner/repo` em `github.com`.
- **V02 — PAT obrigatório no estabelecimento de sessão:** o PAT é obrigatório para iniciar uma sessão segura quando OAuth completo não estiver em uso.
- **V03 — PAT não persistível:** qualquer valor identificado como PAT, token GitHub bruto ou header de autenticação GitHub deve ser rejeitado como campo persistível em sessão de browser.
- **V04 — Origem GitHub restrita:** GitHub Enterprise, `apiBase` customizado, subdomínios e hostnames parecidos com `github.com` permanecem inválidos no MVP.
- **V05 — Sessão segura expirada:** sessão local sem correspondência válida na fronteira segura deve ser tratada como ausente.
- **V06 — Payload de erro redigido:** erros retornados ao browser não podem conter secrets, headers de autenticação, body bruto de provedores externos com segredo ou stack trace sensível.
- **V07 — Arquivo ausente classificado:** ausência de arquivo remoto deve ser classificada como estado vazio aceitável somente quando o fluxo de domínio existente já aceitar inicialização ou ausência; nos demais casos deve ser erro observável de não encontrado.
- **V08 — Falha externa redigida:** erro inesperado de provedor externo deve ser convertido em falha recuperável sem ecoar payload bruto, segredo, header, stack trace sensível ou identificador autenticável.

### 4.2 Regras de Estado

```text
SemSessao -> Conectando : usuário informa repositório + PAT e submete conexão
Conectando -> SessaoAtiva : repositório validado, bootstrap concluído e sessão segura emitida
Conectando -> SemSessao : credencial inválida, repositório inválido, permissão negada ou falha recuperável
SessaoAtiva -> SessaoExpirada : fronteira segura rejeita sessão por expiração, invalidação ou ausência de credencial associada
SessaoAtiva -> SemSessao : usuário executa logout com invalidação da sessão segura
SessaoExpirada -> Conectando : usuário informa novamente repositório + PAT
SessaoLegadaComPAT -> SemSessao : PAT removido do storage e reconexão exigida
```

### 4.3 Regras de Autorização

- **A01 — Acesso ao repositório:** somente uma sessão segura associada a um PAT válido e autorizado pode ler ou escrever dados no repositório configurado.
- **A02 — Escopo por sessão:** uma sessão segura só pode operar sobre o `owner/repo` validado no momento da conexão. Trocar de repositório exige nova conexão.
- **A03 — Sem elevação por parâmetro do cliente:** o cliente não pode alterar `owner`, `repo` ou origem GitHub em uma chamada autenticada para acessar outro repositório sem nova validação.
- **A04 — Logout revoga capacidade da sessão:** após logout bem-sucedido, chamadas subsequentes associadas à sessão anterior devem falhar como não autenticadas.

### 4.4 Limites e Quotas

- **L01 — Quotas GitHub preservadas:** limites de taxa, tamanho e disponibilidade da GitHub API continuam sendo restrições externas e devem ser refletidos em mensagens claras.
- **L02 — Escopo de sessão por browser:** a sessão segura pode sobreviver a reload, mas não deve ser representada por segredo GitHub legível por JavaScript.
- **L03 — Sem cache de domínio fora do GitHub:** a fronteira segura não pode se tornar fonte de verdade para dados de domínio; qualquer cache permitido deve ser transitório e não autoritativo.
- **L04 — Conflito por SHA preservado:** escrita ou exclusão com SHA obsoleto deve permanecer observável como conflito, sem sobrescrever silenciosamente dados remotos.
- **L05 — Limite de taxa preservado:** limitação de taxa do GitHub deve ser exposta como condição recuperável, com orientação de aguardar quando houver indicação externa de retry.

---

## 5. Contrato de Interface

Esta seção define operações observáveis obrigatórias. A TSD não fixa nomes de rotas, estrutura de pastas ou bibliotecas; o planner deve materializar uma superfície equivalente preservando os contratos abaixo.

### 5.0 Semântica canônica de status observável

| Semântica | Status observável canônico | Regras-âncora | Aplicação |
|---|---:|---|---|
| Validação inválida | 400 | V01, V02, V04 | Entrada local inválida antes de estabelecer sessão ou executar operação. |
| Não autenticado | 401 | V05, A04 | Sessão ausente, expirada, revogada ou inválida. |
| Sem permissão | 403 | A01, A02, A03 | Credencial associada não autoriza o repositório ou operação solicitada. |
| Não encontrado | 404 | V07 | Repositório ou arquivo inexistente/inacessível quando ausência não for estado vazio aceitável. |
| Conflito | 409 | L04 | SHA obsoleto, edição concorrente ou exclusão concorrente. |
| Limite de taxa | 429 | L01, L05 | Quota/limite externo atingido. |
| Falha externa | 502 ou 503 | V08, L01 | GitHub indisponível, timeout ou falha inesperada de dependência externa. |

As operações desta seção podem usar nomes, rotas e métodos definidos pelo planner, mas devem preservar a semântica observável acima para UI, testes e tratamento de erro.

### 5.1 Operação: Iniciar sessão segura

**Finalidade:** validar o PAT contra o repositório GitHub, preparar dados FlowBoard quando necessário e emitir uma sessão segura sem devolver o PAT ao browser.

**Request:**

```text
repoUrl: string   — URL ou identificador do repositório GitHub suportado
pat: string       — PAT informado pelo usuário para estabelecer a sessão
```

**Response de sucesso:**

```text
session:
  owner: string
  repo: string
  repoUrl: string
  webUrl: string
  authenticated: true
  expiresAt?: ISO-8601 DateTime
```

**Regras do response:**

- Não deve incluir `pat`, token GitHub bruto, refresh token GitHub, header `Authorization` ou segredo equivalente.
- Qualquer credencial de sessão necessária para chamadas futuras deve ser inacessível a JavaScript ou não reutilizável contra GitHub.
- A resposta deve permitir que a UI exiba o repositório conectado.

**Falhas:**

| Código/Semântica | Condição | Resposta observável |
|---|---|---|
| Validação inválida | URL vazia, formato inválido ou host não suportado | Mensagem clara sobre formato/repositório suportado. |
| Não autorizado | PAT inválido ou expirado | Mensagem clara para revisar o token, sem ecoar o valor. |
| Sem permissão | PAT sem acesso ao repositório | Mensagem clara sobre escopo/permissão. |
| Não encontrado | Repositório inexistente ou inacessível | Mensagem clara sobre repositório não encontrado. |
| Falha externa | GitHub indisponível ou erro inesperado | Mensagem recuperável, sem detalhes sensíveis. |

### 5.2 Operação: Consultar sessão atual

**Finalidade:** permitir que o app restaure a experiência após reload se a sessão segura ainda estiver válida.

**Request:**

```text
Nenhum segredo GitHub no body, query string ou storage legível por JavaScript.
```

**Response de sucesso:**

```text
session:
  owner: string
  repo: string
  repoUrl: string
  webUrl: string
  authenticated: true
  expiresAt?: ISO-8601 DateTime
```

**Falhas:**

| Código/Semântica | Condição | Resposta observável |
|---|---|---|
| Não autenticado | Sessão inexistente, expirada, inválida ou revogada | App retorna ao login e remove metadados locais obsoletos. |

### 5.3 Operação: Encerrar sessão

**Finalidade:** encerrar localmente e na fronteira segura a capacidade de acessar o repositório GitHub.

**Request:**

```text
Nenhum PAT no body, query string ou storage legível por JavaScript.
```

**Response de sucesso:**

```text
loggedOut: true
```

**Idempotência:**  
Repetir logout deve retornar sucesso ou estado equivalente sem reativar a sessão.

### 5.4 Operação: Executar leitura autenticada de dados FlowBoard

**Finalidade:** ler JSON ou blob do repositório configurado pela sessão segura.

**Request:**

```text
path: string       — caminho de dado FlowBoard permitido
kind: "json" | "blob"
```

**Response de sucesso:**

```text
sha: string
content: unknown | base64-string
```

**Falhas relevantes:**

| Código/Semântica | Condição | Resposta observável |
|---|---|---|
| Não autenticado | Sessão segura ausente, expirada ou revogada | App volta ao login ou pede reconexão. |
| Sem permissão | Credencial associada perdeu acesso | Mensagem de permissão/reconexão. |
| Não encontrado | Arquivo inexistente quando ausência não é aceitável | Mensagem ou estado vazio conforme fluxo existente. |
| Conteúdo inválido | JSON remoto malformado ou schema mínimo inválido | Mensagem clara sem vazar payload sensível. |

### 5.5 Operação: Executar escrita autenticada de dados FlowBoard

**Finalidade:** gravar JSON ou blob no repositório configurado pela sessão segura preservando SHA e conflito GitHub.

**Request:**

```text
path: string
kind: "json" | "blob"
content: unknown | base64-string
sha?: string | null
message?: string
```

**Response de sucesso:**

```text
ok: true
sha?: string
```

**Falhas relevantes:**

| Código/Semântica | Condição | Resposta observável |
|---|---|---|
| Não autenticado | Sessão ausente, expirada ou revogada | Reconexão exigida. |
| Sem permissão | Credencial sem permissão de escrita | Mensagem sobre permissão/escopo. |
| Conflito | SHA obsoleto ou edição concorrente | Mantém semântica de conflito e recuperação já esperada pelo produto. |
| Limite de taxa | GitHub limitou requisição | Mensagem com orientação de aguardar quando houver indicação de retry. |
| Falha externa | GitHub indisponível ou erro inesperado | Feedback recuperável sem segredo. |

### 5.6 Operação: Executar exclusão autenticada de dados FlowBoard

**Finalidade:** excluir arquivo de dados ou blob permitido no repositório configurado pela sessão segura.

**Request:**

```text
path: string
sha: string
message?: string
```

**Response de sucesso:**

```text
ok: true
```

**Falhas relevantes:** mesmas regras de autenticação, permissão, não encontrado e falha externa da leitura/escrita.

### 5.7 Idempotência

| Operação | Idempotente? | Comportamento ao reenviar |
|---|---|---|
| Iniciar sessão segura | Parcial | Nova submissão válida deve resultar em uma sessão ativa para o mesmo repositório, podendo substituir a sessão anterior do mesmo usuário/browser. |
| Consultar sessão atual | Sim | Retorna a mesma sessão pública enquanto válida. |
| Encerrar sessão | Sim | Repetições não reativam sessão nem geram erro visível. |
| Leitura autenticada | Sim | Retorna o estado atual do repositório. |
| Escrita autenticada | Condicional | Idempotência depende de `path`, `sha` e conteúdo; conflito por SHA deve continuar explícito. |
| Exclusão autenticada | Condicional | Exclusão com SHA válido remove o arquivo; repetição após remoção pode retornar não encontrado sem vazar segredo. |

---

## 6. Modelo de Dados (delta)

### 6.1 Sessão persistida no browser

| Campo | Tipo | Obrigatório | Descrição / Regra |
|---|---|---|---|
| `owner` | string | Sim | Dono do repositório GitHub validado. |
| `repo` | string | Sim | Nome do repositório GitHub validado. |
| `repoUrl` | string | Sim | Valor normalizado ou original seguro para referência visual. |
| `webUrl` | string | Sim | URL web canônica do repositório. |
| `authenticated` | boolean | Sim | Indica que há sessão segura ativa no momento da emissão. |
| `expiresAt` | ISO-8601 DateTime | Não | Expiração informativa quando houver. |

**Campos proibidos:** `pat`, `token`, `accessToken`, `refreshToken`, `authorization`, `apiBase` controlado pelo usuário, segredo cifrado reversível pela SPA, ou qualquer campo que permita chamar GitHub diretamente.

### 6.2 Credencial segura associada à sessão

| Campo lógico | Tipo | Obrigatório | Descrição / Regra |
|---|---|---|---|
| Identidade da sessão | string opaca | Sim | Referência interna à sessão segura; não deve ser segredo GitHub. |
| Repositório autorizado | `owner/repo` | Sim | Escopo máximo de uso da credencial associada. |
| Estado da credencial | ativa/expirada/revogada | Sim | Determina se chamadas autenticadas podem prosseguir. |
| Criada em | DateTime | Sim | Auditoria mínima. |
| Expira em | DateTime | Recomendado | Limita janela de uso. |

**Observação:** a TSD não define onde ou como essa credencial é armazenada. O contrato obrigatório é que ela não apareça no storage legível por JavaScript nem nos dados de domínio versionados.

**Propriedades mínimas da credencial transitiva:**

- Deve ser escopada ao `owner/repo` validado no estabelecimento da sessão.
- Deve ser revogável por logout ou invalidação equivalente.
- Deve ter expiração ou regra observável de invalidação.
- Não deve ser reutilizável diretamente contra a GitHub API caso seja exposta ao JavaScript por erro.
- Não deve carregar dados de domínio nem virar fonte de verdade de catálogo, boards, cards, horas ou anexos.
- Não deve aparecer em URL, query string, fragment, logs, mensagens de erro ou storage legível por JavaScript.

### 6.3 Dados de domínio

Não há alteração de schema obrigatória para catálogo, boards, cards, horas, anexos ou releases. A feature deve preservar compatibilidade com dados existentes no repositório GitHub.

### 6.4 Necessidade de Migration

- [x] **Sim — migration lógica de sessão local:** sessões legadas contendo PAT devem ser removidas de `localStorage` e `sessionStorage`; o usuário deve reconectar.
- [ ] **Não há migration.**

**Nota de escopo:** a decisão principal de migration é "Sim" porque há limpeza obrigatória de sessão local legada. Não há migration de dados de domínio: boards, cards, horas, catálogo, releases e anexos permanecem no schema atual e no repositório GitHub configurado.

---

## 7. Critérios de Aceite

### 7.1 Caminho Feliz

- **CA01** Deve conectar com repositório GitHub válido e PAT autorizado, exibindo o shell autenticado com identificação do repositório.
- **CA02** Deve persistir apenas metadados não secretos da sessão no browser após login bem-sucedido.
- **CA03** Deve manter o usuário autenticado após reload quando a sessão segura ainda estiver válida.
- **CA04** Deve carregar e salvar dados FlowBoard no mesmo repositório GitHub configurado, sem alterar o schema de domínio.
- **CA05** Deve preservar os fluxos existentes de leitura, escrita, conflito por SHA, anexos e horas sob a nova fronteira segura.

### 7.2 Segurança de Sessão e Storage

- **CA06** Deve provar que `localStorage`, `sessionStorage` e storage state E2E não contêm PAT, token GitHub bruto, header `Authorization` ou segredo equivalente após login.
- **CA07** Deve provar que o modelo de sessão recebido por componentes autenticados não contém `pat`.
- **CA08** Deve remover sessão legada com PAT em `localStorage` e tratar o usuário como desconectado.
- **CA09** Deve remover sessão legada com PAT em `sessionStorage` e tratar o usuário como desconectado.
- **CA10** Deve limpar metadados locais de sessão e invalidar a sessão segura no logout.
- **CA11** Deve manter logout idempotente: múltiplos cliques ou chamadas repetidas não devem reativar sessão nem exibir erro indevido.

### 7.3 Fronteira de Chamadas GitHub

- **CA12** Deve provar que chamadas autenticadas após login não enviam PAT diretamente da SPA para `https://api.github.com`.
- **CA13** Deve provar que a SPA não consegue construir um cliente GitHub autenticado a partir de PAT persistido, porque o PAT não está disponível no estado restaurado.
- **CA14** Deve bloquear tentativa de usar sessão segura para repositório diferente do repositório validado.
- **CA15** Deve preservar falhas 401/403/404/409/429 como feedback claro e sem segredo.

### 7.4 Caminhos de Erro e Validação

- **CA16** Deve exibir erro de URL inválida sem contatar a fronteira segura.
- **CA17** Deve exibir erro de PAT ausente antes de tentar estabelecer sessão.
- **CA18** Deve exibir erro de PAT inválido ou expirado sem ecoar o valor informado.
- **CA19** Deve exibir erro de permissão insuficiente sem sugerir que o repositório foi alterado.
- **CA20** Deve retornar ao login ou pedir reconexão quando a sessão segura expirar.
- **CA21** Deve não imprimir secrets em mensagens de erro, console de produção, payloads de erro ou artefatos de teste.

### 7.5 Governança e Evidência

- **CA22** Deve atualizar, substituir ou deprecar ADRs que afirmam PAT persistido no browser ou chamadas GitHub diretas pela SPA.
- **CA23** Deve manter cobertura unitária relevante acima da meta do repositório nas áreas alteradas.
- **CA24** Deve incluir teste E2E ou equivalente automatizado para ausência de PAT em storage após login, reload e logout.
- **CA25** Deve documentar o risco residual de PAT digitado no formulário enquanto OAuth completo não for adotado.

### 7.6 Matriz RF x CA

| RF | Critérios de aceite principais |
|---|---|
| RF01 | CA02, CA06, CA08, CA09 |
| RF02 | CA07, CA13 |
| RF03 | CA01, CA16, CA17, CA18, CA19 |
| RF04 | CA04, CA05, CA12 |
| RF05 | CA12, CA13 |
| RF06 | CA03, CA06, CA20 |
| RF07 | CA10, CA11 |
| RF08 | CA08, CA09 |
| RF09 | CA15, CA18, CA19, CA21 |
| RF10 | CA04, CA05 |
| RF11 | CA06, CA08, CA09, CA10, CA24 |
| RF12 | CA12, CA14, CA15 |
| RF13 | CA22, CA25 |

---

## 8. Fora de Escopo

- Implementar OAuth GitHub completo como obrigação da primeira entrega — motivo: o state declara OAuth completo como não obrigatório para a primeira entrega e a feature foca a fronteira segura para o fluxo atual com PAT.
- Suporte a GitHub Enterprise, `apiBase` customizado, subdomínios GitHub ou provedores Git alternativos — motivo: o MVP mantém suporte restrito a `github.com` para reduzir variação de contrato e risco de autenticação.
- Rotacionar, revogar ou administrar o PAT original na conta GitHub do usuário — motivo: a aplicação não controla a conta GitHub do usuário nem o ciclo de vida externo do token original.
- Mover dados de domínio FlowBoard para banco de dados próprio, storage de servidor ou qualquer fonte de verdade fora do repositório GitHub configurado — motivo: a Constitution II e a arquitetura vigente preservam o GitHub como fonte de verdade dos dados de domínio.
- Alterar regras funcionais de quadro, cards, horas, releases, busca, anexos ou arquivamento além do necessário para adaptar a autenticação — motivo: o objetivo é reduzir exposição de credencial sem mudar comportamento de produto.
- Criptografia local reversível pelo próprio JavaScript da SPA como substituto de fronteira segura — motivo: isso manteria o segredo recuperável pelo mesmo ambiente ameaçado por XSS.
- Garantir proteção contra XSS durante a digitação inicial do PAT — motivo: enquanto PAT manual existir, a v1.1 reduz persistência e uso contínuo, mas não elimina a exposição no momento de entrada.
- Criar política de auditoria detalhada, painel administrativo de sessões ou gestão multiusuário — motivo: esses controles ampliam o produto para governança operacional não solicitada nesta feature.

---

## 9. Requisitos Não Funcionais

### 9.1 Segurança

- O PAT não pode existir em storage persistente ou restaurável acessível a JavaScript após conexão.
- O PAT não pode aparecer em URL, query string, fragment, JSON de domínio, logs, mensagens de erro, storage state de teste ou payloads retornados ao cliente.
- Sessões seguras devem ser revogáveis no logout.
- Sessões seguras devem ser escopadas ao repositório validado na conexão.
- Falhas devem ser fail-closed: sessão inválida, adulterada, expirada ou legada com PAT deve resultar em usuário desconectado.

### 9.2 Usabilidade

- O fluxo de login deve continuar compreensível para usuário que já conhece URL do repositório e PAT.
- Mensagens de erro devem explicar ação provável: revisar token, revisar permissão, reconectar ou tentar novamente.
- Reload não deve pedir novo login quando a sessão segura ainda estiver válida.

### 9.3 Compatibilidade

- Dados existentes do FlowBoard no repositório GitHub devem permanecer compatíveis.
- Sessões legadas com PAT não devem ser migradas silenciosamente; devem ser limpas e exigir reconexão.
- Testes E2E que usam credenciais de ambiente podem continuar fornecendo PAT ao fluxo de login, mas o storage resultante não pode persistir esse PAT.

### 9.4 Operabilidade

- A fronteira segura deve preservar mapeamento reconhecível de erros GitHub para o app.
- Limite de taxa e indisponibilidade do GitHub devem continuar tratados como dependência externa recuperável.
- Erros inesperados devem ser redigidos antes de chegar ao usuário ou a artefatos de teste.

---

## 10. Perguntas em Aberto e Assunções

### 10.1 Assunções não bloqueantes

| Assunção | Default aplicado | Justificativa | Impacto se estiver errada |
|---|---|---|---|
| Migração de sessão legada | Remover PAT e forçar reconexão | É o comportamento mais seguro e evita reusar PAT já persistido por JavaScript. | Se produto exigir migração sem relogin, será preciso nova decisão de contrato e risco explícito. |
| OAuth completo | Fora da primeira entrega | O state da feature declara OAuth completo como não obrigatório na primeira entrega. | Se OAuth for exigido, muda o fluxo de login e esta TSD precisa revisão. |
| Dados de domínio | Permanecem somente no GitHub | Constitution II e ADR-001 exigem GitHub como fonte de verdade. | Se houver backend de dados, é mudança arquitetural maior e requer ADR nova. |
| Exposição durante digitação do PAT | Risco residual aceito na primeira entrega | Sem OAuth, o usuário ainda digita PAT no formulário. A feature reduz persistência e uso contínuo. | Se o risco for inaceitável, OAuth ou fluxo equivalente deve entrar no escopo. |

### 10.2 Decision Register resumido

| Decisão | Tipo | Evidência | Status |
|---|---|---|---|
| Remover PAT da sessão persistida | Decisão de contrato | Critérios da feature e conflito com ADR-004 | Resolvido pelo escopo da feature. |
| Deixar de chamar GitHub diretamente com PAT da SPA | Decisão de contrato | Critérios da feature | Resolvido pelo escopo da feature. |
| Sessão legada com PAT: reconectar em vez de migrar silenciosamente | Default seguro | Critério permite reconexão ou reemissão; reconexão minimiza exposição | Default documentado, não bloqueante. |
| OAuth obrigatório ou não | Decisão de produto | State marca OAuth completo fora de obrigação da primeira entrega | Resolvido como fora de escopo da primeira entrega. |
| GitHub Enterprise/apiBase customizado | Decisão de produto/segurança | State e segurança anterior mantêm fora de escopo | Resolvido como fora de escopo. |
| Atualizar ADRs | Governança | Constitution III, state da feature, ADR-001 e ADR-004 | Obrigatório antes de merge. |

Não há decisão bloqueante pendente para o planner nesta versão da TSD.

---

## 11. Handoff para o Planner

O planner deve transformar esta TSD em um plano que entregue, de ponta a ponta:

1. Sessão pública do FlowBoard sem PAT ou segredo GitHub exposto.
2. Fronteira segura para estabelecer, consultar e encerrar sessão.
3. Fronteira segura para operações autenticadas de leitura, escrita e exclusão de dados FlowBoard no GitHub.
4. Migração fail-closed de sessões legadas em `localStorage` e `sessionStorage`.
5. Preservação dos dados de domínio no repositório GitHub configurado.
6. Mapeamento redigido de erros de autenticação, autorização, não encontrado, conflito, limite de taxa e falha externa.
7. Testes unitários e E2E cobrindo ausência de PAT em storage, reload, logout, sessão legada e ausência de chamada direta com PAT da SPA para GitHub.
8. Atualização, substituição ou depreciação das ADRs que hoje autorizam PAT persistido e chamadas diretas da SPA.

### 11.1 Cobertura explícita RF -> bloco planejável

| RF | Bloco planejável esperado |
|---|---|
| RF01 | Sessão persistida sem segredo GitHub. |
| RF02 | Modelo público de sessão sem PAT para telas autenticadas. |
| RF03 | Estabelecimento de sessão segura a partir de repositório e PAT informado pelo usuário. |
| RF04 | Fronteira segura para leituras, escritas e exclusões autenticadas no GitHub. |
| RF05 | Remoção de chamada direta da SPA para GitHub com `Authorization: Bearer <PAT>` após login. |
| RF06 | Restauração pós-reload dependente apenas de sessão segura válida. |
| RF07 | Logout com limpeza local e invalidação da capacidade autenticada. |
| RF08 | Migration lógica fail-closed de sessões legadas com PAT. |
| RF09 | Mensagens de erro redigidas para autenticação, autorização e falhas externas. |
| RF10 | Compatibilidade dos documentos de domínio existentes no GitHub. |
| RF11 | Evidência automatizada de ausência de PAT em storage. |
| RF12 | Evidência automatizada da fronteira de chamadas autenticadas. |
| RF13 | Atualização, substituição ou depreciação de ADR-001 e ADR-004 antes de merge. |

### 11.2 Estado para planejamento

| Item | Contagem / status |
|---|---|
| RFs | 13 |
| Critérios de aceite | 25 |
| Assunções não bloqueantes documentadas | 4 |
| Decisões bloqueantes pendentes | 0 |
| Bloqueios para planner | 0 |
| Migration principal | Sim — migration lógica de sessão local |
| Migration de dados de domínio | Não aplicável |
| ADRs obrigatórias | ADR-001 e ADR-004 |

**Pontos de atenção para planejamento:**

- Não introduzir armazenamento autoritativo de dados de domínio fora do GitHub.
- Não tratar criptografia local reversível pela SPA como solução equivalente à fronteira segura.
- Não deixar sessão legada com PAT sobreviver ao primeiro carregamento pós-feature.
- Garantir que qualquer credencial transitiva seja revogável e escopada ao repositório validado.
- Registrar explicitamente o risco residual do PAT durante a digitação enquanto OAuth completo permanecer fora de escopo.

---

## 12. Metadados

| Campo | Valor |
|---|---|
| Documento | Technical Specification Document |
| Feature | Fronteira segura para token GitHub |
| Slug | `secure-github-token-boundary` |
| Versão | v1.1 |
| Data | 2026-04-24 |
| Autor/agente | CodeSteer `spec` |
| Revisão de origem | `spec-reviewer-feature.md` com veredicto "REVISÃO OBRIGATÓRIA" sobre v1.0 |
| State de origem | `state.yaml` |
| Track | FEATURE |
| Status | Draft revisado para `spec-reviewer` |
| Confiança | 88/100 |
| Complexidade | L |
| RFs | 13 |
| Critérios de aceite | 25 |
| Assunções não bloqueantes | 4 |
| Decisões bloqueantes pendentes | 0 |
| Bloqueios para planner | 0 |
| Migration principal | Sim — migration lógica de sessão local |
| Migration de domínio | Não aplicável |
| ADRs afetadas | ADR-001 e ADR-004 |
| Próximo responsável | `spec-reviewer`; se aprovado, `architect`/`planner` conforme pipeline do state |

### 12.1 Histórico de revisão

| Versão | Data | Mudança |
|---|---|---|
| v1.0 | 2026-04-24 | TSD inicial da feature. |
| v1.1 | 2026-04-24 | Corrige seção de metadados, decisão de migration, semântica/status observável, fora de escopo justificado, handoff RF01-RF13, âncoras de falhas, matriz RF x CA, propriedades da credencial transitiva e referências a ADR-001/ADR-004. |
