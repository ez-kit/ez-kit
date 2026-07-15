# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Branching

- `develop` is the default integration branch — feature branches fork from and merge into `develop`.
- `main` is release-only: a `develop → main` PR is a release and the Vercel production + npm release point.
- CI (`.github/workflows/ci.yml`, job `verify`) gates every PR into `develop` and `main`.
- Hooks: pre-commit `lint-staged`, commit-msg `commitlint` (Conventional Commits), pre-push `pnpm ci:fast`. Node pinned via `.nvmrc` (22.18.0).

## Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages via Turborepo
pnpm lint             # Lint all packages (0 warnings allowed)
pnpm typecheck        # TypeScript type-check all packages
pnpm test             # Run all tests (requires build first per turbo deps)
pnpm format           # Prettier write across the whole repo
pnpm format:check     # Prettier check across the whole repo
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
  docs/               # Fumadocs-based Next.js documentation site
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

**`@ez-kit/data-grid-*`** — layered architecture: `data-grid-core` is a UI-framework-agnostic layer on top of TanStack Table core; `data-grid-react` adds React; the `shadcn` and `heroui` sub-packages layer UI-component-library-specific implementations on top.

### TypeScript

Root `tsconfig.base.json` uses `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. All packages inherit from it.

### Linting

ESLint flat config (`eslint.config.mjs`) with `typescript-eslint` strict + stylistic rules. `import/order` is enforced (alphabetical, grouped by type). Type imports must use `import type`. `--max-warnings=0` is enforced in every package's lint script.
