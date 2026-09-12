# Data Grid — Row reordering (menu + keyboard)

**Date:** 2026-09-12
**Status:** Design approved, not implemented
**Packages:** `@ez-kit/data-grid-core`, `@ez-kit/data-grid-react`, `@ez-kit/data-grid-shadcn`, `@ez-kit/data-grid-heroui`, `@ez-kit/docs`

## Problem

A grid can reorder its **columns** — `ordering: { column: true }` puts Move left / Move
right in the header menu and answers `Alt+ArrowLeft` / `Alt+ArrowRight` on a focused
header. Its **rows** have no equivalent. Any application whose row order is meaningful —
a playlist, a checklist, a priority queue, a form's field list — has to build the
affordance itself, outside the grid, against row data the grid is already rendering.

This design adds the row axis of the same feature: two entries in the row's action menu
and the matching keyboard shortcut.

## Scope

**In scope:** moving one row one step up or down, by menu entry or by `Alt+ArrowUp` /
`Alt+ArrowDown`, in both UI kits, in a controlled and an uncontrolled mode.

**Out of scope, deliberately:**

- **Mouse drag-and-drop.** A different interaction with its own problems — pointer
  capture, auto-scroll, a drop indicator, a touch story, and a keyboard fallback that
  is exactly what this design ships anyway. The feature matrix's `Row drag reorder`
  row stays `Planned`; this work adds a new row rather than flipping that one.
- **Moving a row across a page boundary.** See _Neighbour rules_ — the move is defined
  over rendered rows, and a row that vanishes onto another page is not a move the user
  can see happen.
- **A per-row lock** (`canMove: (row) => boolean`). Columns have one because a column
  def is a natural place to write it; a row has no def. Adding it later is additive.
- **`rowOrder` in extractable state.** It is the order of data, not the state of a
  control, and a thousand row ids do not belong in a URL. See _State persistence_.

## Public API

The slot already exists. `OrderingConfig` currently holds only `column`, and its own
doc comment reserves `row`:

> Only `column` exists today. Row ordering, if it lands, will be `row` here, and it can
> only ever turn on with a handler of its own […] That is what keeps a bare
> `ordering: true` meaning exactly what it means today.

This design keeps the reservation and relaxes one half of it — `onChange` is what
selects the **mode**, not what gates the feature:

```ts
export type RowOrderingConfig = FeatureToggle & {
	/**
	 * Called when the user moves a row.
	 *
	 * Omitted — uncontrolled: the grid keeps a `rowOrder` of its own and renders the
	 * moved order itself.
	 * Supplied — controlled: the grid stores nothing and only reports the move; the
	 * application reorders its own data (or sends the move to a server).
	 */
	onChange?: (move: RowMove) => void
}

export type OrderingConfig = FeatureToggle & {
	column?: boolean | ColumnOrderingConfig
	row?: boolean | RowOrderingConfig
}
```

A bare `ordering: true` stays **columns only**. Row reordering turns on exactly one
way, by naming the axis: `ordering: { row: true }`. The promise quoted above exists so
that a minor upgrade cannot silently hand an existing grid a feature nobody asked for,
and that reason survives the change of what `onChange` means: what would break the
promise is `true` reaching a new axis, not a handler being optional on it.

### The move payload

```ts
export const RowMoveDirection = {
	Up: 'up',
	Down: 'down',
} as const

export type RowMoveDirection = (typeof RowMoveDirection)[keyof typeof RowMoveDirection]

export type RowMove = {
	/** The row that moved. */
	rowId: string
	/** The row it swapped with — where `rowId` now sits. */
	targetRowId: string
	direction: RowMoveDirection
}
```

Deliberately **not** the full order, which is what `ColumnOrderingConfig.onChange`
emits. A grid always knows every column; under server-driven pagination it holds one
page of rows and cannot name the order of the rest. A move is the largest fact the grid
actually has, and two ids plus a direction are enough to splice an array or to `PATCH`
a position. Widening the payload later is additive.

`RowMoveDirection` is **physical** (`up` / `down`), not logical. It sits with
`pinning`'s `left` / `right` rather than `align`'s `start` / `end`, for the reason
already settled in `AGENTS.md`: the axis that flips under RTL is the horizontal one.
`ColumnMoveDirection` is logical (`start` / `end`) precisely because it names positions
along that flipping axis.

## Core — `features/ordering/row-ordering.ts`

A mirror of `ordering.ts`, in the same folder, with the same two exported functions:

