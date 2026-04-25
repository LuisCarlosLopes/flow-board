# TSD: Proteção do PAT GitHub (sessão server-side e BFF) — v1.0

> **Status:** Draft  
> **Autor:** spec v1.0 (orquestrador; subagente `spec` indisponível por quota — conteúdo alinhado ao template TSD e exploração do repositório) | **Data:** 2026-04-25  
> **Confiança:** 76/100 | **Complexidade:** L

---

## 1. VISÃO GERAL

**Problema que resolve:**  
O Personal Access Token (PAT) do GitHub é uma credencial de alto privilégio. Hoje o FlowBoard persiste o PAT no **navegador** (objeto de sessão serializado em **`localStorage`**, chave `flowboard.session.v1`, com migração legada a partir de `sessionStorage`), o que o coloca na mesma classe de risco que **Web Storage** descrita no guia de referência: qualquer XSS com execução no origin pode ler o segredo. O MVP anterior documentou esse trade-off em **ADR-004**; a evolução exige **reduzir a superfície** alinhando-se a *defense in depth*: **não** tratar o PAT como dado durável acessível a JavaScript de página após o login, e **centralizar** chamadas autenticadas à API GitHub num **limite server-side** (padrão BFF), em linha com os princípios do documento `docs/Protegendo PAT GitHub em Next.js.md` (transporte seguro, repouso cifrado em cookie **HttpOnly**, verificação de escopos no servidor, DTOs que não vazam campos sensíveis).

**Comportamento principal:**  
Após a entrega, o utilizador continua a indicar URL do repositório e PAT na experiência de **ligação ao GitHub**, mas o sistema **não** mantém o PAT em `localStorage` / `sessionStorage` / `document.cookie` legível por script de página para fins de sessão. A credencial é **validada no servidor**, persistida apenas num **mecanismo de sessão aprovado** inacessível a JS de página (ex.: cookie **HttpOnly** com carga **cifrada**), e **todas** as operações que hoje envolvem `Authorization: Bearer <PAT>` diretamente no browser passam a ser **mediadas** por um **backend da aplicação** (BFF) que detém o segredo só em memória de processo durante o manuseamento da requisição. O **logout** deve invalidar essa sessão no mesmo sentido em que hoje `clearSession` apaga chaves de storage.

**Ator principal:**  
Utilizador humano que se autentica no FlowBoard com PAT + URL de repositório; o **cliente** (SPA) e o **servidor** (camada BFF) como atores técnicos do fluxo.

---

## 2. CONTEXTO DO SISTEMA

### 2.1 Entidades existentes relevantes

| Entidade / tipo | Campos / estrutura relevantes | Papel na feature |
|-------------------|-------------------------------|-------------------|
| `FlowBoardSession` (`sessionStore.ts`) | `pat`, `repoUrl`, `owner`, `repo`, `apiBase`, `webUrl` | **Substituída / descontinuada na forma atual** — o campo `pat` **não** pode permanecer no modelo de sessão exposto ao browser em claro ou em JSON legível em Web Storage. |
| `GitHubContentsClient` / adaptadores GitHub | Token em memória no cliente para `fetch` à API | **Modificada conceitualmente** — origem do token para chamadas à API GitHub deve ser **servidor** (ou exceção documentada e rastreável). |
| Dados de domínio (`flowboard/*` JSON) | Sem PAT | **Sem mudança de conteúdo** — RF de não persistir credencial em ficheiros de dados permanece. |

### 2.2 “Endpoints” hoje (SPA puro)

N/A no sentido REST service-side — o cliente chama **diretamente** `https://api.github.com` (ou base oficial forçada). A feature introduz **novas operações** no **mesmo origin** da app para sessão e proxy; **não** altera a semântica dos JSON em `flowboard/`.

| Origem | O que faz hoje | Impacto |
|--------|----------------|--------|
| Navegador | `fetch` GitHub com PAT em memória vinda de `loadSession().pat` | Deixa de ser o caminho permitido para tráfego autenticado, salvo fase de transição explicitamente fora de escopo. |

### 2.3 Regras e decisões existentes (Constitution, ADR, trabalho anterior)

