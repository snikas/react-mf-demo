# Study guide

This repo turns a 48-hour prep plan into runnable code. Each section below names the concept, where it lives, what to try in the running app, and the one-liner to say out loud.

Run `npm run dev` and open http://localhost:3000 before you start.

---

## The 48-hour plan, mapped

| Plan item | Done here | Your exercise |
| --- | --- | --- |
| 1. Tiny MF demo: shell + remote, React singleton, lazy remote, error boundary, Suspense | `apps/shell/src/federation/*`, `tools/webpack.base.cjs` | Do the "Break it on purpose" drills below |
| 2. One component with `useTransition`, one store with `useSyncExternalStore` | `lab/TransitionDemo.tsx`, `policies/AccessPreview.tsx`, `shell-sdk/store.ts`, `audit/AuditApp.tsx` | Rewrite `AccessPreview` with `useDeferredValue` instead |
| 3. React docs: You Might Not Need an Effect, Suspense, StrictMode | Links on the Lab page | Find every `useEffect` in the repo and justify each |
| 4. Whiteboard the shell SDK + module manifest | `shell-sdk/types.ts`, `shell-sdk/manifest.ts` | Close the editor and draw them, then diff (see below) |
| 5. Route-split SPAs vs. MF on-page composition, out loud | Workspace page vs. "Reports (broken)" | Use the comparison table below |

---

## 1. React 18 essentials

- **createRoot** turns on concurrent rendering: `apps/shell/src/bootstrap.tsx`.
- **Automatic batching**: Lab → *Automatic batching*. Three `setState` calls in a `setTimeout` produce **1** commit, and `flushSync` forces **3**. Source: `lab/BatchingDemo.tsx`.
- **Transitions**: Lab → *useTransition vs useDeferredValue*. Pick "Urgent" and type fast, and the input janks. Switch to `startTransition` and it stays responsive while the list catches up.
- **useId**: `lab/UseIdDemo.tsx`.
- **useSyncExternalStore**: `packages/shell-sdk/src/store.ts` (`useStore`) and `apps/audit/src/AuditApp.tsx` (subscribing straight to the event bus).

> Say it: "React 18's main shift is concurrency. Transitions and Suspense let us prioritize what the user is interacting with, and useSyncExternalStore is the right way to share a store across micro-frontends without tearing."

## 2. Hooks and their pitfalls, found in this code

| Pitfall | Where it's handled |
| --- | --- |
| Derived values stored in state | `TransitionDemo`/`AccessPreview` filter *during render*; no effect + setState |
| Effect without cleanup | `StrictModeFetchDemo` (toggle cleanup off to see the race), `PoliciesApp` fetch uses `AbortController` |
| Unstable `subscribe` for `useSyncExternalStore` | `AuditApp` wraps it in `useCallback` |
| `getSnapshot` returning a new object | Comment in `store.ts`; try `useStore(store, s => ({ t: s.theme }))` and watch it loop |
| Fast-changing values in context | `ShellContext.tsx` holds only stable refs; theme/user go through `useStore` |
| `useMemo` used where it matters | `AccessPreview` memoizes the per-role policy; `SlowList` is `memo` so `useDeferredValue` can skip work |
| Stale closures | Functional updates everywhere (`setX(x => x + 1)`) in `BatchingDemo` |

## 3. StrictMode

Lab → *StrictMode double mount*. In dev, the log shows `#1 started → #1 cleanup → abort() → #2 started → #1 aborted → #2 resolved`. Untick "Effect returns cleanup" and both requests resolve and both call `setState`. In the production build StrictMode is off, so the demo simulates the remount.

> Say it: "Double fetch in dev means a missing cleanup. Fix the effect or move fetching to a data library. Don't remove StrictMode."

## 4–5. Suspense and error boundaries

`RemoteSlot.tsx` is the unit of isolation: `ErrorBoundary` (failed state) wrapping `Suspense` (loading state) per remote.

- **Try:** visit *Reports (broken)*. The registry points it at a missing `remoteEntry.js`. You get a scoped fallback with **Try again**, and an entry on the Platform page's error telemetry.
- **Try:** Workspace → Policies → *Chaos testing* → **Crash this module**. The boundary catches it and Audit next door keeps working. **Try again** reloads the module.
- Error boundaries don't catch errors in event handlers or async code. `PoliciesApp` catches the handler error and **rethrows it during render** via state. That's the library-agnostic version of `react-error-boundary`'s `showBoundary`.
- **Audit uses `mount()`**, so it's a separate React root, and the shell's boundary does *not* reach inside it. That's a real trade-off of the framework-agnostic contract.

