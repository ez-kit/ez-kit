# Core tree-shaking: `allDataGridFeatures` moved to its own subpath

The migration's headline benefit is that a consumer composes a feature set and pays only for what
they register. It did not work. This records what was measured, which of the two candidate fixes was
taken, why the other was rejected **on evidence rather than on argument**, who still imports the
moved name, and where core's gates stand afterwards.

Commit: `e686845f` — `fix(data-grid-core): move allDataGridFeatures to its own subpath`.

## How the numbers were taken

esbuild, `bundle: true`, `format: 'esm'`, **unminified**, against the **built**
`packages/data-grid/core/dist/features/index.js` — tree shaking is a property of what ships, so the
question has to be asked of `dist`, not of `src`. Resolution is workspace-only: `@ez-kit/*` and
relative paths are followed, everything else (`@tanstack/table-core` above all) is left external, so
the byte count is **core's own code** and cannot move because someone else published a release. This
is the same method as `apps/docs/test/tree-shaking/bundle.ts`, and it reproduced that agent's
baseline figures exactly, to the byte.

`row_getIsEditing` is the row-API key `editingFeature` installs and nothing else in the package
names it, so its presence in the output is the editing implementation surviving the shake. Each row
below records it.

## Before

| imported from `…/features`                               |  bytes | editing code present |
| -------------------------------------------------------- | -----: | -------------------- |
| `tableFeatures`                                          | 46 360 | yes                  |
| `rowSortingFeature`                                      | 46 363 | yes                  |
| `editingFeature`                                         | 46 360 | yes                  |
| `tableFeatures, rowSortingFeature, createSortedRowModel` | 46 402 | yes                  |
| `allDataGridFeatures`                                    | 46 365 | yes                  |
| whole surface (`import * as`)                            | 49 696 | yes                  |

Whichever single name you imported, you got ~93% of the entry, editing implementation included.

## After

| imported                                                 |  bytes |  change | editing code present   |
| -------------------------------------------------------- | -----: | ------: | ---------------------- |
| `tableFeatures`                                          |    994 | −97.9 % | **no**                 |
| `rowSortingFeature`                                      |    998 | −97.8 % | **no**                 |
| `editingFeature`                                         | 17 163 | −63.0 % | yes — it was asked for |
| `tableFeatures, rowSortingFeature, createSortedRowModel` |  1 035 | −97.8 % | **no**                 |
| `allDataGridFeatures` (now from `…/features/all`)        | 45 288 |  −2.3 % | yes — inherent         |
| whole surface of `…/features` (`import * as`)            | 48 086 |  −3.2 % | yes                    |

The three rows that matter are the composed ones: a sorting-only set costs 1 035 bytes instead of
46 402, and carries no editing code. `editingFeature` still brings the editing implementation, which
is the control — an absence that also held for a build resolving nothing would prove nothing.
`allDataGridFeatures` still costs what it costs; that is inherent to an all-in set and design §1
says so. What changed is that only a consumer who writes that import path pays it.

Corroborated independently: `apps/docs/test/tree-shaking.test.ts` — whose two `it.fails` cases
existed to pin this defect, and which PR 4 has since flipped to `it` — passes 26/26 against this
build.

## Why option 2, and why option 1 was rejected

**Option 1 — annotate the initializer `/* @__PURE__ */` — does not work.** Measured, not assumed:

| variant                                                              | `tableFeatures` alone |
| -------------------------------------------------------------------- | --------------------: |
| baseline                                                             |                46 360 |
| `/* @__PURE__ */` on the `tableFeatures({ … })` call                 |                46 376 |
| …and `/* @__PURE__ */` on each `create*RowModel()` inside it as well |                46 504 |

Both variants cost the bytes of the comments they added and saved nothing. The mechanism was then
confirmed on a one-module probe rather than left as a guess:

```js
export const withSpread = /* @__PURE__ */ Object.assign({ ...stock, a, b }) // kept
export const noSpread = /* @__PURE__ */ Object.assign({ a, b }) // dropped
```

esbuild drops an annotated call whose argument is a plain object and keeps the identical call when
the object **spreads** — a spread may run getters, so the expression is not droppable whatever the
annotation claims. `allDataGridFeatures` spreads `stockFeatures`, so it is the kept case. The
annotation is therefore not a weaker fix than the move; it is not a fix at all, and no rewording of
it would be, short of enumerating the 17 stock features by hand and giving up the "stays correct
across a table-core patch that adds a feature" property the spread buys.

**Option 2 — a subpath of its own — is what landed.** `allDataGridFeatures` now lives in
`packages/data-grid/core/src/features/all.ts` and ships as
`@ez-kit/data-grid-core/features/all`. It is also the right shape independent of bundler behaviour:
design §1 already says reaching the all-in set should be a deliberate choice, and an import path is
how a deliberate choice is spelled. It cannot be defeated by a bundler that ignores annotations.

Shape of the change:

- `src/features/all.ts` — new; holds the declaration and its docblock, importing the features from
  their own folders rather than through `entry.ts`.
- `src/features/entry.ts` — the declaration and the seven now-unused imports removed; the file
  docblock says where the set went and why, and the named-function-registry docblock's
  `{@link allDataGridFeatures}` is repointed.
- `tsup.config.ts` — `'features/all': 'src/features/all.ts'`.
- `package.json` — an `exports` entry for `./features/all` and a `size-limit` budget for it,
  `ignore`ing `@tanstack/table-core` (core's only runtime dependency), as AGENTS.md requires.
- `src/features/entry.test.ts` — reads `allDataGridFeatures` from `./all`. The cases stay in this
  file deliberately: what they assert is that the set registers the very objects the entry
  re-exports, so the two modules have to be read against each other. The `coreReactivityFeature`
  assertion — on `Object.keys`, because `useTable` spreads its own binding first and a set carrying
  that key would win — is unchanged and still passing.

## Consumers of `allDataGridFeatures`

This is a breaking change to one import path. **Not touched** — each is another agent's territory.

**Breaks at build time, needs routing (PR 3):**

- `packages/data-grid/react/react/src/test-utils.tsx:2` —
  `import { allDataGridFeatures, tableFeatures } from '@ez-kit/data-grid-core/features'`.
  Confirmed red: `src/test-utils.tsx(2,10): error TS2305: Module
'"@ez-kit/data-grid-core/features"' has no exported member 'allDataGridFeatures'.`
  The fix is to split the import — `tableFeatures` stays on `…/features`, `allDataGridFeatures`
  moves to `…/features/all`.
- `packages/data-grid/react/react/src/test-utils.tsx:896` — `export const TEST_FEATURES =
allDataGridFeatures`; the use site, unchanged by the split.

**Already updated by PR 4 while this was in flight — no action:**

- `apps/docs/content/docs/data-grid/feature-set.mdx:151` — now imports from `…/features/all`.
- `apps/docs/content/docs/data-grid/advanced/core.mdx:26` — now lists `…/features/all` as its own
  entry-point row.
- `apps/docs/test/tree-shaking.test.ts:225,231` — both cases flipped from `it.fails` to `it`, and
  both pass.

**Stale prose asserting the defect still exists (PR 6):**

- `packages/data-grid/core/README.md:59`
- `packages/data-grid/react/react/README.md:63`
- `packages/data-grid/react/shadcn/README.md:76`
- `packages/data-grid/react/heroui/README.md:76`

  All four carry the same paragraph: "It does **not** yet make your bundle smaller: importing any
  single name from `@ez-kit/data-grid-core/features` currently pulls ~93% of that entry … A fix in
  core is in progress." That is now false, and the core one additionally points a reader at
  "a deliberately failing case" that no longer fails.

- `AGENTS.md:47` — the paragraph describing the retained-operand defect.
- `.changeset/tanstack-table-v9.md:53` — the ~93% measurement.

## What PR 6's changeset must now say

The changeset is a **major** for `@ez-kit/data-grid-core` either way, so this adds a line rather
than a bump. Three edits:

1. **A new breaking-change entry.** `allDataGridFeatures` is no longer exported from
   `@ez-kit/data-grid-core/features`; it is exported from `@ez-kit/data-grid-core/features/all`.
   The migration is one import line. Every other name on `…/features` is unmoved.
2. **Replace the ~93% paragraph at line 53 with the benefit.** It currently documents the defect as
   a known cost of the migration. It is the opposite now: importing `tableFeatures` from
   `…/features` bundles 994 bytes rather than 46 360, and a sorting-only set 1 035 rather than
   46 402. Composing a set now governs bundle size as well as behaviour, which is what the migration
   was sold on.
3. **Say why the all-in set is on a path of its own** — one sentence: its declaration spreads, a
   spread cannot be shaken, so leaving it on the shared entry charged every consumer for every
   feature. That is also the answer to "why not just annotate it".

No changeset was written here; PR 6 owns the single one.

## Core's five gates, re-measured on the final tree

| gate      | result                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------- |
| build     | pass — ESM + DTS, three entries (`index`, `features/index`, `features/all`)                    |
| typecheck | pass — `tsc --project tsconfig.json --noEmit`, clean                                           |
| lint      | pass — `eslint . --max-warnings=0`, clean                                                      |
| test      | pass — 33 files / 661 tests, unchanged from before                                             |
| size      | pass — `index` 10.65 kB / 12.5 kB, `features` 4.5 kB / 5.5 kB, `features/all` 4.54 kB / 5.5 kB |

Prettier is clean across the package. Core was green before this change and is green after it.

Note what `size-limit` did **not** see: `features` reads 4.5 kB brotlied both before and after,
because it measures an entry point whole rather than what a partial import drags along. That is
exactly the gap `apps/docs/test/tree-shaking.test.ts` was written to cover, one package over, and
the reason the deliverable here is the byte table rather than the budget.
