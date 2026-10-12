# Plan: DnD Phase 2 — The port

## Summary

Give `@ez-kit/data-grid-react` a **drag-and-drop port**: a small set of types (`DndAdapter`,
`DragSpec`, `DragAxis`, `SortableItemHandle`, `DndDropEvent`), a no-op default implementation, a
`dnd` field on `CreateDataGridOptions`, and a **per-root** provider so a grid publishes either the
adapter its bundle was built with or an explicit no-op — never the ambient default and never an
outer grid's. Nothing in this phase imports `@dnd-kit/*`, renders a handle, or changes a single
pixel of existing output.

## User Story

As a kit author shipping a drag adapter on a `/dnd` subpath,
I want the shared React package to define the contract my adapter implements and to publish it to
every component below a grid root,
so that drag mechanics can arrive from an optional peer without the shared package ever naming it.

## Problem → Solution

The shared package must be able to _use_ a drag implementation it may not depend on, and the
implementation must be reachable from a row, a header cell and the visibility panel alike — three
call sites at three depths. Passing it down by prop is not available (the tree between the root and
a row is made of consumer-written composition), and a module-level context would leak an outer
grid's adapter into a nested non-DnD grid, because every context in this package is created at
module scope and therefore shared by everything resolving the same copy of the package.
→ Two contexts, exactly as `data-grid-options-context.tsx` already does for the factory option
layer: a **bundle** context that `createDataGrid`'s bound `<DataGrid>` publishes, and a **grid**
context that the shared core (`DataGridControlled`) publishes from it while closing the bundle one
off. Below a root, `useSortableItem` reads the grid context and delegates; with no adapter it
delegates to the no-op and `useDndEnabled()` is `false`, so a handle renders nothing at all.

## Metadata

- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/data-grid-dnd.prd.md` (revision 3)
- **PRD Phase**: Phase 2 — The port
- **Estimated Files**: 10 (5 created, 5 updated)
- **Parallel with**: Phase 1 (complete) — different packages
- **Depends on**: nothing
- **Unblocks**: Phase 3 (heroui adapter + `/dnd`), and through it Phase 4

---

## UX Design

N/A — internal change. This phase adds no affordance and renders nothing new. The success
criterion is precisely that **a grid with no adapter renders identically**, byte for byte in the
DOM.

### Interaction Changes

| Touchpoint                    | Before                                                                  | After                                                                                                                                                                        | Notes                                                                       |
| ----------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `createDataGrid` options      | `components`, `cellTypes`, `features`, `keyboardNavigation`, `defaults` | + `dnd?: DndAdapter`                                                                                                                                                         | Optional; omitted means the no-op, which is what every existing bundle gets |
| Rendered DOM (no adapter)     | —                                                                       | unchanged                                                                                                                                                                    | No new element, attribute, role or class; asserted by a test                |
| Package public API            | —                                                                       | + `DndAdapter`, `DragSpec`, `DragAxis`, `SortableItemHandle`, `DndDropEvent`, `DndProviderProps`, `noopDndAdapter`, `useDndEnabled`, `useSortableItem`, `DndAdapterProvider` | Additive                                                                    |
| Nested grid inside a DnD grid | n/a                                                                     | gets the no-op, not the outer adapter                                                                                                                                        | The defect this phase's provider split exists to prevent                    |

---

## Mandatory Reading

| Priority | File                                                                           | Lines                           | Why                                                                                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | `packages/data-grid/react/react/src/data-grid-options-context.tsx`             | 199–235                         | **The pattern this phase copies.** Two contexts for one value: an outer one a bound `<DataGrid>` publishes, closed off by the shared core so it stops at the grid it configures.                                            |
| P0       | `packages/data-grid/react/react/src/create-data-grid.tsx`                      | 24–93, 188–233                  | Where `dnd` goes (beside `keyboardNavigation`, `:84`), and `BoundDataGrid`'s provider stack (`:210–233`) the new provider joins.                                                                                            |
| P0       | `packages/data-grid/react/react/src/data-grid/data-grid.tsx`                   | 341–364                         | `DataGridControlled`'s provider tree and the `GridFactoryDefaultsProvider defaults={undefined}` line at `:346` that closes the factory layer — the exact spot the grid-level DnD provider goes.                             |
| P0       | `packages/data-grid/react/react/src/data-grid/keyboard-navigation/context.tsx` | 1–42                            | The shape of a small kit-statement context in this package: `'use client'`, one `createContext`, a `{ enabled, children }` provider, hooks that read it, docblocks that say _why it is a kit statement, not a grid option_. |
| P1       | `packages/data-grid/react/react/src/index.ts`                                  | 139–147, 288–307, 375–388       | The three export blocks the new names join: Factory, DI context, closed sets.                                                                                                                                               |
| P1       | `packages/data-grid/react/react/src/headless-contract.test.ts`                 | 1–70                            | The file-walking guard style. The new "no `@dnd-kit` identifier anywhere in this package" assertion is written the same way.                                                                                                |
| P1       | `packages/data-grid/react/react/src/create-data-grid.test.tsx`                 | 1–40                            | Test shape for the factory: `createDataGrid({ components: testComponents })`, render, assert.                                                                                                                               |
| P1       | `packages/data-grid/react/react/src/closed-sets.test.ts`                       | 1–60                            | Why `DragAxis` must be a `const` object **plus** a same-named union, and where its member assertion goes.                                                                                                                   |
| P2       | `packages/data-grid/react/react/src/public-api.test.ts`                        | 37–61                           | The export-surface assertions the new closed set joins (`exports the closed sets as const objects usable as both value and type`).                                                                                          |
| P2       | `packages/data-grid/core/src/types.ts`                                         | 748–763                         | `ColumnResizeMode` — the canonical closed-set form (`as const` object, `(typeof X)[keyof typeof X]` union, per-member docblocks).                                                                                           |
| P2       | `AGENTS.md`                                                                    | "No styles in …react" paragraph | The paragraph the port's docblock must cite about dnd-kit's inline styles: _the test is authorship, not the attribute_.                                                                                                     |
| P2       | `apps/docs/test/tree-shaking.test.ts`                                          | all                             | The entry-point sets pinned per export. Adding names to `./index` must not change them; run it.                                                                                                                             |

## External Documentation

| Topic                                | Source                                                                 | Key Takeaway                                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useSortable` return shape (v0.1.21) | `@dnd-kit/react@0.1.21` docs, `apps/docs/react/hooks/use-sortable.mdx` | Returns `ref`, `targetRef`, `sourceRef`, `handleRef`, `isDropTarget`, `isDragSource`, `isDragging`, `isDropping`. The port takes the three it needs.    |
| `useSortable` arguments              | same                                                                   | `{ id, index, type, accept, group, disabled, handle, transition, … }`. `DragSpec`'s four fields map onto `id` / `index` / `type`+`accept` / `disabled`. |
| Drag handle pattern                  | same (`multiple-sortable-lists.mdx`, legacy `use-sortable.mdx`)        | The activator is a **separate element** given its own ref — which is why the port returns `handleRef` beside `ref` rather than one node ref.            |