```ts
export function canMoveRow<TRow>(table: Table<TRow>, rowId: string, direction: RowMoveDirection): boolean
export function moveRow<TRow>(table: Table<TRow>, rowId: string, direction: RowMoveDirection): RowMove | undefined
```

`moveRow` returns `undefined` when the move is unavailable, rather than the unchanged
order `moveColumn` returns: there is no order object here to hand back. It describes the
move and performs none of it — the controlled path passes the descriptor to `onChange`,
and the uncontrolled path feeds it to a second pure helper:

```ts
export function applyRowMove(order: readonly string[], move: RowMove): string[]
```

Two functions rather than one because the two modes need different halves: controlled
mode never has an order to apply the move to, and uncontrolled mode needs both.

### Neighbour rules

The universe is `table.getRowModel().rows` — what is actually rendered, in the order it
is rendered. A neighbour is the adjacent row in `direction` that is all three of:

1. **In the same pinning band.** Row pinning has three bands (top, center, bottom); a
   step across a band boundary would read as a pin, not as a reorder. Same rule
   `findNeighbour` applies to a column's pin group, and the search **ends** at the
   boundary rather than skipping past it — what lies beyond is not this row's
   neighbour at all.
2. **Under the same parent row.** With tree data a row moves among its siblings only.
   A leaf that jumped into an adjacent subtree would change its parent, which is a
   different operation with a different meaning.
3. **Rendered.** Rows inside a collapsed subtree are not in the row model, so they are
   neither skipped over silently nor landed on.

Two consequences follow from the universe being the rendered model, and both are
documented rather than worked around:

- **At a page edge the arrows are disabled.** The rows of the next page are not in the
  model, and a row that disappears from view is not a move the user can follow.
- **With a filter active, the neighbour is the next _matching_ row.** In uncontrolled
  mode the grid reorders by that neighbour; in controlled mode the application receives
  its id and splices next to it. Both land the row where the user saw it go.

### The sorting lock

`canMoveRow` returns `false` whenever `table.getState().sorting` is non-empty. Sorting
computes the row order from the data, so a manual move would be recomputed away on the
next render and the row would visibly spring back. The disabled entries say so; they
are not hidden, for the same reason the column menu keeps both directions visible and
disabled at the ends.

Filtering carries no such lock — it removes rows, it does not order them.

## React — where the affordance lives

### Menu entries

Two new ids on `RowActionId`, `MoveUp` and `MoveDown`, in a new `order` section of the
row's menu — beside `PinTop` / `PinBottom`, which already live there. Both entries are
always listed and disabled at the ends, mirroring `buildColumnMenuSections`.

Two new `GridMenuIcon` members, `MoveUp` and `MoveDown`, mapped in both kits.

Two new message keys under `messages.rowActions` — `moveUp`, `moveDown` — plus the
section label. The wording reaches the builder through the resolved dictionary, never
hardcoded in the builder, so both kits translate at once.

### The actions column appears by itself

`system-columns.ts` computes
`needsActions = editing || deleting || pinning || creating || customRowActions`.
Row ordering joins that list. The precedent is exact: row **pinning** has no column of
its own either, and already summons the actions column to hold its menu.

### `Alt+ArrowUp` / `Alt+ArrowDown`

Handled on the `<tr>`, reached by bubbling from whatever inside the row has focus — the
selection checkbox, an inline edit button, the overflow trigger. This is the mechanism
the header already uses: `onHeaderKeyDown` sits on the `Th` and is reached from the
sortable div's `tabIndex={0}`. No roving tabindex, no focus model, nothing the grid
does not already do.

The handler reuses the header's two guards: it ignores the event unless `altKey` is
held, and it bails on an interactive target so that `Option+Arrow` inside a text field
keeps meaning "move by word".

The row carries `data-movable="true"` when it can move, matching the header's attribute
of the same name.

### Risk: HeroUI may swallow the shortcut

