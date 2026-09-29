# Plan: DnD Phase 3 — heroui adapter + `/dnd` subpath

## Summary

Ship the first implementation of the Phase 2 port: `@ez-kit/data-grid-heroui/dnd`, exporting
`adapter` — a `DndAdapter` built on `@dnd-kit/react@0.1.x`, delivered as the kit's **first optional
peer dependency**. The point of the phase is the delivery shape, proven by measurement: a consumer
who never names the subpath installs nothing new, and no drag library is reachable from the kit
root.

## User Story

As an application developer who wants drag reordering in a HeroUI grid,
I want one import — `import { adapter } from '@ez-kit/data-grid-heroui/dnd'` — and one install,
so that I get drag mechanics without every other consumer of this kit paying for them.

## Problem → Solution

Phase 2 defined the contract and left it unimplemented: `DndAdapter` describes a `Provider` and a
`useSortableItem`, and nothing in the repo satisfies either. Meanwhile the kit root is "everything
by construction" — `src/data-grid.tsx` calls `createDataGrid({ components: allComponents, features:
allDataGridFeatures })` — so an adapter imported anywhere the root can reach makes `@dnd-kit/react`
a required install for every existing consumer.
→ One module on its own subpath and its own build entry, imported by nothing else in the package,
with `@dnd-kit/react` declared as an **optional** peer and externalised by the build. The guarantee
is asserted, not asserted-about: `bundledCodeOf()` reads the bundled text of `{ DataGrid }` from the
kit root and fails if any `@dnd-kit` specifier survives in it.

## Metadata

- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/data-grid-dnd.prd.md` (revision 3)
- **PRD Phase**: Phase 3 — heroui adapter + subpath
- **Estimated Files**: 7 (2 created, 5 updated) + 1 changeset
- **Depends on**: Phase 2 (complete, `fd8f55dc`)
- **Unblocks**: Phase 4 (row drag) — the first phase that renders anything

---

## UX Design

N/A — no user-facing surface yet. This phase adds a module a developer can import and an adapter
they can pass to `createDataGrid`, but nothing renders a handle until Phase 4, so a grid built on
this adapter still looks and behaves exactly as it does today.

### Interaction Changes

| Touchpoint                     | Before                  | After           | Notes                                                                       |
| ------------------------------ | ----------------------- | --------------- | --------------------------------------------------------------------------- |
| Kit's public subpaths          | 23                      | 24 (`./dnd`)    | Additive                                                                    |
| Install for a non-DnD consumer | `@heroui/react` + peers | unchanged       | `@dnd-kit/react` is optional; a clean install without it must build and run |
| Kit root bundle                | no drag library         | no drag library | Asserted by `bundledCodeOf()`, not assumed                                  |
| Rendered DOM                   | —                       | unchanged       | The adapter's `Provider` is not mounted by the grid until Phase 4           |

---

## Mandatory Reading