## 6. Lazy loading and code splitting

- Route split: `App.tsx` lazy-loads the Lab page with `webpackChunkName` + `webpackPrefetch` magic comments.
- Lab → *Lazy loading*: hover **Show chart** and the log shows `preload()` before the click. Pick "First attempt fails" to watch `lazyWithRetry` recover from a `ChunkLoadError`. Pick "Every attempt fails" to get the boundary with a **Reload page** button (`isChunkLoadError`).

## 7. TypeScript patterns

| Pattern | Example |
| --- | --- |
| Discriminated unions for state | `lib/async.ts`, `PoliciesApp` reducer `State`, `ShellEventSchema` |
| `satisfies` | `ROLE_PERMISSIONS`, each remote's `manifest` |
| `as const` → literal union | `PERMISSIONS`, `ROLES`, `DATA_ELEMENTS` |
| Generics | `createStore<T>`, `useStore<T, S>`, `retry<T>`, `subscribe<T extends ShellEventType>` |
| `Extract<>` for typed handlers | `EventOf<T>` in `events.ts` |
| `unknown` + validate at the boundary | `validateModule(mod: unknown, …)`, `decodeJwt`, `fetchRegistry` (all zod) |

## 8. Module Federation

Read `tools/webpack.base.cjs` and `apps/shell/src/federation/loadRemote.ts` together. The loader does by hand the four steps a static `remotes: {}` config hides:

1. inject `<script src=remoteEntry.js>`, which defines `window.policies`
2. `__webpack_init_sharing__('default')`
3. `container.init(__webpack_share_scopes__.default)` (negotiates the React singleton)
4. `container.get('./Module')()`

**Break it on purpose** (run each with `npm run dev`, then revert):

| Change | Expected failure | Lesson |
| --- | --- | --- |
| In `apps/shell/src/index.ts`, replace `import('./bootstrap')` with `import './bootstrap'` | "Shared module is not available for eager consumption" | Why the async boundary exists |
| In `sharedDeps()` in `webpack.base.cjs`, skip `react` when `pkg.name === '@demo/policies'` | Policies bundles its own React → "Invalid hook call" | React must be one shared copy |
| Add `strictVersion: true` to `react` and bump `requiredVersion` in one remote to `^19` | Load-time error instead of a warning | Version skew policy |
| Change `sdkVersionRange` in `apps/audit/src/module.tsx` to `^2.0.0` | Contract error in Audit's slot only | Contracts fail closed, scoped |
| Point `policies` in `apps/shell/public/remotes.local.json` at port 3009 | Policies fallback; everything else fine | Dynamic remotes + isolation |
| Remove `rootMode: 'upward'` from babel-loader | Build fails parsing TSX | Monorepo config resolution |

Also know: **MF 2.0** (`@module-federation/enhanced`) adds a manifest protocol, automatic type sharing (dts), runtime plugins and Rspack support. Alternatives: single-spa, import maps / native federation, Web Components, iframes, build-time npm packages.

## 9. Shell SDK and module contract (whiteboard drill)

Draw these from memory, then compare with `packages/shell-sdk/src/types.ts` and `manifest.ts`:

```ts
interface ShellSdk {
  version: string;
  auth:   { getUser(); getToken(): Promise<string>; can(p: Permission): boolean };
  nav:    { navigate(path) };
  events: { publish(e); subscribe(type, fn); subscribeAll(fn); recent() };
  ui:     { notify(toast) };
  flags:  { isEnabled(key) };
  store:  ReadonlyStore<ShellState>;   // user, theme, flags → useStore()
}

ModuleManifest = { name, version, title, requiredPermissions[], sdkVersionRange, entry: 'react' | 'mount' }
Entry          = default Component<{ sdk }>  |  mount(el, sdk) => unmount
```

Design points to mention:

- The shell keeps a separate `ShellAdmin` (sign in, set theme, set flags). Modules only get `sdk`: **capability separation**.
- The shell validates the manifest, the SDK range and the entry kind *before* rendering, and uses `requiredPermissions` as a route guard.
- Governance: semver the SDK, deprecation windows, **contract tests in each remote's CI** (`apps/*/src/*.test.tsx`), documented patterns.
- Split modules by business capability, not by layer. Avoid a distributed monolith: minimal shared state, clear contracts, independent deploys.

