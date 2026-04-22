# Task breakdown — Página dedicada de cards arquivados

> **Origem do plano:** `.memory-bank/specs/archived-cards-page/planner-feature.md` (IPD v1.0)  
> **TSD de referência:** `spec-feature.md` v1.1  
> **Revisão de plano:** `plan-reviewer-feature.md` (aprovado)  
> **Complexidade (IPD):** M  
> **Geração:** `task-breakdown` — artefato de execução, sem código nem comandos

---

## Resumo

| Campo | Valor |
|--------|--------|
| Total de tasks | 6 |
| Ordem lógica | Página e paridade → integração na shell → remoção no canvas/estilos → E2E → fecho DoD |
| Ficheiro IPD rastreado | `planner-feature.md` §1–10 |

**Nota (plan-reviewer):** Em `AppShell.tsx`, `useNavigate` pode já existir; a integração exige `useLocation` e ramificação do `<main>` conforme IPD §4.3.

---

## T1 — Criar página de arquivados e (opcional) ficheiros de apoio

- **Status:** PENDENTE
- **Objetivo:** Disponibilizar a vista dedicada com lista, estados e acções alinhados ao `BoardView` actual, com paridade de persistência, tempo, erros 409, invalidação de cache de busca e acessibilidade.
- **Insumos (IPD):** §1 Missão, §3 DoD (RF02–RF04, RF05 empty, RF06 indireto na página N/A, RF08, INV-NAV01 preparação, a11y), §4.1–4.2 fluxos 1–3 e 6, §4.3 CRIAR, §5 Guardrails, §7.2 A3
- **Caminhos (repo):**
  - `apps/flowboard/src/features/board/ArchivedCardsPage.tsx` (obrigatório)
  - `apps/flowboard/src/features/board/useBoardDocumentForBoard.ts` (ou nome equivalente) — *opcional, recomendado no IPD para paridade*
  - `apps/flowboard/src/features/board/ArchivedCardsPage.css` — *opcional, se estilos não ficarem inline/outro ficheiro existente*
- **Dependências:** nenhuma
- **Entregável:** Componente de página (e, se criados, hook e CSS) que implementa empty state sem `selectedBoardId`, carregamento e erro alinhados ao padrão do quadro, lista com `isCardArchived` e `sortArchivedByDefault`, restaurar e excluir com o mesmo efeito que a linha de base, botões com `disabled` coerente com `saving`, região de lista com nome acessível, reconciliação de tempo/intervalo conforme decisão de implementação (hook partilhado ou equivalente documentado no PR).
- **Check de conclusão (DoD da task):**
  - Ficheiro principal `ArchivedCardsPage.tsx` presente e exportando a superfície necessária à shell.
  - Comportamento e mensagens de erro 409 e PT alinhados ao padrão actual do quadro, sem duplicar semântica divergente de exclusão/restaurar/tempo.
  - Pós-persistência: coerente com a necessidade de `onBoardPersisted` / limpeza de cache de busca tal como no quadro (paridade A3).
- **Riscos / atenção:** Drift de lógica em relação a `BoardView` se a extracção for omitida; intervalo de reconciliação de tempo só na página de arquivados (IPD §4.2 passo 6).

---

## T2 — Integrar rota e shell (`AppShell`)

- **Status:** PENDENTE
- **Objetivo:** Servir a página de arquivados na rota bookmarkable, com navegação explícita com quadro seleccionado, retorno à raiz ao usar abas Quadro/Horas quando a URL for a de arquivados, e sem alterar o contrato da busca.
- **Insumos (IPD):** §3 DoD (RF02, RF05, RF07, INV-NAV01), §4.2 fluxos 4–5, §4.3 MODIFICAR `AppShell`, §2.3 `SearchModal` inalterado, §5 Guardrails, §10 tabela (abordagem `useLocation` + `path="*"` default)
- **Caminhos (repo):**
  - `apps/flowboard/src/features/app/AppShell.tsx`
  - `apps/flowboard/src/App.tsx` — *apenas se* for necessário adoptar `Outlet` ou rotas aninhadas; *por defeito sem alteração* (IPD §4.3)