```
KEY_INSIGHT: v0.1.x's `useSortable` returns refs and booleans only — it applies transforms itself.
APPLIES_TO:  `SortableItemHandle`; it needs no `transform`, `style` or `listeners` member.
GOTCHA:      Pre-1.0. The port is the insulation — keep `SortableItemHandle` to the three members
             the grid actually consumes, so a v0.2 rename costs one adapter file and no call site.
```

---

## Patterns to Mirror

### TWO_CONTEXTS_FOR_ONE_VALUE

```tsx
// SOURCE: src/data-grid-options-context.tsx:199-235
const GridFactoryDefaultsContext = createContext<AnyDefaultOptions | undefined>(undefined)

export function GridFactoryDefaultsProvider({ defaults, children }: GridFactoryDefaultsProviderProps) {
	return <GridFactoryDefaultsContext.Provider value={defaults}>{children}</GridFactoryDefaultsContext.Provider>
}
```

```tsx
// SOURCE: src/data-grid/data-grid.tsx:341-348 — the shared core closing the outer layer off
<GridFactoryDefaultsProvider defaults={undefined}>
	<CellTypesProvider cellTypes={resolvedCellTypes}>
```

### KIT_STATEMENT_CONTEXT

```tsx
// SOURCE: src/data-grid/keyboard-navigation/context.tsx:17-26
const KeyboardNavigationContext = createContext(false)

export function KeyboardNavigationProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
	return <KeyboardNavigationContext.Provider value={enabled}>{children}</KeyboardNavigationContext.Provider>
}

export function useKeyboardNavigationEnabled(): boolean {
	return useContext(KeyboardNavigationContext)
}
```

### CLOSED_SET

```ts
// SOURCE: packages/data-grid/core/src/types.ts:755-762
export const ColumnResizeMode = {
	/** The width follows the pointer live, every frame of the drag. The default. */
	OnChange: 'onChange',
	/** The width updates once, on mouse release. */
	OnEnd: 'onEnd',
} as const

export type ColumnResizeMode = (typeof ColumnResizeMode)[keyof typeof ColumnResizeMode]
```

### DEV_ONLY_WARNING