`Alt+Arrow` column reordering does **not** work in the HeroUI kit
([#223](https://github.com/ez-kit/ez-kit/issues/223)): React Aria's `Column` spreads its
own prop bag after the one the grid supplies, overwriting `onKeyDown`. `Row` is built
the same way, so the same defect is likely.

**This is the first task of the implementation plan, before any feature code.** Probe
it on a live HeroUI grid. Outcomes:

- It works → nothing to do.
- It is overwritten → move the handler to the actions **cell** (which the grid owns the
  markup of) and re-probe. If that also fails, ship the menu entries in both kits and
  record the shortcut as a third row in `kit-parity.mdx`'s divergence table, linked to
  #223 as the same upstream cause.

The menu entries work in both kits regardless, so the feature is never kit-exclusive —
only the shortcut is at risk.

## Uncontrolled mode

The grid keeps `rowOrder: string[]` and applies it to `data` **before** `createTable`
sees it — a memo in the React adapter, not a custom row model:

```ts
const orderedData = useMemo(() => applyRowOrder(data, rowOrder, getRowId), [data, rowOrder, getRowId])
```

TanStack has no row-order feature to extend, and reordering upstream of the table keeps
every row model, every id and every piece of state untouched. `applyRowOrder` is a pure
function in the core package and is unit-tested on its own.

`rowOrder` starts empty — an untouched grid renders `data` exactly as given — and is
seeded from the current row ids on the first move, then updated by `applyRowMove`. It
is always written **complete**, the same rule `columnOrder` follows and for
the same reason. A row present in `data` but absent from `rowOrder` — a row the server
has just added — keeps its declared position rather than being appended; `applyRowOrder`
is specified and tested on exactly that case.

Under server-driven pagination, uncontrolled mode reorders within the loaded page only.
That is the honest limit of a mode that holds no more than the grid does, and it is why
controlled mode exists. The docs say so where a reader is choosing between the two.

## State persistence

`rowOrder` is **not** added to the extractable state (`state/extract-state.ts` and the
`state-keys` vocabulary). Everything there — sorting, filters, page, column layout —
describes how a view is configured. A row order describes the data itself, it grows
with the row count, and a URL carrying a thousand ids is not a deep link anybody wants.
An application that needs to persist an uncontrolled order should use controlled mode,
which hands it every move.

## Error handling

There is no failure path inside the grid. A move is a pure computation over the rendered
row model, and `canMoveRow` gates it: an unavailable move disables the entry, and the
keyboard handler returns before `preventDefault`, leaving the event to the browser.

Two development-only warnings, following the grid's existing `warnOnce` discipline:

- `ordering: { row: … }` with `sorting` enabled and a sort applied is **not** a warning
  — it is the documented disabled state.
- A grid whose `getRowId` is left at the index default while row ordering is on **is** a
  warning: index-derived ids change the moment rows move, so the order refers to the
  wrong rows on the next render. This is the one real misconfiguration the feature has,
  and it is silent without the warning.

## Testing

**Core, unit** — `canMoveRow` / `moveRow` / `applyRowMove` / `applyRowOrder` over: both directions; both
ends; the three pinning bands; tree siblings and a refused cross-parent step; a
collapsed subtree; a filtered model; the sorting lock; a row missing from `rowOrder`.

**React, unit** — the menu carries both entries; each is disabled at its end; both are
disabled under an active sort; the actions column materialises from `ordering` alone;
`Alt+ArrowUp` / `Alt+ArrowDown` move a row and are ignored on an interactive target;
uncontrolled mode re-renders in the new order; controlled mode emits one `RowMove` and
moves nothing by itself.

**E2E** — `apps/docs/e2e/packages/data-grid/ordering/rows.spec.ts`, run against both
kits by the existing harness, covering the menu path and the keyboard path, and
asserting the edge-disabled and sorted-disabled states.

**Docs** — a new page and a live example registered in `manifest.json` **and**
`registry.ts`; an entry in `apps/docs/test/docs-options/page-type-map.ts` classifying
its option table, without which the option-name test fails by design.

## Documentation

- New page `content/docs/data-grid/row-ordering.mdx`, placed in `meta.json` directly
  after `row-actions`, cross-linked from `columns/ordering.mdx`.
- `kit-parity.mdx` — only if the HeroUI probe finds the shortcut overwritten.
- `feature-matrix.data.ts` — a new `Rows & Selection` row, `Row reordering (menu +
keyboard)`, status `Done`, pointing at the new page. `Row drag reorder` stays
  `Planned`.
- While in that file: `i18n / messages` is marked `Planned` although localisation has
  shipped (`core/src/messages/**`, `localization.mdx`, `e2e/…/localization/messages.spec.ts`).
  Flip it to `Done`. Unrelated to this feature, one line, and it currently tells every
  reader of the Features page something false.

## Release

One changeset, minor, naming `@ez-kit/data-grid-core`, `@ez-kit/data-grid-react` and
`@ez-kit/data-grid-heroui`. **Not** `@ez-kit/data-grid-shadcn`, which is `private` and
listed in `.changeset/config.json`'s `ignore`; naming it fails the `version` job after
merge. `scripts/check-changesets.mjs` enforces this, so `pnpm lint` catches a mistake
here before CI does.