## 10. Events and cross-module state

- Event names follow `domain.entity.action`, carry `version: 1`, and the zod-validated discriminated union lives in `events.ts`.
- **Try:** Workspace → change a rule. The Audit log (a different build) shows it. Turn on `audit.showPayloads` on the Platform page (as admin) to see payloads.
- The bus rejects invalid events and isolates a throwing subscriber (see `events.test.ts`).
- State rule: local by default. Share only user/tenant/permissions/theme/flags through the tiny shell store. Treat the URL as shared state.

## 11. Auth and RBAC

- Platform page → decoded JWT. The token lives in a closure inside the SDK (in memory), never in localStorage. `getToken()` silently refreshes when expired (`auth.test.ts` proves it).
- Switch the header role to **viewer**: policy selects disable, and the Audit slot shows "Not authorised… audit:read". As **admin**: Export CSV appears and flags become editable.
- UI code checks **permissions** (`can('policy:edit')`), never role names. The backend always enforces.
- Real-world: OIDC Authorization Code + PKCE, a refresh token in an httpOnly/Secure/SameSite cookie, or a BFF.

## 12. CI/CD for independently deployable modules

- `.github/workflows/ci.yml`: lint → typecheck → unit + contract tests → build (fails on the 250 KB **size budget**) → Pages deploy.
- `scripts/assemble.mjs` publishes remotes under **immutable versioned paths** (`remotes/policies/1.4.2/`) and writes `remotes.json`. **Release = change the pointer. Rollback = point back.** Bump `apps/policies/package.json` to `1.5.0`, rebuild, and look at `dist/`.
- `npm run preview` serves `remotes.json`/`remoteEntry.js` as `no-cache` and hashed files as `immutable`.
- What you'd add next: Playwright smoke tests of shell + new remote in staging, canary via per-tenant manifests or flags, Sentry alerts on error rate by `module@version` (`reportError` already tags both).

## 13. Nice-to-haves, in the code

- **Design tokens** → CSS custom properties in `packages/shell-sdk/src/tokens.css`; theme switch = one `data-theme` attribute. Remotes use **CSS Modules** with an app prefix (`policies__table--x1y2z`), and no global resets.
- **a11y**: skip link, focus moves to `<main>` on route change, `aria-live` toasts and logs, labelled form controls, `:focus-visible` rings, `prefers-reduced-motion`, `eslint-plugin-jsx-a11y` in lint.

---

## Route-split SPAs vs. Module Federation

Practice with the app open: the "Workspace" page is MF composition.

| | Route-split SPAs + runtime Web Components | Module Federation |
| --- | --- | --- |
| Composition | Each path belongs to one product team's SPA; the platform team's shared Web Components render inside it, loaded at runtime. Platform and product share a screen, but two product teams don't. | The shell lays out the page; any team's module, including two product teams side by side, sits in it as a peer in one React tree |
| Navigation between teams | Full page load | Client-side |
| Shared deps | Each SPA bundles its own React | Negotiated singletons (React, SDK) |
| Cross-app state | URL, cookies, backend | Shell store + typed event bus |
| Contracts | Implicit (DOM / custom element attributes) | Typed manifest + SDK, validated at load |
| Isolation | Very strong (separate documents) | Error boundaries + CSS Modules; weaker, so needs discipline |
| Independent deploy | Yes | Yes, via runtime manifest pointer |

## Likely questions, short answers

- **Why import('./bootstrap')?** It creates the async boundary so the share scope initialises before React is consumed.
- **How do you deploy a remote without rebuilding the shell?** Dynamic remotes: the shell reads a per-environment manifest at runtime. A release changes the pointer.
- **One team's bug takes down the page?** Not if each remote is wrapped in its own ErrorBoundary + Suspense, events are validated, and subscribers are isolated.
- **How do modules get the user?** `sdk.auth.getUser()` / `useStore(sdk.store, s => s.user)`. Never from globals or localStorage.
- **Old chunk 404 after deploy?** Retry once, then prompt a reload. Never cache `remoteEntry.js`.
- **When would you not use MF?** Small team, one deploy cadence, or a need for hard isolation (use iframes) or framework diversity (use Web Components or `mount()`).
