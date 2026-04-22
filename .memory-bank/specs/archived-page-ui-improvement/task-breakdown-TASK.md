# Task breakdown — Melhoria visual e de UX da página Arquivados

> **IPD de origem:** `.memory-bank/specs/archived-page-ui-improvement/planner-TASK.md` (**v1.1** — referência de UI: `prototype-archived-page.html`, Sec. 2.5)  
> **Estado de contexto:** `.memory-bank/specs/archived-page-ui-improvement/state.yaml`  
> **Complexidade (IPD):** S  
> **Track:** TASK  
> **Geração:** `task-breakdown` — artefato de execução (sem blocos de código de produto; comandos de verificação listados com permissão do orquestrador)

---

## Resumo executivo

| Campo | Valor |
|--------|--------|
| Objetivo do plano | Refinar `ArchivedCardsPage` com hierarquia tech-dark, metadados só de leitura (`columnId` → label, `archivedAt` pt-BR), CTAs com Restaurar mais proeminente, link explícito ao quadro, lista/estados vazios mais informativos — **estrutura e intenção visual** alinhadas a `prototype-archived-page.html` (área do `main`, não o shell de demo) — sem novo schema. |
| Total de tasks | 5 |
| Estratégia | Fundações de display (helpers) → markup e ações (TSX) → estilos (CSS) → E2E → portão de qualidade (lint/unit/build/E2E). |

---

## Guardrails herdados do IPD

- **Protótipo:** `prototype-archived-page.html` é o guia de markup/estado (toolbar com eyebrow+título+subtítulo, link back, painel com header “Histórico…”, grid de linha, `btn--primary` vs `btn--ghost-danger`, empty + loading com shimmer). Não portar `proto-shell`, tabs de demo, secção `proto-demo` nem dependência de fontes do `<head>` do HTML — mapear para tokens/tipografia do app.
- Não adicionar campos a `Card`, `BoardDocumentJson` ou contratos de persistência; não alterar `AppShell`, `App.tsx`, `cardArchive.ts`, repositório ou tipos de persistência além de leitura.
- Não implementar arquivar/excluir em massa nem tags; não mudar regras de `sortArchivedByDefault` / `isCardArchived` sem bug bloqueante.
- Não remover nem renomear `data-testid` existentes (`archived-page`, `archived-row-*`, `archived-restore-*`, `archived-delete-*`) sem actualizar E2E na mesma entrega; preferir `data-testid` para o atalho “voltar ao quadro” (`archived-back-to-board`).
- Não modificar ficheiros fora do mapa: `ArchivedCardsPage.tsx`, `ArchivedCardsPage.css`, `card-archive.spec.ts`.
- Não usar `any` nem ignorar erros de tipo para formatar datas.

---

## Comandos de verificação (pacote `apps/flowboard`)

Usar a partir da raiz do repositório; repetir conforme a coluna “Quando” de cada task.

| Comando | Uso |
|---------|-----|
| `cd apps/flowboard && pnpm lint` | Estático e pós-alterações TS/CSS |
| `cd apps/flowboard && pnpm test` | Vitest (unit) |
| `cd apps/flowboard && pnpm build` | `tsc` + bundle |
| `cd apps/flowboard && pnpm test:e2e:raw` | Playwright (E2E; requer auth/setup local conforme projecto) |

---

## Sequência de tasks

### T1 — Definir helpers de exibição para coluna e data de arquivamento

- **Status:** CONCLUÍDA
- **Objetivo:** Centralizar, no âmbito da página, a resolução do label de coluna a partir de `doc.columns` e `card.columnId`, e a formatação segura de `archivedAt` em pt-BR, com fallbacks alinhados a Sec. 7.1 / A1–A2 do IPD.
- **Base no IPD:** §4.2 passos 1–2, §3 DoD (funcional + edge cases de coluna/data), §7.2
- **Arquivos:** `apps/flowboard/src/features/board/ArchivedCardsPage.tsx` (apenas funções / constantes locais, sem ainda reestruturar JSX se preferir fazer o mínimo nesta task, ou incluir o uso mínimo necessário para compilar)
- **Dependências:** nenhuma
- **Entregável:** `getColumnLabel` ou `Map` equivalente; `formatArchivedAtForDisplay` (ou nome coerente) com guarda para `undefined` e ISO inválido; fallback visível e acessível quando a coluna não existir (A1: ex. rótulo curto ou `columnId` — documentar escolha no relatório do executor); sem lançar excepções em `archivedAt` inválido.
- **Check de conclusão:**
  - [ ] Com `doc` e `columns` preenchidos, o label da coluna corresponde a `doc.columns.find(…).label` quando o `columnId` existe.
  - [ ] Com `columnId` ausente do mapa, a UI de fallback está definida (copy consistente com A1).
  - [ ] `archivedAt` ausente → não mostrar data destrutiva ou mostrar “—” conforme decisão, sem quebrar layout.
  - [ ] `archivedAt` string inválida → não throw; output seguro ou omissão.