```tsx
// SOURCE: src/data-grid/data-grid.tsx:57, 419-430
const IS_DEV = process.env.NODE_ENV !== 'production'
// …
const wasControlledRef = useRef(isControlled)
if (IS_DEV && wasControlledRef.current !== isControlled) {
	console.error(
		`<DataGrid> switched from ${describe(wasControlledRef.current)} to ${describe(isControlled)}. ` +
			'Pick one mode for the lifetime of the component — switching remounts the grid and resets its state.',
	)
}
wasControlledRef.current = isControlled
```

### FACTORY_PROVIDER_STACK

```tsx
// SOURCE: src/create-data-grid.tsx:210-233
function BoundDataGrid(props: BoundProps) {
	return (
		<KeyboardNavigationProvider enabled={keyboardNavigation}>
			<GridComponentsProvider components={components}>
				<GridFactoryDefaultsProvider defaults={factoryDefaults}>{/* … */}</GridFactoryDefaultsProvider>
			</GridComponentsProvider>
		</KeyboardNavigationProvider>
	)
}
```

### FILE_WALKING_GUARD

```ts
// SOURCE: src/headless-contract.test.ts:26-57
function walk(dir: string, exts: readonly string[]): string[] {
	/* … */
}

it('emits no literal `className=` strings in data-grid/* or cell-types/*', () => {
	const offenders: { file: string; match: string }[] = []
	const re = /className=['"][^'"\n]+['"]/g
	for (const file of allFiles) {
		/* … */
	}
	expect(offenders).toEqual([])
})
```

### TEST_STRUCTURE

```tsx
// SOURCE: src/create-data-grid.test.tsx:19-25
describe('createDataGrid', () => {
	it('returns DataGrid, useDataGrid, GridComponentsProvider', () => {
		const result = createDataGrid({ components: {} })
		expect(result.DataGrid).toBeTypeOf('function')
	})
```

---

## Files to Change

| File                                             | Action | Justification                                                                                                       |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------- |
| `.../react/react/src/data-grid/dnd/types.ts`     | CREATE | The port's contract: `DragAxis`, `DragSpec`, `SortableItemHandle`, `DndDropEvent`, `DndProviderProps`, `DndAdapter` |
| `.../react/react/src/data-grid/dnd/noop.ts`      | CREATE | `noopDndAdapter` — inert refs, `isDragging: false`, pass-through Provider                                           |
| `.../react/react/src/data-grid/dnd/context.tsx`  | CREATE | Both contexts, both providers, `useDndAdapter` / `useDndEnabled` / `useSortableItem`, dev identity warning          |
| `.../react/react/src/data-grid/dnd/index.ts`     | CREATE | Barrel, mirroring `data-grid/keyboard-navigation/index.ts`                                                          |
| `.../react/react/src/data-grid/dnd/dnd.test.tsx` | CREATE | Every success criterion of the phase                                                                                |
| `.../react/react/src/create-data-grid.tsx`       | UPDATE | `dnd` field + `<DndBundleProvider>` in the bound stack                                                              |
| `.../react/react/src/data-grid/data-grid.tsx`    | UPDATE | `DataGridControlled` promotes bundle → grid adapter and closes the bundle context off                               |
| `.../react/react/src/index.ts`                   | UPDATE | Export the port                                                                                                     |
| `.../react/react/src/closed-sets.test.ts`        | UPDATE | `DragAxis` member assertion                                                                                         |
| `.../react/react/src/headless-contract.test.ts`  | UPDATE | New guard: no `@dnd-kit` identifier anywhere in this package's `src`                                                |
| `.changeset/dnd-port.md`                         | CREATE | `@ez-kit/data-grid-react` minor — additive public API                                                               |

## NOT Building

- **No `@dnd-kit` dependency, import, type reference or string** anywhere in this package. A guard
  test enforces it.
- **No adapter implementation.** That is Phase 3 (heroui, on `/dnd`).
- **No handle, no `data-slot`, no `data-dragging`, no commit.** Phase 4 onward. `dropRow` /
  `dropColumn` already exist from Phase 1 and are **not** called here.
- **No `<DataGrid dnd>` prop and no `dnd` on `UseDataGridConfig`.** `createDataGrid` only — PRD
  _Decisions Log_, "How a project switches it on".
- **No `FullGridComponents` member.** `dnd` is a config field precisely so the component contract
  does not grow; see AGENTS.md on every new key being a major.
- **No keyed Provider and no adapter-identity invariant.** Removed in PRD r3. What ships is one
  docblock sentence plus a cheap development-mode warning.
- **No `data-drop-edge`, no drop-edge vocabulary.** Removed in r3.
- **No `messages` keys.** Announcements are Phase 8.
- **No docs page.** Phase 11 — including the unresolved question of `CreateDataGridOptions` not
  being a governing type in `apps/docs/test/docs-options/page-type-map.ts`.

---

## Step-by-Step Tasks

### Task 1: The port's types

