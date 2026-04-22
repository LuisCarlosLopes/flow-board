# spec-reviewer — card-attachments (FEATURE)

**Data:** 2026-04-22  
**Artefato revisado:** `spec-feature.md` v1.0  
**Constitution:** alinhada ao Princípio II (GitHub-only) e I (domínio testável).

## Veredito

**GO condicional** para fase `planner`, com itens abaixo fechados no IPD ou explicitamente aceitos como débito da v1.

## Achados

### Críticos

- Nenhum bloqueador de segurança óbvio: download via fetch autenticado está correto (evita PAT na URL).

### Maiores (fechar no plano)

1. **schemaVersion:** A spec deixa em aberto bump para `schemaVersion: 2`. O `planner` deve decidir: (a) manter `schemaVersion: 1` com campo opcional `attachments` e parser tolerante, ou (b) bump com migração documentada. Evitar ambiguidade no IPD.
2. **Órfãos pós-upload:** Ordem PUT blob → PUT board pode deixar arquivo sem referência. O plano deve definir retry idempotente e/ou limpeza best-effort.
3. **Markdown preview:** Exigir reutilização explícita do mesmo sanitizador/pipeline da `description` do card; se não existir sanitização forte, registrar risco XSS no plano e mitigação.

### Menores

1. Limites agregados (N anexos por card) — definir número na v1 ou aceitar “sem limite” com risco de repo grande.
2. **MIME vs extensão:** Política de rejeitar em conflito está correta; testes devem cobrir caso “.pdf renomeado para .jpg”.

## ADR

Recomendado **ADR curto** para: convenção `flowboard/attachments/...` + extensão do `GitHubContentsClient` para PUT/GET binário Base64. Pode ser combinado com revisão do implementer se o time preferir ADR mínimo pós-plano.

## Próximo passo

- **architect:** somente se o `planner` identificar trade-off não resolvido na spec; caso contrário pular.
- **planner** → `plan-reviewer` → `task-breakdown` → **HITL** → implementação.

## Score de qualidade (revisão de spec)

**88/100** — especificação utilizável; pendências são fecháveis em planejamento sem reescrita completa.