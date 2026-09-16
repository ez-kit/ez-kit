---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

The data-grid moves to TanStack Table v9, and **you now compose the feature set**.

This is a breaking release across the whole grid. It is `minor` because the packages are `0.x`;
`major` is reserved for the deliberate 1.0 cut and is not what this is.

## `features` is required

```ts
import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'

// The first three are mandatory — see below. Add what this grid actually does after them.
const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
})

const table = useDataGrid({ features, data, columns, sorting: true })
```

`@ez-kit/data-grid-core/features` is a new entry point and the single import path for the stock
TanStack features, the row-model factories, the `filterFns` / `sortFns` / `aggregationFns`
registries and the grid's own seven features, which are now real v9 plugins under upstream's naming
register (`editingFeature`, `creatingFeature`, `deletingFeature`, `draftFeature`, `loadingFeature`,
`infiniteFeature`, `rowOrderingFeature`). `@tanstack/table-core` stays our dependency rather than
becoming your peer. `allDataGridFeatures` is the all-in set, for prototypes and examples, and it
lives on **`@ez-kit/data-grid-core/features/all`** — see below.

**Three features are structural, whatever else you register:** `columnVisibilityFeature`,
`columnPinningFeature` and `columnSizingFeature`. The shell lays out a column grid, so it needs
visibility, pin groups and widths to lay one out with; omitting any of them is a **render-time
`TypeError`**, not a silent no-op, and the development-mode warning below says nothing about it.
Open every set with those three. Every other feature is genuinely optional — leave out
`rowSortingFeature` and you get a grid that does not sort.

**Composing a set governs two things: behaviour, and your bundle.** An unregistered feature
contributes no state slice, no API and no work at runtime — and it is not in what you ship.
Measured against the built entry, unminified: importing `tableFeatures` alone costs **994** bytes,
`rowSortingFeature` **998**, a sorting-only set **1 035**, and `editingFeature` **17 163**, which is
what a feature with a real implementation behind it weighs. A grid pays for what it registers.

**`allDataGridFeatures` moved to `@ez-kit/data-grid-core/features/all`.** A breaking import-path
change, and the reason the numbers above are what they are: as a top-level
`tableFeatures({ …stockFeatures, … })` call on the main entry it was not something a bundler could
drop — an object spread may run getters — so it retained every operand and each of those imports
cost ~46 kB instead. On its own subpath, reaching the all-in set is a choice. `tableFeatures` and
every individual feature stay exactly where they were; only this one name moved.

`features` has **no default**, deliberately: the only possible default is the all-in set, which is
what everyone who never thought about it would then ship. A `defaults` layer — `createDataGrid`'s
`defaults`, or a `DataGridOptionsProvider` — may state a set for everything below it, where it is
optional; the instance config still names one.

**Registering a feature does not switch it on, and configuring one does not register it.**
`features` is compile time (what exists), the config is runtime (whether this grid uses it), so a
wide shared grid definition still works at a dozen call sites with half of it off. `sorting: false`
beside a registered `rowSortingFeature` is correct and intended.

**Configuring a feature you did not register is _not_ a compile error.** It type-checks clean and
produces a grid with no state slice, no API and no behaviour for that option — a silent no-op. The
only thing that reports it is a development-mode warning naming the missing feature. An earlier
plan for this release promised a compile-time gate here; it is **not delivered**, and that is
stated rather than quietly dropped, because the gate costs the named `TS2561` diagnostic the
warning catalogue is built around. It is a separate piece of work.

## The table's state API

`table.getState()` and `table.setState(...)` are **gone**, along with `subscribe`, `getSnapshot`,
`getInitialSnapshot`, `notifyStateSubscribers` and `syncControlledState`. The hand-written store
behind them is gone with them. State lives in v9's atoms:

- `table.store.state` — the current whole state; `table.store.subscribe(fn)` to follow it;
- `table.atoms.<slice>.get()` — one slice;
- `table.initialState` — the state as of construction, resolved once and never reassigned;
- the setters a registered feature installs (`table.setSorting(...)`, …) for writes.

