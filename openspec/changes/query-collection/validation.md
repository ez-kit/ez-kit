# Validation

Validated on 2026-11-13 with pnpm 10.34.9 (invoked through npx), Node 24.22.1 and the workspace's installed dependencies.

## Repository checks

The required gate ran sequentially:

1. `pnpm exec turbo run build --filter=!@ez-kit/docs`: passed, 16 tasks.
2. `pnpm lint`: passed, 32 tasks.
3. `pnpm typecheck`: passed, 32 tasks, including registered Query error types and compiled Orval examples.
4. `pnpm test`: passed, 32 tasks. Query React: 76 tests; qc-react: 85; docs: 313.
5. `pnpm exec turbo run size --filter=!@ez-kit/docs`: passed after correcting qc-react's size configuration to exclude its new runtime dependency, as required by AGENTS.md. Its original 3 kB budget is unchanged.

`pnpm verify:affected` passed before the full gate (24 tasks). Two final collection regression cases were added afterwards and passed targeted lint, typecheck and tests, then the full gate above.

Measured sizes: Query gate entry 450 B / 550 B; collection entry 1.38 kB / 1.6 kB; qc-react own code 2.69 kB / 3 kB. The new collection budget provides approximately 15% headroom. Query gate isolation remains unchanged.

## Compatibility and browser checks

- `pnpm --filter @ez-kit/query-react test:react18`: 74 passed. This ran before the two final signal/cache and convention-override cases; those additions passed with current React in the full gate. No runtime implementation changed between these test additions.
- `pnpm --filter @ez-kit/qc-react test:react18`: 79 passed, six existing HeroUI cases skipped because that kit requires React 19.
- Playwright: 12 passed across `e2e/docs/qc-react.spec.ts`, `e2e/docs/query-collection.spec.ts` and both kits' query-source/query-modal scenarios. A temporary configuration used Next dev on port 3108 and `/usr/bin/chromium` with `--no-sandbox`; it was removed after the run.
- Browser coverage includes ordinary-list search/page reset, create/update/delete/deleteMany, last-page correction, infinite loading and pending/dismissed modal mutation sessions.
- `pnpm --filter @ez-kit/qc-react example:check`: passed; Orval 8.47.0 regenerated identical fetchers. The shared collection recipe compiles for both list and grid consumers.
- Direct Node import of the built collection entry passed without importing a grid package.

## Contract-specific coverage

Runtime/type fixtures cover arbitrary params, independent mutation inputs/results/context, optional operations and reads, selected responses/pages, native exact query keys, cache sharing, signal forwarding, source capability changes, same-source grid adaptation and original business identifiers. Mutation tests cover preparation failures/retries, callback variables, invalidation after unmount and pending mutations across distinct tenant base keys. Explicit/native mutation keys retain TanStack behavior; arbitrary same-key callback replacement is not frozen.

## Environment limitation

The docs production build was excluded from build/size because Google Fonts downloads are blocked in this environment. This is the existing user-accepted limitation, not a passing production-build result. Browser checks used Next dev with fallback fonts. Docs lint, typecheck, unit tests and the selected browser scenarios passed.

`openspec validate query-collection --strict` and `git diff --check` passed. All 21 tracked implementation tasks are complete.