- **ACTION**: Create `src/data-grid/dnd/types.ts`.
- **IMPLEMENT**:
  - `DragAxis` as a closed set — `const DragAxis = { Row: 'row', Column: 'column' } as const` plus
    `type DragAxis = (typeof DragAxis)[keyof typeof DragAxis]`. One axis value per surface; the
    visibility panel is the **column** axis (it reorders columns), which the docblock must say so
    Phase 6 does not invent a third.
  - `type DragSpec = { id: string; index: number; axis: DragAxis; disabled?: boolean }`. Docblock:
    `index` is the item's **real** index in its axis' order, never its position in a virtual
    window (Phase 9 depends on that being stated here); `disabled` carries every lock the step
    path honours and a disabled item is not draggable at all.
  - `type SortableItemHandle = { ref: (node: HTMLElement | null) => void; handleRef: (node: HTMLElement | null) => void; isDragging: boolean }`.
    Exactly three members, deliberately — `@dnd-kit/react@0.1` returns eight and the port takes
    what the grid consumes, so a pre-1.0 rename costs one adapter file.
  - `type DndDropEvent = { axis: DragAxis; sourceId: string; targetId: string }`. Docblock: **ids
    are the source of truth**, matching `dropRow`'s convention from Phase 1; no `direction`, no
    indices.
  - `type DndProviderProps = { onDrop: (event: DndDropEvent) => void; children: ReactNode }`.
  - `type DndAdapter = { Provider: ComponentType<DndProviderProps>; useSortableItem: (spec: DragSpec) => SortableItemHandle }`.
- **MIRROR**: CLOSED_SET for `DragAxis`.
- **IMPORTS**: `import type { ComponentType, ReactNode } from 'react'`.
- **GOTCHA**: `exactOptionalPropertyTypes` — `disabled?: boolean` cannot be _passed_ as
  `undefined`. Every call site builds the spec with the conditional-spread form used throughout
  this package (`{...(disabled !== undefined ? { disabled } : {})}`); say so in the docblock,
  because the adapter boundary is where dnd-kit's non-`exactOptionalPropertyTypes` types get paid
  for (PRD, _Typing and lint_).
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react typecheck`.

### Task 2: The no-op adapter

- **ACTION**: Create `src/data-grid/dnd/noop.ts`.
- **IMPLEMENT**: `export const noopDndAdapter: DndAdapter` with a module-level `NOOP_REF = () => {}`
  and a module-level frozen `INERT: SortableItemHandle = { ref: NOOP_REF, handleRef: NOOP_REF, isDragging: false }`;
  `useSortableItem: () => INERT`; `Provider: ({ children }) => children`. Docblock: the constants
  are hoisted so the no-op returns a **stable identity** every render — a fresh object would
  invalidate any `useMemo`/`useEffect` a Phase 4 call site keys on the handle, in the grids that
  use no DnD at all.
- **MIRROR**: n/a — new module, but keep the docblock density of `keyboard-navigation/context.tsx`.
- **IMPORTS**: `import type { DndAdapter, SortableItemHandle } from './types'`.
- **GOTCHA**: `Provider` returns `children` directly. Type it so a bare `ReactNode` return
  type-checks (`({ children }: DndProviderProps) => children` typed as `ComponentType<DndProviderProps>`
  may need `<>{children}</>` under this repo's React types — use the fragment and stop thinking
  about it). It must **not** be `'use client'`-gated or do anything with `onDrop`.
- **VALIDATE**: `expect(noopDndAdapter.useSortableItem({ id: 'a', index: 0, axis: 'row' })).toBe(noopDndAdapter.useSortableItem({ id: 'b', index: 1, axis: 'row' }))` — identity, in the new test file.

### Task 3: The two contexts and the hooks

- **ACTION**: Create `src/data-grid/dnd/context.tsx` with `'use client'` at the top.
- **IMPLEMENT**:
  - `const DndBundleContext = createContext<DndAdapter | null>(null)` — what
    `createDataGrid({ dnd })` publishes, closed off by the root. Docblock cites
    `GridFactoryDefaultsContext` as the precedent and states **why two contexts**: one value cannot
    simultaneously be carried down and reset.
  - `const DndGridContext = createContext<DndAdapter | null>(null)` — what one grid publishes to
    its own subtree. `null` means "this grid has no DnD", which is _explicit_, not a fallthrough.
  - `export function DndBundleProvider({ adapter, children }: { adapter: DndAdapter | null; children: ReactNode })`
    and `export function DndAdapterProvider({ adapter, children }: …)` (the grid-level one).
  - `export function useDndBundleAdapter(): DndAdapter | null` — internal-ish, read by the root.
  - `export function useDndAdapter(): DndAdapter | null` — reads `DndGridContext`.
  - `export function useDndEnabled(): boolean { return useDndAdapter() !== null }` — **the gate a
    handle renders behind.** Docblock: a handle must not render at all when no adapter is
    registered (PRD, _The port_), so this is the condition, not `isDragging`.
  - `export function useSortableItem(spec: DragSpec): SortableItemHandle { return (useDndAdapter() ?? noopDndAdapter).useSortableItem(spec) }`
    — an **unconditional** call, which is the whole reason the adapter must not change under a
    mounted tree. Docblock carries that sentence verbatim from the PRD: _the adapter is bound once,
    at `createDataGrid` time, and must not change under a mounted tree_, plus the AGENTS.md
    citation about dnd-kit authoring its own inline styles (_the test is authorship, not the
    attribute_), since that is the paragraph that makes this port legal in a no-styles package.
  - Development-mode identity warning, in the grid-level provider: `useRef` the first adapter seen,
    `console.error` on a change, following DEV_ONLY_WARNING exactly (including writing the ref back
    after the check, so a persistent mistake warns once per change rather than every render).
- **MIRROR**: TWO_CONTEXTS_FOR_ONE_VALUE, KIT_STATEMENT_CONTEXT, DEV_ONLY_WARNING.
- **IMPORTS**: `import { createContext, useContext, useRef } from 'react'`; `import { noopDndAdapter } from './noop'`; `import type { DndAdapter, DragSpec, SortableItemHandle } from './types'`; `import type { ReactNode } from 'react'`.
- **GOTCHA**: Do **not** give either context a non-`null` default of `noopDndAdapter`. `null` is
  what distinguishes "no DnD here" from "an adapter is registered", which `useDndEnabled` is built
  on; the no-op is applied at the `useSortableItem` call, not at the context default.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test` after Task 8.

