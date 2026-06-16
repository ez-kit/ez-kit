# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Constraints

### No styles in `packages/data-grid/react/react`

The shared React package (`data-grid/react/react`) must contain **zero visual styling** — no inline `style={{}}`, no Tailwind/className-based styles. All visual styling belongs exclusively in the UI kit packages (`shadcn`, `heroui`). The react package may only add semantic `data-*` attributes to elements so that UI kit CSS can target them.

### Vendored shadcn primitives are immutable

`packages/data-grid/react/shadcn/src/components/ui/**` is vendored from shadcn — **do not modify these files.** All behavioral overrides (colSpan handling, alignment, pinning, custom slots, etc.) must live in `packages/data-grid/react/shadcn/src/blocks/` adapters that wrap the primitives. See `packages/data-grid/react/shadcn/CLAUDE.md` for the full rule.

## Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages via Turborepo
pnpm lint             # Lint all packages (0 warnings allowed)
pnpm typecheck        # TypeScript type-check all packages
pnpm test             # Run all tests (requires build first per turbo deps)
pnpm format           # Format all packages with Prettier
pnpm size             # Check bundle size limits
pnpm run ci               # Full CI check: lint + typecheck + test + build + size
```

Run a single package's tests directly (faster, no turbo overhead):

```bash
pnpm --filter @ez-kit/zu-store test
pnpm --filter @ez-kit/data-grid-core test
```

Watch mode for a specific package:

```bash
cd packages/zu-store && pnpm exec vitest
```

Docs app:

```bash
pnpm docs:dev         # Start Fumadocs dev server (runs sandpack:build first)
pnpm docs:build
```

The docs app auto-runs `sandpack:build` (`apps/docs/scripts/build-sandpack.mjs`) before every `dev`, `build`, `lint`, and `typecheck` — there is no separate root command to invoke. Build a package first if docs need its latest output. To regenerate manually: `pnpm --filter @ez-kit/docs sandpack:build`.

Generate a new package:

```bash
pnpm pkg:new          # Runs turbo gen package — interactive prompts
```

Release flow:

```bash
pnpm changeset        # Create a changeset for changed public packages
pnpm version-packages # Bump versions from changesets
pnpm release          # Publish to npm
```

## Architecture

This is a **pnpm + Turborepo monorepo** of ESM-only React utility libraries.

### Workspace layout

```
apps/
  docs/                         # Fumadocs-based Next.js documentation site
    app/
      sandbox/data-grid/
        shadcn/layout.tsx       # Sets DataGridTypeProvider(type='shadcn')
        heroui/page.tsx         # Sets DataGridTypeProvider(type='heroui')
    shared/
      DataGrid.tsx              # Runtime switcher — lazy-loads shadcn or heroui DataGrid based on context
      data-grid/
        examples/               # data-grid examples — one set of components used by BOTH shadcn and heroui
          manifest.json         # List of all example slugs (add new examples here)
          components/           # example components, rendered via DataGridTypeProvider context
        sandpack/
          generated/            # Auto-generated bundles — DO NOT edit manually (see sandpack:build)
      examples/                 # Newer per-package live examples — examples/<package>/<name>.tsx (zu-store, valtio-kit)
    scripts/
      build-sandpack.mjs        # Generates sandpack/generated/*.ts files (bundles each package with tsup)
packages/
  zu-store/           # @ez-kit/zu-store — Zustand context store factory (+ history middleware, store-cache)
  valtio-kit/         # @ez-kit/valtio-kit — Valtio context store + source-agnostic persist engine (URL/storage/IndexedDB)
  data-grid/
    core/             # @ez-kit/data-grid-core — headless data-grid (TanStack Table)
    react/
      react/          # @ez-kit/data-grid-react — framework-agnostic React adapter
      shadcn/         # @ez-kit/data-grid-shadcn — Shadcn UI flavour
      heroui/         # @ez-kit/data-grid-heroui — HeroUI flavour
      native/         # @ez-kit/data-grid-native — plain/native UI flavour (ships its own global.css)
turbo/
  generators/         # Plop-based package scaffolding (config.ts + templates/)