- **Constitution III:** credenciais e sessão com **superfície mínima**; alterações em PAT/sessão exigem **ADR** antes de merge.
- **ADR-004:** no MVP, PAT em `sessionStorage` (e texto sobre evolução). **Atualização 2026-04-21** reforçou `apiBase`, hostname, CSP. O documento de decisão **deve ser revisto/substituido** se o PAT **deixar** de residir em Web Storage; não é possível cumprir esta feature sem **nova decisão de arquitetura** (substituir ou deprecar o trecho de “persistir em sessionStorage”/storage web para o PAT).
- **Guia `docs/Protegendo PAT GitHub em Next.js.md`:** referência de **princípios** (tabela *localStorage/sessionStorage/cookies*; *Server Actions* e CSRF no Next; *iron-session* / AEAD; *Route Handlers* como BFF; *DAL* e DTOs; rate limit/401/403; segredos só em variáveis de ambiente de servidor, **nunca** `NEXT_PUBLIC_*` equivalente). O FlowBoard **não** usa hoje o App Router do Next.js; o TSD mapeia **conceitos** (HttpOnly+selo cifrado, BFF, validação de escopos) para **requisitos verificáveis** sem exigir Next.js.

### 2.4 Estado implementado hoje (código)

- `apps/flowboard/src/infrastructure/session/sessionStore.ts`: lê/grava `flowboard.session.v1` em **`localStorage`**, com migração de `sessionStorage` → `localStorage`. Inclui `pat` no JSON.
- `LoginView`: validação inicial ainda ocorre no cliente com o PAT antes de guardar sessão.
- `README` / cópia de marketing podem ainda mencionar “só sessionStorage” — alinhamento documental é consequência pós-ADR, não RF desta spec.

---

## 3. REQUISITOS FUNCIONAIS

**RF01 — Eliminar repouso do PAT em Web Storage (sessão de produto)**  
O sistema **não** deve persistir o PAT do utilizador em `localStorage`, `sessionStorage` nem em cookies acessíveis a JavaScript, **após** a conclusão bem-sucedida do fluxo de estabelecimento de sessão (ver §5). (Durante a digitação no formulário, o segredo transita em memória do processo de UI como hoje, até submissão.)

**RF02 — Estabelecimento de sessão no servidor**  
O sistema deve aceitar a URL do repositório e o PAT **numa operação processada no servidor** do mesmo *deploy* que serve a SPA, validar acesso (equivalente a `verifyRepositoryAccess` / bootstrap) **no servidor** ou por componente de confiança **sem** repatriar o PAT para o bundle cliente, e emitir/renovar a sessão (cookie de sessão **HttpOnly** com carga cifrada ou mecanismo com **garantia equivalente** documentada no ADR).

**RF03 — BFF / proxy para API GitHub**  
O sistema deve permitir que as operações da aplicação que hoje requerem cabeçalho `Authorization` com PAT contra `api.github.com` sejam **executadas através** da camada servidor (BFF), de modo que o **browser** não envie o PAT à API GitHub e não precise armazená-lo fora do cofre de sessão server-side.

**RF04 — Logout**  
O sistema deve encerrar sessão destruindo/invalidar o token de sessão no mesmo nível de garantia de **“não restar credencial reutilizável”** que o conjunto (cookie + segredo de selagem) permitir, e **limpar** qualquer artefacto de sessão legada no browser (ex. chave `flowboard.session.v1` se ainda existir por migração).

**RF05 — Compatibilidade de dados**  
O sistema **não** deve escrever PAT nos JSON de `flowboard/` nem em URL; reforço de RF já existente.

**RF06 — Validação de intenção de escopos (servidor)**  
O sistema deve, no estabelecimento de sessão, **inspecionar** se o token tem permissão **suficiente** para o modo de operação do FlowBoard (mínimo necessário alinhado ao guia: PAT clássico via `GET /user` e cabeçalhos de escopos; PAT fine-grained com *permission probing* quando os cabeçalhos não forem conclusivos). Se insuficiente, falhar com **mensagem** compreensível **sem** criar sessão.

**RF07 — Superfície de resposta (DTO)**  
O sistema deve garantir que respostas enviadas ao browser para alimentar a UI **não** incluam o PAT nem chaves de cifradeira raw; dados sensíveis de diagnóstico apenas em canais apropriados (ex. logs de servidor redigidos em produção).

**RF08 — Regressão funcional mínima**  
O sistema deve manter a capacidade de: ligar a um repositório válido, carregar/alterar quadros, e desligar — **percorrendo o novo** modelo de confiança (critérios de aceite em §7).

**RF09 — E2E e testes**  
A suíte de testes (unitários, integração, E2E) deve ser **atualizada** para o novo fluxo: credenciais de teste **não** podem depender de persistir PAT em `storageState` em claro se isso violar RF01; o planner trata *fixtures* (variáveis de ambiente, login via API de teste, etc.).

---

## 4. REGRAS DE NEGÓCIO

### 4.1 Validações

