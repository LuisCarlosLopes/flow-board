# ADR-001: FlowBoard — SPA cliente + persistência exclusiva via GitHub API

**Status:** Aceito  
**Data:** 2026-04-19  
**Feature de origem:** personal-kanban  
**Autores:** architect (EPIC)
**Atualização 2026-04-24:** parcialmente supersedida pela `ADR-009` para a fronteira de credenciais e transporte autenticado

---

## Contexto

O produto FlowBoard deve armazenar quadros, cards e segmentos de tempo em JSON num repositório GitHub privado do usuário, sem backend gerenciado pelo fornecedor (PRD / TSD). É necessário decidir a topologia de implantação: app web que fala diretamente com a GitHub API versus backend intermediário.

## Decisão

Decidimos implementar **aplicação web (SPA) executando no navegador** que persiste **somente** via **GitHub REST API** autenticada com **PAT** fornecido pelo usuário, sem serviço próprio de dados entre o cliente e o GitHub no MVP.

> **Trecho supersedido pela `ADR-009`:** a autenticação e o transporte autenticado não ocorrem mais diretamente do browser para `https://api.github.com`. O FlowBoard agora usa uma fronteira same-origin (`/api/*`) para guardar o PAT fora do JavaScript do cliente, mantendo o GitHub apenas como fonte de verdade dos dados `flowboard/**`.

## Alternativas Consideradas

| Alternativa | Por que foi descartada |
|-------------|-------------------------|
| BFF / API própria em cloud | Introduz hospedagem, custo, multi-tenant e contradiz premissa de “dados só no repo do usuário” sem ganho obrigatório no MVP |
| GitHub OAuth App sem PAT manual | Melhor UX futura; aumenta escopo (app registration, redirect URIs); explicitamente Fase 2 no PRD |
| Electron desktop | PRD prioriza web desktop-first; empacotamento nativo é Fase 2 / fora do MVP atual |

## Consequências

**Positivas:**
- ✅ Alinhamento direto com RF13 e modelo de custo zero de infra para o produto
- ✅ Menos superfície operacional (sem servidor de app a proteger)

**Trade-offs aceitos:**
- ⚠️ Este trade-off foi substituído pela `ADR-009`: o PAT deixou de ser persistido no cliente, mas o runtime same-origin passou a fazer parte do deployment autenticado.
- ⚠️ Limites de rate e disponibilidade da `api.github.com` são dependência dura

## Guardrails derivados desta decisão

- **G1:** Nenhuma persistência de domínio FlowBoard fora do repositório GitHub configurado na sessão, salvo caches transitórios opcionais descritos em ADR futuro.
- **G2:** Integrações com GitHub devem usar contratos e erros tratados conforme TSD (`spec-epic.md` §5.4).

## Status de vigência

- **Aceito com supersessão parcial** — o princípio “GitHub como fonte de verdade dos dados” continua vigente; a topologia “browser fala autenticado direto com GitHub” foi substituída pela `ADR-009`.
