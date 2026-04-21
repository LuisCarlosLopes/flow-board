# IPD — Endurecimento de segurança da SPA (pós-revisão)

**Track:** TASK  
**Slug:** `security-hardening-mvp`  
**Data:** 2026-04-21  
**Baseline:** `main`  
**Origem:** Itens da revisão de segurança (PAT/sessão, `apiBase`, hostname, CSP, parsers JSON, logging).

---

## 1. Contexto e restrições

- **Modelo MVP:** sem backend; PAT e metadados em `sessionStorage` (ADR-004). XSS continua sendo classe de risco aceita com mitigação por CSP + higiene — **não** resolvida só com código de sessão.
- **Constitution III:** alterações materiais em tratamento de sessão/PAT exigem **ADR atualizado** antes do merge.
- **Stack:** Vite 8 + React 19; CSP deve ser compatível com `type="module"` e, idealmente, com `npm run dev` (ver decisão D4).

---

## 2. Objetivo da entrega

Reduzir superfície explorável **sem** mudar o modelo de produto (ainda PAT no browser):

1. Impedir que `apiBase` adulterado no `sessionStorage` direcione o header `Authorization` para host não autorizado.
2. Corrigir validação de hostname “somente GitHub” para rejeitar sufixos tipo `evilgithub.com`.
3. Adicionar defesa em profundidade no browser (CSP e, se possível na mesma entrega, meta tags mínimas).
4. Endurecer validação de JSON remoto (`catalog` / board) nos limites de persistência.
5. Opcional de baixo esforço: reduzir vazamento de detalhes via `console.error` em fluxos de UI.

---

## 3. Decisões de desenho (propostas)

### D1 — Allowlist de `apiBase`

- **Valor único no MVP:** `https://api.github.com` (normalizado: sem barra final, comparar após `new URL` ou string fixa).
- **Comportamento em `loadSession`:** se `apiBase` ausente ou inválido, **retornar `null`** e **remover** a chave `flowboard.session.v1` (fail-closed), forçando novo login — evita silenciosamente apontar para API errada.
- **`createClientFromSession`:** pode assumir sessão já normalizada **ou** reaplicar allowlist (defesa em profundidade). Preferir uma função única `normalizeOrInvalidateSession(raw): FlowBoardSession | null` usada por `loadSession`.

*Extensão futura (fora do escopo):* GitHub Enterprise exige segundo valor na allowlist + validação de `hostname` do repo; só com HITL e ADR.

### D2 — Hostname do repositório (`parseRepoUrl`)

- Rejeitar hostnames que não sejam exatamente `github.com` **ou** subdomínios controlados documentados.
- **MVP recomendado:** aceitar **apenas** `github.com` (rejeitar `www.github.com`, `gist.github.com`, etc., a menos que o produto queira suportar — hoje o chip/webUrl normalizam para `https://github.com/owner/repo`).
- Implementação sugestiva: após `new URL`, exigir `hostname === 'github.com'` **ou** (se produto exigir) `hostname === 'www.github.com'` com redirect canônico — **default do IPD:** só `github.com`.

### D3 — Validação de JSON (`parseCatalog` / `parseBoard`)

- **Catalog:** garantir `boards[]` com entradas que tenham `boardId`, `title`, `dataPath` strings não vazias (ajustar às invariantes reais do app).
- **Board:** além de `schemaVersion` e `boardId`, validar presença de estruturas mínimas que `BoardView` / domínio assumem (ex.: `columns`, `cards` arrays — conferir `BoardDocumentJson` em `types.ts` e falhar com erro claro se malformado).
- Objetivo: **fail-fast** em dados corrompidos ou hostis no repo, não silencioso `as` cast.

### D4 — CSP e cabeçalhos

- **Preferência:** CSP via meta tag em `index.html` para ambientes estáticos; documentar que **deploy** atrás de CDN pode duplicar/reforçar com headers.
- **Conteúdo mínimo típico:** `default-src 'self'`; `script-src 'self'` (Vite build emite scripts com hash ou nomes estáveis — validar em `npm run build` e inspecionar `dist/index.html`); `style-src 'self' 'unsafe-inline'` **somente se** inevível com CSS-in-JS/CSS modules (preferir restringir se o bundle não exigir); `font-src` incluir `https://fonts.gstatic.com`; `style-src` pode precisar `https://fonts.googleapis.com` se usar link stylesheet externo.
- **Dev:** se meta CSP quebrar HMR, **alternativa aceita neste TASK:** CSP aplicada só em build (plugin Vite que injeta meta só em `production`) — registrar no ADR como trade-off.