| Priority | File                                                                                                   | Lines                                                         | Why                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | `packages/data-grid/react/react/src/data-grid/dnd/types.ts`                                            | all (127)                                                     | **The contract being implemented.** `DndAdapter`, `DragSpec`, `SortableItemHandle`, `DndDropEvent`, `DndProviderProps` — plus the `@remarks` saying the Provider is not mounted yet.                                                                                |
| P0       | `packages/va-store/src/persist/url/react-router.ts` + `packages/store-persist/src/url/react-router.ts` | all (2) / 1–33                                                | The delivery precedent end to end: a two-line re-export shim on a subpath, and the real adapter behind it. Note the export is `reactRouterAdapter` there and `adapter` here — a deliberate asymmetry the PRD records.                                               |
| P0       | `packages/data-grid/react/heroui/tsup.config.ts`                                                       | all                                                           | The entry map the new `dnd` entry joins, `external`, and the docblock explaining why every subpath gets its own entry.                                                                                                                                              |
| P0       | `packages/data-grid/react/heroui/package.json`                                                         | all                                                           | `exports`, `size-limit` (per-entry objects, each with the same four `ignore`s), `dependencies` / `devDependencies` / `peerDependencies`. **No `peerDependenciesMeta` yet — this phase adds the kit's first.**                                                       |
| P0       | `packages/store-persist/package.json`                                                                  | `peerDependencies`, `peerDependenciesMeta`, `devDependencies` | The optional-peer shape to copy exactly: declared as a peer, marked `optional`, **and** present in `devDependencies` so typecheck and tests can see it.                                                                                                             |
| P1       | `apps/docs/test/tree-shaking/bundle.ts`                                                                | 8–26, 74–108                                                  | `workspaceOnly` (externalises every non-`@ez-kit/` specifier) and `bundledCodeOf`. Read 8–26 to understand **why** the guard works: an external import survives in the output text as a bare `from "@dnd-kit/react"`, which is exactly the string being looked for. |
| P1       | `apps/docs/test/tree-shaking.test.ts`                                                                  | 140–177, 200–259                                              | The heroui entries already measured (`subpathEntryOf('data-grid/react/heroui', …)`) and the existing `bundledCodeOf` cases with their `EDITING_MARKER` idiom.                                                                                                       |
| P1       | `packages/data-grid/react/heroui/src/data-grid.tsx`                                                    | 1–50                                                          | The kit root's imports — the file that must **not** gain a `./dnd` import, and the docblock at `:30-37` explaining the identical rule for `DefaultLayout`.                                                                                                          |
| P2       | `packages/data-grid/react/heroui/src/index.ts`                                                         | all                                                           | The barrel that must not re-export the adapter, for the same reason.                                                                                                                                                                                                |
| P2       | `packages/data-grid/react/react/src/data-grid/dnd/dnd.test.tsx`                                        | 12–26                                                         | `makeTestAdapter` — the shape a hand-written `DndAdapter` takes, useful as a reference for what the real one must satisfy.                                                                                                                                          |
| P2       | `AGENTS.md`                                                                                            | "Never bump a dependency with `pnpm up -r`"                   | Adding a dependency here is a manifest edit plus a plain `pnpm install`, never `pnpm up -r`.                                                                                                                                                                        |

## External Documentation

| Topic                      | Source                                                           | Key Takeaway                                                                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useSortable` args/returns | `@dnd-kit/react@0.1.21` `apps/docs/react/hooks/use-sortable.mdx` | Takes `{ id, index, type, accept, group, disabled, handle, … }`; returns `{ ref, targetRef, sourceRef, handleRef, isDropTarget, isDragSource, isDragging, isDropping }`.                               |
| `DragDropProvider`         | same, `guides/migration.mdx`                                     | `onDragEnd(event, manager)` where `event.canceled` is the cancel flag and `event.operation` holds `{ source, target, position }`; `source.id` / `target.id` are `UniqueIdentifier` (string \| number). |
| Handle pattern             | same, virtualized example                                        | `const { isDragging, ref, handleRef } = useSortable({ id, index })` — `ref` on the moving element, `handleRef` on the activator. Confirms the port's two-ref split.                                    |
| `move` / `arrayMove`       | `@dnd-kit/helpers` source                                        | Not used. It is for reconciling an items array during the drag; this grid commits through its own `dropRow` / `dropColumn` from ids. PRD r3 removed the preview order for the same reason.             |

```
KEY_INSIGHT: `useSortable` accepts `type` and `accept`, which is how two axes coexist in one tree.
APPLIES_TO:  Task 2 — `DragSpec.axis` maps to BOTH `type` and `accept`.
GOTCHA:      Omit them and a row becomes a valid drop target for a column header. The port has no
             other mechanism for this — PRD r3 removed the composite `group` key.

KEY_INSIGHT: `onDragEnd` fires for a cancel and for a drop with no target.
APPLIES_TO:  Task 2 — the Provider must return early on `event.canceled` and on a missing `target`.
GOTCHA:      Also skip `source.id === target.id`: dnd-kit reports a self-drop, and forwarding it
             would make the grid commit a no-op move and fire `onChange` for nothing. The PRD's
             success metric is "exactly 1 `onChange` per drag", which a no-op drop would break.

KEY_INSIGHT: `@dnd-kit/react` is pre-1.0 (0.1.21) and the port is the insulation.
APPLIES_TO:  Task 3 — peer range.
GOTCHA:      `^0.1.21` means `>=0.1.21 <0.2.0` under semver's pre-1.0 caret rule, which is the
             right tightness while the API moves. Settles the PRD's open question deliberately.