### Task 4: The barrel

- **ACTION**: Create `src/data-grid/dnd/index.ts`.
- **IMPLEMENT**: Re-export the runtime values (`DragAxis`, `noopDndAdapter`, `DndAdapterProvider`,
  `DndBundleProvider`, `useDndAdapter`, `useDndBundleAdapter`, `useDndEnabled`, `useSortableItem`)
  and the types (`DndAdapter`, `DndDropEvent`, `DndProviderProps`, `DragSpec`,
  `SortableItemHandle`), `export type` for the types per `verbatimModuleSyntax`.
- **MIRROR**: `src/data-grid/keyboard-navigation/index.ts` — values block then types block.
- **IMPORTS**: n/a.
- **GOTCHA**: No `export *`. The package's barrels list names; `import/order` is enforced
  alphabetically with `--max-warnings=0`.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react lint`.

### Task 5: `dnd` on `CreateDataGridOptions`

- **ACTION**: Update `src/create-data-grid.tsx`.
- **IMPLEMENT**: Add `dnd?: DndAdapter` to `CreateDataGridOptions`, **immediately after
  `keyboardNavigation`** (`:84`) since it is the same kind of field — a statement by the bundle,
  not an option of the grid. Docblock states: it is the **only** way DnD is switched on; there is
  no `<DataGrid dnd>` prop and no config field; a kit's own `createDataGrid` call (`data-grid.tsx:116`
  in both kits) must **never** pass it, or the peer becomes required for every consumer of that
  kit root and the `bundledCodeOf()` guard in `apps/docs/test/tree-shaking.test.ts` fails. Destructure
  `dnd` in the parameter list and wrap the existing stack: `<DndBundleProvider adapter={dnd ?? null}>`
  **outermost**, above `KeyboardNavigationProvider`.
- **MIRROR**: FACTORY_PROVIDER_STACK.
- **IMPORTS**: `import { DndBundleProvider } from './data-grid/dnd'`; `import type { DndAdapter } from './data-grid/dnd'`.
- **GOTCHA**: Do not add `dnd` to `DataGridBundle`'s returned members and do not touch
  `factoryDefaults` — the adapter is not an option layer, it never merges, and it must not reach
  `mergeOptionLayers`.
- **VALIDATE**: `createDataGrid({ components: {} })` still returns the same six members
  (`create-data-grid.test.tsx:19`).

### Task 6: The grid root provides its own value

- **ACTION**: Update `DataGridControlled` in `src/data-grid/data-grid.tsx`.
- **IMPLEMENT**: Read `const bundleAdapter = useDndBundleAdapter()` at the top of the component, and
  wrap the existing provider tree so that, from outside in:
  `<DndBundleProvider adapter={null}>` → `<DndAdapterProvider adapter={bundleAdapter}>` →
  `<GridFactoryDefaultsProvider defaults={undefined}>` → the rest unchanged.
  A comment above it, in the register of the one already at `:341-345`: the bundle layer has done
  its job by the time we get here, so it is closed off — without this, a nested `<DataGrid>` among
  another grid's children silently inherits the outer kit's adapter, and every context in this
  package is module-scoped, so "outer" means _any_ grid in the tree resolving the same copy of the
  package. The grid layer is published unconditionally, **including when it is `null`**: that is
  what "a root provides a bound adapter or an explicit no-op, never falls through" means.
- **MIRROR**: TWO_CONTEXTS_FOR_ONE_VALUE (the `defaults={undefined}` line two rows below is the
  same move).
- **IMPORTS**: `import { DndAdapterProvider, DndBundleProvider, useDndBundleAdapter } from './dnd'`.
- **GOTCHA**: Order matters. `DndBundleProvider adapter={null}` must be **outside**
  `DndAdapterProvider`, or the grid-level read would see the closed value. And the bundle read must
  happen in `DataGridControlled`, not in `DataGridRoot` — `DataGridUncontrolled` sits between them
  and is where `useDataGrid` runs; putting the read higher changes nothing today but would fork the
  two paths.
- **VALIDATE**: The nested-grid test in Task 8.

### Task 7: Export the port

- **ACTION**: Update `src/index.ts`.
- **IMPLEMENT**: A new block after the Factory block (`:139-147`), with a short docblock saying what
  the port is and that this package ships no implementation of it:
  `export { DndAdapterProvider, noopDndAdapter, useDndEnabled, useSortableItem } from './data-grid/dnd'`
  and `export type { DndAdapter, DndDropEvent, DndProviderProps, DragSpec, SortableItemHandle } from './data-grid/dnd'`.
  Add `DragAxis` to the existing closed-sets export block (`:378-388`), alphabetically placed to
  keep `import/order` and the block's own reading order.
- **MIRROR**: The surrounding blocks' comment style — each block says _why_ the names are public.
- **IMPORTS**: n/a.
- **GOTCHA**: Do **not** export `DndBundleProvider` or `useDndBundleAdapter`. They are the
  factory/root handshake; exporting them would let a consumer publish a bundle adapter around an
  arbitrary subtree, which is exactly the leak Task 6 closes. Publish `DndAdapterProvider` so an
  application composing by hand can register one for a subtree it owns.
- **VALIDATE**: `public-api.test.ts` still passes; `pnpm --filter @ez-kit/docs test -- tree-shaking`
  reports unchanged entry-point sets.

### Task 8: Tests

- **ACTION**: Create `src/data-grid/dnd/dnd.test.tsx`.
- **IMPLEMENT**, one `it` per PRD success criterion:
  1. `noopDndAdapter.useSortableItem` returns a stable, inert handle (identity + `isDragging === false`).
  2. **A grid with no adapter renders identically**: render `<DataGrid …>` with `testComponents`
     twice — once through a plain `createDataGrid({ components: testComponents })` and once through
     `createDataGrid({ components: testComponents, dnd: fakeAdapter })` where `fakeAdapter` is a
     test double — and assert the **first** grid's `container.innerHTML` equals a baseline rendered
     without the factory at all.
  3. `useDndEnabled()` is `false` inside a grid from a bundle with no `dnd`, and `true` inside one
     from a bundle with an adapter. Read it from a component rendered as `children`.
  4. `useSortableItem` delegates to the registered adapter: the double records the `DragSpec` it
     was handed and returns a sentinel handle; assert both.
  5. **A nested grid does not inherit the outer adapter**: render a DnD-bound `<DataGrid>` whose
     `children` contain a bare `<DataGrid data columns features>` whose own children read
     `useDndEnabled()`; assert `false` inside and `true` outside, in one render.
  6. The dev warning fires when the adapter identity changes under a mounted tree, and not
     otherwise — `vi.spyOn(console, 'error')`, rerender with a second adapter object.
- **MIRROR**: TEST_STRUCTURE; `renderWithComponents` / `testComponents` / `TEST_FEATURES` /
  `TEST_ROWS` / `TEST_COLUMNS` from `src/test-utils.tsx`.
- **IMPORTS**: `import { render, screen } from '@testing-library/react'`; `import { describe, expect, it, vi } from 'vitest'`;
  the factory, the port, and the test-utils fixtures.
- **GOTCHA**: The test double's `useSortableItem` is a **hook** — it must not be called
  conditionally and must obey the Rules of Hooks even when it ignores its spec. Write it as a plain
  function returning a constant; do not call `useState` inside it.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test`.