- **[V01]** `repoUrl` resolvida para **apenas** anfitrião permitido (hoje: `github.com` — **mantém** regra de produto do endurecimento anterior, salvo ADR alargando).
- **[V02]** `apiBase` da sessão (se existir no contrato) permanece a **origem oficial** `https://api.github.com` (ou política fechada em ADR; **default:** igual ao comportamento pós-`security-hardening-mvp`).
- **[V03]** Tamanho/formato mínimo do segredo de **selagem** (password)* ≥ requisito da biblioteca criptográfica escolhida (ex. ≥ 32 octetos aleatórios) — *nível "regra de configuração", não "campo de UI"*.

### 4.2 Regras de estado

```
Desconectado → Sessão ativa (servidor) : estabelecimento com PAT válido + escopos OK
Sessão ativa → Desconectado : logout explícito OU falha de autenticação que invalide o cookie
Sessão ativa → Sessão ativa (renovação) : apenas se o produto documentar janela de sessão/rotate (opcional; default: sem requisito além de expiração de cookie)
```

### 4.3 Autorização

- **[A01]** Só o **utilizador do browser** que completou o fluxo de login (mesma origem, mecanismos de proteção a CSRF na camada de estabelecimento de sessão) adquire a sessão — **não** confiar em `Origin` sozinho se o mecanismo escolhido for menos forte que o documentado para Server Actions; **aberta no ADR** se tokens anti-CSRF forem necessários (default: o planner demonstra aderência ao risco do guia).
- **[A02]** Cada requisição BFF carrega **apenas** a identidade da sessão do cookie; o servidor **não** aceita PAT em query/body em rotas *subsequentes* de uso normal (o PAT atravessa **uma** vez, no estabelecimento).

### 4.4 Limites

- **[L01]** Comportamento sob **rate limit** GitHub: mensagens e degradação alinhadas ao guia; **sem** bucles que repitam o PAT em logs.

---

## 5. CONTRATO DE INTERFACE (comportamental)

> Rotas, nomes de módulo e framework são **do planner**. Aqui ficam **obrigações** e **mensagens** observáveis.

### 5.1 `POST` **[camada BFF] `/api/flowboard/session` (ou prefixo canónico do IPD)** — Estabelecer sessão

> **Nota de contrato:** o **path** exato pode ajustar-se no IPD se o mapa de rotas do *deploy* exigir, desde que a semântica e as cargas abaixo sejam preservadas. O default sugerido reflete padrão comum BFF+SPA.

**Request — `Content-Type: application/json`**
```
repoUrl: string   — URL do repositório (formato já aceite por `parseRepoUrl` / regras de host)
pat: string      — Personal Access Token (uma vez; nunca logar nem devolver)
```

**Response (sucesso — `200` ou `204`)**  
Headers: `Set-Cookie: <session>=<selo cifrado>; HttpOnly; Secure (prod); SameSite=...; Path=...; Max-Age=...`  
Body: opcional JSON **não** sensível, ex. `{ "owner": string, "repo": string, "webUrl": string }` — *omitir* se a UI obter tudo de `GET` autenticado.

**Response (falha — mínimo)**

| Código | Condição | Corpo |
|--------|----------|--------|
| `400` | `repoUrl` / `pat` inválidos ou ausentes | `{ "error": string }` |
| `401` / `403` | PAT rejeitado ou escopos insuficientes | `{ "error": string, "code"?: string }` |
| `422` | Bootstrap remoto / GitHub com estado incompatível | `{ "error": string }` |

**Disparo:** submissão do formulário de login.  
**Efeito no browser:** a SPA **não** recebe o PAT; sessão = cookie **HttpOnly**.

### 5.2 `GET|PUT|...` **[camada BFF] `/api/flowboard/github/...` (árvore sob o IPD)** — Proxy para API GitHub

**Request:** Método e subpath alinhados à operação de conteúdo (ex. leitura de ficheiro no repo); **cookie** de sessão HttpOnly; **não** enviar `Authorization: Bearer` do browser.

**Response (sucesso):** `200` com corpo DTO/bytes conforme operação, **sem** cabeçalhos de PAT.

**Response (falha):** `401` se sessão ausente/inválida; `4xx/5xx` mapeados de GitHub de forma **redigida** (sem vazar PAT ou URLs internas sensíveis em excesso).

**Comportamento:** o servidor reabre a sessão, utiliza o PAT **só em memória** face à API GitHub, devolve resultado já filtrado.

### 5.3 `POST` **[camada BFF] `/api/flowboard/session/logout`** — Encerrar sessão

**Request:** cookie de sessão; corpo vazio ou `{}`.

