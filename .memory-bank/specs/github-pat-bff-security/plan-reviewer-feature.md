# Plan Review — github-pat-bff-security (IPD v1.0)

**Data:** 2026-04-25 | **Revisor:** plan-reviewer (relatório auxiliar; subagente indisponível)  
**Artefato:** `planner-feature.md`

## Veredicto

**Verde — GO** com notas

**Score de qualidade do IPD:** 80/100

## Camada estrutural

- Alinhamento TSD × ARD × IPD: **OK** (BFF, iron-session, estrangular cliente).
- DoD: **verificável**; inclui testes, lint, README, ADRs.
- Mapa de alterações: **concreto** (paths, fases, ordem).

## Camada de consistência

- M1 (Medium): a opção `POST .../invoke` (RPC) vs rotas finas ainda **aberta**; o IPD deixa a escolha ao *implementer* — **aceitável** se o *task.md* exigir *commit* numa tarefa única (T*).
- M2 (Low): produção: processo Node + static — o IPD lista alternativas; **HITL** pode pedir *uma* opção fechada antes de deploy.

## Camada de acurácia com o repo

- `GitHubContentsClient` reutilizável no Node: **plausível** (fetch + classe existente).
- `bootstrapFlowBoardData` a partir do servidor: exige `GitHubContentsClient` no BFF no login — **correto**; confirmar se há dependência de *window* nesse caminho (grep no *implementer*).

## Go / No-Go

- **GO** para `task-breakdown` e depois HITL antes de `implementer`.

## Ações recomendadas (não bloqueantes)

- Fechar na *task* de desenho de API: **uma** de: RPC `invoke` **ou** conjunto de rotas espelhadas, antes de tocar toda a UI.

---

## Addendum 2026-04-25 — Validação Vercel

O IPD foi **auto-corrigido**: a Fase D não pressupõe mais um único processo Node *always-on* em produção. **Obrigatório** alinhar com **Vercel Serverless (Node)** + `vercel.json` + pasta `api/`, conforme **ADR-009** e **architect-feature** v1.1. O veredicto **Verde — GO** mantém-se com esta adenda como **restrição de implementação**.
