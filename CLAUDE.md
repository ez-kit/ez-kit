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
pnpm ci               # Full CI check: lint + typecheck + test + build + size
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
pnpm docs:dev         # Start Fumadocs dev server
pnpm docs:build
pnpm docs:sandpack    # Regenerate Sandpack bundles (run after any package change, required before docs:dev/build)
```

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
        examples/               # SHARED examples — one set of components used by BOTH shadcn and heroui
          manifest.json         # List of all example slugs (add new examples here)
          components/           # 12 example components, rendered via DataGridTypeProvider context
        sandpack/
          DataGridSandpackExample.tsx
          generated/            # Auto-generated bundles — DO NOT edit manually, run docs:sandpack to regenerate
    scripts/
      build-sandpack.mjs        # Generates sandpack/generated/*.ts files (bundles each package with tsup)
packages/
  zu-store/           # @ez-kit/zu-store — Zustand context store factory
  data-grid/
    core/             # @ez-kit/data-grid-core — headless data-grid (TanStack Table)
    react/
      react/          # @ez-kit/data-grid-react — framework-agnostic React adapter
      shadcn/         # @ez-kit/data-grid-shadcn — Shadcn UI flavour
      heroui/         # @ez-kit/data-grid-heroui — HeroUI flavour
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

**`@ez-kit/zu-store`** — `createContextStore(factory)` wraps a Zustand vanilla store in React context, returning `{ Provider, useStore, useShallowStore, Item }`. The `Provider` initialises the store once via `useRef` so it survives re-renders without re-creating state.

**`@ez-kit/data-grid-*`** — layered architecture: `data-grid-core` is a UI-framework-agnostic layer on top of TanStack Table core; `data-grid-react` adds React; the `shadcn` and `heroui` sub-packages layer UI-component-library-specific implementations on top. Each UI package uses `createDataGrid(components)` to inject its UI components into the shared render layer.

### Docs app architecture

**Runtime UI switching** — `apps/docs/shared/DataGrid.tsx` lazy-loads either `@ez-kit/data-grid-shadcn` or `@ez-kit/data-grid-heroui` based on `DataGridTypeProvider` context set by the route layout. Example components are written **once** and automatically work for both UI kits — there is no duplication.

**Adding a new example** — add the component to `apps/docs/shared/data-grid/examples/components/` and register its slug in `apps/docs/shared/data-grid/examples/manifest.json`. It will appear for both shadcn and heroui automatically.

**Sandpack build pipeline** — `scripts/build-sandpack.mjs` bundles each package with tsup and writes large pre-built files to `shared/data-grid/sandpack/generated/` (290 KB – 1.4 MB). Run `pnpm docs:sandpack` after any package change. Never edit the generated files manually.

### TypeScript

Root `tsconfig.base.json` uses `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. All packages inherit from it.

### Linting

ESLint flat config (`eslint.config.mjs`) with `typescript-eslint` strict + stylistic rules. `import/order` is enforced (alphabetical, grouped by type). Type imports must use `import type`. `--max-warnings=0` is enforced in every package's lint script.