```

---

## Patterns to Mirror

### SUBPATH_ADAPTER_MODULE

```ts
// SOURCE: packages/va-store/src/persist/url/react-router.ts:1-2
/** React Router URL adapter, re-exported from `@ez-kit/store-persist/url/react-router`. */
export * from '@ez-kit/store-persist/url/react-router'
```

```ts
// SOURCE: packages/store-persist/src/url/react-router.ts:1-16 — the real adapter behind it
'use client'

import { useRef } from 'react'
import { useSearchParams } from 'react-router'

/** Render-scoped URL adapter for react-router v6/v7 (BrowserRouter / data routers). */
export const reactRouterAdapter: RenderScopedAdapter = {
	source: URL_SOURCE,
	mergeMeta: urlMetaMerge,
	// …
}
```

### OPTIONAL_PEER

```jsonc
// SOURCE: packages/store-persist/package.json
"peerDependencies": { "react-router": ">=6.0.0", "zod": ">=3.0.0" },
"peerDependenciesMeta": { "react-router": { "optional": true }, "zod": { "optional": true } },
"devDependencies": { "react-router": "…", "zod": "…" }
```

### TSUP_ENTRY

```ts
// SOURCE: packages/data-grid/react/heroui/tsup.config.ts:22-56
export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'core/index': 'src/blocks/core/core-components.ts',
		// …
	},
	format: ['esm'],
	dts: true,
	sourcemap: true,
	splitting: true,
	external: ['react', 'react-dom'],
})
```

### SIZE_LIMIT_ENTRY

```jsonc
// SOURCE: packages/data-grid/react/heroui/package.json
{
	"path": "dist/expanding/index.js",
	"limit": "420 B",
	"ignore": ["@ez-kit/data-grid-core", "@ez-kit/data-grid-react", "@internationalized/date", "lucide-react"],
}
```

### BUNDLED_CODE_GUARD

```ts
// SOURCE: apps/docs/test/tree-shaking.test.ts:214-249
const FEATURES_ENTRY = subpathEntryOf('data-grid/core', 'features/index.js')

