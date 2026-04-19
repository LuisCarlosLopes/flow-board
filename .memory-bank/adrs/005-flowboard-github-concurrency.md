# ADR-005: FlowBoard — Concorrência otimista com SHA e retry na GitHub Contents API

**Status:** Aceito  
**Data:** 2026-04-19  
**Feature de origem:** personal-kanban  
**Autores:** architect (EPIC)

---

## Contexto

D10 e R12–R13 do TSD exigem escrita baseada no SHA atual e comportamento definido em 409 / conflito. Duas abas ou dispositivos podem atualizar o mesmo arquivo de quadro.

## Decisão

Decidimos implementar **locking otimista** por arquivo:

1. **GET** do conteúdo atual + `sha` do blob.
2. Aplicar mudança de domínio em memória sobre o JSON desserializado.
3. **PUT** com o mesmo `sha`; se **409**, refazer **GET**, re-aplicar operação (merge manual de alto nível: reaplicar intenção do usuário sobre novo estado) ou falhar com mensagem se irreconciliável.

Retry com **backoff** em **429** / rate limit, respeitando headers `Retry-After` quando presentes.

## Alternativas Consideradas

| Alternativa | Por que foi descartada |
|-------------|-------------------------|
| Last-write-wins silencioso | Perda de dados sem aviso — viola espírito do TSD |
| Lock distribuído externo | Requer infraestrutura fora do GitHub; fora do MVP |
| CRDT em JSON | Complexidade alta para o volume de edição pessoal |

## Consequências

**Positivas:**
- ✅ Coerente com API Contents e com particionamento por quadro (ADR-002)

**Trade-offs aceitos:**
- ⚠️ Edição simultânea no **mesmo** quadro pode exigir intervenção do usuário após conflito real

## Guardrails derivados desta decisão

- **G9:** Nenhuma escrita em `flowboard/**` sem `sha` válido da última leitura bem-sucedida para aquele path.
- **G10:** Erros 409 e 429 devem surface na UI com ação sugerida (retry / recarregar), não falhas silenciosas.

## Status de vigência

- **Aceito** — em vigor desde 2026-04-19.