- **Dependências:** T1 (componente de página disponível)
- **Entregável:** Conteúdo de `<main>` condicionado ao pathname (ex. `/archived` conforme A1) renderizando `ArchivedCardsPage` com as props requeridas; link ou controlo visível com `data-testid` estável quando houver `selectedBoardId`; ao seleccionar abas Kanban/Horas, navegação para o index/base se a rota actual for a de arquivados; `SearchModal` e `onSelectResult` sem redirecção obrigatória para arquivados; desfecho de layout do `<main>` em rota de arquivados coerente (evitar `className` ambígua, sugestão S1 do plan-reviewer).
- **Check de conclusão (DoD da task):**
  - Rota de arquivados acessível com URL estável e integrada à shell existente com uma instância de `AppShell` (evitar duplicação de layout).
  - Navegação “Arquivados” (ou equivalente claro) visível com quadro activo; sem quadro, a rota leva a empty state da página, não a lista cruzada.
  - Trocar o quadro no selector com a rota de arquivados aberta leva a recarregar/reflectir o novo quadro (INV-NAV01).
- **Riscos / atenção:** Duas instâncias de `AppShell`; perda de `mainView` se a roteirização for incorrecta; não alterar `App.tsx` sem necessidade.

---

## T3 — Remover listagem de arquivados do canvas e actualizar microcopy de arquivar

- **Status:** PENDENTE
- **Objetivo:** Cumprir RF01, INV-UI01 e RF06: canvas só colunas e activos; texto de `handleArchiveCard` a referir gestão na página de arquivados, não “zona” no canvas.
- **Insumos (IPD):** §3 DoD RF01, RF06, §4.3 MODIFICAR `BoardView`, TSD R-COPY01
- **Caminhos (repo):**
  - `apps/flowboard/src/features/board/BoardView.tsx`
- **Dependências:** T1 e T2 podem ser concluídos em paralelo a nível de código, mas a remoção da secção só é coerente após a rota e a página estarem integrados; **recomendado após T2** para o utilizador nunca perder acesso à gestão de arquivados.
- **Entregável:** Secção `fb-archived`, toggle, `archivedExpanded` e listagem removidos; `useMemo` e estado associados removidos se deixarem de ser referenciados; `handleUnarchiveCard`, `handleDeleteCard`, `handleArchiveCard` mantidos para colunas/modais; `window.confirm` (ou equivalente) em `handleArchiveCard` actualizado (RF06); nenhum `archived-section-toggle` no canvas; canvas conforme DnD/modais existentes.
- **Check de conclusão (DoD da task):**
  - Não existe render da secção de arquivados no `BoardView` (revisão do componente: zero referências activas de UI removida, excepto comentários se existirem).
  - Cópia de arquivar não descreve destino numa “zona” abaixo das colunas; alinha à lista/página de arquivados.
- **Riscos / atenção:** Não apagar lógica partilhada ainda usada por modais ou fluxos; não tocar `SearchModal` nem `cardSearch`.

---

## T4 — Ajustar estilos: remover ou relocalizar `fb-archived*`

- **Status:** PENDENTE
- **Objetivo:** Evitar CSS morto no canvas e manter aparência da nova lista onde os estilos forem parcialmente reutilizados.
- **Insumos (IPD):** §4.3 MODIFICAR `BoardView.css`, CRIAR opcional `ArchivedCardsPage.css`, §8 protocolo (verificação de `fb-archived` no canvas)
- **Caminhos (repo):**
  - `apps/flowboard/src/features/board/BoardView.css`
  - `apps/flowboard/src/features/board/ArchivedCardsPage.css` — *se T1 tiver criado este ficheiro*
- **Dependências:** T3 (estrutura DOM do `BoardView` final)
- **Entregável:** Regras `.fb-archived*` removidas ou movidas de `BoardView.css` para o destino correcto; sem estilos órfãos que assumam a secção no canvas; consistência visual da lista de arquivados na nova página.
- **Check de conclusão (DoD da task):**
  - `BoardView.css` deixa de conter regras necessárias apenas à secção removida, ou estão neutralizadas sem efeito residual no canvas.
  - Lista na página dedicada com estilos adequados (ficheiro da página ou equivalente alinhado ao TSD §9).
- **Riscos / atenção:** Não quebrar outros selectores partilhados no mesmo ficheiro.

---

## T5 — Actualizar E2E de card-archive

- **Status:** PENDENTE
- **Objetivo:** Substituir interacção com a secção colapsável por navegação à rota e selectores `data-testid` da nova superfície; manter a cobertura de fluxo: arquivar → lista → busca e badge → modal → restaurar → card no quadro; cobrir empty sem quadro e regressão de ausência do toggle.
- **Insumos (IPD):** §3 DoD (testes), §6, §2.1 E2E, §4.3 `card-archive.spec.ts`, TSD CA-AC01–AC11 (onde aplicável a UI)
- **Caminhos (repo):**
  - `apps/flowboard/tests/e2e/card-archive.spec.ts`