it('does not reach the editing implementation', async () => {
	const code = await bundledCodeOf(FEATURES_ENTRY, SORTING_ONLY)

	expect(code).not.toContain(EDITING_MARKER)
})
```

### EXTERNALISATION_RULE

```ts
// SOURCE: apps/docs/test/tree-shaking/bundle.ts:16-26
const workspaceOnly: Plugin = {
	name: 'workspace-only',
	setup(build) {
		build.onResolve({ filter: /.*/ }, (args) => {
			if (args.kind === 'entry-point') return null
			const isOurs = args.path.startsWith('.') || args.path.startsWith('/') || args.path.startsWith('@ez-kit/')

			return isOurs ? null : { path: args.path, external: true }
		})
	},
}
```

---

## Files to Change

| File                                               | Action | Justification                                                         |
| -------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| `packages/data-grid/react/heroui/src/dnd.tsx`      | CREATE | The adapter — the only module in the repo that names `@dnd-kit/react` |
| `packages/data-grid/react/heroui/src/dnd.test.tsx` | CREATE | Unit tests for the mapping and the drop-event translation             |
| `packages/data-grid/react/heroui/package.json`     | UPDATE | `exports["./dnd"]`, optional peer + devDependency, size-limit entry   |
| `packages/data-grid/react/heroui/tsup.config.ts`   | UPDATE | `dnd` entry; `external` gains the drag package                        |
| `apps/docs/test/tree-shaking.test.ts`              | UPDATE | The `bundledCodeOf` guard on the kit root                             |
| `pnpm-lock.yaml`                                   | UPDATE | Produced by `pnpm install`, committed                                 |
| `.changeset/dnd-heroui-adapter.md`                 | CREATE | `@ez-kit/data-grid-heroui` minor                                      |

## NOT Building

- **No handle, no `data-slot`, no `data-dragging`, no CSS.** Phase 4.
- **No mounting of `adapter.Provider` by the grid root, and no commit.** Those two are one coherent
  change and land together in Phase 4, where `dropRow` gives `onDrop` something to call. Until then
  the M1 caveat recorded in the Phase 2 report stands, and the `@remarks` in `types.ts` states it.
- **No shadcn adapter.** That kit ships as a registry payload and needs the multi-item generator
  first — Phase 10.
- **No sensors configuration** (pointer distance, touch delay, keyboard). Phase 4 and Phase 7; the
  adapter uses dnd-kit's defaults here.
- **No `@dnd-kit/helpers`, no `move`, no `arrayMove`.** The grid commits from ids through its own
  drop helpers. PRD r3 removed the preview order that would have needed them.
- **No docs page and no example.** Phase 11.
- **No change to `@ez-kit/data-grid-react`.** The port is finished; if this phase finds it wanting,
  that is a finding to record, not a silent edit.

---

## Step-by-Step Tasks

### Task 1: Install the optional peer

- **ACTION**: Edit `packages/data-grid/react/heroui/package.json` by hand, then run a plain
  `pnpm install` from the repo root.
- **IMPLEMENT**: Add `"@dnd-kit/react": "^0.1.21"` to `devDependencies` (so typecheck and vitest
  resolve it), `"@dnd-kit/react": "^0.1.21"` to `peerDependencies`, and
  `"peerDependenciesMeta": { "@dnd-kit/react": { "optional": true } }` — the kit's first such block,
  placed after `peerDependencies`.
- **MIRROR**: OPTIONAL_PEER.
- **IMPORTS**: n/a.
- **GOTCHA**: **Never `pnpm up -r`** — AGENTS.md records what that did to this repo the last time
  (it re-resolved react-aria's `use-sync-external-store`, duplicated zustand by peer id, and broke
  three `zu-store` examples nothing had touched). Edit the manifest, run plain `pnpm install`.
- **VALIDATE**: `pnpm install` succeeds; `git diff pnpm-lock.yaml` shows `@dnd-kit/*` added and
  **nothing else re-resolved**. If anything unrelated moved, stop and investigate.

### Task 2: The adapter

- **ACTION**: Create `packages/data-grid/react/heroui/src/dnd.tsx`.
- **IMPLEMENT**:
  - `'use client'` at the top, per every other module in this kit that uses hooks.
  - `import { DragDropProvider } from '@dnd-kit/react'` and
    `import { useSortable } from '@dnd-kit/react/sortable'`.
  - `function DndProvider({ onDrop, children }: DndProviderProps)` rendering
    `<DragDropProvider onDragEnd={…}>{children}</DragDropProvider>`. The handler:
    return early when `event.canceled`; read `const { source, target } = event.operation`; return
    when `target == null`; return when `source.id === target.id`; otherwise call
    `onDrop({ axis, sourceId: String(source.id), targetId: String(target.id) })`.
    The axis comes from `source.type` — cast through the closed set, and return early if it is
    neither member, because a `type` this adapter did not set is not ours to commit.
  - `function useSortableItem(spec: DragSpec): SortableItemHandle` calling
    `useSortable({ id: spec.id, index: spec.index, type: spec.axis, accept: spec.axis, ...(spec.disabled !== undefined ? { disabled: spec.disabled } : {}) })`
    and returning `{ ref, handleRef, isDragging }` — **only** those three, mapped explicitly rather
    than spread, so an upstream addition cannot silently widen this package's contract.
  - `export const adapter: DndAdapter = { Provider: DndProvider, useSortableItem }`, with a module
    docblock recording: why the export is `adapter` and not `dndKitAdapter` (a kit has exactly one
    and the path names it — the asymmetry with `reactRouterAdapter` is deliberate and recorded in
    the PRD's decisions log); that this module is imported by nothing else in the package and must
    stay that way; and that dnd-kit writes its own inline transforms, which is not an authorship
    violation of the no-styles rule (that rule governs the shared react package anyway, and this is
    a kit).
- **MIRROR**: SUBPATH_ADAPTER_MODULE.
- **IMPORTS**: `import type { DndAdapter, DndProviderProps, DragSpec, SortableItemHandle } from '@ez-kit/data-grid-react'` — the kit already depends on that package, and Phase 2 exported all five types.
- **GOTCHA**: `exactOptionalPropertyTypes` — `disabled` cannot be forwarded as `undefined`, hence
  the conditional spread. dnd-kit's own types are not written under that flag, so **this module is
  where that mismatch gets paid for**; if a cast is needed, scope it and say why in a comment, per
  the discipline AGENTS.md demands of the feature-optionality guards.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-heroui typecheck`.

### Task 3: Build entry, export map, size budget

- **ACTION**: Update `tsup.config.ts` and `package.json`.
- **IMPLEMENT**:
  - `tsup.config.ts`: add `dnd: 'src/dnd.tsx'` to `entry`, and change `external` to
    `['react', 'react-dom', /^@dnd-kit\//]`.
  - `package.json`: add `"./dnd": { "types": "./dist/dnd.d.ts", "import": "./dist/dnd.js", "default": "./dist/dnd.js" }`
    to `exports`, after `./expanding` and before `./styles.css`.
  - `package.json`: add a `size-limit` entry for `dist/dnd.js` with the same four `ignore`s as
    every sibling. Set the limit from the first measured build plus roughly 15% headroom, per the
    repo's stated budgeting rule.
- **MIRROR**: TSUP_ENTRY, SIZE_LIMIT_ENTRY.
- **IMPORTS**: n/a.
- **GOTCHA**: **The `external` entry must be a regex, not the string `'@dnd-kit/react'`.** This
  module imports `@dnd-kit/react/sortable` as well, and a bare-string external does not match a
  subpath specifier — the sortable half would be inlined into `dist/dnd.js`, silently turning a
  peer into a vendored copy. Second gotcha, for the docblock beside the size-limit entry:
  `size-limit` excludes peer dependencies, so this number measures **the adapter module alone**,
  not the cost of drag to a consumer. Say that rather than implying more, as the PRD instructs.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-heroui build`, then
  `node -e "const s=require('fs').readFileSync('packages/data-grid/react/heroui/dist/dnd.js','utf8'); console.log(/useSortable\s*=|function useSortable/.test(s) ? 'INLINED — external regex is wrong' : 'externalised')"`
  — and read the file: it must contain bare `from "@dnd-kit/react"` / `"@dnd-kit/react/sortable"`
  imports and no dnd-kit implementation.

### Task 4: The guard with teeth

- **ACTION**: Update `apps/docs/test/tree-shaking.test.ts`.
- **IMPLEMENT**: A `describe` beside the existing `bundledCodeOf` cases, asserting that a bundle of
  `{ DataGrid }` from the heroui kit root
  (`subpathEntryOf('data-grid/react/heroui', 'index.js')`) contains no `@dnd-kit` substring; and,
  as the positive control that gives the negative one meaning, that a bundle of `{ adapter }` from
  `dist/dnd.js` **does**. Without the second assertion the first passes for the wrong reason —
  e.g. a typo'd entry path bundling nothing.
- **MIRROR**: BUNDLED_CODE_GUARD.
- **IMPORTS**: the file's existing `bundledCodeOf` / `subpathEntryOf`.
- **GOTCHA**: Do **not** reach for `entryPointsPulledBy` here. `workspaceOnly` externalises every
  non-`@ez-kit/` specifier, so a drag library can never appear in a `pulls` set, and `entryPointOf`
  folds `dist/dnd.js` onto the bare package name — the PRD says this explicitly and calls the
  entry-point metric unusable for this question. The reason `bundledCodeOf` _does_ work is the flip
  side of the same fact: an externalised import survives in the output text as a literal
  `from "@dnd-kit/react"`, which is the string being matched.
- **VALIDATE**: `pnpm --filter @ez-kit/docs test`. Then the negative control: temporarily add
  `export { adapter } from './dnd'` to the kit's `src/index.ts`, rebuild the kit, confirm the guard
  **fails**, revert.

### Task 5: Adapter tests

- **ACTION**: Create `packages/data-grid/react/heroui/src/dnd.test.tsx`.
- **IMPLEMENT**:
  1. `adapter` satisfies the port's shape — `Provider` is a function, `useSortableItem` is a
     function.
  2. `useSortableItem` forwards the spec: render a component calling it inside a
     `<DndProvider onDrop={noop}>`, and assert it returns the three members with `isDragging === false`
     at rest, and that the returned `ref` / `handleRef` are callable. (dnd-kit needs its provider
     above the hook; that is the point of mounting one.)
  3. `disabled: true` is forwarded without a type error and the item still yields a handle.
  4. The drop translation, which is the part worth testing and the part a browser spec will not
     reach until Phase 4: extract the `onDragEnd` handler's logic into a named exported-for-test
     helper — `toDropEvent(event): DndDropEvent | null` — and cover **cancel**, **no target**,
     **self-drop**, **unknown `type`**, and the happy path for both axes. All five return `null`
     except the last two.
- **MIRROR**: `dnd.test.tsx` in the shared package (the Phase 2 file) for structure and comment
  register; the kit's own `src/index.test.tsx` for its render harness.
- **IMPORTS**: `@testing-library/react`, `vitest`, the adapter and the test helper.
- **GOTCHA**: Do not attempt to simulate a real pointer drag in jsdom — dnd-kit measures layout,
  and jsdom reports every element as zero-sized. Driving an actual drag is Playwright's job in
  Phase 4. That is exactly why the translation logic is extracted into a pure helper here: it is
  the half that _can_ be tested without a browser, and it is where the four refusals live.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-heroui test`.

### Task 6: Changeset

- **ACTION**: Create `.changeset/dnd-heroui-adapter.md`.
- **IMPLEMENT**: `'@ez-kit/data-grid-heroui': minor`. Summary in English: the `/dnd` subpath and
  its `adapter`, `@dnd-kit/react` as an optional peer, and — stated plainly — that nothing renders
  differently yet because the grid does not mount the adapter's provider until the next release.
- **MIRROR**: `.changeset/dnd-port.md`.
- **IMPORTS**: n/a.
- **GOTCHA**: `@ez-kit/data-grid-shadcn` must not appear — it is `private` and changesets-ignored,
  and `scripts/check-changesets.mjs` fails `pnpm lint` on it. `@ez-kit/data-grid-react` is not named
  either: this phase does not touch it.
- **VALIDATE**: `pnpm lint`.

---

## Testing Strategy

### Unit Tests

| Test                                   | Input                                         | Expected Output                         | Edge Case? |
| -------------------------------------- | --------------------------------------------- | --------------------------------------- | ---------- |
| adapter shape                          | the exported `adapter`                        | both members are functions              | no         |
| spec forwarding                        | `{ id, index, axis: 'row' }` under a provider | three-member handle, `isDragging` false | no         |
| `disabled` forwarded                   | `{ …, disabled: true }`                       | compiles; handle returned               | **yes**    |
| drop translation — happy path          | source/target, different ids, `type: 'row'`   | `{ axis: 'row', sourceId, targetId }`   | no         |
| drop translation — column axis         | same with `type: 'column'`                    | `axis: 'column'`                        | no         |
| drop translation — canceled            | `{ canceled: true }`                          | `null`                                  | **yes**    |
| drop translation — no target           | `operation.target == null`                    | `null`                                  | **yes**    |
| drop translation — self-drop           | `source.id === target.id`                     | `null`                                  | **yes**    |
| drop translation — foreign `type`      | `type: 'something-else'`                      | `null`                                  | **yes**    |
| kit root reaches no drag library       | bundle of `{ DataGrid }`                      | no `@dnd-kit` in the text               | **yes**    |
| the subpath does reach it              | bundle of `{ adapter }`                       | `@dnd-kit` present                      | **yes**    |
| the build externalises the subpath too | `dist/dnd.js`                                 | bare imports, no inlined library        | **yes**    |

### Edge Cases Checklist

- [x] Drag cancelled (Escape, or dropped on nothing)
- [x] Dropped on itself
- [x] A `type` this adapter did not set
- [x] `disabled` omitted vs. present under `exactOptionalPropertyTypes`
- [x] Subpath specifier externalisation (`@dnd-kit/react/sortable`)
- [x] A fresh install without the optional peer
- [ ] Concurrent access — n/a
- [ ] Network failure — n/a

---

## Validation Commands

### Static Analysis

```bash
pnpm --filter @ez-kit/data-grid-heroui typecheck
pnpm --filter @ez-kit/data-grid-heroui lint
```

EXPECT: zero errors, zero warnings.

### Unit Tests

```bash
pnpm --filter @ez-kit/data-grid-heroui test
pnpm --filter @ez-kit/docs test
```

EXPECT: all pass, including the new guard and its positive control.

### Build and Size

```bash
pnpm build
pnpm --filter @ez-kit/data-grid-heroui size
```

EXPECT: build clean; **`dist/index.js` unchanged** against its 16.6 KB budget — the root must not
have moved at all. The new `dist/dnd.js` entry reports within its own budget.

### Full Suite

```bash
pnpm lint && pnpm test
```

EXPECT: no regressions across all 28 tasks.

### The install guarantee

```bash
# The claim: a consumer without the optional peer still builds and runs.
pnpm --filter @ez-kit/data-grid-heroui exec node -e "console.log(require.resolve ? 'ok' : 'ok')"
```

Then the real check, which the harness cannot fake: read `dist/index.js` and `dist/index.d.ts` and
confirm neither names `@dnd-kit`. The `bundledCodeOf` guard asserts the runtime half; the `.d.ts`
half matters too, because a type-only reference from the root would make the peer required for
anyone running `tsc`.

### Manual Validation

- [ ] `grep -rn "@dnd-kit" packages/data-grid/react/heroui/src` lists **only** `dnd.tsx` and `dnd.test.tsx`.
- [ ] `git diff pnpm-lock.yaml` shows only `@dnd-kit/*` additions.
- [ ] Negative control for Task 4 performed and reverted.

---

## Acceptance Criteria

- [ ] `@ez-kit/data-grid-heroui/dnd` exports `adapter`, typed `DndAdapter`
- [ ] `@dnd-kit/react` is an optional peer and a devDependency; nothing else moved in the lockfile
- [ ] `dist/dnd.js` externalises both `@dnd-kit/react` and `@dnd-kit/react/sortable`
- [ ] No `@dnd-kit` reachable from the kit root, in `dist/index.js` or `dist/index.d.ts`
- [ ] The root's size-limit number is unchanged
- [ ] The drop translation refuses cancel, no-target, self-drop and a foreign type
- [ ] Changeset on `@ez-kit/data-grid-heroui` alone
- [ ] All validation commands pass

## Completion Checklist

- [ ] `src/dnd.tsx` imported by nothing else in the package
- [ ] The three returned members mapped explicitly, not spread
- [ ] Any cast at the dnd-kit boundary is scoped and explained
- [ ] The size-limit docblock says what the number does and does not measure
- [ ] The guard has a positive control
- [ ] No scope from Phases 4–11 crept in

## Risks

| Risk                                                                    | Likelihood | Impact | Mitigation                                                                                                     |
| ----------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `pnpm install` re-resolves something unrelated                          | M          | H      | Plain `pnpm install` after a manifest edit, never `pnpm up -r`; inspect the lockfile diff                      |
| A bare-string `external` leaves `@dnd-kit/react/sortable` inlined       | M          | H      | Regex external; Task 3's read of `dist/dnd.js` is the check                                                    |
| A type-only import of the adapter from the root makes the peer required | L          | H      | Check `dist/index.d.ts`, not only the JS bundle                                                                |
| dnd-kit's types fight `exactOptionalPropertyTypes`                      | M          | M      | The adapter boundary is where it is paid for; scoped casts with comments                                       |
| The port turns out to be shaped wrong for the real library              | L          | H      | This phase is precisely that test. A mismatch is a finding to record against Phase 2, not a quiet fix          |
| jsdom cannot drive a real drag, so the adapter is under-tested here     | H          | L      | Accepted and designed around: the translation is a pure helper; the drag itself is Playwright's job in Phase 4 |

## Notes

- **The PRD's `import/no-extraneous-dependencies` concern is moot** — verified while planning:
  `eslint.config.mjs` configures `import/resolver` and `import/order` and **does not enable that
  rule at all**, so importing an optional peer needs no lint configuration. The PRD's _Typing and
  lint_ paragraph says otherwise; it was written from an assumption. Recorded here rather than
  edited into the PRD, which is a historical document.
- **The peer range question is settled**: `^0.1.21`, i.e. `>=0.1.21 <0.2.0`. The PRD listed wide-vs-tight
  as open. Tight, because the library is pre-1.0 and the port already insulates consumers from it.
- **`src/dnd.tsx`, not `src/dnd.ts`** as the PRD names it: the module renders `<DragDropProvider>`,
  so it needs JSX. Same correction as Phase 2's `noop.tsx`.
- **The `adapter` export name breaks symmetry with `reactRouterAdapter` deliberately** — a kit has
  exactly one adapter and the subpath names it. The PRD's decisions log records this; the module
  docblock repeats it so a reader does not "fix" it.
