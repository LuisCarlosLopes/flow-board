# Especificação técnica — Feature flags de preview

**Slug:** `preview-feature-flags`  
**Track:** FEATURE  
**Baseline:** commit `044b119d13ccc1e4cfe43eb3e992a6a42ea0273b`

## 1. Problema e objetivo

Novas funcionalidades precisam de um mecanismo uniforme para serem desenvolvidas atrás de um interruptor, visível apenas como **preview** para utilizadores que optem por as ativar. O produto não dispõe de backend de configuração; as preferências devem viver no cliente, sem gravar dados de domínio no GitHub.

**Objetivo:** registo canónico de flags, painel de pré-visualizações na shell autenticada, toggles persistentes por browser, e API única para o código consultar se uma preview está ativa.

## 2. Comportamento visível

1. **Controlo discreto:** Na área principal pós-login (`AppShell`), junto às ações existentes da topbar (ou imediatamente abaixo, na `fb-board-bar`), existe um controlo pouco intrusivo — por exemplo ícone “laboratório” ou texto curto “Previews” — que abre um painel (modal ou painel lateral).
2. **Lista:** O painel mostra **apenas** funcionalidades com `lifecycle: 'preview'`. Cada linha tem título, descrição curta opcional e um interruptor (on/off).
3. **Persistência:** O estado ligado/desligado persiste em `localStorage` (mesmo padrão defensivo que `themeStore` e `boardSelectionStore`: try/catch, fallback silencioso em quota/modo privado).
4. **Funcionalidades definitivas:** Entradas com `lifecycle: 'stable'` **não** aparecem no painel. Continuam definidas no registo apenas para o código usar `isFeatureEnabled(id)` de forma homogénea; o utilizador não as configura por este UI.

## 3. Contratos

### 3.1 Identificador

- `FeatureFlagId`: string literal branda (ex.: `'hours_csv_export_preview'`), definida como union a partir do registo ou como `const` objects para evitar typos.

### 3.2 Definição de flag

```typescript
type FeatureLifecycle = 'preview' | 'stable'

type FeatureFlagDefinition = {
  /** Chave estável; única no registo. */
  id: string
  /** Título curto para o painel (só preview). */
  title: string
  /** Descrição opcional para o painel. */
  description?: string
  /** Default quando não há entrada em storage ou primeira visita. */
  defaultEnabled: boolean
  lifecycle: FeatureLifecycle
}
```

### 3.3 Registo

- Ficheiro único canónico, ex.: `apps/flowboard/src/infrastructure/featureFlags/featureFlagRegistry.ts` (ou `src/domain/featureFlags/registry.ts` se preferir domínio puro só com tipos + lista; a persistência fica em `infrastructure`).
- Exporta:
  - `FEATURE_FLAG_REGISTRY: readonly FeatureFlagDefinition[]` (ou mapa por id)
  - `getFeatureFlagDefinition(id: string): FeatureFlagDefinition | undefined`
  - `listPreviewFlags(): FeatureFlagDefinition[]` — filtra `lifecycle === 'preview'`

### 3.4 Preferências persistidas

- Chave de storage: prefixo versionado, ex.: `flowboard.featureFlags.v1`
- Valor: objeto JSON `{ [flagId: string]: boolean }` apenas para flags que o utilizador alterou em relação ao default **ou** sempre todas as preview (decisão de implementação: recomenda-se guardar só overrides para minimizar tamanho; ao ler, merge com defaults do registo).

Funções puras recomendadas (testáveis):

- `parseFeatureFlagOverrides(raw: string | null): Record<string, boolean>`
- `mergeFlagState(def: FeatureFlagDefinition, overrides: Record<string, boolean>): boolean`
- `serializeOverrides(overrides: Record<string, boolean>): string`

### 3.5 API de leitura para features

- `isFeatureEnabled(id: FeatureFlagId): boolean` — usa registo + overrides em memória ou lê storage (preferir hook React `useFeatureFlag(id)` que subscreve a um store/context ou `storage` event se necessário para sincronizar abas).
- Para código fora de React: funções em módulo que leem o mesmo store (ou injeção de getter em testes).

**Invariante:** Para `lifecycle === 'stable'`, `isFeatureEnabled(id)` deve devolver `true` por omissão (ou o valor fixo definido no registo se algum dia existir stable “desligável” — **fora de escopo**; neste spec, stable = sempre ligado para efeitos de produto).

### 3.6 UI

- Componente dedicado, ex.: `PreviewFeaturesModal` ou `PreviewFeaturesPanel`, acionado pelo botão discreto.
- Acessibilidade: foco preso no modal, `aria-modal`, fechar com Esc, rótulos nos switches.
- `data-testid` nos elementos críticos (abrir painel, lista vazia, toggle por id).

## 4. Regras de negócio

| Regra | Descrição |
|--------|-----------|
| R1 | Só `lifecycle === 'preview'` entram na lista do painel. |
| R2 | Ao promover uma feature de preview para stable, atualizar o registo; a entrada deixa de aparecer no painel; utilizadores que tinham preview off podem passar a ver sempre a funcionalidade (comportamento esperado de “GA”). |
| R3 | Defaults vêm do registo; overrides do utilizador só se aplicam a previews listadas (ids desconhecidos em storage são ignorados). |
| R4 | Não escrever preferências de flags no repositório GitHub nem em ficheiros `flowboard/` de dados. |

## 5. Casos extremos

- **Primeira visita:** todos os previews usam `defaultEnabled` do registo; storage vazio.
- **Storage corrupto / JSON inválido:** tratar como sem overrides; log opcional em dev apenas.
- **Id obsoleto em storage:** ignorar chaves que não existem no registo atual.
- **Registo sem previews:** o botão discreto pode abrir painel com estado vazio (“Não há pré-visualizações disponíveis”) ou ocultar o botão — **decisão:** mostrar botão com estado vazio mantém UI estável para equipa; alternativa documentada no plano como opcional de produto.

## 6. Fora de escopo

- Feature flags remotas, percentagem roll-out, A/B.
- Sincronização entre dispositivos ou utilizadores.
- Auditoria server-side.

## 7. Riscos

- **Fragmentação de estado:** várias abas — recomenda escutar `storage` para atualizar toggles (opcional MVP: documentar “recarregar página”).
- **Esquecimento de gate:** code review deve exigir uso de `isFeatureEnabled` / hook em ramos novos.

## 8. Rastreio aos critérios de aceite

| Critério (state.yaml) | Secção |
|------------------------|--------|
| Registo canónico | §3.2–3.3 |
| Toggle + persistência local | §2, §3.4 |
| Controlo discreto na shell | §2, §3.6 |
| Só preview na lista | R1 |
| Consulta centralizada | §3.5 |
| Testes | §3.4 funções puras + hook/store |

## 9. Dependências

- Nenhuma nova dependência npm obrigatória.
- Alinhado à Constitution: dados de domínio não misturados com prefs; inglês no código, documento em português.
