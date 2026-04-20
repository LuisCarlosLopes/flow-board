# ADR-006: FlowBoard — Janela de apresentação na coluna Concluído

**Status:** Aceito  
**Data:** 2026-04-20  
**Feature de origem:** done-column-performance  
**Autores:** architect (squad CodeSteer)

---

## Contexto

O quadro carrega um `BoardDocumentJson` completo via GitHub (ADR-002). A coluna com `role === 'done'` pode crescer indefinidamente; hoje todos os cards são renderizados e registrados no `@dnd-kit`, o que degrada performance.

## Decisão

1. **Não** paginar nem fatiar dados no repositório: a fonte de verdade permanece o documento JSON inteiro em memória após o load.
2. Introduzir uma **janela de apresentação** apenas na UI da coluna Concluído por **virtualização** (lista virtual com scroll; ex.: `@tanstack/react-virtual`). *“Carregar mais”* permanece alternativa documentada se a integração com DnD bloquear manutenção, mas **não** é o caminho padrão após escolha explícita da opção A.
3. Manter o domínio (`buildItemsRecord`, `applyDragEnd`, etc.) operando sobre o mapa completo de ids; a fatia é responsabilidade da camada de feature/UI.

## Alternativas consideradas

| Alternativa                              | Por que não é a escolha principal                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Paginação clássica por páginas na coluna | UX pobre para coluna vertical tipo Kanban; conflita com expectativa de scroll contínuo. |
| Apenas otimização de render (memo)       | Não reduz o número de nós DOM/sortables de forma suficiente.                            |
| Virtualizar todas as colunas de imediato | Escopo maior; o problema costuma concentrar-se em Concluído.                            |

## Consequências

**Positivas**

- Performance do app escala melhor com histórico grande de tarefas concluídas.
- Persistência e contrato GitHub permanecem estáveis.

**Trade-offs aceitos**

- Maior complexidade na integração entre lista virtual e `@dnd-kit`.
- Testes adicionais para arrastar soltar em lista virtualizada.

## Guardrails

- Ordem canônica dos cards continua definida pelo documento; UI não pode persistir apenas subconjunto sem reconciliar com o estado completo após DnD.
- Cabeçalho da coluna deve mostrar o total real de cards, não só os visíveis.

## Status de vigência

- **Aceito** — decisão de produto/engineering: opção **A** (virtualização); implementação no app deve seguir esta direção.