### D5 — Logging

- Substituir `console.error('...', e)` por mensagem genérica + opcional `import.meta.env.DEV` para detalhe, ou helper único `logClientError(context, err)`.

### D6 — Riscos residuais (comunicar no ADR)

- PAT ainda legível a JS na origem; mitigação futura: OAuth/proxy.
- Extensões do browser podem ler storage — mitigação é educação do usuário (já parcialmente no onboarding).

---

## 4. Mapa de alterações

| Área | Arquivo | Alteração |
|------|---------|-----------|
| Sessão | `apps/flowboard/src/infrastructure/session/sessionStore.ts` | Allowlist `apiBase`; normalização/fail-closed no load; possivelmente export constante `GITHUB_API_BASE`. |
| Sessão | `apps/flowboard/src/infrastructure/session/sessionStore.test.ts` | Casos: JSON com `apiBase` evil; sessão válida preservada. |
| URL | `apps/flowboard/src/infrastructure/github/url.ts` | Hostname estrito; função auxiliar `isAllowedGitHubWebHost(hostname)`. |
| URL | `apps/flowboard/src/infrastructure/github/url.test.ts` | `evilgithub.com`, `github.com.evil.com`, happy paths. |
| Cliente | `apps/flowboard/src/infrastructure/github/fromSession.ts` | Opcional: assert/ normalização (se sessão puder vir de outro call site no futuro). |
| Persistência | `apps/flowboard/src/infrastructure/persistence/boardRepository.ts` | Endurecer `parseCatalog` / `parseBoard`. |
| Persistência | `apps/flowboard/src/infrastructure/persistence/boardRepository.test.ts` | JSON malformado; golden válido. |
| CSP | `apps/flowboard/index.html` e/ou `vite.config.ts` | Meta CSP ou injeção condicional `production`. |
| UI | `CreateTaskModal.tsx`, `SearchModal.tsx`, `useClipboard.ts` | Logging redigido (se aprovado no escopo). |
| Governança | `.memory-bank/adrs/004-flowboard-session-and-pat-storage.md` | Nova subseção: validação de `apiBase`, hostname, CSP; ou ADR filho com referência cruzada. |

---

## 5. Critérios de pronto (DoD)

- [ ] Nenhum caminho de código usa `session.apiBase` sem passar pela allowlist após reload.
- [ ] `parseRepoUrl('https://evilgithub.com/o/r')` retorna erro, não resolução válida.
- [ ] Build de produção abre a shell sem violações CSP bloqueantes nos recursos usados (fonts, scripts, styles).
- [ ] `parseCatalog` / `parseBoard` rejeitam objetos com campos críticos ausentes ou tipos errados; testes cobrem pelo menos um caso negativo cada.
- [ ] ADR atualizado; `state.yaml` marca entrega concluída com histórico.
- [ ] `npm test` + `npm run build` em `apps/flowboard` verdes.

---

## 6. Ordem sugerida de implementação

1. Constante allowlist + `loadSession` fail-closed + testes.  
2. `parseRepoUrl` hostname + testes.  
3. Parsers `boardRepository` + testes.  
4. CSP (validar dev e build).  
5. Logging opcional.  
6. ADR.  
7. `code-reviewer` + `tester` (cobertura).

---

## 7. Gate HITL pré-implementer

**Decisões fixadas (2026-04-21):**

- **D2:** apenas `hostname === 'github.com'` (rejeita `www` e typosquat `*github.com`).  
- **D4:** CSP **somente** no artefato de build de produção (plugin Vite; `dev` sem meta CSP).  
- **D3:** validação **mínima** em `parseCatalog` / `parseBoard` (tipos e campos obrigatórios).

**Pacote mínimo para aprovação:** este IPD + `task.md` (task-breakdown) alinhados.

---

## 8. Pós-entrega

- Atualizar `state.yaml`: `status: concluído`, `summary` com arquivos tocados e limites conhecidos.  
- Se CSP ficar só em produção, registrar dívida técnica opcional: alinhar headers no hosting.
