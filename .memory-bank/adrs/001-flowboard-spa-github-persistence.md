# ADR-001: FlowBoard — SPA cliente + persistência exclusiva via GitHub API

**Status:** Aceito  
**Data:** 2026-04-19  
**Feature de origem:** personal-kanban  
**Autores:** architect (EPIC)

---

## Contexto

O produto FlowBoard deve armazenar quadros, cards e segmentos de tempo em JSON num repositório GitHub privado do usuário, sem backend gerenciado pelo fornecedor (PRD / TSD). É necessário decidir a topologia de implantação: app web que fala diretamente com a GitHub API versus backend intermediário.

## Decisão

Decidimos implementar **aplicação web (SPA) executando no navegador** que persiste **somente** via **GitHub REST API** autenticada com **PAT** fornecido pelo usuário, sem serviço próprio de dados entre o cliente e o GitHub no MVP.

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
- ⚠️ PAT no cliente exige disciplina de armazenamento e mitigação de XSS (ver ADR-004)
- ⚠️ Limites de rate e disponibilidade da `api.github.com` são dependência dura

## Atualização 2026-04-25 (BFF, ADR-009)

O browser **não** envia o PAT diretamente à `api.github.com` quando a aplicação adota **ADR-009**; o **mesmo *deploy* do produto** inclui um processo *server-side* (BFF) que retém o segredo e proxya chamadas. Isto **não** contradiz a ausência de *backend de dados* do fornecedor: o BFF **não** persiste quadros fora do GitHub; apenas sessão cifrada e tráfego autenticado. O trade-off *“PAT no cliente”* em **ADR-001** deixa de ser exigido após a transição; ver **ADR-009** e **ADR-004** (estado *superseded* parcial).

## Guardrails derivados desta decisão

- **G1:** Nenhuma persistência de domínio FlowBoard fora do repositório GitHub configurado na sessão, salvo caches transitórios opcionais descritos em ADR futuro.
- **G2:** Integrações com GitHub devem usar contratos e erros tratados conforme TSD (`spec-epic.md` §5.4).

## Status de vigência

- **Aceito** — em vigor desde 2026-04-19, aplica-se ao MVP FlowBoard a partir de `personal-kanban`.