```

### Package conventions

- Public API exported exclusively from `src/index.ts`
- Built with `tsup` → ESM output + `.d.ts` declarations into `dist/`
- Each package extends `tsconfig.base.json` and uses `@/*` → `src/*` path alias
- Tests live in `src/**/*.test.ts(x)` or `test/**/*.test.ts(x)`, run with Vitest in jsdom
- Each package has a `size-limit` budget (default 3 KB) enforced in CI
- Packages declare `"sideEffects": false`

### Key architectural patterns

**`@ez-kit/zu-store`** — `createContextStore(factory)` wraps a Zustand vanilla store in React context, returning `{ Provider, useStore, useShallowStore, Item }` (selector-based reads). The `Provider` initialises the store once via `useRef` so it survives re-renders without re-creating state. Also exports `withHistory` (undo/redo middleware) and `store-cache` (`createStoreCache`, `CacheProvider`, scoped/keyed nested stores).

**`@ez-kit/valtio-kit`** — sibling to zu-store but Valtio-backed. `createContextStore(factory)` returns `{ Provider, useStore, useSnapshot, Item }` where `useStore()` is the raw mutable proxy (mutate directly, e.g. `state.count++`) and `useSnapshot()` is the readonly auto-tracked read. The `persist` subsystem (subpath export `@ez-kit/valtio-kit/persist`) is a source-agnostic two-way sync engine: the Valtio proxy is the synchronous source of truth, the substrate is a throttled, rehydratable mirror. The core speaks one interchange type — `Keyed = Map<string, string>` — and every substrate is a `SourcePort` (`get`/`set`/optional `subscribe`); codecs (`paramString`/`paramNumber`/`paramArray`/`paramEnum`/`paramJson`/`paramBoolean`/`paramBigInt`/`paramDate`), key naming (`key`/`prefix`/`absolute`), throttling, loop-breaking, and hydration are shared. Source adapters live behind their own peer-gated subpaths: URL (`@ez-kit/valtio-kit/persist/url` + `…/url/react-router`, `…/url/next`), Web Storage + IndexedDB (`@ez-kit/valtio-kit/persist/storage`: `localStorageAdapter`/`sessionStorageAdapter`/`indexedDbAdapter`, with cross-tab `subscribe` and `version`/`migrate`), and optional `validators/zod`. Fields are declared via `@persistUrl()`/`@persistLocalStorage()`/`@persistField()` decorators or the accessor builder (`urlField()`/`localStorageField()`/…). Stores are request-scoped via `createPersistStore`/`createPersistFields`; `PersistProvider adapters={[…]}` mounts one engine per source (a field can sync to several substrates at once); `useHydrated()` gates the post-hydration fill; `$url`/`$persist` are per-source control handles. Each integration is an optional peer dependency.

**`@ez-kit/data-grid-*`** — layered architecture: `data-grid-core` is a UI-framework-agnostic layer on top of TanStack Table core; `data-grid-react` adds React; the `shadcn`, `heroui`, and `native` sub-packages layer UI-component-library-specific implementations on top. Each UI package uses `createDataGrid({ components })` to inject its UI components into the shared render layer and re-exports the result (`DataGrid`, `useDataGrid`, `defineColumns`, `createColumnHelper`, `GridComponentsProvider`).

### Docs app architecture

**Runtime UI switching** — `apps/docs/shared/DataGrid.tsx` lazy-loads either `@ez-kit/data-grid-shadcn` or `@ez-kit/data-grid-heroui` based on `DataGridTypeProvider` context set by the route layout. Example components are written **once** and automatically work for both UI kits — there is no duplication.

**Two example conventions** — (1) **data-grid** examples are manifest-based: add the component to `apps/docs/shared/data-grid/examples/components/` and register its slug in `apps/docs/shared/data-grid/examples/manifest.json`; it then appears for both shadcn and heroui automatically. (2) **Other packages** (zu-store, valtio-kit) use a flat per-package convention with no registry: drop a file at `apps/docs/shared/examples/<package>/<name>.tsx` and reference it from MDX by its relative path without the `.tsx` extension.

**Sandpack build pipeline** — `apps/docs/scripts/build-sandpack.mjs` bundles each package with tsup and writes large pre-built files to `shared/data-grid/sandpack/generated/`. It runs automatically before the docs app's `dev`/`build`/`lint`/`typecheck` (via the `sandpack:build` prebuild step) — never edit the generated files manually.

### TypeScript

Root `tsconfig.base.json` uses `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. All packages inherit from it.

### Linting

ESLint flat config (`eslint.config.mjs`) with `typescript-eslint` strict + stylistic rules. `import/order` is enforced (alphabetical, grouped by type). Type imports must use `import type`. `--max-warnings=0` is enforced in every package's lint script.

<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
[specs/001-data-grid-docs/plan.md](./specs/001-data-grid-docs/plan.md)

<!-- SPECKIT END -->
