# Code Review Report — archived-cards-page

> Agente: code-reviewer | Módulos: quality, performance, security (foco: persistência / 409)

---

## § Revisão pós-correção 409 (2026-04-22)

> **Data:** 2026-04-22 | **Escopo:** `BoardView.tsx` e `ArchivedCardsPage.tsx` — `shaRef`, `saveChainRef`, `saveDocument` serializado, efeitos `useEffect` em `boardId`/`doc`/`sha`, e alinhamento com conflitos GitHub 409.

### Contexto (extração)

| Campo | Valor |
|--------|--------|
| **Linguagem/Stack** | TypeScript, React 18+ |
| **Execução** | SPA; `createBoardRepository` + `putFileJson(path, previousSha)` por `boardFilePath(boardId)` |
| **Foco** | Fila de saves + ETag/SHA; troca de quadro; duplicação; superfície de credenciais |

### Respostas às questões (síntese)

1. **Fila + `shaRef` evitam PUTs em paralelo com SHA obsoleto (no mesmo quadro)?** **Sim, para tudo o que passa por `saveDocument`:** `saveChainRef.current.then(run)` impede dois `run()` a correr em paralelo. Dentro de cada `run`, após sucesso (ou após 409 e reload no `catch`), `shaRef.current` é atualizado antes de o *seguinte* `run` ser agendado (o encadeamento só avança quando a `Promise` da iteração anterior cumpre). Isto endereça o caso típico (ex.: arquivar dois cards em sequência) — *desde que* ambos usem a mesma instância e o mesmo `boardId` lógico.

2. **`.catch` na cadeia esconde erros?** A substituição `saveChainRef.current = queued.catch(() => {})` **não** suprime a rejeição devolvida a quem faça `await saveDocument(...)` / `return queued` — a **rejeição propaga** no `queued`. O `.catch` serve apenas para a referência interna da fila **não ficar rejeitada**, permitindo `then(run)` a workers seguintes. Risco remanescente: chamadas `void saveDocument(...)` (sem `await`) podem gerar rejeições por observar; isso é limitação de uso, não da fila.

3. **`boardId` muda, cadeia reposta — save antigo ainda conclui com id errado?** **Há condição de corrida real.** Não existe `key={boardId}` no `AppShell` para `BoardView` / `ArchivedCardsPage`; ao mudar o quadro, a mesma instância de componente reutiliza `shaRef` e `docRef`. Um `run` pendentE enfileirado *antes* da troca ainda passa a `saveBoard(nextDoc.boardId, …, shaRef.current)`: o **path/args de documento** seguem o `boardId` do doc, mas o **`shaRef` pode já ter sido atualizado pelo `reload` do quadro novo**, gerando 409 (If-Match errado) ou, em caminhos de sucesso, `setDoc`/`setSha` com o quadro A enquanto o *prop* `boardId` já é B — **dessincronia de UI/estado**. Não implica, por si só, “secret errado” no repositório: o conteúdo grava ainda `boardFilePath(nextDoc.boardId)`; o problema é de concorrência coerente com o que o utilizador vê. **Recomendação de produto/eng.:** `key={selectedBoardId}` no contentor, ou *guard* no `run` (ignorar resultados se `boardId`/`boardId` do doc deixou de bater com um ref “save generation”), ou SHA capturada por save em vez de só global.

4. **Duplicação `BoardView` vs `ArchivedCardsPage`?** **Dívida de manutenção aceitável a curto prazo** após a correção 409, mas ainda **🟡 MÉDIO** — padrão idêntico (`saveChainRef`, `reload` com reconciliação, intervalo 60s, refs). Unificar em hook (ex. `useBoardDocumentPersistence`) reduz *drift*.

5. **Segurança: novo PAT / sessão?** **Nenhum achado.** Sem novos canais; mesmo `createClientFromSession` / repositório. **Aprovado neste ponto.**

### Achados (severidade)

#### 🟠 ALTO

**[ALTO] [concorrência] Troca de quadro com `save` ainda a executar: `shaRef` partilhado + `setDoc` de um save antigo**

**LOCALIZAÇÃO:** `BoardView.tsx` — `saveDocument` / `run` (~L215–264); `useEffect` reset cadeia (~L163–165). Idem padrão em `ArchivedCardsPage.tsx` (~L106–108, ~L131–181).

**PROBLEMA:** A fila e o `shaRef` corrigem o 409 *dentro* do mesmo quadro; com mudança rápida de `boardId` na mesma instância, o estado de SHA e a hidratação pós-`loadBoard` de um `run` antigo podem conflitar com o quadro selecionado e com o conteúdo apresentado.

**EVIDÊNCIA:** `shaRef` global à montagem; `setDoc` incondicional após sucesso/409 no `run`; sem comparação com `boardId` atual (prop).

**CORREÇÃO (direcção):** Remontar main com `key={boardId}` **ou** ref `const activeBoardIdRef` atualizado a cada render e early-return/ignore em `run` se `nextDoc.boardId !== activeBoardIdRef.current` **ou** anexar geração ao enqueue.