**Response (sucesso — `204` ou `200`):** `Set-Cookie` com expiração do cookie de sessão (ou substituição por valor vazio, conforme política); instrução ao cliente limpar `flowboard.session.v1` se existir.

**Response (falha):** `401` opcional se já não houver sessão (tratar como idempotente).

### 5.4 Idempotência

| Operação | Idempotente? | Nota |
|----------|----------------|------|
| Estabelecer sessão com mesmo PAT reenviado | Pode recriar sessão | Não exigir duplicar recursos; evitar fuga de diffs de PAT no cliente |
| Repetir GET via BFF com cookie válido | Sim | O mesmo resultado lógico para mesma leitura remota |
| Logout | Sim | Segunda chamada é no-op seguro |

---

## 6. MODELO DE DADOS (delta)

### 6.1 Sessão

- O modelo **`FlowBoardSession` no browser não contém `pat`**. Pode conter **identificador opaco** de sessão **ou** nada, se toda a identidade for cookie-only.
- Dados de resolução de repo (`owner`, `repo`, `webUrl`, `repoUrl` conforme necessidade de UI) — **não** sensíveis, persistência conforme ADR (ex. só no servidor, ou re-fetch).

### 6.2 Dados de domínio em GitHub

N/A — **sem** alteração de `catalog.json` / board JSON para esta feature, salvo ajuste documental de versão *só* se o produto exigir (default: **não**).

### 6.3 Migration

- [ ] **N/A** (schema DB)  
- [ ] **Sim** — *migração de **compatibilidade de utilizador**:* sessões existentes com PAT em `localStorage` must be tratadas: **mínimo** — ao carregar a nova versão, o utilizador é **solicitado a logar de novo** (logout limpo) **ou** migrar *uma* vez para o novo fluxo, **sem** persistir o PAT de volta em claro. — Decisão fechada no **plano**; esta spec exige **comportamento** documentado, não a estratégia de rollout detalhada.

---

## 7. CRITÉRIOS DE ACEITE

### 7.1 Happy path

- **[CA01]** Com credenciais válidas, o utilizador completa o login e **há** cookie HttpOnly (ou mecanismo equivalente aprovado) de sessão; a UI passa a operacional sem o PAT acessível via `localStorage`/`sessionStorage` legível pela app.  
- **[CA02]** Operações de leitura/escrita no repositório remoto (equivalente ao que o MVP faz) **functionam** através do BFF.  
- **[CA03]** Logout remove a capacidade de continuar a chamar a API sem reautenticar.

### 7.2 Erro / validação

- **[CA04]** PAT inválido or escopos insuficientes → **sem** sessão, mensagem de erro, **sem** vazar valor do token.  
- **[CA05]** Requisições CORS/CSRF: caminho de estabelecimento de sessão rejeita origens indevidas (comportamento verificável em teste ou análise controlada do planner).

### 7.3 Edge cases

- **[CA06]** Resposta 401/403 do GitHub propagada de forma **segura** (DTO), com caminho de re-login se aplicável.  
- **[CA07]** *storage* antigo: após sucesso, **não** resta PAT usável no storage web antigo, ou a feature documenta a janela e teste cobre a política mínima.

---

## 8. FORA DE ESCOPO

- **FE01** Trocar GitHub.com por *GitHub Enterprise Server* com host de API custom — a menos que o ADR existente alargue allowlist.  
- **FE02** OAuth de aplicação GitHub (fluxo de redirect do GitHub) — pode ser pós-requisito; **não** exigido aqui.  
- **FE03** *Penetration test* de terceiros e certificações.  
- **FE04** Reduzir a superfície XSS **além** das políticas já existentes (CSP) — a squad pode referenciar, mas **implementação** detalhada de CSP fica fora se já coberta.  
- **FE05** Migração do front-end de Vite para Next.js **apenas** para cumprir o guia — o guia é **normativo** em princípios, não em framework.

---

## 9. REQUISITOS NÃO-FUNCIONAIS

### 9.1 Performance

- A latência p95 das operações via BFF **não** deve degrar a UX de forma pior do que 1 ronda extra de rede; se inevitável, exibir *loading* (requisito de produto suave).

### 9.2 Segurança

- PAT **não** em logs de cliente; **não** em *bundle* publicado; **não** `PUBLIC` env prefix para segredos de cifradeira.  
- Segredos de servidor só em **variáveis de ambiente** / secret manager do *deploy*.

### 9.3 Retenção e auditoria

- N/A além de **não** reter PAT em tabelas em claro; se a implementação for *stateful* (DB) para sessões, o ADR deve justificar; **default** alinhado ao guia: preferência **stateless cifrada** no cookie.

