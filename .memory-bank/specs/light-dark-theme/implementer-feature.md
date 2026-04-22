# Implementer report — light-dark-theme

**Data:** 2026-04-22

## Entregue

- `themeConstants.ts` / `themeStore.ts` / `themeStore.test.ts` — chave `flowboard-theme`, fallback `dark`, guards sem `localStorage`.
- `index.html` — script inline síncrono alinhado ao comentário da constante TS.
- `main.tsx` — `applyThemeToDocument(readTheme())` antes do `createRoot`.
- `tokens.css` — bloco `html[data-theme='light']` com tokens espelhados.
- `index.css` — `color-scheme` por `data-theme`.
- `AppShell` + CSS — botão com `data-testid="fb-theme-toggle"`, ícones sol/lua, `aria-label` em PT.
- `SearchModal.css` — removido bloco `prefers-color-scheme: light` vazio.

## Verificações

- `pnpm test` — 259 testes OK (incl. 7 novos do theme store).
- `pnpm lint` — sem erros nos arquivos tocados (avisos apenas em `coverage/` pré-existentes).
- `pnpm build` — executado no fechamento da entrega.

## Escopo não alterado

- `App.tsx` e `features/auth/*` — sem mudança necessária (tema via `<html>` global).
