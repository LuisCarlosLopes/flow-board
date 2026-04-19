# Implementation Plan Document — FlowBoard MVP

> **Versão:** v1.0 | **Slug:** personal-kanban | **Data:** 2026-04-19  
> **Base:** `spec-epic.md`, `architect-epic.md`, ADR-001–005, `prototype_reference`  
> **Confiança:** 82/100 | **Complexidade:** XL  
> **Estado do repo:** greenfield — raiz sem `package.json`; tudo sob `apps/flowboard/` será **criado**.

---

## 1. Missão

Implementar **FlowBoard**: SPA React+TS+Vite em `apps/flowboard/`, domínio puro testável, cliente GitHub Contents com SHA (ADR-005), sessão PAT em `sessionStorage` (ADR-004), persistência em `flowboard/catalog.json` + `flowboard/boards/<boardId>.json` (ADR-002), UI alinhada ao protótipo **sem** busca global, notificações, favoritos ou sistema de labels no MVP (ADR-003, `spec-reviewer` [A4]).

**Critério de sucesso:** fluxos RF02–RF14 demonstráveis contra repositório GitHub real de teste; testes Vitest no domínio ≥ casos da matriz RF (§6); matriz RF×teste preenchida (lacuna [A2] do spec-reviewer).

---

## 2. Estado do sistema

### 2.1 Zona de trabalho

| Área | Ação |
|------|------|
| `apps/flowboard/` | **CRIAR** — app completo |
| `.memory-bank/specs/personal-kanban/prototypes/` | **LER** — referência visual apenas |
| `_codesteer/`, `.cursor/` | **NÃO TOCAR** |

### 2.2 Stack fixada (IPD)

- **Runtime:** React 19 + TypeScript 5  
- **Build:** Vite 6  
- **Testes:** Vitest + Testing Library (componentes críticos)  
- **HTTP:** `fetch` encapsulado  
- **DnD:** `@dnd-kit/core` + `@dnd-kit/sortable` (ou equivalente acessível)  
- **Roteamento:** React Router 7  

### 2.3 Contratos externos

- GitHub REST: `GET/PUT /repos/{owner}/{repo}/contents/{path}` com `Authorization: Bearer <PAT>`  
- Normalização URL repo: TSD §5.1 + ADR-002 paths  

---

## 3. Definition of Done (DoD)

- [ ] Login valida PAT contra API; erros 401/403/404 com mensagens claras  
- [ ] Logout limpa `sessionStorage` e estado em memória  
- [ ] Catálogo + arquivos de quadro criados/atualizados com SHA; 409/429 tratados (ADR-005)  
- [ ] Colunas respeitam P01–P02; edição rejeita estado inválido (V01)  
- [ ] Movimento de card aplica R01–R06; totais no card (RF10)  
- [ ] Tela horas: dia/semana/mês + escopo quadro atual; **“Todos os quadros”** se entregue no MVP ou corte documentado (RF12)  
- [ ] **Não** shippar: busca topbar funcional, notificações, favoritos, labels/tags persistidos  
- [ ] Matriz RF×teste (§6) atualizada com evidência  
- [ ] `README` em `apps/flowboard/` com setup PAT escopos mínimos e aviso de segurança (RF14)  

### 3.1 Edge cases obrigatórios nos testes

- Em progresso → Backlog: segmento descartado (R03)  
- Backlog → Concluído direto: sem segmento (R04)  
- Reordenação dentro de Em progresso: não reinicia timer (R06)  
- Conflito 409: pelo menos um fluxo de retry/recuperação  
- Período relatório: conclusão do segmento dentro do intervalo (R09)  

---

## 4. Especificação de entrega

### 4.1 Contrato interno principal

- `GitHubContentsClient`: `getJsonPath(path)`, `putJsonPath(path, body, sha)`  
- `SessionStore`: get/set/clear PAT + `owner/repo/apiBase`  
- `boardReducer` / funções puras: `applyColumnEdit`, `applyCardMove`, `projectHours(boards, period, scope)`  

### 4.2 Fluxo de execução (ordem)

