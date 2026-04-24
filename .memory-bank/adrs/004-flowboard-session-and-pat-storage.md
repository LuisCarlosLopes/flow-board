# ADR-004: FlowBoard — Sessão e armazenamento do PAT no MVP

**Status:** Aceito  
**Data:** 2026-04-19  
**Feature de origem:** personal-kanban  
**Autores:** architect (EPIC)
**Atualização 2026-04-24:** supersedida pela `ADR-009` para sessão, armazenamento do PAT e boundary de autenticação

---

## Contexto

RF02–RF03 e NFR de segurança exigem validar PAT, manter sessão e remover credenciais no logout, sem vazar token em URLs ou JSON de dados (TSD). É preciso escolher onde guardar o PAT entre reloads de página.

## Decisão

Decidimos, no **MVP inicial**:

- Persistir **PAT** e metadados mínimos da sessão em **`sessionStorage`** (escopo por aba), com opção documentada de evoluir para `localStorage` cifrado ou Web Crypto em release posterior.
- **Nunca** escrever PAT em query string, fragment ou arquivos `flowboard/**`.
- Exibir avisos de segurança in-app conforme RF14 (texto derivado do TSD, não do ADR).

> **Trecho supersedido pela `ADR-009`:** o PAT não é mais persistido em `sessionStorage` nem `localStorage`. O browser mantém apenas metadados públicos de sessão; a credencial passa a viver no vault server-side atrás de cookie `HttpOnly`.

## Alternativas Consideradas

| Alternativa | Por que foi descartada no MVP |
|-------------|--------------------------------|
| `localStorage` em claro | Maior janela de exposição em disco; aceitável só com criptografia ou com risco explícito ao usuário |
| Memória apenas (sem reload) | UX ruim; reload perde sessão |
| Service Worker com vault | Complexidade desproporcional ao MVP |

## Consequências

**Positivas:**
- ✅ Histórico do MVP registrado
- ⚠️ Mantido apenas como contexto de decisão original; não descreve mais o runtime atual

**Trade-offs aceitos:**
- ⚠️ Usuário precisa relogar se fechar todas as abas; aceitável para MVP dev
- ⚠️ XSS no origin do app ainda pode acessar `sessionStorage` — mitigação é CSP + higiene de dependências (IPD)

## Guardrails derivados desta decisão

- **G7:** Substituído pela `ADR-009`: o browser não pode restaurar nem expor PAT.
- **G8:** Logout continua obrigatório, mas agora deve revogar a sessão no BFF e expirar o cookie `HttpOnly`.

## Atualização 2026-04-21 (endurecimento pós-revisão)

- **Sessão legada:** qualquer `flowboard.session.v1` contendo `pat` ou `apiBase` deve ser removida *fail-closed*; a aplicação exige reconexão segura.
- **URL do repositório (MVP):** somente host **`github.com`** exato (sem `www`, sem sufixos tipo `evilgithub.com`).
- **CSP:** meta `Content-Security-Policy` é injetada **somente no build de produção** (`vite build`), não no `dev`, para não quebrar HMR; reforço via headers no CDN/host permanece recomendado.
- **JSON remoto (`flowboard/`):** validação **mínima** no carregamento de `catalog.json` e documentos de board (tipos e campos obrigatórios), com falha explícita se o conteúdo estiver malformado.

## Status de vigência

- **Supersedida pela `ADR-009`** — manter apenas como histórico do MVP inicial.
