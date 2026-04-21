# IPD — Maximizar detalhes do card (TASK) — v1.0

> **Status:** Pronto para HITL (pré-implementer)  
> **Agente:** planner  
> **Track:** TASK  
> **Score:** 4  
> **Confiança:** 88/100  
> **Migrations:** Não  

---

## 1. Missão

Adicionar ao `CreateTaskModal` (modal de nova tarefa / edição — “detalhes do card”) um **controle para maximizar** o painel do formulário na viewport, com **restauração** ao tamanho padrão, sem fechar o modal e sem perder o rascunho.

---

## 2. Justificativa de track

| Sinal | Peso |
|------|------|
| Vários arquivos (TSX, CSS, testes) | +1 |
| Validação independente (UI + testes) | +1 |
| Critério de aceite com UX (tamanho “substancialmente maior”) | +1 |
| Sem decisão arquitetural de domínio/persistência | 0 |
| Sem efeito irreversível fora do cliente | 0 |

**Score: 4 → TASK**

---

## 3. Estado atual (baseline)

- `CreateTaskModal.tsx`: overlay `.fb-ctm-overlay` + caixa `.fb-ctm` (máx. `min(560px, 100%)`, altura `min(90vh, 720px)`).
- Título fixo em `<h2>` sem barra de ações ao lado.
- ESC fecha; formulário com estado local.

---

## 4. Mapa de alterações

| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `CreateTaskModal.tsx` | Estado local `isMaximized` (ou nome equivalente em inglês). Botão toggle na região do título (ex.: ícone Lucide se já houver no projeto, ou SVG inline consistente com outros modais). `aria-pressed` ou `aria-expanded` no botão; `aria-label` em PT para leitores de tela. Aplicar classe condicional no overlay e/ou no painel. |
| 2 | `CreateTaskModal.css` | Modificadores, ex.: `.fb-ctm--maximized` com `width`/`max-width`/`height`/`max-height` ocupando viewport menos padding (alinhar a `--space-*` existentes). Opcional: textarea com `flex: 1` / `min-height` maior no modo maximizado para aproveitar altura. |
| 3 | `CreateTaskModal.test.tsx` | Cobrir alternância de classe ou `data-testid` ao clicar no toggle; garantir que campos não resetam ao alternar (um caso com título/descrição preenchidos). |

**Não alterar:** `BoardView.tsx`, domínio, persistência — a menos que surja dependência real (não esperada).

---

## 5. Design UX (recomendado)

- Um único botão **alternar** (“Maximizar” / “Restaurar” ou ícone expand/compress com `title` + `aria-label`).
- Posição: canto superior direito da área do título, alinhado ao `h2`.
- Modo maximizado: manter **mesmos** botões Cancelar / Salvar; não esconder o footer.

---

## 6. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Scroll duplo (overlay + painel) | Manter um único eixo de scroll principal; testar em altura pequena. |
| Foco / leitor de tela | Preservar `role="dialog"` e `aria-labelledby`; nome do botão claro. |
| Regressão visual em mobile | `min()` e padding já existentes; validar largura 100% com padding. |

---

## 7. Definição de pronto (implementer)

- [ ] Toggle funcional com estados visualmente distintos.
- [ ] `data-testid` no botão (ex.: `ctm-maximize-toggle`).
- [ ] Testes Vitest cobrindo toggle e não-reset do formulário.
- [ ] `npm test` / lint do pacote `flowboard` sem falhas novas.

---

## 8. Pós-entrega (opcional)

- Persistir preferência “sempre maximizar” em `localStorage` — **fora** do escopo mínimo; registrar como melhoria se o usuário pedir.