- **Riscos / atenção:** Não alterar `props` de `ArchivedCardsPage` nem lógica de `handleUnarchiveCard` / `handleDeleteCard` / persistência.

**Verificação:** `cd apps/flowboard && pnpm lint` e `cd apps/flowboard && pnpm test` (se não houver teste novo, garantir que não há regressão de compilação).

---

### T2 — Reestruturar cabeçalho, atalho ao quadro e linhas com metadados e hierarquia de ações

- **Status:** CONCLUÍDA
- **Objetivo:** Reproduzir a **intenção estrutural** do protótipo (IPD §2.5): bloco título (eyebrow de contexto, H1 com contagem `(n)` alinhada a `archivedList.length`, subtítulo explicativo); `Link` “Voltar ao quadro” (estilo equivalente ao `.link-back` do demo, ícone opcional) com atalho focável para o Kanban (`/`) e `data-testid="archived-back-to-board"` quando `boardId` estiver presente; quando `boardId` for `null`, não oferecer link enganador (omitir, `disabled` + explicação, ou equivalente do IPD §4.1). **Painel** com cabeçalho secundário (label tipo “Histórico neste quadro”). Cada item: título, linha de metadados (label da coluna, data formatada se existir — padrão de separação como no demo), região de ações com Restaurar sólido e Excluir ghost/destrutivo, preservando `confirm` e `disabled` quando `saving === true`. Manter `data-testid` existentes.
- **Base no IPD:** §2.5, §1, §3 DoD, §4.1, §4.2 passos 0 e 3–3.b, §4.3 MODIFICAR TSX, §5, §6
- **Arquivos:** `apps/flowboard/src/features/board/ArchivedCardsPage.tsx`
- **Dependências:** T1
- **Entregável:** JSX reorganizado: bloco superior (título + contagem + navegação); lista com `li` e secções de conteúdo vs acções; classes de botão preparadas para primário vs perigo (detalhe visual completado em T3); `Link` / `NavLink` de `react-router-dom` coerente com `ReleaseNotesPage`.
- **Check de conclusão:**
  - [ ] Título e contagem visíveis e coerentes com o número de cards arquivados.
  - [ ] Com `boardId` definido, existe elemento com `data-testid="archived-back-to-board"` e navega para `/`.
  - [ ] Com `boardId` null, não há atalho que sugira regresso ao quadro inexistente.
  - [ ] Cada linha mostra título + label de coluna (via T1) + data pt-BR quando aplicável; estados sem board / carregando / vazio / erro mantêm `data-testid="archived-page"` e mensagens claras.
  - [ ] `archived-restore-*`, `archived-delete-*`, `archived-row-*` mantidos e funcionais; botões respeitam `saving`.
- **Riscos / atenção:** Não depender de texto visível como único contrato para o executor de E2E; testid no link de retorno.

**Verificação:** `cd apps/flowboard && pnpm lint` e `cd apps/flowboard && pnpm test`.

---

### T3 — Ajustar `ArchivedCardsPage.css` (layout, tipografia, largura útil, botões)

- **Status:** CONCLUÍDA
- **Objetivo:** Alinhar à tech-dark e ao **protótipo** (superfície do painel, sombra, bordas de linha, estados empty/loading com barra de shimmer como no HTML): hierarquia tipográfica do cabeçalho, melhor uso da largura útil (teto de referência ~1120px no demo, IPD §4.2), grid/flex para metadados em linha secundária, classes para `fb-archived__btn--primary` (accent) vs estilo ghost-destrutivo para excluir; subtexto de meta legível; contraste e foco aceitáveis. Usar **tokens** do app, não copiar `:root` do ficheiro de protótipo.
- **Base no IPD:** §2.5, §4.2 passo 4, §4.3 MODIFICAR CSS, §3 DoD, §7.1 (largura vs AppShell)
- **Arquivos:** `apps/flowboard/src/features/board/ArchivedCardsPage.css`
- **Dependências:** T2 (markup e nomes de classes estáveis)
- **Entregável:** Folha de estilos actualizada; tokens `--space-*`, `--text-*`, `--accent*`, `--danger-*`, `--bg-*`, `--border-*` (sem introduzir dependências novas fora do mapa).
- **Check de conclusão:**
  - [ ] Restaurar visualmente mais proeminente que Excluir; Excluir permanece destrutivo.
  - [ ] Sem overflow horizontal indevido no main; lista legível com densidade informativa melhorada.
- **Riscos / atenção:** Não editar `AppShell.css` salvo excepção fora de escopo; resolver só dentro do CSS da página.

**Verificação:** `cd apps/flowboard && pnpm lint` e `cd apps/flowboard && pnpm build`.

---

### T4 — Actualizar E2E `card-archive.spec.ts`

