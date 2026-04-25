# ADR-009: FlowBoard — Sessão com PAT fora do browser (BFF + cookie cifrado)

**Status:** Aceito  
**Data:** 2026-04-25  
**Feature de origem:** github-pat-bff-security  
**Autores:** architect (FEATURE)

---

## Contexto

O TSD *github-pat-bff-security* e o guia `docs/Protegendo PAT GitHub em Next.js.md` exigem **defesa em profundidade**: o PAT do GitHub **não** pode permanecer acessível a JavaScript de página via Web Storage após o login. O **ADR-004** tinha validado, para o MVP, persistência do PAT em `sessionStorage` (evoluindo para `localStorage`), o que continua **vulnerável a XSS** no origin.

Constitution **III** manda superfície mínima e **ADR** antes de merge quando o tratamento de PAT/sessão muda.

## Decisão

Decidimos introduzir uma **camada de aplicação servidor** (*Backend-for-Frontend*, BFF) **no mesmo produto e deploy** que entrega a SPA Vite, responsável por:

1. **Receber** o PAT **uma única vez** no fluxo de login (HTTPS), **validar** o token (acesso ao repositório + verificação de escopos conforme TSD) e **selar** a sessão com **criptografia autenticada (AEAD)** em **cookie `HttpOnly`**, com `Secure` em produção e `SameSite` restritivo (`Lax` mínimo; `Strict` se o deploy permitir sem quebrar fluxos).
2. **Nunca** devolver o PAT à SPA nem persistir o PAT em `localStorage` / `sessionStorage` / `document.cookie` legível por script.
3. **Encaminhar** as chamadas à **GitHub REST API** **somente a partir do processo servidor**, com o PAT apenas em memória de requisição (ou destravado do cookie imediatamente antes do `fetch` server-side).
4. **Expor** à SPA **endpoints same-origin** (prefixo sugerido no TSD: `/api/flowboard/...`) que substituem o uso direto de `GitHubContentsClient` com `Authorization: Bearer <PAT>` no browser, exceto para a fase de transição / migração documentada no IPD.
5. Usar a biblioteca **`iron-session`** (ou equivalente com **seal/unseal** AEAD e API estável no runtime Node) para o **payload opaco** do cookie, com **segredo de serviço** (`SESSION_SECRET` ou nome alinhado ao IPD) com **≥ 32 caracteres aleatórios**, nunca com prefixo de exposição ao cliente (análogo a `NEXT_PUBLIC_*`).

## Alternativas Consideradas

| Alternativa | Por que foi descartada |
|-------------|-------------------------|
| **Migrar o front para Next.js (App Router + Server Actions)** | Cumpre o guia “literalmente”, mas o repositório é Vite+React; custo e risco de migração fora do escopo do TSD (§8 FE05). |
| **Manter PAT só em memória SPA (sem reload)** | UX inaceitável; reload perde sessão. |
| **localStorage cifrado com chave no JS** | Chave acessível a XSS; não resolve a classe de ameaça alvo. |
| **Sessão server-side em Redis/Postgres** | Operação e custo adicionais; sem requisito de invalidação centralizada além do cookie; reavaliar se o produto crescer além de *stateless* cookie. |
| **GitHub OAuth App (sem PAT colado)** | Melhor UX e modelo de ameaça diferente; **fora de escopo** do TSD atual (OAuth explícito). |
| **Apenas Vercel Edge Runtime para o BFF** | `iron-session` e a pilha criptográfica usada assentam no **Node.js**; Edge imporia reimplementação ou outra lib — **excluído** até reavaliação explícita. |

## Consequências

**Positivas:**

- PAT **não** fica no modelo de ameaça “script lê `localStorage`”.
- Uma barreira clara: **BFF** + **DTOs** reduzem vazamento acidental de cabeçalhos/JSON brutos.
- Alinhado ao guia de referência (BFF, cookie HttpOnly, validação de escopos no servidor).

**Trade-offs aceitos:**