1. Bootstrap Vite+React+TS em `apps/flowboard/`  
2. `domain/*` + testes Vitest (regras tempo + colunas)  
3. `infrastructure/github/*` + testes com **mock fetch**  
4. `features/auth` — login/logout UI + integração real API  
5. `features/board` — lista quadros, canvas Kanban, CRUD card, DnD, colunas (modais)  
6. `features/hours` — relatório + filtros  
7. Polimento acessível, README, matriz RF×teste  

### 4.3 Mapa de alterações (CRIAR)

| Caminho | Propósito |
|---------|-----------|
| `apps/flowboard/package.json` | Manifesto |
| `apps/flowboard/vite.config.ts` | Build |
| `apps/flowboard/tsconfig.json` | TS strict |
| `apps/flowboard/index.html` | Entry |
| `apps/flowboard/src/main.tsx` | Bootstrap React |
| `apps/flowboard/src/app/routes.tsx` | Rotas shell |
| `apps/flowboard/src/domain/types.ts` | Tipos Board, Column, Card, Segment |
| `apps/flowboard/src/domain/boardRules.ts` | P01–V02 |
| `apps/flowboard/src/domain/timeEngine.ts` | R01–R06, totais |
| `apps/flowboard/src/domain/hoursProjection.ts` | R09, escopos |
| `apps/flowboard/src/domain/*.test.ts` | Vitest |
| `apps/flowboard/src/infrastructure/github/url.ts` | Normalização repo URL |
| `apps/flowboard/src/infrastructure/github/client.ts` | Cliente Contents |
| `apps/flowboard/src/infrastructure/github/boardRepository.ts` | Catálogo + boards |
| `apps/flowboard/src/features/auth/LoginView.tsx` | Login |
| `apps/flowboard/src/features/board/BoardView.tsx` | Kanban |
| `apps/flowboard/src/features/hours/HoursView.tsx` | Relatório |
| `apps/flowboard/src/ui/AppShell.tsx` | Topbar estilo protótipo (sem busca real) |
| `apps/flowboard/README.md` | Setup |

**Modificar:** nenhum arquivo de produto existente fora de `apps/flowboard/` (exceto opcional `package.json` na raiz se monorepo com workspaces — **decisão:** monorepo simples com workspace opcional; se não usar workspaces, apenas `apps/flowboard/package.json`).

---

## 5. Guardrails

- **G-A:** Nenhum PAT em JSON commitado em `flowboard/**` (ADR-002 G3)  
- **G-B:** Toda escrita GitHub com SHA (ADR-005 G9)  
- **G-C:** Regras P/R não duplicadas só em JSX (ADR-003 G5)  
- **G-D:** Protótipo: não implementar escopo [A4] sem PRD  

---

## 6. Testes

| Área | Tipo | Cobertura alvo |
|------|------|----------------|
| `domain/*` | Vitest unitário | ≥90% linhas domínio |
| `github/client` | Vitest + mock `fetch` | 401, 409, 429 |
| Fluxo crítico | Playwright (opcional pós-MVP) | — |

### 6.1 Matriz RF × teste (mínimo)

| RF | Evidência |
|----|-----------|
| RF01 | Teste E2E manual ou snapshot: título FlowBoard visível |
| RF02–RF03 | Teste integração mock + manual PAT sandbox |
| RF05–RF08 | Unit + UI básica |
| RF09–RF10 | `timeEngine.test.ts` |
| RF11–RF12 | `hoursProjection.test.ts` |
| RF13 | `boardRepository` mock 409 |
| RF14 | README + presença de copy no Login (smoke) |

---

## 7. Riscos e dependências

- **Repo vazio:** primeiro commit pode precisar criar `flowboard/` via API — documentar no README  
- **RF12 marginal:** se atrasar, registrar corte em `CHANGELOG` e TSD cross-link  

---

## 8. Fora deste IPD

- CI/CD, deploy estático, domínio customizado  
- OAuth GitHub App  
- Offline queue  

---

## 9. Metadados

```json
{
  "planner": "ok",
  "confidence": 82,
  "ipd_path": ".memory-bank/specs/personal-kanban/planner-epic.md",
  "greenfield": true
}
```