### Task 9: The "no `@dnd-kit`" guard

- **ACTION**: Update `src/headless-contract.test.ts`.
- **IMPLEMENT**: A third `it` that walks the **whole** `src` tree (not just `data-grid/` and
  `cell-types/` — reuse `walk(SRC_DIR, ['.ts', '.tsx'])` and do not apply `SKIP_FILES`, except this
  file itself) and asserts no file contains the string `@dnd-kit`. Comment says why: the shared
  package hosts the port and must never depend on, import, or name the implementation — the
  adapter lives on a kit's `/dnd` subpath as an optional peer, and this guard is what keeps a
  well-meant refactor from moving it here.
- **MIRROR**: FILE_WALKING_GUARD.
- **IMPORTS**: none new.
- **GOTCHA**: The existing `walk` skips `styles` and `utils` directories and every `.test.*` file.
  For this assertion that is fine and even desirable (a test naming the string in prose would
  self-trip), but the existing call sites pass `data-grid` / `cell-types` only — call `walk` on
  `SRC_DIR` for the new case, and keep the two existing cases on their current file sets so their
  meaning does not change.
- **VALIDATE**: Temporarily add `// @dnd-kit/react` to a source file, confirm the test fails, remove it.

### Task 10: Closed-set and public-API assertions

- **ACTION**: Update `src/closed-sets.test.ts` and `src/public-api.test.ts`.
- **IMPLEMENT**: In `closed-sets.test.ts`, add `DragAxis` to the import from `./index` and
  `expect(DragAxis.Row).toBe('row')` to the `exposes the named members` case. In
  `public-api.test.ts`, add `expect(publicApi.DragAxis.Column).toBe('column')` to the
  `exports the closed sets as const objects usable as both value and type` case.