`onStateChange` is unchanged and is still how you mirror state into your own store.

`columnSizingInfo` — v8's transient mid-drag slice — is `columnResizing` in `TableState`, so a
`state` / `initialState` / `onStateChange` reader keyed on the old name no longer matches. The
persisted slice you would deep-link is still `columnSizing`.

## Renamed and re-shaped exports

- **`VisibilityState` is `ColumnVisibilityState`** on `@ez-kit/data-grid-react`'s entry point.
  v9's own name for the type. No alias is re-exported for the old one — that would be our
  invention rather than a name TanStack still has. One word at your import.
- **`ReactSelectionConfig` and `ReactExpandingConfig` gained a leading `TFeatures` type
  parameter**, following `SelectionConfig` / `ExpandingConfig`. A break for anyone who named
  either. `ReactRowActionsConfig` is unaffected.
- **`DataTable` from `@ez-kit/data-grid-react` is the React table**, not core's: its `grid` is
  `ResolvedGridOptions` and it declares `gridContext`. The explicit re-export shadows the core
  name, so an annotation written against this entry point now describes the table you actually
  hold.
- **`ResolvedGridOptions` gained `pagination.enabled`, plus `rowActions`, `direction` and
  `pinning.rowConfig`** — the members that left the TanStack options bag when v9 removed
  `TableOptionsResolved`. Reading any of those off `table.options` now yields `undefined`,
  silently; read them from the resolved grid options instead.

## New on `@ez-kit/data-grid-core`'s public entry

`createTableOptions(config)` resolves a config into v9 options **without constructing anything**,
so a framework adapter can hand them to its own constructor — this is what `useDataGrid` does, and
why a React table is not built by calling `createTable` inside a hook. `createAppliedEmitter` and
`createDraftAtoms` come with it: an adapter using `useTable` has to redo what `createTable` does
after construction, and projecting `onStateChange` through the applied snapshot is one of those
jobs — without it an adapter would either re-implement the projection or drop deferral from
`onStateChange` in React only. `GridOptions`, `StateHandlerTable`, `FormColumnMeta` and
`TableFeatures` are exported as the types those signatures name.

## Behaviour changes

- **A controlled write to a deferred axis no longer lands.** With `draft` on, passing
  `state.sorting` (or `columnFilters`, or `globalFilter`) used to overwrite the draft while it was
  clean. It no longer does, clean or dirty. This is forced by v9's atom precedence — an externally
  owned atom beats `options.state` outright — and it is what stops a controlled consumer mirroring
  the last applied query back over what the user is composing.
- **`deleting: true` now says what it does.** Written as a bare `true` with no `onDelete`, it did
  nothing at all: no actions column, no button, no error. A write feature has no defaults — the
  grid cannot invent a deletion — so the handler still decides whether the feature is on, but a
  development-mode warning now names the option and the handler it wants. Generic over `creating`,
  `editing` and `deleting`; every other handler-less spelling stays silent on purpose, because an
  object in a defaults layer is a description of how a write should look, not a request for one.
- **Column reordering by keyboard works under RTL.** The header cell resolved the grid's direction
  from `columnResizeDirection`, an option only written when resizing is on, so on a default grid
  both shortcuts moved columns the wrong way. It reads the grid's own `direction` now. Pre-existing
  under v8, found by the port.
- **A plain TanStack table in the same project is no longer polluted.** The grid declared its state
  slices by augmenting `TableState` globally, so any `@tanstack/table-core` table in your codebase
  had `state.editing` declared and lying. Each feature now declares itself under its own key, and
  the declarations reach you only through `@ez-kit/data-grid-core/features`.

`@tanstack/table-core` is `^9.2.4`, and `@ez-kit/data-grid-react` now depends on
`@tanstack/react-table` for `useTable`.