- **Status:** CONCLUÍDA
- **Objetivo:** Manter o fluxo criar card → arquivar → arquivados → visibilidade de linha com título; ajustar localizadores se heading/estrutura/cópia mudarem, preferindo `getByTestId`. Incluir asserção de presença/visibilidade de `archived-back-to-board` quando o cenário tiver board seleccionado; opcional smoke: clicar e verificar `/` (IPD §6).
- **Base no IPD:** §3 DoD (E2E), §5 (E2E), §6, §4.3 card-archive, §7.1
- **Arquivos:** `apps/flowboard/tests/e2e/card-archive.spec.ts`
- **Dependências:** T2, T3 (DOM e testids finais)
- **Entregável:** Espec a verde com selectores robustos; nenhum teste crítico dependente só de texto frágil onde houver `data-testid`.
- **Check de conclusão:**
  - [ ] Cenário principal de arquivados continua a passar.
  - [ ] `archived-back-to-board` asserado quando aplicável.
  - [ ] (Opcional) Navegação de volta smoke documentada na entrega se implementada.
- **Riscos / atenção:** E2E pode depender de credenciais/ambiente; alinhar com `test:e2e:raw` e documentação do pacote.

**Verificação:** `cd apps/flowboard && pnpm test:e2e:raw` (ou comando E2E activo do repo, após setup local).

---

### T5 — Fechar Definition of Done e verificações finais

- **Status:** CONCLUÍDA
- **Objetivo:** Confirmar DoD Sec. 3, guardrails, protocolo Sec. 8, e `state.yaml` AC; nenhum ficheiro fora do mapa; relatório de entrega alinhado a §9 do IPD.
- **Base no IPD:** §3, §5, §7–8, §9, `state.yaml` acceptance_criteria
- **Arquivos:** nenhum — apenas verificação; correcções mínimas só em ficheiros do mapa se bloqueio de CI.
- **Dependências:** T1–T4
- **Entregável:** Checklist DoD preenchida; registo de decisões (fallback A1, granularidade A2); “Sugestões fora de escopo” (ex. filtro local por título) se não implementado.
- **Check de conclusão:**
  - [ ] `cd apps/flowboard && pnpm lint` sem novos erores introduzidos.
  - [ ] `cd apps/flowboard && pnpm test` verde.
  - [ ] `cd apps/flowboard && pnpm build` verde.
  - [ ] E2E alinhada ao fluxo aprovado (T4).
  - [ ] Todos os itens funcionais e edge cases da §3 e `state.yaml` endereçados.
- **Riscos / atenção:** Filtro local por título (A3) fica fora do caminho crítico; não bloquear entrega.

**Verificação:** conjunto completo: `cd apps/flowboard && pnpm lint && pnpm test && pnpm build` e E2E conforme T4.

---

## Cobertura do DoD (IPD §3) e do `state.yaml`

| Item | Task(s) |
|------|--------|
| Linha: título + label coluna + data pt-BR quando `archivedAt` | T1, T2 |
| Cabeçalho: título + contagem; layout área útil | T2, T3 |
| Restaurar > Excluir visualmente; Excluir destrutivo | T2, T3 |
| Atalho “voltar ao quadro” coerente com React Router; sem link quebrado sem board | T2, T4 |
| Sem novos campos no JSON; só leitura de `columnId`, `columns[]`, `archivedAt` | T1, T2 (guardrails) |
| E2E e build/test verdes | T4, T5 |
| Edge: coluna desconhecida, `archivedAt` ausente/inválido, `boardId` null, `saving` | T1, T2 |

---

## Lacunas ou bloqueios

- Nenhum bloqueio identificado; assunções A1–A3 com defaults no IPD.

---

## Matriz de rastreabilidade

| Task | Secções do IPD | Arquivos / áreas | DoD / testes |
|------|----------------|------------------|--------------|
| T1 | §4.2 (1–2), §3 funcional, §7.2 | `ArchivedCardsPage.tsx` (helpers) | DoD: metadados + edge coluna/data |
| T2 | §2.5, §4.1, §4.2 (0, 3), §4.3 TSX, §3, §5 | `ArchivedCardsPage.tsx` (JSX) | DoD: cabeçalho, painel, navegação, ações, testids, espelho do protótipo |
| T3 | §2.5, §4.2 (4), §4.3 CSS, §3, §7.1 | `ArchivedCardsPage.css` | DoD: hierarquia visual, largura, CTAs, empty/loading |
| T4 | §3 (E2E), §5, §6, §4.3 E2E | `card-archive.spec.ts` | DoD: E2E verde, `archived-back-to-board` |
| T5 | §3 completo, §8, §9, state.yaml | — (verificação) | DoD: lint, test, build, E2E fechados |

---

### Metadata JSON (handoff orquestrador)

```json
{
  "agent": "task-breakdown",
  "status": "success",
  "ipd_source": ".memory-bank/specs/archived-page-ui-improvement/planner-TASK.md",
  "ipd_version": "1.1",
  "ui_reference": ".memory-bank/specs/archived-page-ui-improvement/prototype-archived-page.html",
  "total_tasks": 5,
  "complexity": "S",
  "blocked_tasks": 0,
  "blockers": [],
  "task_md_path": ".memory-bank/specs/archived-page-ui-improvement/task-breakdown-TASK.md"
}
```