- **MIRROR**: The existing assertions in both files, verbatim in shape.
- **IMPORTS**: extend the existing named-import lists (alphabetical, `import/order` is enforced).
- **GOTCHA**: `DragAxis` is a value **and** a type under one name. Import it as a value; do not add
  it to any `import type` block.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test`.

### Task 11: Changeset

- **ACTION**: Create `.changeset/dnd-port.md`.
- **IMPLEMENT**: `'@ez-kit/data-grid-react': minor` and a summary in English: the drag-and-drop
  port — types, no-op default and per-root provider — plus `dnd` on `createDataGrid`. State that no
  adapter ships yet and that nothing renders differently.
- **MIRROR**: `.changeset/ordering-step-past-pinned.md`.
- **IMPORTS**: n/a.
- **GOTCHA**: **Never name `@ez-kit/data-grid-shadcn`** — it is `private` and changesets-ignored,
  and `scripts/check-changesets.mjs` fails the lint step on it. `@ez-kit/data-grid-core` is not
  named either: Phase 1's helpers already have their own changeset and this phase does not touch
  core.
- **VALIDATE**: `pnpm lint` (the changeset check is its first step).

---

## Testing Strategy

### Unit Tests

| Test                                    | Input                                                  | Expected Output                                    | Edge Case? |
| --------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- | ---------- |
| no-op handle is inert and stable        | two different `DragSpec`s                              | same object; `isDragging === false`                | no         |
| DOM unchanged without an adapter        | bundle with no `dnd` vs. no factory at all             | identical `container.innerHTML`                    | no         |
| `useDndEnabled` off                     | bundle with no `dnd`                                   | `false`                                            | no         |
| `useDndEnabled` on                      | bundle with `dnd: double`                              | `true`                                             | no         |
| delegation                              | `useSortableItem({ id: 'r1', index: 3, axis: 'row' })` | double receives that exact spec; sentinel returned | no         |
| nested grid isolation                   | DnD grid whose children hold a bare `<DataGrid>`       | inner `false`, outer `true`, one render            | **yes**    |
| adapter identity change                 | rerender with a second adapter object                  | one `console.error`, message names the rule        | **yes**    |
| no identity warning on a stable adapter | rerender with the same object                          | no `console.error`                                 | **yes**    |
| `disabled` omitted vs. present          | spec built with the conditional-spread form            | compiles under `exactOptionalPropertyTypes`        | **yes**    |
| `@dnd-kit` absent from `src`            | the whole tree                                         | zero offenders                                     | **yes**    |

### Edge Cases Checklist

- [x] No adapter at all (the default for every existing consumer)
- [x] Adapter registered, nested grid without one
- [x] Adapter identity changes under a mounted tree (dev warning)
- [x] `DragSpec.disabled` omitted under `exactOptionalPropertyTypes`
- [x] Bare `<DataGrid>` with no `createDataGrid` wrapper at all
- [ ] Concurrent access — n/a, no shared mutable state
- [ ] Network failure — n/a
- [ ] Permission denied — n/a

---

## Validation Commands

### Static Analysis

```bash
pnpm --filter @ez-kit/data-grid-react typecheck
pnpm --filter @ez-kit/data-grid-react lint
```

EXPECT: zero type errors, zero warnings (`--max-warnings=0`).

### Unit Tests

```bash
pnpm --filter @ez-kit/data-grid-react test
```

EXPECT: all pass, including the new `dnd.test.tsx` and the updated guards.

### Full Test Suite

```bash
pnpm build && pnpm test
```

EXPECT: no regressions. `apps/docs/test/tree-shaking.test.ts` in particular — the added exports
must not change any recorded entry-point set (the port imports only `react`).

### Size

```bash
pnpm --filter @ez-kit/data-grid-react size
```

EXPECT: within budget. The port is a few hundred bytes of types plus two contexts; if the entry's
number moves materially, something dragged in more than intended.

### Manual Validation

- [ ] `grep -rn "@dnd-kit" packages/data-grid/react/react/src` prints nothing.
- [ ] `pnpm docs:dev`, open any data-grid example in both kits — visually unchanged, no console
      output.
- [ ] In a scratch file, `createDataGrid({ components, dnd: someObject })` type-checks and
      `createDataGrid({ components })` still does.

---

## Acceptance Criteria

- [ ] `DndAdapter`, `DragSpec`, `DragAxis`, `SortableItemHandle`, `DndDropEvent`,
      `DndProviderProps` exported from `@ez-kit/data-grid-react`
- [ ] `noopDndAdapter`, `useDndEnabled`, `useSortableItem`, `DndAdapterProvider` exported
- [ ] `dnd?: DndAdapter` on `CreateDataGridOptions`, documented as the only switch
- [ ] A grid with no adapter renders identical DOM
- [ ] No `@dnd-kit` string anywhere in `packages/data-grid/react/react`
- [ ] A nested non-DnD grid does not inherit an outer adapter
- [ ] Dev-mode warning on adapter identity change
- [ ] Changeset on `@ez-kit/data-grid-react` only
- [ ] All validation commands pass

## Completion Checklist

- [ ] Two-context split mirrors `data-grid-options-context.tsx` and says so in its docblock
- [ ] The "bound once, must not change under a mounted tree" sentence is in the port's docblock
- [ ] The AGENTS.md no-styles paragraph is cited where dnd-kit's inline styles are discussed
- [ ] Closed set is a `const` object plus a same-named union — not a TS `enum`, not a bare union
- [ ] No hardcoded values; no authored class name or inline style
- [ ] Tests follow the AAA shape and the existing guards' style
- [ ] No scope from Phases 3–11 crept in

## Risks

| Risk                                                                  | Likelihood | Impact | Mitigation                                                                                                                      |
| --------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| The port's shape does not fit `@dnd-kit/react@0.1`'s `useSortable`    | L          | H      | Shape taken from the 0.1.21 docs (`ref`/`handleRef`/`isDragging`, `{id,index,type,disabled}`); Phase 3 is the proof and is next |
| `DndProviderProps.onDrop` turns out too narrow for Phase 4's commit   | M          | M      | Ids only, matching `dropRow`'s Phase 1 convention; widening a props type is additive                                            |
| Provider order regressed by a later refactor, leaking to nested grids | M          | H      | The nested-grid test asserts it in one render                                                                                   |
| `useSortableItem` called while the adapter identity changes           | L          | H      | Documented rule + dev warning; binding is build-time by construction                                                            |
| A kit passes `dnd` in its own `data-grid.tsx`                         | M          | H      | Docblock forbids it; Phase 3's `bundledCodeOf()` guard catches it with teeth                                                    |
| Added exports shift a tree-shaking entry-point set                    | L          | M      | Run `apps/docs/test/tree-shaking.test.ts`; the port imports only `react`                                                        |

## Notes

- **Why two contexts and not one.** One context cannot both carry the bundle's adapter past the
  root and be reset at the root. The factory option layer had the identical problem and the
  identical answer (`data-grid-options-context.tsx:199-214`), so this is a second instance of an
  established pattern rather than a new mechanism.
- **Why `null` rather than `noopDndAdapter` as the context default.** `useDndEnabled` needs to
  distinguish "no DnD" from "an adapter is registered"; the no-op is applied at the call, not at
  the default. A handle renders behind `useDndEnabled()`, which the PRD states as a requirement
  (_a handle must not render at all when no adapter is registered_).
- **Why `useSortableItem` is called unconditionally.** It is a hook. That is precisely what makes
  the "bound once at `createDataGrid` time" rule load-bearing, and why the dev warning exists
  instead of the keyed Provider and identity invariant PRD r3 removed.
- **Phase 1 is done and is not touched here.** `dropRow` / `dropColumn` are not called until
  Phase 4.
- **Open question deliberately left open**: how the docs app renders composed-only DnD examples
  (`shared/DataGrid.tsx` lazy-loads the kits' _prebuilt_ grids). That is Phase 11's problem and
  nothing in this phase forecloses an answer.
