# Code Review Report — archived-page-ui-improvement (TASK)

> Data: 2026-04-22 | Agente: code-reviewer | Módulos: quality  
> **Escopo de código:** `ArchivedCardsPage.tsx`, `ArchivedCardsPage.css`, `card-archive.spec.ts`  
> **Referência:** `state.yaml`, `planner-TASK.md` §2.3, §3, §4.3, §5, `implementer-TASK.md`

## Contexto

| Campo | Valor |
| --- | --- |
| **Linguagem/Stack** | TypeScript, React 19, react-router-dom, CSS com tokens do app |
| **Contexto de execução** | Browser (FlowBoard). Dados: documento do board (GitHub), conteúdo de cards/colunas confiável no mesmo sentido de antes; textos de UI escapados por React. |
| **Módulos aplicados** | `quality` (mínimo). Segurança/performance/tagger **não** carregados: sem sinais fortes (sem SQL/shell, sem `dangerouslySetInnerHTML`, sem hotspots novos de performance; tagger não exigido pelo IPD). Verificação pontual: **sem** `dangerouslySetInnerHTML`; strings de utilizador em nós de texto/confirm. |

---

### Problemas Críticos

Nenhum encontrado.

---

### Problemas Altos

Nenhum encontrado.

---

### Problemas Médios

**🟡 MÉDIO** [Acessibilidade / live regions] Banner de `persistError` anunciado como conteúdo geral, não como erro urgente

**LOCALIZAÇÃO:** `ArchivedCardsPage.tsx` — `className="fb-archived-page__warn"` (aprox. linhas 388–391)  
**PROBLEMA:** O contentor usa `role="status"`, típico de atualizações informativas (`aria-live` polite). Falhas de persistência/conflito são **erros**; utilizadores de leitores de ecrã podem receber o anúncio tarde ou com prioridade inadecuada em relação a `role="alert"` (ou `aria-live="assertive"` com semântica de alerta).  
**EVIDÊNCIA:**  
```388:391:apps/flowboard/src/features/board/ArchivedCardsPage.tsx
      {persistError ? (
        <div className="fb-archived-page__warn" role="status">
          {persistError}
        </div>
```  
**CORREÇÃO:** Trocar para `role="alert"` (e manter estilos), ou adicionar `aria-live="assertive"` alinhado à política de anúncio de erros do resto do app.  
**JUSTIFICATIVA:** Padrão WCAG/ARIA: erros operacionais devem ser claramente sinalizados; `status` desvaloriza a severidade percecionada.

---

**🟡 MÉDIO** [E2E / seletores] Dependência de texto visível `Salvando…` sujeita a regressão por copy ou i18n

**LOCALIZAÇÃO:** `card-archive.spec.ts` (aprox. linha 58)  
**PROBLEMA:** O IPD §3 e §5 preferem `data-testid` para fluxos críticos. A espera pós-arquivar baseia-se em `getByText('Salvando…')`, frágil se o texto, espaços ou localização mudarem.  
**EVIDÊNCIA:**  
```57:58:apps/flowboard/tests/e2e/card-archive.spec.ts
    // Kanban removes the card from the column before `saveDocument` finishes; `/archived` loads from GitHub.
    await expect(page.getByText('Salvando…')).toHaveCount(0, { timeout: 60_000 })
```  
**CORREÇÃO:** Adicionar `data-testid` ao parágrafo de “a gravar” (p.ex. `archived-page-saving` ou reutilizar convénção global) no componente que renderiza `Salvando…` e, no E2E, `expect(page.getByTestId('...')).toHaveCount(0, ...)`.  
**JUSTIFICATIVA:** Alinhamento com guardrails do IPD e estabilidade de CI.

---

**🟡 MÉDIO** [Cópia / pt-BR] Ortografia incorreta no estado vazio

**LOCALIZAÇÃO:** `ArchivedCardsPage.tsx` (aprox. linha 417)  
**PROBLEMA:** O imperativo de segundo pessoa de tratamento de “arquivar” em pt-BR é **“Arquive”**, não “Arquivue”. Afecta credibilidade da cópia e critério de i18n do pedido.  
**EVIDÊNCIA:**  
```414:418:apps/flowboard/src/features/board/ArchivedCardsPage.tsx
          <div className="fb-archived__empty" role="status">
            <strong className="fb-archived__empty-title">Nenhum card arquivado</strong>
            <p className="fb-archived__empty-text">
              Arquivue um card pelo menu do cartão no Kanban para vê-lo listado aqui.
            </p>
```  
**CORREÇÃO:** Substituir “Arquivue” por “Arquive” (e rever frase se necessário, e.g. “Arquive um card…”).  
**JUSTIFICATIVA:** Norma criteriosa do português; visível em estado vazio.

