# ADR-004: FlowBoard — Sessão e armazenamento do PAT no MVP

**Status:** Aceito  
**Data:** 2026-04-19  
**Feature de origem:** personal-kanban  
**Autores:** architect (EPIC)

---

## Contexto

RF02–RF03 e NFR de segurança exigem validar PAT, manter sessão e remover credenciais no logout, sem vazar token em URLs ou JSON de dados (TSD). É preciso escolher onde guardar o PAT entre reloads de página.

## Decisão

Decidimos, no **MVP**:

- Persistir **PAT** e metadados mínimos da sessão em **`sessionStorage`** (escopo por aba), com opção documentada de evoluir para `localStorage` cifrado ou Web Crypto em release posterior.
- **Nunca** escrever PAT em query string, fragment ou arquivos `flowboard/**`.
- Exibir avisos de segurança in-app conforme RF14 (texto derivado do TSD, não do ADR).

## Alternativas Consideradas

| Alternativa | Por que foi descartada no MVP |
|-------------|--------------------------------|
| `localStorage` em claro | Maior janela de exposição em disco; aceitável só com criptografia ou com risco explícito ao usuário |
| Memória apenas (sem reload) | UX ruim; reload perde sessão |
| Service Worker com vault | Complexidade desproporcional ao MVP |

## Consequências

**Positivas:**
- ✅ PAT não sobrevive a fechamento do browser (reduz superfície)
- ✅ Implementação simples alinhada a online-first

**Trade-offs aceitos:**
- ⚠️ Usuário precisa relogar se fechar todas as abas; aceitável para MVP dev
- ⚠️ XSS no origin do app ainda pode acessar `sessionStorage` — mitigação é CSP + higiene de dependências (IPD)

## Guardrails derivados desta decisão

- **G7:** Código de persistência GitHub deve ler PAT apenas de camada de sessão aprovada (adapter injetado), nunca de globais públicas.
- **G8:** Logout deve apagar chaves de sessão conhecidas e invalidar estado em memória.

## Status de vigência

- **Aceito** — em vigor desde 2026-04-19; revisar antes de Fase 2 offline-first.