- **Dependências:** T1, T2, T3, T4 (comportamento e testids estáveis)
- **Entregável:** Suite E2E actualizada: rotas e selectores alinhados ao path final; asserções em `archived-row-*` ou testids expostos em `ArchivedCardsPage`; cenário de `/archived` sem quadro; remoção de dependência a `archived-section-toggle` no canvas; manutenção de passos de busca e modal sem exigir deep-link forçado.
- **Check de conclusão (DoD da task):**
  - Cenário feliz (IPD §6.2) coberto pela nova navegação.
  - Cenário negativo empty e regressão (sem toggle no canvas) explícitos ou equivalentes.
  - Referências a testids removidos do DOM actualizadas em todo o pacote de testes do `apps/flowboard/tests` (revisão coordenada para não deixar apontadores órfãos).
- **Riscos / atenção:** Frágil com GitHub real; manter títulos únicos e timeouts conforme práticas existentes da suíte.

---

## T6 — Fechar Definition of Done e verificações finais (sem alteração de código além de correccões mínimas)

- **Status:** PENDENTE
- **Objetivo:** Garantir que todos os itens de §3 do IPD, guardrails, paridade 409, RF07/RF08, a11y, qualidade e testes afectados estão verificados; aplicar o protocolo de auto-correção do IPD §8.
- **Insumos (IPD):** §3 DoD completo, §5, §6, §7 riscos, §8 protocolo, §9 entrega
- **Caminhos (repo):** nenhum novo — apenas confirmação transversal; correções pontuais só se necessário para fechar itens pendentes **dentro** do mapa aprovado (ficheiros já listados em T1–T5).
- **Dependências:** T1, T2, T3, T4, T5
- **Entregável:** Checklist concluída: board sem secção de arquivados; rota e lista com paridade; navegação e empty; microcopy RF06; busca e modal sem regressão (ficheiros não tocados: `SearchModal`, `cardSearch`); hours não afectado só por visitar arquivados; compilação e análise estática do pacote `flowboard` sem regressões introduzidas no escopo; testes afectados verdes; verificação de ausência de `archived-section-toggle` e de secção `fb-archived` no `BoardView` (conforme protocolo de auto-correção do IPD §8); PR com descrição alinhada a §9.
- **Check de conclusão (DoD da task):**
  - Todos os quadrados de §3 DoD do IPD justificadamente assinalados.
  - Nenhum delta de schema ou ficheiro da lista NÃO TOCAR (excepto imports necessários) violado.
  - Rastreio em PR: remoção no canvas, nova rota, localização do link, actualização de E2E; se houver hook, uma frase sobre contrato (IPD §9).
- **Riscos / atenção:** Não alargar escopo; não introduzir dependências npm novas; não forçar redirecção da busca.

---

## Matriz de rastreabilidade

| Task | Secções do IPD | Caminhos / áreas (repo) | DoD / teste relacionado |
|------|----------------|-------------------------|-------------------------|
| T1 | §1, §3 (RF02–5,8, a11y), §4.1–4.2, §4.3 CRIAR, §5, §7.2 A3 | `ArchivedCardsPage.tsx`, opc. `useBoardDocumentForBoard.ts`, opc. `ArchivedCardsPage.css` | RF02–4, empty RF05, RF08 base, A3; TSD CA-AC03, AC04, AC06-8, AC11 (paridade) |
| T2 | §3, §4.2 (4–5), §4.3 `AppShell`, default `App.tsx` | `AppShell.tsx`, `App.tsx` só se Outlet | RF02, RF05, RF07, INV-NAV01; TSD 5.1, CA-AC02, AC05-8 |
| T3 | §3 RF01, RF06, §4.3 `BoardView` | `BoardView.tsx` | RF01, RF06, INV-UI01; TSD R-COPY01, CA-AC01, AC09 |
| T4 | §4.3 `BoardView.css` + CRIAR CSS | `BoardView.css`, `ArchivedCardsPage.css` (se existir) | UI consistente; verificação §8 para `fb-archived` no canvas |
| T5 | §3 testes, §6, §4.3 E2E | `tests/e2e/card-archive.spec.ts` | §6.2; regressão toggle; TSD CA-AC10 |
| T6 | §3, §5, §6–9 | transversal; ficheiros do mapa se correções mínimas | DoD pleno; §8; build/lint/suites do pacote |

---

## Metadados (pipeline)

```json
{
  "agent": "task-breakdown",
  "status": "success",
  "ipd_source": ".memory-bank/specs/archived-cards-page/planner-feature.md",
  "total_tasks": 6,
  "complexity": "M",
  "blocked_tasks": 0,
  "blockers": [],
  "task_md_path": ".memory-bank/specs/archived-cards-page/task-breakdown-feature.md"
}
```
