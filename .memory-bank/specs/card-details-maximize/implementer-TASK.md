# Implementer — card-details-maximize (TASK)

## Escopo executado

- `CreateTaskModal.tsx`: estado `isMaximized`, reset ao fechar (`isOpen === false`), header com botão `data-testid="ctm-maximize-toggle"`, `aria-pressed` e rótulos PT, ícone único SVG (expand/compress).
- `CreateTaskModal.css`: `.fb-ctm--maximized` (largura até 1200px, altura até min(100vh-padding, 900px)), formulário com `flex:1` no modo maximizado, `.fb-ctm__field--stretch` para área de descrição crescer.
- `CreateTaskModal.test.tsx`: testes RTL para toggle + preservação do título; reset de maximizado ao reabrir modal.

## Verificação

- `npm run test` (Vitest): 242 testes passando.
- `npm run build`: OK.
- `npm run lint`: sem erros no código fonte (avisos apenas em `coverage/`).

## Riscos residuais

- Em viewports muito baixas, scroll interno do formulário pode exigir rolagem extra; aceitável para TASK.