---

### Baixo / Info

**🔵 BAIXO** [Acessibilidade / consistência] Rótulo acessível da `section` do painel difere entre carregamento e conteúdo

**LOCALIZAÇÃO:** `ArchivedCardsPage.tsx` — `section` de loading vs lista (aprox. 373 e 409)  
**PROBLEMA:** `aria-label="Arquivados"` (loading) vs `aria-label="Tarefas arquivadas"` (dados) descrevem o mesmo painel de forma inconsistente, o que confunde leitores de ecrã ao mudar o estado.  
**EVIDÊNCIA:** comparação das duas `section`.  
**CORREÇÃO:** Unificar `aria-label` (e.g. sempre “Tarefas arquivadas” ou “Histórico de arquivados neste quadro”).  
**JUSTIFICATIVA:** Comportamento previsível entre estados de UI.

---

**🔵 BAIXO** [UI / conteúdo longo] Títulos e meta sem quebra forçada explícita

**LOCALIZAÇÃO:** `ArchivedCardsPage.css` — `.fb-archived__row-title`, `.fb-archived__row-meta`  
**PROBLEMA:** Títulos ou IDs de coluna muito longos podem forçar overflow horizontal; mitigação mínima comum seria `overflow-wrap: break-word` (ou `word-break`) em títulos. Não comprovado como bug em dados reais.  
**EVIDÊNCIA:** `.fb-archived__row-main { min-width: 0; }` existe, mas o título em si não fixa `overflow-wrap`.  
**CORREÇÃO:** Adicionar `overflow-wrap: break-word` no título (e opcionalmente em meta) se quiserem robustez a strings extremas.  
**JUSTIFICATIVA:** Densidade de informação e ecrãs estreitos.

---

**⚪ INFO** [Segurança — verificação pontual] Superfície XSS no ficheiro

**CONCLUSÃO:** Não há `dangerouslySetInnerHTML` nem análogos no escopo. Títulos e rótulos são renderizados como filhos de texto (React) ou usados em `window.confirm` (não HTML). Risco de injeção DOM clássica neste diff: **não identificado** com base na leitura completa do ficheiro.

---

**⚪ INFO** [Contrato / IPD] Cumprimento de guardrails

- `data-testid` exigidos preservados: `archived-page`, `archived-row-${id}`, `archived-restore-*`, `archived-delete-*`.  
- `archived-back-to-board` condicionado a `boardId` não vazio, coerente com “sem atalho enganoso” com `boardId` null.  
- Sem alteração de contrato de persistência ou novos campos; apenas leitura de colunas, `archivedAt`, título.  
- Navegação: `Link` para `/` com foco visível no CSS.  
- Metadados: coluna (com fallback A1) + data pt-BR ou “Sem data de arquivamento”.

---

### Resumo

| Campo | Valor |
| --- | --- |
| Total de achados | 5 |
| Críticos | 0 |
| Altos | 0 |
| Médios | 3 |
| Baixos / Info | 2 (2 baixos; INFO segurança/contrato sem contagem de severidade no total “findings” operacional) |
| **Recomendação** | **APROVAR** |
| Correção prioritária | Corrigir cópia “Arquivue” → “Arquive” e, em follow-up, `role` do erro de persistência + testid para indicador de gravação no E2E. |

**Critérios da recomendação (agente):** sem CRÍTICOS nem ALTOS; melhorias MÉDIO/BAIXO não bloqueiam merge, desde que a equipa aceite a dívida documentada.

---

```json
{
  "agent": "code-reviewer",
  "status": "complete",
  "modules_loaded": ["quality"],
  "findings_total": 5,
  "findings_critical": 0,
  "findings_high": 0,
  "findings_medium": 3,
  "findings_low": 2,
  "tagger_missing": 0,
  "tagger_inadequate": 0,
  "recommendation": "APROVAR",
  "priority_fix": "Ortografia do estado vazio (Arquive) e, como melhoria, role=alert para persistError e data-testid no indicador de salvamento para o E2E",
  "report_path": ".memory-bank/specs/archived-page-ui-improvement/code-reviewer-TASK.md"
}
```