- Hospedagem exige **código a correr no servidor** com runtime compatível com `iron-session` e `fetch` à API GitHub. **Não** basta *static file hosting* puro: são necessárias **Serverless Functions** (ou processo long-lived noutro host — ver abaixo).
- Latência: **+1** hop (browser → origin → GitHub) por operação; em *serverless* há ainda *cold start* esporádico.
- Desenvolvimento: **dois** processos locais (Vite + API) ou *proxy* no `vite.config` — paridade de contratos com produção.

## Guardrails derivados desta decisão

- **G-009-1:** Nenhum bundle cliente pode importar ou receber o PAT em respostas de `/api/flowboard/*` após o login, salvo fase de migração com bandeira e prazo zero — ver IPD.
- **G-009-2:** Segredo de selagem **apenas** em variável de ambiente de servidor; rotação = novo deploy com novo segredo e forçar re-login.
- **G-009-3:** Chamadas a `https://api.github.com` com credencial **apenas** em módulos que executam no servidor (Node), **não** em `client.ts` usado por componentes de UI após a transição completa.
- **G-009-4:** Manter allowlist de **host** do repo e **apiBase** conforme ADR-004/segurança (origem API oficial) no BFF.
- **G-009-5:** Logout: invalidar cookie de sessão e, *best effort*, limpar chaves legadas `flowboard.session.v1` no browser se ainda existirem.
- **G-009-6 (Vercel):** Handlers do BFF que executam `iron-session` / cifradeira no stack escolhido **devem** usar **Node.js** no *deploy* Vercel; **não** migrar esses caminhos para **Edge Runtime** sem ADR que substitua a pilha criptográfica.

## Relação com ADRs anteriores

- **ADR-001:** Continua válido o princípio de **dados de domínio só no repositório GitHub do utilizador**; a camada BFF **não** introduz repositório de dados do produto. A redação *“cliente fala com GitHub”* passa a ser **“browser fala com o origin; o origin (BFF) fala com GitHub”** — ver *Atualização* em ADR-001.
- **ADR-004:** A decisão de guardar o PAT em Web Storage fica **supersedida** para implementações que adotam ADR-009; requisitos de `apiBase`, hostname e validação JSON **permanecem** onde aplicáveis.

## Plataforma de alojamento: Vercel (obrigatório para o desenho atual)

O produto **corre na Vercel**; a arquitetura BFF abaixo **deve** ser válida nesse *runtime*, sem depender de um daemon Node contínuo alocado *só* para FlowBoard (que a Vercel **não** oferece no modelo padrão de aplicação front+API).

1. **Produção:** as rotas `/api/...` são **Vercel Serverless Functions** com **Node.js runtime** (*not* Edge para handlers que usam `iron-session` / cifradeira alinhada ao guia de referência do stack atual). O *build* estático da SPA (Vite `dist/`) e as funções partilham o **mesmo domínio** de *deployment*, o que mantém *same-origin*, cookies `HttpOnly` e políticas `SameSite` coerentes.
2. **Configuração:** `SESSION_SECRET` (e segredos semelhantes) entram em **Project → Settings → Environment Variables** (Production / Preview / Development), **nunca** no cliente. O *Root Directory* do projeto na Vercel deve apontar para o app (p.ex. `apps/flowboard` no monorepo) para que a pasta de funções e o *output* do Vite fiquem coerentes.
3. **Limites *serverless*:** cumprir o *timeout* e o tamanho de payload admitidos no plano; chamadas longas à API GitHub podem exigir `maxDuration` (quando disponível) ou quebrar em operações menores no IPD. Isto **não** muda a decisão de segurança, apenas o dimensionamento.
4. **Local *dev*:** continua a ser aceitável um processo Node (Hono/Express) na máquina do programador, com o Vite a fazer *proxy* de `/api` — equivalente de contrato às funções de produção, mas **a implementação** deve tratar o *handler* de forma reutilizável (ex. export do núcleo importado por `api/xxx.ts` e pelo servidor de desenvolvimento).

## Status de vigência

- **Aceito** — em vigor desde 2026-04-25 para a feature *github-pat-bff-security* e sucessores que mantiverem o mesmo modelo de ameaça.
- **Atualização 2026-04-25 (Vercel):** plataforma de alojamento explícita e restrição de *runtime*; auto-correção de redação que pressupunha “um único processo Node em produção” *always-on*.
