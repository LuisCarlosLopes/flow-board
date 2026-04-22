# Implementer — theme-review-followup (HOTFIX)

**Data:** 2026-04-22

- `themeBootstrap.contract.test.ts`: lê `apps/flowboard/index.html` e exige `var k = '<THEME_STORAGE_KEY>'`, `getItem(k)` e ramo `light`/`dark`.
- `CreateTaskModal.css`: `.fb-ctm__attachment-row--pending` com `background: var(--accent-dim)`.

**Evidência:** `pnpm test` — 261 testes OK.

---

## Iteração 2 — findings **low** (pedido “baixa”)

- `AppShell.tsx`: `window` `storage` em `THEME_STORAGE_KEY` + `readTheme` / `applyThemeToDocument` / `setTheme` (outras abas).
- `SearchModal.css`: halo de foco do input com `var(--accent-dim)` em vez de `rgba` fixo.
- `AppShell.css`: `.fb-chip--accent` com `border-color: var(--accent-border)`.
- `CreateTaskModal.tsx`: `.fb-ctm__copy-wrapper` com `aria-live="polite"` e `aria-atomic="true"`; botão Copiar deixa de usar `disabled` durante `isCopied`.

**Evidência:** `pnpm test` — 261 testes OK após iteração 2.
