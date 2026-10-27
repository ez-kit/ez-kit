# 0012. Never bump a dependency with `pnpm up -r`

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)

## Decision

**Never bump a dependency with `pnpm up -r`** — it re-resolves the whole tree and the damage lands somewhere unrelated. Edit the range in the manifest and run a plain `pnpm install`. `@heroui/react` ≥ 3.2.3 takes the react-aria packages and `@internationalized/date` as peers; they are devDependencies of the heroui kits and the docs app.

## Context, rationale and rejected alternatives

**Never bump a dependency with `pnpm up -r`.** It re-resolves the whole tree inside the declared
ranges, not just the package named, and the damage lands somewhere unrelated. Bumping HeroUI this
way re-resolved react-aria's own `use-sync-external-store` from 1.6.0 to 1.7.0; zustand declares
that package as an **optional peer** (`>=1.2.0`), so pnpm instantiated zustand twice by peer id, the
docs app and `@ez-kit/zu-store` then resolved different copies of its types, and three
`StateCreator` errors appeared in `zu-store` examples that nothing in the change had touched. Edit
the range in the manifest and run a plain `pnpm install`: the same HeroUI bump then leaves
`use-sync-external-store` at one version and needs no `pnpm.overrides` entry at all.

Note also that `@heroui/react` moved `react-aria`, `react-aria-components`, `@react-aria/ssr`,
`@react-aria/utils` and `@internationalized/date` from its dependencies to its **peers** in 3.2.3.
They are declared in the heroui kits' and the docs app's `devDependencies`, and a consumer of
`@ez-kit/data-grid-heroui` installs them alongside `@heroui/react` themselves.
