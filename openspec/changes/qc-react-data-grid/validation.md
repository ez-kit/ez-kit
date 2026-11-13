# Validation — 2026-11-12

## Implemented scope

The connector, shared-grid bridge, explicit bulk deletion and pending-modal behavior
are implemented. Documentation includes `/docs/qc-react`, checked API tables,
registered examples in both kits and the reproducible Orval 8.47.0 recipe.
Durable decisions D1–D8 are recorded in ADRs 0028–0030 and linked from AGENTS.md.
No package publication or OpenSpec archive was performed.

## Checks

Commands use the repository's pnpm 10.34.9 (through `npx --yes pnpm@10.34.9`
in this environment).

- `pnpm lint`: passed, including site-origin and changeset checks.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; qc-react has 81 passing tests, docs has 311.
- `pnpm test:react18`: shared grid 1,827, form 625 and Query 65 tests passed.
  `pnpm --filter @ez-kit/qc-react test:react18`: 75 passed, six HeroUI cases
  skipped because that kit requires React 19. The root command now includes qc-react.
- `pnpm exec turbo run size --filter='!@ez-kit/docs'`: passed for all libraries.
  The connector is 2.61 kB against a 3 kB limit.
- Orval generation/check and example type checking passed in task 7.1.
- OpenSpec strict validation and changed-file whitespace/format checks passed.

Browser validation uses the existing Playwright suites with installed Chromium
(`/usr/bin/chromium`) and a temporary, removed configuration targeting Next dev
on port 3108. The dev server uses fallback fonts. The selected suites cover
creating/editing/deleting, the selection action bar, pending connected modals,
and the new source's pages/infinite/search transitions in both kits.
All 94 selected kit scenarios pass across the full run and corrected targeted
reruns; the documentation navigation/preview scenario also passes.
Initial new-test locator failures were corrected against actual accessible names
and rerun; they were not product failures. The docs page also has a browser guard
for its registered previews and API navigation; this caught and fixed using the
wrong preview component before completion.

## Accepted environment limitation

`pnpm build` builds all libraries but fails in the existing docs site layout:
Next cannot download Inter and Figtree from Google Fonts. A direct request to
`https://fonts.googleapis.com` returns a proxy `403 Forbidden` in this environment.
`pnpm size` also reaches the docs build through its Turbo dependency and fails
there; the independent library-size run passes.

The Google Fonts restriction is accepted as non-blocking for this PR. The failed
site build is not recorded as a successful production verification. Repeat the
production build and root size command in an
environment permitting Google Fonts (`fonts.googleapis.com` and its font-asset
host `fonts.gstatic.com`). No font replacement, mocked production-font result or
network-policy bypass is included in this change.

## PR documentation refinements

The native-options helper is named `createGridDataSource`. The two connected
examples now use the shared displayed-import rewrite for kit components, with
runtime kit selection isolated in the registry loader. Both examples remain
copyable standalone with their default bundle; the embed loader injects the
selected kit.

The Orval section now contains the complete OpenAPI/config/transport/convention/
source/grid recipe. Its titled code blocks were extracted from the actual MDX,
generated with Orval 8.47.0 and successfully type-checked together. Browser coverage
for both connected examples and the documentation's live kit tabs passed 11/11.
