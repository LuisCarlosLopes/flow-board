# Guia Completo de Arquitetura para Proteger Personal Access Tokens (PATs) em Next.js (App Router)

> **Escopo**: Login com PAT do GitHub (fine‑grained ou classic) e PAT do Azure DevOps em aplicações Next.js 14/15 com App Router, usando Auth.js v5 (NextAuth) e o ecossistema Vercel/Node.js. Cobre arquitetura, Route Handlers, middleware, segredos, cookies, CSRF/XSS, exemplos de código e auditoria.

---

## 1. Princípios fundamentais antes de escrever uma linha de código

Antes de qualquer detalhe de implementação, há três regras inegociáveis para PATs.

**(a) PAT é equivalente a senha.** A documentação oficial do GitHub e do Azure DevOps dizem isso textualmente: "Treat your access tokens like passwords" e "Treat PATs with the same level of caution as passwords" ([GitHub Docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), [Microsoft Learn](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops)). Isso implica nunca enviar PATs ao navegador, nunca persistir em `localStorage`, nunca incluir em logs e nunca expor em respostas de erro.

**(b) Princípio do menor privilégio + expiração curta.** O GitHub recomenda PATs *fine‑grained* com escopos mínimos e expiração mínima ([GitHub Docs](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure)). O Azure DevOps permite até 1 ano, mas a orientação prática é 30–90 dias e o uso preferencial de Microsoft Entra tokens, que duram apenas 1 hora ([Microsoft DevBlogs](https://devblogs.microsoft.com/devops/reducing-pat-usage-across-azure-devops/), [OneUptime](https://oneuptime.com/blog/post/2026-02-16-how-to-configure-azure-devops-personal-access-tokens-and-manage-token-lifecycle-security/view)).

**(c) Backend‑for‑Frontend (BFF) é o padrão correto.** O IETF e a OWASP recomendam que SPAs nunca armazenem tokens no navegador; em vez disso, um servidor confiável (BFF) detém o token e expõe ao cliente apenas um *cookie de sessão* opaco e `HttpOnly` ([Duende Software Docs](https://docs.duendesoftware.com/bff/), [Skycloak](https://skycloak.io/blog/keycloak-backend-for-frontend-bff-pattern/)). Em Next.js App Router, o "BFF" é literalmente seus Server Components, Server Actions e Route Handlers ([Next.js Docs — BFF](https://nextjs.org/docs/app/guides/backend-for-frontend), [Cyber Sierra](https://cybersierra.co/blog/secure-nextjs-bff-sessions/)).

> **Nota arquitetural**: Tanto o GitHub quanto a Microsoft estão *desencorajando* PATs em favor de GitHub Apps/OAuth e Microsoft Entra OAuth, respectivamente, justamente porque PATs são credenciais de longa duração com alto blast‑radius ([Microsoft DevBlogs](https://devblogs.microsoft.com/devops/reducing-pat-usage-across-azure-devops/), [Microsoft Learn — Authentication Methods](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/authentication-guidance?view=azure-devops)). Considere o fluxo PAT como ponte tática enquanto migra para OAuth/Entra ID quando possível.

---

## 2. Arquitetura segura do fluxo PAT no Next.js App Router

### 2.1 Fronteira servidor/cliente: Server Components vs. Client Components

No App Router, o código vive em dois "universos" isolados de módulos: o **runtime de servidor** (Node.js/Edge) tem acesso a `process.env`, segredos, banco de dados, e o **runtime de cliente** (browser) deve ser tratado com as mesmas suposições de segurança que código não confiável ([Next.js — Data Security](https://nextjs.org/docs/app/guides/data-security)). A documentação oficial é categórica: Server Components "Run only on the server. Can safely access environment variables, secrets, databases, and internal APIs", enquanto Client Components "must follow the same security assumptions as code running in the browser. Must not access privileged data or server‑only modules" ([Next.js — Data Security](https://nextjs.org/docs/app/guides/data-security)).

Para um PAT, isso se traduz em três regras práticas:

1. **O PAT só pode ser lido em código de servidor** (Server Component, Server Action, Route Handler, middleware/proxy).
2. **Nunca passe o PAT como prop para um Client Component** — qualquer prop atravessa a borda de serialização e termina no bundle/HTML enviado ao browser.
3. **Nunca passe o PAT em `searchParams`, query strings ou URLs**, porque headers `Referer`, logs de proxy reverso e analytics podem capturá‑los.

### 2.2 `NEXT_PUBLIC_` vs. variáveis privadas

Esta é a fonte #1 de vazamento acidental de segredos em Next.js. As regras oficiais:

- Variáveis sem prefixo (`AUTH_SECRET`, `GITHUB_PAT`, `AZURE_DEVOPS_PAT`) só existem no **runtime de servidor** ([Next.js — Environment Variables](https://nextjs.org/docs/pages/guides/environment-variables)).
- Variáveis prefixadas com `NEXT_PUBLIC_` são **inlined** (substituídas literalmente) no bundle JavaScript no momento de `next build` e enviadas ao navegador ([Next.js — Environment Variables](https://nextjs.org/docs/pages/guides/environment-variables), [LogRocket](https://blog.logrocket.com/configure-environment-variables-next-js/)).
- A configuração `env` em `next.config.js` **também** inclui o valor no bundle do cliente, **mesmo sem o prefixo `NEXT_PUBLIC_`** ([Next.js — next.config.js env](https://nextjs.org/docs/app/api-reference/config/next-config-js/env), [LogRocket](https://blog.logrocket.com/configure-environment-variables-next-js/)).

> **Regra absoluta**: nunca use `NEXT_PUBLIC_` em nenhuma variável que contenha um PAT, um `clientSecret`, uma chave HMAC/JWT, ou qualquer credencial. Após `next build`, sempre faça uma busca por `grep -r "ghp_\|gho_\|ghu_\|ghs_\|github_pat_" .next/` e por valores parciais do PAT no bundle para confirmar que nada vazou ([Medium — Bale](https://medium.com/@bloodturtle/managing-environment-variables-in-next-js-protecting-sensitive-information-95ba60910d56)).

### 2.3 O padrão BFF aplicado a PATs

O fluxo BFF para PATs em Next.js é:

```
Browser  ──(HTTPS, formulário com PAT)──►  Next.js Route Handler (servidor)
                                              │
                                              │ valida PAT contra GitHub/Azure DevOps API
                                              │ se válido: cria sessão (JWT/registro DB)
                                              │ armazena PAT criptografado server‑side
                                              ▼
Browser  ◄──(Set‑Cookie: HttpOnly, Secure, SameSite=Lax, sessão opaca)──
```

A partir desse momento, o navegador **nunca mais vê o PAT**; só carrega o cookie de sessão. Toda chamada autenticada ao GitHub/Azure DevOps é feita por Server Components ou Route Handlers que recuperam o PAT do armazenamento server‑side ([Cyber Sierra](https://cybersierra.co/blog/secure-nextjs-bff-sessions/), [Skycloak](https://skycloak.io/blog/keycloak-backend-for-frontend-bff-pattern/), [DEV — damikun](https://dev.to/damikun/web-app-security-understanding-the-meaning-of-the-bff-pattern-i85)).

Essa separação resolve simultaneamente: (1) impossibilidade de roubo via XSS (o token não é JS‑acessível), (2) CSRF mitigado por `SameSite`, (3) revogação simples (apaga o registro de sessão server‑side), (4) auditoria centralizada de uso ([Duende](https://docs.duendesoftware.com/bff/)).

### 2.4 Marcando módulos como server‑only

O pacote `server-only` (publicado no npm pelo time do React) é uma defesa extra. Importá‑lo em um arquivo causa **erro de build** se esse arquivo for incluído acidentalmente em um Client Component ([Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Builder.io](https://www.builder.io/blog/server-only-next-app-router)):

```ts
// lib/pat-store.ts
import 'server-only';

export async function getDecryptedPat(sessionId: string): Promise<string> {
  // só acessível no servidor; build falha se importado no cliente
  // ...
}
```

Toda a "Data Access Layer" (DAL) que toca PATs deve começar com `import 'server-only'` ([Next.js — Authentication](https://nextjs.org/docs/app/guides/authentication), [Makerkit](https://makerkit.dev/blog/tutorials/server-only-code-nextjs)).

---

## 3. Validação e troca do PAT por sessão

### 3.1 Estratégia: receber → validar → trocar por sessão → descartar/criptografar

O fluxo recomendado é:

1. **Receber** o PAT em uma única requisição POST HTTPS para `/api/auth/pat-login` (Route Handler).
2. **Validar** chamando a API do provedor. No GitHub, `GET https://api.github.com/user` com header `Authorization: Bearer <PAT>` retorna 200 + dados do usuário se o token é válido, ou 401 caso contrário ([GitHub Docs — Authenticating to REST API](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api)). No Azure DevOps, o PAT é enviado em **Basic auth** (username vazio, senha = PAT, codificado em Base64); um endpoint comum para validar é `GET https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1` ([Microsoft Learn — Use PATs](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops), [TechTarget](https://www.techtarget.com/searchcloudcomputing/tip/A-practical-guide-to-PATs-in-Azure-DevOps)).
3. **Criar uma sessão server‑side** com um token de sessão *opaco* (JWT assinado, ou ID que aponta para um registro em banco/Redis). O PAT é armazenado encriptado em banco/cofre, indexado pelo ID de sessão.
4. **Definir cookie** `HttpOnly`, `Secure`, `SameSite=Lax`, com expiração ≤ expiração do PAT.
5. **Descartar** o PAT em texto‑claro da memória da requisição (não passar adiante, não logar).

> **Regra OWASP**: nunca armazene PATs ou JWTs em `localStorage`/`sessionStorage`/`cookies sem HttpOnly`/state do React. A OWASP HTML5 Cheat Sheet adverte explicitamente: "A single Cross Site Scripting can be used to steal all the data in these objects, so it's recommended not to store sensitive information in local storage" ([OWASP HTML5 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html), [OWASP JWT Java](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)).

### 3.2 Auth.js v5 (NextAuth) com Credentials Provider para PAT

Auth.js v5 (`next-auth@5`) é a maneira idiomática de implementar isso. O `Credentials` provider permite que você defina uma função `authorize()` que recebe o PAT do usuário e devolve um objeto `user` se ele for válido — Auth.js cuida do resto (cookie HttpOnly, JWT, CSRF, sessão) ([Auth.js — Credentials Provider](https://next-auth.js.org/providers/credentials), [Auth.js — Migrating to v5](https://authjs.dev/getting-started/migrating-to-v5)).

Pontos de atenção em v5:

- Variáveis de ambiente são auto‑detectadas com prefixo `AUTH_` (ex.: `AUTH_SECRET`, `AUTH_GITHUB_ID`); `NEXTAUTH_*` ainda funciona via aliases ([Auth.js — Migrating to v5](https://authjs.dev/getting-started/migrating-to-v5)).
- Use `session: { strategy: 'jwt' }` (obrigatório com Credentials provider, pois usuários não são persistidos automaticamente em DB) ([NextAuth.js — Credentials](https://next-auth.js.org/providers/credentials)).
- A sessão JWT é assinada e armazenada num cookie HttpOnly por padrão; nunca exponha o PAT no payload do JWT — armazene apenas um ID/`userId` e use `session()`/`jwt()` callbacks para mapear. O PAT cru fica em armazenamento server‑side separado (DB/Redis/Key Vault) ([NextAuth.js Discussion #1860](https://github.com/nextauthjs/next-auth/discussions/1860)).

Esqueleto de `auth.ts` (raiz do projeto):

```ts
// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { validateGithubPat, validateAzdoPat } from "@/lib/pat-validators";
import { storeEncryptedPat } from "@/lib/pat-store";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h
  providers: [
    Credentials({
      id: "github-pat",
      name: "GitHub PAT",
      credentials: {
        pat: { label: "Personal Access Token", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z.object({ pat: z.string().min(20).max(255) }).safeParse(credentials);
        if (!parsed.success) return null;

        const profile = await validateGithubPat(parsed.data.pat);
        if (!profile) return null;

        // armazena o PAT cifrado fora do JWT
        const sessionRef = await storeEncryptedPat({
          provider: "github",
          userId: profile.id.toString(),
          pat: parsed.data.pat,
          scopes: profile.scopes,
        });

        return {
          id: profile.id.toString(),
          name: profile.login,
          email: profile.email ?? null,
          image: profile.avatar_url,
          // referência opaca, NÃO o PAT
          patRef: sessionRef.id,
        };
      },
    }),
    Credentials({
      id: "azdo-pat",
      name: "Azure DevOps PAT",
      credentials: {
        pat: { label: "Personal Access Token", type: "password" },
        organization: { label: "Organization", type: "text" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({ pat: z.string().min(20), organization: z.string().min(1) })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const profile = await validateAzdoPat(parsed.data.pat, parsed.data.organization);
        if (!profile) return null;

        const sessionRef = await storeEncryptedPat({
          provider: "azure-devops",
          userId: profile.id,
          pat: parsed.data.pat,
          organization: parsed.data.organization,
        });

        return {
          id: profile.id,
          name: profile.displayName,
          email: profile.emailAddress,
          patRef: sessionRef.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.patRef = (user as any).patRef;
        token.provider = (user as any).provider;
      }
      return token;
    },
    async session({ session, token }) {
      // NUNCA inclua o PAT cru aqui
      (session as any).patRef = token.patRef;
      return session;
    },
    authorized: async ({ auth }) => !!auth, // para o middleware/proxy
  },
});
```

### 3.3 Validadores: chamadas reais às APIs

```ts
// lib/pat-validators.ts
import 'server-only';

export async function validateGithubPat(pat: string) {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "your-app/1.0",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const scopes = res.headers.get("x-oauth-scopes")?.split(",").map(s => s.trim()) ?? [];
  const profile = await res.json();
  return { ...profile, scopes };
}

export async function validateAzdoPat(pat: string, organization: string) {
  // Azure DevOps usa Basic com username vazio
  const auth = Buffer.from(`:${pat}`).toString("base64");
  const res = await fetch(
    `https://dev.azure.com/${encodeURIComponent(organization)}/_apis/connectionData?api-version=7.1`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return {
    id: data.authenticatedUser?.id,
    displayName: data.authenticatedUser?.providerDisplayName,
    emailAddress: data.authenticatedUser?.properties?.Account?.$value,
  };
}
```

A documentação do GitHub confirma o formato `Authorization: Bearer <token>` e `Authorization: token <token>` para REST API ([GitHub Docs — REST authentication](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api)). A Microsoft confirma o formato Basic auth com username vazio para Azure DevOps ([Microsoft Learn — Use PATs](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops)).

> **Atenção a uma armadilha**: a documentação do GitHub avisa que muitas tentativas de autenticação com credencial inválida causam `403 Forbidden` temporário, "After detecting several requests with invalid credentials within a short period, the API will temporarily reject all authentication attempts for that user (including ones with valid credentials)" ([GitHub Docs — REST authentication](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api)). Ou seja, **não** valide PATs em loop sem rate‑limit no seu lado.

---

## 4. Middleware (Next.js 15) / Proxy (Next.js 16)

### 4.1 Mudança de nomenclatura entre versões

Em **Next.js 12–15**, o arquivo é `middleware.ts` na raiz e exporta `function middleware()` ([Authgear](https://www.authgear.com/post/nextjs-middleware-authentication)). Em **Next.js 16**, o arquivo passou a se chamar `proxy.ts` e a função `proxy`; um codemod automatiza a migração: `npx @next/codemod@canary middleware-to-proxy` ([Authgear](https://www.authgear.com/post/nextjs-middleware-authentication), [Clerk Docs](https://clerk.com/docs/nextjs/getting-started/quickstart)). O resto da semântica é igual.

### 4.2 ⚠️ CVE‑2025‑29927: uma lição obrigatória sobre middleware

Em março de 2025 foi divulgada uma vulnerabilidade crítica (CVSS 9.1) que **bypassa qualquer lógica em middleware** via o header interno `x-middleware-subrequest`. Versões afetadas: < 12.3.5, < 13.5.9, < 14.2.25, < 15.2.3 ([Vercel Postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass), [Datadog Security Labs](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/), [JFrog](https://jfrog.com/blog/cve-2025-29927-next-js-authorization-bypass/), [NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-29927)).

**Implicações arquiteturais permanentes**:

1. **Atualize sempre** para versões patcheadas (15.2.3+, 14.2.25+, etc.) ([Vercel Postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)).
2. **Nunca confie apenas em middleware para autenticação ou autorização**. Use middleware para *checks otimistas* (redirecionar usuários não logados para `/login`), mas a verificação de fato deve ocorrer no Server Component, Route Handler ou Server Action que toca os dados — o padrão Data Access Layer ([Next.js — Authentication](https://nextjs.org/docs/app/guides/authentication), [Clerk Articles](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router)).
3. **Configure o reverse proxy** (Nginx, Cloudflare, ALB) para *strip* o header `x-middleware-subrequest` em requisições de entrada ([OffSec](https://www.offsec.com/blog/cve-2025-29927/), [Picus Security](https://www.picussecurity.com/resource/blog/cve-2025-29927-nextjs-middleware-bypass-vulnerability)).

### 4.3 Middleware de sessão otimista (Auth.js v5)

```ts
// middleware.ts (Next.js ≤15) ou proxy.ts (Next.js 16+)
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login");
  const isProtected =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/api/proxy");

  if (!req.auth && isProtected) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (req.auth && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  // Não roda em static/_next/api de auth — Auth.js cuida desses
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

A documentação do Auth.js mostra exatamente esse padrão ([Auth.js — Protecting](https://authjs.dev/getting-started/session-management/protecting), [Auth.js — Nextjs Reference](https://authjs.dev/reference/nextjs)).

### 4.4 Rate limiting & proteção contra brute force

O endpoint que recebe PATs é alvo natural de força bruta. A documentação oficial do Next.js sobre BFF recomenda rate limiting nas Route Handlers ([Next.js — BFF](https://nextjs.org/docs/app/guides/backend-for-frontend)). Implementação canônica usa Upstash Redis + `@upstash/ratelimit` ([Upstash Blog](https://upstash.com/blog/nextjs-ratelimiting), [Peerlist](https://peerlist.io/blog/engineering/how-to-implement-rate-limiting-in-nextjs)):

```ts
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const patLoginLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  // 5 tentativas em 5 minutos por IP é um ponto de partida razoável
  limiter: Ratelimit.slidingWindow(5, "5 m"),
  analytics: true,
  prefix: "ratelimit:pat-login",
});
```

Use **sliding window** para PAT login (smoother, sem spikes na borda da janela), e **fixed window** para uso geral de API ([Upstash Blog](https://upstash.com/blog/nextjs-ratelimiting)). Considere também `serverActions.bodySizeLimit` em `next.config.js` para bloquear payloads gigantes em Server Actions ([Next.js — serverActions config](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)).

---

## 5. Cookies e tokens de sessão

A configuração canônica para o cookie que armazena a sessão (não o PAT!):

| Atributo | Valor recomendado | Razão |
|---|---|---|
| `HttpOnly` | `true` | Bloqueia acesso via `document.cookie` em XSS ([OWASP HTML5](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html), [DEV — mohsenfallahnjd](https://dev.to/mohsenfallahnjd/understanding-httponly-cookies-in-depth-10oc)) |
| `Secure` | `true` em produção | Só transmite por HTTPS ([Authgear — Sessions](https://www.authgear.com/post/nextjs-session-management)) |
| `SameSite` | `Lax` (default) ou `Strict` para fluxos sensíveis | CSRF mitigation; `None` exige `Secure` ([Barrion](https://barrion.io/blog/cookie-security-best-practices)) |
| `Path` | `/` | Todo o app |
| `Max-Age`/`expires` | ≤ expiração do JWT/PAT | Sessões longas são liability ([Authgear](https://www.authgear.com/post/nextjs-session-management)) |
| Nome | `__Host-` ou `__Secure-` prefix | Browsers rejeitam reescrita por subdomínios |

A API `cookies()` do Next.js (em `next/headers`) é a forma idiomática de definir/ler cookies em Server Actions e Route Handlers ([Next.js — cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)):

```ts
import { cookies } from "next/headers";

const cookieStore = await cookies();
cookieStore.set({
  name: "__Host-app-session",
  value: signedJwt,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 8, // 8h
});
```

> Nota Next.js 15: `cookies()` agora é assíncrono (`await cookies()`), embora o uso síncrono seja temporariamente compatível ([Next.js — cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)).

Para sessões JWT *fora* do Auth.js, use `jose` (edge‑compatível, ao contrário de `jsonwebtoken`) ([Authgear](https://www.authgear.com/post/nextjs-session-management)):

```ts
// lib/session.ts
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function encryptSession(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function decryptSession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}
```

---

## 6. Segredos e variáveis de ambiente

### 6.1 Hierarquia em Next.js

Next.js carrega `.env.local` (não‑commit), `.env.development`, `.env.production`, `.env.test` baseado em `NODE_ENV`, com `.env.local` tendo prioridade ([LogRocket](https://blog.logrocket.com/configure-environment-variables-next-js/), [Next.js — Environment Variables](https://nextjs.org/docs/pages/guides/environment-variables)). `.env.local` deve estar no `.gitignore` por padrão.

Estrutura segura sugerida:

```bash
# .env.example  (commitado, sem valores reais)
AUTH_SECRET=
SESSION_SECRET=
PAT_ENCRYPTION_KEY=
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
KEY_VAULT_URL=

# .env.local  (NUNCA commitado)
AUTH_SECRET="32-byte-base64-random"
SESSION_SECRET="outro-32-byte-base64"
PAT_ENCRYPTION_KEY="32-byte-base64-AES-256-GCM-key"
DATABASE_URL="postgres://..."
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
KEY_VAULT_URL="https://my-vault.vault.azure.net"
```

> **Não use** `process.env.MEU_SEGREDO` espalhado pelo código. Centralize em um único módulo `lib/env.ts` (com validação Zod) que só é importado de código server‑only. Isso é a recomendação oficial do Next.js: "Secret keys should be stored in environment variables, but only the Data Access Layer should access process.env. This keeps secrets from being exposed to other parts of the application" ([Next.js — Data Security](https://nextjs.org/docs/app/guides/data-security)).

### 6.2 Cofres de segredo em produção

**Azure Key Vault** — recomendado quando hospedando em Azure (App Service / Container Apps / AKS) com Managed Identity, eliminando até a necessidade de variáveis de ambiente para segredos:

```ts
// lib/azure-secrets.ts
import 'server-only';
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

const credential = new DefaultAzureCredential();
const client = new SecretClient(process.env.KEY_VAULT_URL!, credential);

export async function getSecret(name: string): Promise<string> {
  const result = await client.getSecret(name);
  if (!result.value) throw new Error(`Missing secret: ${name}`);
  return result.value;
}
```

`DefaultAzureCredential` automaticamente usa Managed Identity em Azure e Azure CLI/env vars em desenvolvimento local ([Microsoft Learn — Azure Key Vault Node](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-node), [Microsoft Learn — Key Vault Secrets JS](https://learn.microsoft.com/en-us/javascript/api/overview/azure/keyvault-secrets-readme?view=azure-node-latest)). Cache os segredos em memória do servidor com TTL para evitar chamadas em todo request.

**HashiCorp Vault** — recomendado em ambientes multi‑cloud ou on‑prem. GitGuardian fornece exemplos para Azure DevOps PATs especificamente ([GitGuardian](https://www.gitguardian.com/remediation/azure-devops-personal-access-token)).

**GitHub Actions Secrets** — para credenciais usadas em CI/CD que injetam variáveis no build/deploy do Vercel/Azure ([GitHub Docs — Keeping API credentials secure](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure)).

### 6.3 Verificação anti‑vazamento pós‑build

Adicione um step de CI:

```bash
# scripts/check-bundle.sh
set -euo pipefail
next build
# Procura prefixos típicos de PAT em todo o output do bundle do cliente
if grep -rE "ghp_|gho_|github_pat_|^\\s*\"[A-Za-z0-9]{52}\"" .next/static/ ; then
  echo "❌ Possível PAT no bundle cliente!"
  exit 1
fi
echo "✅ Bundle limpo"
```

A documentação do Next.js explicitamente recomenda "Always verify the build output: After building your application, always check the client‑side bundle to ensure that no sensitive information has been included" ([Medium — Bale](https://medium.com/@bloodturtle/managing-environment-variables-in-next-js-protecting-sensitive-information-95ba60910d56)).

---

## 7. Proteção contra ataques específicos

### 7.1 CSRF

Há **três camadas** que o Next.js já fornece e que você deve reforçar:

1. **Server Actions** comparam automaticamente o `Origin` header contra `Host`/`X-Forwarded-Host`; se diferentes, a action é abortada. Apenas POST é aceito ([Next.js — Data Security](https://nextjs.org/docs/app/guides/data-security), [Next.js — serverActions config](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions), [Next.js — Security blog](https://nextjs.org/blog/security-nextjs-server-components-actions)). Configure `serverActions.allowedOrigins` se você usar reverse proxy com domínios diferentes.
2. **Cookies `SameSite=Lax`** bloqueiam o envio do cookie em POST cross‑site ([Telerik](https://www.telerik.com/blogs/protecting-nextjs-applications-cross-site-request-forgery-csrf-attacks), [Barrion](https://barrion.io/blog/cookie-security-best-practices)).
3. **Para Route Handlers** (`route.ts`) que aceitam POST com PAT, a proteção CSRF **não é automática** — você precisa fazê‑la manualmente ([Next.js — Security blog](https://nextjs.org/blog/security-nextjs-server-components-actions)). Recomendado: cookie double‑submit ou biblioteca `edge-csrf`. Em endpoints recebem PAT, exija também:
   - Header `X-Requested-With: XMLHttpRequest` (rejeitar requests sem ele).
   - Validar `Origin`/`Referer` server‑side.
   - Token CSRF em hidden field validado contra cookie sob HMAC.

> **Bug conhecido (geeknik/nextjs-csrf-case-sensitivity-repro)**: a comparação de Origin vs Host em Server Actions não é case‑insensitive em algumas versões, gerando falsos positivos quando hostnames têm letras maiúsculas. Normalize lowercase no proxy ([GitHub Issue](https://github.com/geeknik/nextjs-csrf-case-sensitivity-repro)).

### 7.2 XSS

Como o cookie de sessão é `HttpOnly`, mesmo um XSS bem‑sucedido não pode roubá‑lo ([DEV — HttpOnly Cookies](https://dev.to/mohsenfallahnjd/understanding-httponly-cookies-in-depth-10oc), [OWASP HTML5](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)). Mas atenção:

- O endpoint `/api/auth/session` do Auth.js **expõe a sessão ao cliente** via fetch JS. Use a callback `session()` para garantir que **o PAT/refresh token não esteja no payload**, apenas dados públicos ([NextAuth.js Discussion #1860](https://github.com/nextauthjs/next-auth/discussions/1860)).
- Configure CSP no `next.config.js`/`headers()`: `default-src 'self'; script-src 'self' 'nonce-...'`. Isso reduz o impacto de qualquer XSS bem‑sucedido ([Yagiz](https://www.yagiz.co/securing-your-nextjs-13-application/)).
- Adicione `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` ([Yagiz](https://www.yagiz.co/securing-your-nextjs-13-application/)).
- Use `experimental_taintUniqueValue` (React experimental API) para impedir que o PAT acidentalmente flua para um Client Component ([Next.js — Data Security](https://nextjs.org/docs/app/guides/data-security)).

### 7.3 Roubo de cookie / session hijacking

Além de `HttpOnly`/`Secure`/`SameSite`:

- **Sliding session**: re‑emita o cookie a cada request com nova expiração para que sessões inativas expirem ([Authgear — Sessions](https://www.authgear.com/post/nextjs-session-management)).
- **Token rotation**: ao detectar mudança suspeita (User‑Agent, IP grande variação), invalide a sessão e force novo login ([Barrion](https://barrion.io/blog/cookie-security-best-practices), [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)). A OWASP avisa contudo que IP por si só não é confiável (mobile users mudam de rede).
- **Logout efetivo**: como JWT é stateless, mantenha uma denylist server‑side de session IDs revogados, ou implemente sessões stateful (sessão em DB, cookie só carrega ID) — a OWASP recomenda essa abordagem ([OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)).

---

## 8. Exemplos práticos completos

### 8.1 Route Handler que recebe PAT, valida e cria sessão

```ts
// app/api/auth/pat-login/route.ts
import 'server-only';
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers, cookies } from "next/headers";
import { signIn } from "@/auth";
import { patLoginLimiter } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

const Body = z.object({
  provider: z.enum(["github-pat", "azdo-pat"]),
  pat: z.string().min(20).max(255),
  organization: z.string().optional(), // requerido para azdo-pat
});

export async function POST(req: NextRequest) {
  // CSRF defense: confere Origin contra Host
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin || !host || new URL(origin).host.toLowerCase() !== host.toLowerCase()) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  // Rate limit por IP
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success, remaining } = await patLoginLimiter.limit(ip);
  if (!success) {
    await auditLog({
      event: "pat.login.rate_limited",
      ip,
      severity: "warn",
    });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // IMPORTANTE: nunca logar o PAT em si — apenas metadados
  const patFingerprint = await sha256Hex(parsed.data.pat).then(h => h.slice(0, 12));

  try {
    // signIn do Auth.js v5 com Credentials provider
    const result = await signIn(parsed.data.provider, {
      ...parsed.data,
      redirect: false,
    });

    if (result?.error) {
      await auditLog({
        event: "pat.login.failed",
        provider: parsed.data.provider,
        ip,
        patFingerprint,
        reason: result.error,
        severity: "warn",
      });
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    await auditLog({
      event: "pat.login.success",
      provider: parsed.data.provider,
      ip,
      patFingerprint,
      severity: "info",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Não exponha detalhes do erro ao cliente
    await auditLog({
      event: "pat.login.error",
      provider: parsed.data.provider,
      ip,
      patFingerprint,
      message: err instanceof Error ? err.message : "unknown",
      severity: "error",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function sha256Hex(s: string) {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
```

### 8.2 Armazenamento criptografado de PAT (AES‑256‑GCM)

```ts
// lib/pat-store.ts
import 'server-only';
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { db } from "@/lib/db";

const KEY = Buffer.from(process.env.PAT_ENCRYPTION_KEY!, "base64");
if (KEY.length !== 32) throw new Error("PAT_ENCRYPTION_KEY must be 32 bytes (base64)");

export async function storeEncryptedPat(input: {
  provider: "github" | "azure-devops";
  userId: string;
  pat: string;
  organization?: string;
  scopes?: string[];
}) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(input.pat, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const record = await db.patSession.create({
    data: {
      provider: input.provider,
      userId: input.userId,
      organization: input.organization,
      scopes: input.scopes ?? [],
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      // expira a sessão antes do PAT em si
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    },
  });
  return { id: record.id };
}

export async function getDecryptedPat(sessionRefId: string): Promise<string | null> {
  const r = await db.patSession.findUnique({ where: { id: sessionRefId } });
  if (!r || r.expiresAt < new Date()) return null;

  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(r.iv, "base64"));
  decipher.setAuthTag(Buffer.from(r.authTag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(r.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}
```

### 8.3 Server Component que usa PAT armazenado server‑side

Esse padrão respeita "nunca expor PAT ao cliente" porque o Server Component só envia o resultado já transformado:

```tsx
// app/dashboard/repos/page.tsx
import 'server-only';
import { auth } from "@/auth";
import { getDecryptedPat } from "@/lib/pat-store";
import { redirect } from "next/navigation";
import { auditLog } from "@/lib/audit";

export default async function ReposPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const patRef = (session as any).patRef as string | undefined;
  if (!patRef) redirect("/login");

  const pat = await getDecryptedPat(patRef);
  if (!pat) redirect("/login");

  await auditLog({
    event: "pat.use",
    provider: "github",
    userId: session.user?.id,
    operation: "list_repos",
    severity: "info",
  });

  const res = await fetch("https://api.github.com/user/repos?per_page=20&sort=updated", {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "your-app/1.0",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    // não vaze o status real do GitHub para o usuário se não for 401
    return <p>Não foi possível listar repositórios.</p>;
  }

  const repos: { id: number; full_name: string; private: boolean }[] = await res.json();

  // SOMENTE os campos públicos chegam ao cliente — Data Transfer Object pattern
  const dto = repos.map(r => ({ id: r.id, name: r.full_name, private: r.private }));

  return <RepoList repos={dto} />;
}
```

### 8.4 Data Access Layer (DAL) consolidando autenticação + autorização

A documentação do Next.js recomenda **fortemente** centralizar todo acesso a dados/PAT em um DAL ([Next.js — Authentication](https://nextjs.org/docs/app/guides/authentication), [Francisco Moretti](https://www.franciscomoretti.com/blog/modern-nextjs-authentication-best-practices), [Mikul](https://www.mikul.me/blog/nextjs-middleware-authentication-routing)):

```ts
// lib/dal.ts
import 'server-only';
import { cache } from "react";
import { auth } from "@/auth";
import { getDecryptedPat } from "@/lib/pat-store";
import { redirect } from "next/navigation";

export const verifySession = cache(async () => {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
});

export const getPatForCurrentUser = cache(async () => {
  const session = await verifySession();
  const patRef = (session as any).patRef as string | undefined;
  if (!patRef) redirect("/login");
  const pat = await getDecryptedPat(patRef);
  if (!pat) redirect("/login");
  return { pat, provider: (session as any).provider as "github" | "azure-devops" };
});

export async function ghFetch(path: string, init?: RequestInit) {
  const { pat, provider } = await getPatForCurrentUser();
  if (provider !== "github") throw new Error("Wrong provider");
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "your-app/1.0",
    },
  });
}
```

`cache()` do React memoíza dentro de **um único render pass**, evitando múltiplas decifragens do PAT por componente ([Next.js — Authentication](https://nextjs.org/docs/app/guides/authentication), [Clerk](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router)).

### 8.5 Middleware completo

```ts
// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = ["/", "/login", "/api/auth"].some(p => pathname.startsWith(p));
  if (!req.auth && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Tudo exceto static assets
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|svg|ico)$).*)",
  ],
};
```

> Lembre‑se: **o middleware é otimista**. A verificação de fato é o `verifySession()` no DAL ([Next.js — Authentication](https://nextjs.org/docs/app/guides/authentication), [Clerk Articles](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router)).

---

## 9. Auditoria e logging sem vazar PAT

### 9.1 O que registrar

Eventos mínimos para audit log:

| Evento | Campos |
|---|---|
| `pat.login.attempt` | timestamp, ip, userAgent, provider, patFingerprint (primeiros 8 chars do SHA‑256) |
| `pat.login.success` | + userId, scopes, organization (azdo) |
| `pat.login.failed` | + reason ("invalid_token", "rate_limited") |
| `pat.use` | timestamp, userId, provider, operation (`list_repos`, `create_workitem`...), targetResource |
| `pat.session.revoked` | timestamp, sessionId, userId, reason |
| `pat.session.expired` | timestamp, sessionId, userId |

### 9.2 O que NUNCA logar

A regra é categórica em todas as fontes: "Never log credentials or security tokens in plain text (e.g., passwords, API keys), and avoid storing raw sensitive personal data" ([Sonar](https://www.sonarsource.com/resources/library/audit-logging/), [Better Stack](https://betterstack.com/community/guides/logging/sensitive-data/), [Palo Alto Networks](https://unit42.paloaltonetworks.com/third-party-supply-chain-token-management/)).

- ❌ O PAT em texto‑claro
- ❌ Headers `Authorization`, `Cookie`
- ❌ JWT completo (mesmo que assinado)
- ❌ Body de requests em endpoints de login

Em vez disso, logue um **fingerprint** SHA‑256 truncado (ex.: 12 chars hex). Isso permite correlação ("o mesmo PAT inválido foi usado 50 vezes") sem expor o segredo.

### 9.3 Log redaction com Pino

```ts
// lib/logger.ts
import 'server-only';
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "pat",
      "*.pat",
      "credentials.pat",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "body.pat",
    ],
    censor: "[REDACTED]",
    remove: false,
  },
  formatters: {
    level(label) { return { level: label }; },
  },
});
```

A configuração `redact` do Pino substitui automaticamente os caminhos especificados antes de gravar o log ([Pino Redaction docs](https://github.com/pinojs/pino/blob/main/docs/redaction.md), [Better Stack — Pino](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/), [SigNoz](https://signoz.io/guides/pino-logger/)).

### 9.4 Função `auditLog` recomendada

```ts
// lib/audit.ts
import 'server-only';
import { logger } from "./logger";
import { db } from "./db";

type AuditEvent = {
  event: string;
  severity: "info" | "warn" | "error";
  userId?: string;
  provider?: "github" | "azure-devops";
  organization?: string;
  ip?: string;
  userAgent?: string;
  patFingerprint?: string;
  operation?: string;
  targetResource?: string;
  reason?: string;
  message?: string;
};

export async function auditLog(e: AuditEvent) {
  // 1) log estruturado para SIEM (com redaction Pino)
  logger[e.severity](e, e.event);

  // 2) registro persistente para audit trail (tabela append-only, sem update/delete)
  try {
    await db.auditLog.create({
      data: {
        event: e.event,
        severity: e.severity,
        userId: e.userId,
        provider: e.provider,
        organization: e.organization,
        ip: e.ip,
        userAgent: e.userAgent,
        patFingerprint: e.patFingerprint,
        operation: e.operation,
        targetResource: e.targetResource,
        reason: e.reason,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    logger.error({ err }, "audit_log_persistence_failed");
  }
}
```

### 9.5 Padrões de auditoria a incorporar

- **Append‑only**: a tabela `audit_log` deve revogar `UPDATE`/`DELETE` para o usuário da app via permissões SQL.
- **Encrypt‑at‑rest** e **encrypt‑in‑transit** ([OLOID](https://www.oloid.com/blog/authentication-logs)).
- **Retenção**: GDPR/SOC2/PCI‑DSS exigem retenção mínima — 90 dias é razoável para audit, mais se o setor demandar ([Serverion](https://www.serverion.com/uncategorized/checklist-for-cloud-api-logging-best-practices/)).
- **Alertas**: dispare alerta quando >N falhas de PAT login do mesmo IP em janela curta, ou quando o mesmo `patFingerprint` aparece de IPs geograficamente distantes ([OLOID](https://www.oloid.com/blog/authentication-logs)).
- **Espelhar com auditoria nativa**: o Azure DevOps já registra `PersonalAccessTokenCreated`, `PersonalAccessTokenUsed`, `PersonalAccessTokenRevoked` em seu audit log ([Medium — aliplt](https://medium.com/@alipolatbt/personal-access-token-pat-management-in-azure-devops-fdb399b01b31)). Faça pull desses eventos para correlacionar com seu próprio audit log da app.

---

## 10. Checklist final de produção

### Configuração
- [ ] Next.js ≥ 15.2.3 (ou 14.2.25, 13.5.9, 12.3.5) — proteção contra CVE‑2025‑29927 ([Vercel](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass))
- [ ] Reverse proxy strip do header `x-middleware-subrequest` ([OffSec](https://www.offsec.com/blog/cve-2025-29927/))
- [ ] `auth.ts` na raiz com Auth.js v5; `AUTH_SECRET` ≥ 32 bytes random
- [ ] Cookies `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`, com `Max-Age` finito
- [ ] CSP, X‑Frame‑Options DENY, X‑Content‑Type‑Options nosniff configurados ([Yagiz](https://www.yagiz.co/securing-your-nextjs-13-application/))

### Segredos
- [ ] Nenhum segredo prefixado com `NEXT_PUBLIC_` ([Next.js — env vars](https://nextjs.org/docs/pages/guides/environment-variables))
- [ ] Nenhum segredo em `next.config.js` `env:` ([LogRocket](https://blog.logrocket.com/configure-environment-variables-next-js/))
- [ ] `.env.local` no `.gitignore`; `.env.example` commitado vazio
- [ ] Em produção, segredos vêm de Azure Key Vault / Vault / GitHub Secrets ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-node), [GitHub Docs](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure))
- [ ] Step de CI faz grep por prefixos de PAT no `.next/static/`

### Arquitetura
- [ ] Toda chamada a GitHub/Azure DevOps roda em Server Component ou Route Handler com `import 'server-only'`
- [ ] DAL central com `verifySession()` memoizado via React `cache()` ([Next.js Auth](https://nextjs.org/docs/app/guides/authentication))
- [ ] PATs armazenados criptografados (AES‑256‑GCM) server‑side; sessão JWT contém apenas referência opaca
- [ ] DTO pattern: Server Components devolvem ao cliente apenas campos públicos ([Next.js Data Security](https://nextjs.org/docs/app/guides/data-security))
- [ ] Server Actions: `serverActions.allowedOrigins` configurado se houver reverse proxy ([Next.js Server Actions config](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions))

### Endpoints de PAT
- [ ] Validação de Origin vs Host explícita em Route Handlers (case‑insensitive)
- [ ] Schema de input validado com Zod
- [ ] Rate limit (Upstash sliding window 5/5min por IP) ([Upstash](https://upstash.com/blog/nextjs-ratelimiting))
- [ ] Resposta de erro genérica (`401 Authentication failed`); detalhes só no audit log
- [ ] Após sucesso, descarte o PAT da memória da request

### Logging & Auditoria
- [ ] Pino com `redact` para `pat`, `authorization`, `cookie` ([Pino Redaction](https://github.com/pinojs/pino/blob/main/docs/redaction.md))
- [ ] Tabela `audit_log` append‑only com timestamp, userId, ip, patFingerprint
- [ ] Alertas em SIEM para volumes anormais de falha
- [ ] Pull do Azure DevOps audit log para correlação ([Medium — aliplt](https://medium.com/@alipolatbt/personal-access-token-pat-management-in-azure-devops-fdb399b01b31))

### Operacional
- [ ] Plano de revogação: endpoint `/api/auth/revoke` que apaga o registro `patSession` e invalida o cookie
- [ ] Rotação: alerta ao usuário 7 dias antes do PAT expirar; UI para troca atômica
- [ ] Documente, para usuários, como criar um *fine‑grained PAT* com **escopo mínimo** ([GitHub Docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), [Microsoft Learn](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops))
- [ ] Roadmap de migração para GitHub App / Microsoft Entra OAuth — mais seguro a longo prazo ([GitHub Docs — Keeping API credentials secure](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure), [Microsoft DevBlogs](https://devblogs.microsoft.com/devops/reducing-pat-usage-across-azure-devops/))

---

## 11. Referências oficiais

**Next.js (App Router)**
- [Data Security](https://nextjs.org/docs/app/guides/data-security)
- [Authentication](https://nextjs.org/docs/app/guides/authentication)
- [Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Environment Variables](https://nextjs.org/docs/pages/guides/environment-variables)
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [serverActions config](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)
- [cookies() API](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Postmortem CVE‑2025‑29927 (Vercel)](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)

**Auth.js (NextAuth v5)**
- [Migrating to v5](https://authjs.dev/getting-started/migrating-to-v5)
- [Next.js reference](https://authjs.dev/reference/nextjs)
- [Protecting routes/sessions](https://authjs.dev/getting-started/session-management/protecting)
- [Credentials Provider (v4 docs ainda válidas para a API)](https://next-auth.js.org/providers/credentials)

**GitHub**
- [Managing your personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Keeping your API credentials secure](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure)
- [Authenticating to the REST API](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api)
- [Setting a PAT policy for your organization](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/setting-a-personal-access-token-policy-for-your-organization)

**Azure DevOps / Microsoft**
- [Use personal access tokens](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops)
- [Manage PATs with policies](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/manage-pats-with-policies-for-administrators?view=azure-devops)
- [Authentication Methods for Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/authentication-guidance?view=azure-devops)
- [Reducing PAT usage across Azure DevOps (DevBlogs)](https://devblogs.microsoft.com/devops/reducing-pat-usage-across-azure-devops/)
- [Make Azure DevOps secure](https://learn.microsoft.com/en-us/azure/devops/organizations/security/security-overview?view=azure-devops)
- [Azure Key Vault Secrets — Node.js quickstart](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-node)
- [@azure/keyvault-secrets README](https://learn.microsoft.com/en-us/javascript/api/overview/azure/keyvault-secrets-readme?view=azure-node-latest)

**OWASP**
- [JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)

**CVE‑2025‑29927**
- [NVD record](https://nvd.nist.gov/vuln/detail/CVE-2025-29927)
- [Datadog analysis](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)
- [JFrog analysis](https://jfrog.com/blog/cve-2025-29927-next-js-authorization-bypass/)
- [Zscaler ThreatLabz](https://www.zscaler.com/blogs/security-research/cve-2025-29927-next-js-middleware-authorization-bypass-flaw)

**BFF & padrões de segurança SPA**
- [Duende Software — BFF Security Framework](https://docs.duendesoftware.com/bff/)
- [Skycloak — BFF com Keycloak](https://skycloak.io/blog/keycloak-backend-for-frontend-bff-pattern/)
- [Cyber Sierra — Secure Next.js BFF](https://cybersierra.co/blog/secure-nextjs-bff-sessions/)

**Logging seguro**
- [Pino Redaction docs](https://github.com/pinojs/pino/blob/main/docs/redaction.md)
- [Better Stack — Sensitive data in logs](https://betterstack.com/community/guides/logging/sensitive-data/)
- [Sonar — Audit Logging Best Practices](https://www.sonarsource.com/resources/library/audit-logging/)

---

> **Última recomendação estratégica**: tanto o GitHub quanto a Microsoft estão ativamente movendo seus ecossistemas para longe de PATs ([GitHub Apps](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure), [Microsoft Entra OAuth](https://devblogs.microsoft.com/devops/reducing-pat-usage-across-azure-devops/)). Implemente o fluxo PAT seguro descrito acima como a maneira *correta* de fazer no curto/médio prazo, mas planeje migrar para OAuth/GitHub App e Microsoft Entra (Azure CLI tokens, Service Principals, Managed Identities) tão logo seu caso de uso permita — esses tokens duram ≤ 1 hora, são revogáveis centralmente, suportam Conditional Access e eliminam a maior parte do risco residual de PATs.