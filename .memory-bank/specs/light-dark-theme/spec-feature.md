# Especificação Técnica: Tema claro e escuro com persistência

**Versão do documento:** v1.0  
**Data:** 2026-04-22  
**Status:** Pronta para revisão / implementação após HITL  
**Confiança:** 92%

---

## 1. Objetivo e metas

### Problema
O FlowBoard hoje assume visual **dark** fixo (`tokens.css` em `:root`). Existe comentário em `SearchModal.css` indicando que light via `prefers-color-scheme` não está implementado. Usuários não podem escolher tema claro nem ter a escolha persistida.

### Metas
1. **Dois temas** com hierarquia de tokens equivalente: **dark** (baseline atual) e **light** (novo preset).
2. **Alternância explícita** na UI (não só preferência do sistema).
3. **Persistência** da escolha no **localStorage** do navegador.
4. **Bootstrap antecipado** para reduzir FOUC ao recarregar.
5. **Comportamento determinístico** com dados corrompidos ou ausentes.

### Fora de escopo (v1)
- Modo “seguir sistema” (`system`) como terceira opção persistida.
- Broadcast entre abas.

---

## 2. Entidades e contratos

### 2.1 ThemeMode

```typescript
type ThemeMode = 'dark' | 'light'
```

**Regras:**
- Somente estes dois literais são valores persistidos válidos.
- Qualquer outro valor armazenado é tratado como **inválido** e dispara fallback.

### 2.2 Chave de armazenamento

- **Chave sugerida:** `flowboard-theme` (prefixo alinhado ao produto; não colidir com `flowboard-session` e chaves de board).
- **Formato:** string JSON opcional — preferência por valor simples `"dark"` ou `"light"` (sem JSON object) para simetria com outros stores; se usar JSON, documentar no código.

**Recomendação:** armazenar string pura `"dark"` | `"light"` para menor superfície de parse.

### 2.3 Contrato DOM

- Elemento **`document.documentElement`** (`<html>`) recebe **`data-theme="dark"`** ou **`data-theme="light"`**.
- CSS: tokens **dark** definidos em `:root` e/ou `[data-theme="dark"]`; tokens **light** em `[data-theme="light"]`.
- **Dark** deve permanecer visualmente equivalente ao estado atual do produto (regressão visual mínima aceitável documentada no plano de testes).

---

## 3. Regras de negócio / comportamento

### R1 — Leitura inicial
1. Ao carregar a aplicação, ler `localStorage.getItem(THEME_STORAGE_KEY)`.
2. Se valor for `'light'` ou `'dark'`, aplicar esse modo.
3. Caso contrário (null, string vazia, lixo), aplicar **`dark`** como padrão e **opcionalmente** normalizar gravando `'dark'` (decisão de implementação: normalizar evita reavaliação ambígua; pode ser omitido para escrita mínima).

### R2 — Escrita ao alternar
1. Ao usuário acionar o controle de tema, alternar modo e **persistir** imediatamente.
2. Atualizar `data-theme` no `<html>` na mesma transação lógica.

### R3 — Ambiente sem `localStorage`
- Se `localStorage` indisponível (ex.: modo privado restrito), aplicar tema em memória apenas para a sessão; não falhar a aplicação (padrão já usado em `sessionStore` / `boardSelectionStore`).

### R4 — Ordem de execução (FOUC)
- Incluir **script inline síncrono** no `<head>` ou imediatamente após abertura de `<body>` em `index.html` que:
  - lê a chave,
  - define `data-theme` no `<html>` antes do carregamento do módulo Vite.
- Manter script **mínimo** (sem dependências externas).

### R5 — Consistência com media queries legadas
- Remover ou substituir blocos `@media (prefers-color-scheme: light)` que assumem “não implementado” por regras que respeitem **`data-theme`** (ou herdem dos tokens), para não haver tema claro “meio aplicado” só no modal de busca.

---

## 4. Requisitos de UI/UX

### UI.1 — Colocação
- Controle na **topbar** da área autenticada (`AppShell`), próximo a ações existentes (ex.: antes do badge de versão ou após busca), com **rótulo acessível** (`aria-label` ou texto visível + ícone).

### UI.2 — Acessibilidade
- Botão ou switch com estado anunciável (ex.: “Tema escuro” / “Tema claro” ou `aria-pressed` se toggle).
- Contraste em **ambos** os temas ≥ WCAG 2.1 AA nos componentes tocados; validação principal nos tokens light.

### UI.3 — Onboarding
- Se onboarding compartilha o mesmo `index.html`, o bootstrap aplica tema também na tela de onboarding (mesmo store).

---

## 5. Critérios de aceite (verificáveis)

| ID | Critério | Verificação |
|----|-----------|---------------|
| AC.1 | Toggle alterna entre light e dark na shell autenticada | Manual / E2E: clicar → cores de fundo/texto mudam conforme tokens |
| AC.2 | Após F5, tema permanece | Manual / E2E: localStorage + screenshot |
| AC.3 | `data-theme` no `<html>` coincide com modo ativo | Inspecionar DOM após toggle e após reload |
| AC.4 | Valor inválido no storage resulta em dark | Teste unitário do store + limpar/recarregar |
| AC.5 | Search modal e demais superfícies não ficam só “light do SO” | Remover inconsistência `prefers-color-scheme` órfã |
| AC.6 | Sem exceção não tratada se localStorage bloqueado | Teste com stub undefined (padrão repo) |

---

## 6. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| FOUC | Script inline + mesma chave no React |
| Regressão dark | Manter valores `:root` / dark iguais aos atuais |
| Tokens incompletos em light | Checklist de variáveis usadas em `index.css` / features |

---

## 7. Handoff para planejamento

**Dependências:** Nenhuma API GitHub; apenas cliente.

**Arquivos prováveis:** ver `repo_write_scope` em `state.yaml`.

**Testes:** Vitest no store de tema; smoke manual nas duas telas principais (onboarding se aplicável).