### 9.4 Alojamento (Vercel)

- O *deploy* alvo é **Vercel**: ficheiros estáticos da SPA + **Vercel Serverless Functions** com **Node.js runtime** para `/api/*`, *same-origin* com a aplicação, cookies `HttpOnly` e `SESSION_SECRET` nas variáveis de ambiente do projeto (**não** expostas ao cliente).
- **Edge Runtime** **não** é o alvo para handlers que executam `iron-session` / cifradeira equivalente no stack escolhido (ver **ADR-009** G-009-6).
- *Cold start*, limites de duração e de payload por plano são restrições operacionais a dimensionar no IPD, **sem** alterar o contrato de segurança.

---

## 10. PERGUNTAS EM ABERTO (decisões de implementação, não de produto)

A plataforma de alojamento de produção está **fechada** em **Vercel** (§9.4, ADR-009). Permanecem decisões de *detalhe* de implementação no IPD (estrutura exata de `api/`, `vercel.json`, *maxDuration*).

| # | Dúvida residual | Default adotado | Impacto se errado |
|---|-----------------|-----------------|-------------------|
| Q1 | Forma exacta de `vercel.json` / mapeamento `api/*` | Definir no IPD; testar em Preview | Rotas 404 ou SPA a engolir `/api` |
| Q2 | Biblioteca de cifradeira (ex. iron-session vs. alternativas) | Criptografia autenticada, chave fora do cliente | Refactor se troca cedo |

**Decisão consequencial explícita:** **ADR-004** deve ser **atualizado ou substituido** — não é dúvida de copy, é **governança** (Constitution III).

---

## 11. HANDOFF PARA O PLANEJAMENTO (impl-planner / IPD)

```
Escopo para planejamento:

Feature: Proteção do PAT (sessão server-side e BFF)
TSD versão: v1.0
Perguntas bloqueantes: 0
Assunções não bloqueantes documentadas: 2 (hospedagem, biblioteca cifradeira)

O que implementar (resumo):
- RF01–RF04: retirar PAT de Web Storage e introduzir sessão + BFF
- RF05: manter invariants de dados no repositório GitHub
- RF06: validação de escopos no servidor
- RF07: DTOs sem vazamento
- RF08–RF09: regressão e testes

Novos contratos:
- Orquestração de "Estabelecer sessão" e "Proxy GitHub" e "Logout" no mesmo site que serve a SPA; paths/verbos a fixar no IPD

Delta de dados:
- Sessão de browser: sem `pat` em JSON local; serviço: payload cifrado ou credencial fora de DB — conforme IPD/ADR
- DB migration: padrão default **não** requer; sessão *stateful* requer justificação

Fora de escopo: OAuth app, GHE, pentest, migração para Next

Restrições: Constitution III, conformidade com o guia em princípios; aderência à allowlist de API/host já vigente salvo ADR
```

---

## 12. METADADOS

| Campo | Valor |
|-------|--------|
| Confiança | 76/100 |
| Complexidade | L |
| Entidades impactadas | Sessão, cliente GitHub, roteirização de *fetch* |
| Novas operações (lógicas) | 3 (estabelecer sessão, proxy, logout) |
| Requer DB migration | Não (default) |
| Decisões bloqueantes abertas | 0 (ADR-004 a atualizar — é consequência, não dúvida) |
| Versão TSD | v1.0 |

### 12.1 Riscos

- **R1:** Aumento de complexidade de *deploy* (servidor sempre disponível).  
- **R2:** E2E precisa de ajuste de credenciais e talvez *cookie* *partitioning* em testes.  
- **R3:** Regressão de *offline* / PWA, se houver, ao depender de servidor (avaliar no IPD).

### 12.2 Mapeamento guia → requisito (rastreabilidade resumida)

| Tema do guia | Onde cai no TSD |
|--------------|-----------------|
| Não localStorage/sessionStorage para PAT | RF01, §2 |
| HttpOnly, Secure, SameSite | RF02, §4 |
| Validação / escopos no servidor (GET /user, probing fine-grained) | RF06 |
| BFF, não *fetch* com PAT no cliente pós-sessão | RF03, §5.2 |
| Cifradeira (AEAD) e segredo de servidor | RF02, §9.2 |
| DAL/DTO, não vazar payload GitHub bruto | RF07 |
| *Rate limit* e erros 401/403 | §4, CA06 |

---

**Próxima fase (pipeline):** `spec-reviewer` → `architect` (recomendado: decisão BFF + ADR-004) → `planner` → `plan-reviewer` → `task-breakdown` → **HITL** → `implementer` → `verifier` → `code-reviewer` → `tester`.
