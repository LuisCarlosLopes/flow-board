# plan-reviewer — card-attachments

**Data:** 2026-04-22  
**IPD:** `planner-feature.md` v1.0  

## Veredito

**APROVADO** para `task-breakdown` e gate **HITL** antes do `implementer`.

## Checagens

- Mapa de arquivos cobre domínio, GitHub, modal, board e ADR.
- Decisões abertas da spec (schemaVersion, órfãos) foram fechadas no IPD.
- `repo_write_scope` é limitado e auditável.

## Ressalva

Se `BoardView` não expuser hoje o `GitHubContentsClient` ao modal, o implementer pode precisar de **callbacks** (`onUploadAttachment`, `onDeleteAttachment`) — ajuste fino permitido sem mudar o objetivo do produto.

## Score

**90/100**