**JUSTIFICATIVA:** Evita aplicar o resultado de um commit concebido para o quadro anterior após a navegação.

#### 🟡 MÉDIO

**[MÉDIO] [concorrência] `reload` (reconciliação no load) grava fora de `saveChainRef`**

**LOCALIZAÇÃO:** `BoardView.reload` e `ArchivedCardsPage.reload` — `await repo.saveBoard(..., got.sha)` no ramo de reconciliação (ex. `BoardView` ~L122–123).

**PROBLEMA:** Não compõe a mesma fila que `saveDocument`. Cenário *edge*: potencial intercalamento com outro `save` se ambos forem muito próximos (menos provável no arranque do que ações de utilizador + tick).

**EVIDÊNCIA:** Save directo, sem `saveChainRef.current.then`.

**CORREÇÃO:** Reutilizar o mesmo helper de enfileiramento para este save **ou** documentar a exclusão mútua (ex. só ocorre antes de `doc` estável e intervalo 60s).

**JUSTIFICATIVA:** Uma fila unificada reforçaria a invariante “um PUT por cadeia” em todos os caminhos.

**[MÉDIO] [manutenibilidade] Duplicação persistente (mitigada no eixo 409, não desaparece)**

**LOCALIZAÇÃO:** `BoardView.tsx` vs `ArchivedCardsPage.tsx` — padrão de persistência e timer.

**PROBLEMA:** Invariantes duplicadas; futuras regras (abort, fila e2e) duplicam esforço.

**CORREÇÃO:** Extração faseada a um módulo/hook comum (sem obrigar nesta entrega se o *scope* for só 409 no mesmo board).

**JUSTIFICATIVA:** DRY; uma fonte de verdade.

#### 🔵 BAIXO

**[BAIXO] [robustez] `void saveDocument(...)` e rejeições não observadas**

**LOCALIZAÇÃO:** Vários `void saveDocument(nextDoc)`.

**PROBLEMA:** A fila *não* engole erros, mas o caller não trata; em falhas persistentes, consola pode assinalar rejeições globais.

**CORREÇÃO:** `.catch` local ou helper que registe sem alterar a fila.

**JUSTIFICATIVA:** Comportamento previsível em CI/devtools.

#### ⚪ INFO

**Fila `saveChainRef` + `catch` no ref:** padrão idiomático para *promise queue*; o retorno `return queued` mantém a semântica para `await`.

### Segurança (PAT / sessão)

Nenhum novo; conforme análise acima (§5).

### Veredicto e pontuação

| Campo | Valor |
|--------|--------|
| **Objetivo 409 (mesmo quadro, ações em sequência)** | **Endereçado** pela serialização e por `shaRef` actualizado pós-`loadBoard` em cada iteração |
| **Críticos** | **0** |
| **Altos** | **1** (troca de quadro + save pendentE) |
| **Médios** | **2** |
| **Baixos/Info** | **1+1** |
| **Score** | **85/100** |
| **Apto a ship (critério: 0 críticos)** | **Sim** para o *fix* de 409 em cadeia no mesmo board; **ressalva:** endurecer transição de quadro (ver ALTO) para confiança em navegação rápida |
| **Recomendação (template do agente)** | **CONDICIONAL** (≥1 achado ALTO) |

**Metadata (revisão 409):**

```json
{
  "agent": "code-reviewer",
  "status": "complete",
  "scope": "post-409-persistence",
  "date": "2026-04-22",
  "modules_loaded": ["quality", "performance", "security"],
  "findings_total": 5,
  "findings_critical": 0,
  "findings_high": 1,
  "findings_medium": 2,
  "findings_low": 1,
  "recommendation": "CONDICIONAL",
  "score": 85,
  "ok_to_ship_if_zero_critical": true,
  "priority_fix": "Proteger save in-flight com mudança de board (key ou guard por boardId) para evitar mistura de sha/estado"
}
```

---

## Relatório anterior (TSD v1.1, implementação) — resumo

Revisão completa *feature* (rotas, E2E, alinhamento RF/CA) **2026-04-22**; escopos: `ArchivedCardsPage`, `AppShell`, `BoardView`, E2E. **Score anterior: 78/100**, **CONDICIONAL** — destaque: duplicação e concorrência *timer vs utilizador* antes da fila. A seção **§ Revisão pós-correção 409** acima assume o código *actual* e documenta a mitigação da cadeia de saves; os achados de produto/UX (E2E, `JSON.stringify`, a11y) do relatório longo original mantêm-se como dívida não re-auditada em detalhe nesta passagem.

| Métrica (snapshot antigo) | Valor |
|---------------------------|--------|
| critical | 0 |
| major | 2 |
| minor | 4 |
| Recomendação | CONDICIONAL |

*Detalhe alinhado a spec / RF-01–08 e metadata JSON completa encontravam-se na versão precedente; substituída por este documento unificado com secção 409 no topo.*

---

**One-line summary (409):** A fila + `shaRef` fecham o 409 em ações em sequência no mesmo quadro; ainda falta vedar race ao mudar de `boardId` (mesma instância) e, secundariamente, alinhar o `save` de reconciliação do `reload` com a fila.
