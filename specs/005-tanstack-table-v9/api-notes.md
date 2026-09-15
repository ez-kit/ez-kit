# TanStack Table v9 — installed API inventory

Every name below was read out of an installed `.d.ts` (or, where the runtime behaviour is the
answer, an installed `.js`) in this worktree's `node_modules`. Nothing here is from the docs site
or from memory. Each section names the file it was read from so a later reader can re-derive it.

Anything the migration design assumed that is **not** in the installed package has been deleted
rather than softened; see [§7 Removed from this inventory](#7-removed-from-this-inventory).

## 0. Resolved versions

Read with `require.resolve` from inside each consuming package:

| Package                 | Version    | Resolved root                                                                                                                   |
| ----------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `@tanstack/table-core`  | **9.2.4**  | `node_modules/.pnpm/@tanstack+table-core@9.2.4/node_modules/@tanstack/table-core`                                               |
| `@tanstack/react-table` | **9.2.4**  | `node_modules/.pnpm/@tanstack+react-table@9.2.4_react-dom@19.2.5_react@19.2.5__react@19.2.5/node_modules/@tanstack/react-table` |
| `@tanstack/react-store` | **0.11.1** | for the grid: transitive, via `react-table`'s `"@tanstack/react-store": "^0.11.1"`                                              |
| `@tanstack/store`       | **0.11.1** | for the grid: transitive, via `react-store`                                                                                     |

**v8 is now gone from the workspace entirely.** `@tanstack/table-core` was a direct dependency of
only `data-grid-core` and `data-grid-react`. No other workspace package names `@tanstack/table-core`
at all: the shadcn and heroui kits depend on `@ez-kit/data-grid-react` and nothing TanStack-Table
directly, and `apps/docs` depends on `@ez-kit/data-grid-core`, `-react`, `-shadcn` and `-heroui` —
so every one of them reaches table-core only through a workspace package. After the bump,
`grep -n table-core pnpm-lock.yaml`
returns `9.2.4` and nothing else — there is no `@tanstack/table-core@8.21.3` entry left. A stale
`@tanstack+table-core@8.21.3` directory remains in `node_modules/.pnpm` from the previous install
and is not resolved by anything; do not read it by mistake.

`@tanstack/react-store@0.11.0` and `@tanstack/store@0.11.0` are **not** leftovers — they remain live in
the lockfile, resolved by `@tanstack/react-form@1.33.2`, which depends on `@tanstack/react-store: 0.11.0`
(`pnpm-lock.yaml:10861`), which in turn depends on `@tanstack/store: 0.11.0` (`pnpm-lock.yaml:10868`).
`react-table@9.2.4` and `table-core@9.2.4` resolve **0.11.1** for both. The workspace therefore has two
`@tanstack/store` copies side by side: atoms created under `react-form` and atoms created under the grid
are not the same module instance, so they cannot be shared or compared by identity across the two.

`react-table@9.2.4` pins `"@tanstack/table-core": "9.2.4"` exactly, so the adapter and the core can
never drift apart.

Subpath exports of `@tanstack/table-core` (from its `package.json` `exports`):
`.`, `./experimental-worker-plugin`, `./flex-render`, `./reactivity`, `./static-functions`,
`./store-reactivity-bindings`, `./package.json`. Note `flexRender` is **not** exported from the main
index (`grep -c flexRender dist/index.d.ts` → `0`); it lives on `./flex-render` and is re-exported by
`@tanstack/react-table`.

---

## 1. Feature slots and prerequisites

Read from `dist/types/TableFeatures.d.ts`.

### Valid keys of `tableFeatures({...})`

`TableFeatures` is the argument type:

```ts
interface TableFeatures extends Partial<CoreFeatures>, Partial<StockFeatures>, Partial<Plugins> {
	aggregationFns?: Record<string, AggregationFnDef<any, any, any, any>>
	columnMeta?: object
	coreRowModel?: (table: any) => () => RowModel<any, any>
	expandedRowModel?: (table: any) => () => RowModel<any, any>
	facetedMinMaxValues?: (table: any, columnId: string) => () => [number, number] | undefined
	facetedRowModel?: (table: any, columnId: string) => () => RowModel<any, any>
	facetedUniqueValues?: (table: any, columnId: string) => () => Map<any, number>
	filteredRowModel?: (table: any) => () => RowModel<any, any>
	filterFns?: Record<string, FilterFn<any, any>>
	filterMeta?: object
	groupedRowModel?: (table: any) => () => RowModel<any, any>
	paginatedRowModel?: (table: any) => () => RowModel<any, any>
	sortedRowModel?: (table: any) => () => RowModel<any, any>
	sortFns?: Record<string, SortFn<any, any>>
	tableMeta?: object
}
```

So the key space is: the 6 core feature keys (§2), the 17 stock feature keys (§2), anything
declaration-merged into `interface Plugins {}` — **this is where our seven custom features
register** — plus the 14 non-feature slots listed above.

The non-feature slots are named by a type alias, and they are stripped from `table._features` at
runtime:

```ts
type NonFeatureKeys =
	| 'aggregationFns'
	| 'columnMeta'
	| 'coreRowModel'
	| 'expandedRowModel'
	| 'facetedMinMaxValues'
	| 'facetedRowModel'
	| 'facetedUniqueValues'
	| 'filterFns'
	| 'filterMeta'
	| 'filteredRowModel'
	| 'groupedRowModel'
	| 'paginatedRowModel'
	| 'sortFns'
	| 'sortedRowModel'
	| 'tableMeta'
```

### The plugin registration point

```ts
interface Plugins {}
```

> Declaration-merge target for custom table features. Add custom feature keys here so
> `TableFeatures` can accept them in the `features` option and use the same feature-map extraction
> system as built-in features.

### `FeatureSlotPrereqs`

Every entry, verbatim:

```ts
interface FeatureSlotPrereqs {
	aggregationFns: 'rowAggregationFeature'
	columnResizingFeature: 'columnSizingFeature'
	expandedRowModel: 'rowExpandingFeature'
	facetedMinMaxValues: 'columnFacetingFeature'
	facetedRowModel: 'columnFacetingFeature'
	facetedUniqueValues: 'columnFacetingFeature'
	filteredRowModel: 'columnFilteringFeature'
	filterFns: 'columnFilteringFeature'
	filterMeta: 'columnFilteringFeature'
	globalFilteringFeature: 'columnFilteringFeature'
	groupedRowModel: 'columnGroupingFeature'
	paginatedRowModel: 'rowPaginationFeature'
	sortedRowModel: 'rowSortingFeature'
	sortFns: 'rowSortingFeature'
}
```

This interface is also declaration-mergeable — a custom feature can add its own slot prerequisites
and get the same validation.

`ValidateFeatureSlots<TFeatures>` turns a missing prerequisite into a _string literal type_ at that
key, so the property fails to type-check with a readable message:

```text
`Error: '${K & string}' requires '${FeatureSlotPrereqs[K] & string}' to be included in this table's features.`
```

### The helper

Read from `dist/helpers/tableFeatures.d.ts`:

```ts
declare function tableFeatures<TFeatures extends TableFeatures>(
	features: TFeatures & ValidateFeatureSlots<TFeatures>,
): TFeatures
```

It is an identity function at the type level — the return type is `TFeatures`, so `typeof features`
is the feature-set type to thread through our generics.

---

## 2. Stock and core feature inventory

### Stock — 17 keys, not 16

Read from `dist/features/stockFeatures.d.ts`. The design (and upstream's own migration skill) both
say "16 stock features"; the installed interface has **17** members. The extra one is
`cellSpanningFeature`, which upstream's migration table omits — it is new in v9 and has no v8
capability to map from.

```ts
interface StockFeatures {
	cellSelectionFeature
	cellSpanningFeature // <- the 17th; absent from upstream's migration table
	columnFacetingFeature
	columnFilteringFeature
	columnGroupingFeature
	columnOrderingFeature
	columnPinningFeature
	columnResizingFeature
	columnSizingFeature
	columnVisibilityFeature
	globalFilteringFeature
	rowAggregationFeature
	rowExpandingFeature
	rowPaginationFeature
	rowPinningFeature
	rowSelectionFeature
	rowSortingFeature
}
declare const stockFeatures: StockFeatures
```

Each is also a standalone named export from the package index, e.g. `rowSelectionFeature`, imported
individually so the unused ones tree-shake. `stockFeatures` is the all-in aggregate.

### Core — always present, do not register

Read from `dist/core/coreFeatures.d.ts`:

```ts
interface CoreFeatures {
	coreReactivityFeature?: TableReactivityBindings
	coreCellsFeature: typeof coreCellsFeature
	coreColumnsFeature: typeof coreColumnsFeature
	coreHeadersFeature: typeof coreHeadersFeature
	coreRowModelsFeature: typeof coreRowModelsFeature
	coreRowsFeature: typeof coreRowsFeature
	coreTablesFeature: typeof coreTablesFeature
}
```

`coreReactivityFeature` is the one a framework adapter supplies — `useTable` injects
`reactReactivity()` into `features` before calling `constructTable` (see §5).

### Row-model factories, from `dist/index.d.ts`

`createCoreRowModel`, `createSortedRowModel`, `createFilteredRowModel`, `createPaginatedRowModel`,
`createExpandedRowModel`, `createGroupedRowModel`, `createFacetedRowModel`,
`createFacetedMinMaxValues`, `createFacetedUniqueValues`. Also exported from the index:
`constructTable`, `tableFeatures`, `tableOptions`, `metaHelper`, `createColumnHelper`.

---

## 3. Custom feature contract

Read from `dist/types/TableFeatures.d.ts` (the `TableFeature` interface), `dist/utils.d.ts` and
`dist/utils.js` (the installation helpers), and the per-object `*_FeatureMap` interfaces under
`dist/types/`. Cross-checked against the package's own `skills/custom-features/SKILL.md`.

### `interface TableFeature` — every member, verbatim

```ts
interface TableFeature {
	assignCellPrototype?: <TFeatures, TData>(prototype: Record<string, any>, table: Table<TFeatures, TData>) => void
	assignColumnPrototype?: <TFeatures, TData>(prototype: Record<string, any>, table: Table<TFeatures, TData>) => void
	assignHeaderPrototype?: <TFeatures, TData>(prototype: Record<string, any>, table: Table<TFeatures, TData>) => void
	assignRowPrototype?: <TFeatures, TData>(prototype: Record<string, any>, table: Table<TFeatures, TData>) => void
	constructTableAPIs?: <TFeatures, TData>(table: Table<TFeatures, TData>) => void
	getDefaultColumnDef?: <TFeatures, TData, TValue extends CellData = CellData>() => ColumnDefBase_All<
		TFeatures,
		TData,
		TValue
	>
	getDefaultTableOptions?: <TFeatures, TData>(
		table: Table<TFeatures, TData>,
	) => Partial<TableOptions_All<TFeatures, TData>>
	getInitialState?: (initialState: Partial<TableState_All>) => TableState_All
	initTableInstanceData?: <TFeatures, TData>(table: Table<TFeatures, TData>) => void
	initCellInstanceData?: <TFeatures, TData, TValue extends CellData = CellData>(
		cell: Cell<TFeatures, TData, TValue>,
	) => void
	initColumnInstanceData?: <TFeatures, TData, TValue extends CellData = CellData>(
		column: Column<TFeatures, TData, TValue>,
	) => void
	initHeaderGroupInstanceData?: <TFeatures, TData>(headerGroup: HeaderGroup<TFeatures, TData>) => void
	initHeaderInstanceData?: <TFeatures, TData, TValue extends CellData = CellData>(
		header: Header<TFeatures, TData, TValue>,
	) => void
	initRowInstanceData?: <TFeatures, TData>(row: Row<TFeatures, TData>) => void
	resetTableInstanceData?: <TFeatures, TData>(table: Table<TFeatures, TData>) => void
}
```

(Generic constraints elided for width: every `TFeatures extends TableFeatures`, every
`TData extends RowData`. The full text is at `dist/types/TableFeatures.d.ts:270-415`.)

There are exactly 15 members. Note what is **not** there: no `createTable`, no `getDefaultOptions`,
no `assign*APIs` per object type — see the guardrail at the end of this section.

### Hook ordering, from the doc comments

- `getInitialState` runs during state resolution; the incoming `initialState` carries what earlier
  features and the user already contributed, so **spread it last**: `{ myDefaults, ...initialState }`.
- `getDefaultTableOptions` runs while options resolve; user options win over what it returns.
- `initTableInstanceData` runs once after options, state atoms and the store exist. Features are
  processed in a single pass in registration order, and **each feature's instance data is
  initialized just before its own `constructTableAPIs`**, so a feature may rely on data and APIs of
  features registered earlier.
- `constructTableAPIs` runs after options, state atoms, the store, and that feature's
  `initTableInstanceData`. It is documented as _exclusively_ for assigning table methods.
- `resetTableInstanceData` runs after `table.reset()` has restored internally owned atoms. It does
  not own state slices and cannot reset externally controlled state.
- The `assign*Prototype` hooks run **lazily**, the first time an object of that kind is constructed
  for that table. The prototype is cached per table (`table._rowPrototype`, `_columnPrototype`,
  `_cellPrototype`, `_headerPrototype` on `Table_CoreProperties`).
- Header groups have **no** prototype; `initHeaderGroupInstanceData` is their only extension point,
  and it reruns on every header-group rebuild (visibility / order / pinning change).

### The `*_FeatureMap` interfaces our seven features merge into

Every one is declaration-mergeable. Member names and the file each is declared in:

| Map                                                               | File                           | Existing stock keys                                                                                              |
| ----------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `TableState_FeatureMap`                                           | `dist/types/TableState.d.ts`   | 14 (every stock feature with state; not `cellSpanningFeature`, `columnFacetingFeature`, `rowAggregationFeature`) |
| `TableOptions_FeatureMap<TFeatures, TData>`                       | `dist/types/TableOptions.d.ts` | 16                                                                                                               |
| `Table_FeatureMap<TFeatures, TData>`                              | `dist/types/Table.d.ts`        | 16                                                                                                               |
| `ColumnDef_FeatureMap<TFeatures, TData, TValue extends CellData>` | `dist/types/ColumnDef.d.ts`    | 11                                                                                                               |
| `Column_FeatureMap<TFeatures, TData>`                             | `dist/types/Column.d.ts`       | 11                                                                                                               |
| `Row_FeatureMap<TFeatures, TData>`                                | `dist/types/Row.d.ts`          | 8                                                                                                                |
| `Cell_FeatureMap`                                                 | `dist/types/Cell.d.ts`         | 4 — **no generics**                                                                                              |
| `Header_FeatureMap`                                               | `dist/types/Header.d.ts`       | 2 — **no generics**                                                                                              |
| `RowModelFns_FeatureMap<TFeatures, TData>`                        | `dist/types/RowModelFns.d.ts`  | 3                                                                                                                |
| `CachedRowModels_FeatureMap<TFeatures, TData>`                    | `dist/types/RowModel.d.ts`     | 6                                                                                                                |

`Cell_FeatureMap` and `Header_FeatureMap` take **no type parameters** — a module augmentation that
declares them with `<TFeatures, TData>` will not merge. This is an easy thing to get wrong by
symmetry with the other eight.

Each composite type is assembled the same way, e.g.:

```ts
type Row<TFeatures extends TableFeatures, TData extends RowData> = Row_Core<TFeatures, TData> &
	ExtractFeatureMapTypes<TFeatures, Row_FeatureMap<TFeatures, TData>>
```

so a merged key only contributes its types when that key is present in the table's `TFeatures`.

`Plugins` must be merged too — that is what makes the feature key legal in `tableFeatures({...})`:

```ts
declare module '@tanstack/table-core' {
	interface Plugins {
		densityFeature: TableFeature
	}
	interface TableState_FeatureMap {
		densityFeature: DensityState
	}
	// …one entry per map the feature actually backs with runtime behaviour
}
```

### ▶ How a method installed through `assignRowPrototype` obtains the `table` instance

**Answer: two routes, both real, and the stock features use both.** Confidence: high — read from
the installed implementation, not only the types.

`assignRowPrototype` is `(prototype, table) => void`. The hook is invoked **once per table**, the
first time a row is constructed for it, and the prototype it receives is that table's own
`table._rowPrototype`. So:

**Route A — lexical closure over the hook's `table` argument.** Because the prototype is per-table,
closing over `table` is sound; there is no cross-table sharing to poison. This is how the memo
machinery gets `table` (`dist/utils.js:318-341`):

```js
function assignPrototypeAPIs(feature, prototype, table, apis) {
	for (const [staticFnName, { fn, memoDeps }] of Object.entries(apis)) {
		const { fnKey, fnName } = getFunctionNameInfo(staticFnName)
		if (memoDeps) {
			const memoKey = `_memo_${fnKey}`
			prototype[fnKey] = function (...args) {
				if (!this[memoKey]) {
					const self = this
					this[memoKey] = tableMemo({
						memoDeps: (depArgs) => memoDeps(self, depArgs),
						fn: (...deps) => fn(self, ...deps),
						fnName,
						objectId: self.id,
						table,
						feature, // <- closure over the hook's `table`
					})
				}
				return this[memoKey](...args)
			}
		} else
			prototype[fnKey] = function (...args) {
				return fn(this, ...args) // <- `this` is the row instance
			}
	}
}
```

**Route B — through the instance: `row.table`.** The non-memoized branch installs
`function (...args) { return fn(this, ...args) }`, so the declared `fn` receives the **row as its
first argument**, and `Row_CoreProperties` carries `table: Table<TFeatures, TData>`
(`dist/core/rows/coreRowsFeature.types.d.ts:53`). This is what every stock feature does for state
reads — from `dist/features/row-selection/rowSelectionFeature.js:34-58`:

```js
assignRowPrototype: (prototype, table) => {
	assignPrototypeAPIs('rowSelectionFeature', prototype, table, {
		row_getIsSelected: { fn: (row) => row_getIsSelected(row) },
		row_getIsSomeSelected: {
			fn: (row) => row_getIsSomeSelected(row),
			memoDeps: (row) => [row.subRows, row.table.atoms.rowSelection?.get(), row.table.options.enableRowSelection],
		},
		// …
	})
}
```

Upstream's own guardrail (`skills/custom-features/SKILL.md`) states the rule as: _"Table API `fn`
receives declared arguments. Prototype API `fn` receives the current object first"_, and _"Prototype
methods are shared and must not close over per-object mutable data"_ — per-**table** data is fine,
per-**row** data is not.

**Recommendation for our seven features:** prefer Route B (`row.table`) for anything that reads
state, so the method stays correct if the prototype is ever reused, and reserve the closure for
what `assignPrototypeAPIs` itself needs. Both work; B matches every stock feature.

Two mechanical details that bite:

1. **Key naming is load-bearing.** `getFunctionNameInfo` splits on `_`: a key `row_getIsSelected`
   installs as `prototype.getIsSelected`. The prefix (`table_`, `column_`, `row_`, `cell_`,
   `header_`) is stripped. A key without an underscore will not install under the name you expect.
2. **There is no `assignRowAPIs` / `assignColumnAPIs` / `assignCellAPIs` / `assignHeaderAPIs`.**
   Only `assignTableAPIs` (direct assignment, table is a singleton) and `assignPrototypeAPIs` (used
   inside the four `assign*Prototype` hooks). Signatures at `dist/utils.d.ts:146` and `:159`:

```ts
declare function assignTableAPIs<TFeatures, TData, TDeps, TDepArgs>(
	feature: keyof TFeatures & string,
	table: Table<TFeatures, TData>,
	apis: APIObject<TDeps, NoInfer<TDepArgs>>,
): void

declare function assignPrototypeAPIs<TFeatures, TData, TDeps, TDepArgs>(
	feature: keyof TFeatures & string,
	prototype: Record<string, any>,
	table: Table<TFeatures, TData>,
	apis: PrototypeAPIObject<TDeps, NoInfer<TDepArgs>>,
): void

interface API<_TDeps, _TDepArgs> {
	fn: (...args: any) => any
	memoDeps?: (depArgs?: any) => [...any] | undefined
}
interface PrototypeAPI<_TDeps, _TDepArgs> {
	fn: (self: any, ...args: any) => any
	memoDeps?: (self: any, depArgs?: any) => [...any] | undefined
}
```

Note `feature: keyof TFeatures & string` — the feature key passed here must be the same string the
feature is registered under, which is the key we declaration-merge into `Plugins`.

### Other installation helpers our features will want

From `dist/utils.d.ts`:

```ts
declare function makeStateUpdater<TFeatures, K>(
	key: K,
	instance: {
		readonly options: { readonly atoms?: object | undefined }
		readonly baseAtoms: object
	},
): (updater: Updater<TableState<any>[K & keyof TableState<any>]>) => void

declare function functionalUpdate<T>(updater: Updater<T>, input: T): T
declare function setStateSlice<K>(
	instance: { readonly options: object },
	key: K,
	updater: Updater<StateSliceForKey<K>>,
	isEqual?: StateSliceEqualityFn<StateSliceForKey<K>>,
): void
declare function stateSlicesEqual(a: unknown, b: unknown): boolean
declare function cloneState<T>(value: T): T
declare function callMemoOrStaticFn<TObject, TArgs, TReturn>(
	obj: TObject,
	fnKey: string,
	staticFn: (obj: TObject, ...args: TArgs) => TReturn,
	...args: TArgs
): TReturn
```

`makeStateUpdater(key, table)` is the standard body of a feature's default `on<Slice>Change` — it
writes through the base atom for that slice and accepts both value and updater forms. `setStateSlice`
is the structural-equality-guarded path a feature uses when it routes through a user handler.

---

## 4. State surfaces

Read from `dist/core/table/coreTablesFeature.types.d.ts` (the declarations), `dist/types/Table.d.ts`
(where they land on `Table`), and `@tanstack/store@0.11.1`'s `dist/types.d.ts` / `dist/store.d.ts`
(what `Atom` / `ReadonlyAtom` / `ReadonlyStore` actually are).

> Note for a later reader: the brief's Step 5 grep pointed at `$CORE/dist/types` for
> `baseAtoms|readonly atoms|store`. These are declared one directory over, in
> `dist/core/table/coreTablesFeature.types.d.ts`; `dist/types/Table.d.ts` only re-exports the
> interface. Grep `$CORE/dist` rather than `$CORE/dist/types`.

### The four declared shapes

```ts
/** A map of writable atoms, one per `TableState` slice. These are the internal
 *  writable atoms that the library always writes to via `makeStateUpdater`. */
type BaseAtoms<TFeatures extends TableFeatures> = {
	[K in keyof TableState<TFeatures>]-?: Atom<TableState<TFeatures>[K]>
}

/** A map of readonly derived atoms, one per `TableState` slice. Each derives
 *  from its corresponding `baseAtom` plus, optionally, a per-slice external
 *  atom or external state value.
 *  Precedence: `options.atoms[key]` > `options.state[key]` > `baseAtoms[key]`. */
type Atoms<TFeatures extends TableFeatures> = {
	[K in keyof TableState<TFeatures>]-?: ReadonlyAtom<TableState<TFeatures>[K]>
}

/** A map of optional external atoms, one per `TableState` slice. Consumers can
 *  provide their own writable atom for any state slice to take over ownership. */
type ExternalAtoms<TFeatures extends TableFeatures> = Partial<{
	[K in keyof TableState<TFeatures>]: Atom<TableState<TFeatures>[K]>
}>
```

and the broadened internal variants feature code uses (`BaseAtoms_All`, `Atoms_All`,
`ExternalAtoms_All`) which make **every** key optional, so feature code written generically can read
`table.atoms.columnPinning?.get()` for a slice it does not own.

On the table itself (`Table_CoreProperties`):

```ts
readonly atoms: Atoms<TFeatures>
readonly baseAtoms: BaseAtoms<TFeatures>
readonly initialState: TableState<TFeatures>
readonly options: TableOptions<TFeatures, TData>
readonly optionsStore?: Atom<TableOptions<TFeatures, TData>> | undefined
readonly store: ReadonlyStore<TableState<TFeatures>>
readonly _reactivity: TableReactivityBindings
readonly _features: Partial<CoreFeatures> & TFeatures
```

plus, on `Table_Table`:

```ts
reset: () => void
setOptions: (newOptions: Updater<TableOptions<TFeatures, TData>>) => void
```

### What an atom and a store actually are

From `@tanstack/store@0.11.1` `dist/types.d.ts`:

```ts
interface Readable<T> {
	get: () => T
}
interface BaseAtom<T> extends Subscribable<T>, Readable<T> {}
interface Atom<T> extends BaseAtom<T> {
	/** Sets the value of the atom using a function. */
	set: ((fn: (prevVal: T) => T) => void) & ((value: T) => void)
}
interface ReadonlyAtom<T> extends BaseAtom<T> {}
```

and `dist/store.d.ts`:

```ts
declare class ReadonlyStore<T> implements Omit<Store<T>, 'setState' | 'actions'> {
	get state(): T
	get(): T
	subscribe(observerOrFn: Observer<T> | ((value: T) => void)): Subscription
}
```

So `table.store.state` / `table.store.get()` is the full current snapshot, `table.store.subscribe`
is the whole-state subscription, and `table.atoms.<slice>.get()` is a single slice.

### ▶ Does a frozen / initial snapshot equivalent to our `getInitialSnapshot` exist?

**Answer: not as a snapshot API, but `table.initialState` is a correct substitute for the one job
ours does.** Confidence: high for existence, high for the SSR conclusion.

Our `getInitialSnapshot` (`packages/data-grid/core/src/types.ts:949-957`) is documented as "the
snapshot as of construction, frozen", and its one caller is
`packages/data-grid/react/react/src/use-data-grid-selector.ts:35`, the `getServerSnapshot` argument
of `useSyncExternalStore`.

What v9 has:

```ts
/** This is the resolved initial state of the table. */
readonly initialState: TableState<TFeatures>
```

Assigned once during construction (`dist/core/table/constructTable.js:84`):

```js
table.initialState = getInitialTableState(table._features, table.options.initialState)
```

where `getInitialTableState` folds every feature's `getInitialState` over the user's `initialState`
and returns `cloneState(initialState)` (`constructTable.js:13-17`). It is then installed as a
property descriptor (`coreTablesFeature.utils.js:111-113`) and nothing writes to it afterwards.

Two qualifications, both verified:

1. **It is not literally frozen.** `grep -rn "Object.freeze" $CORE/dist --include="*.js"` returns
   **nothing**. `initialState` is stable-by-reference and never reassigned, but it is a plain
   object; our type's word "frozen" would become "stable" rather than "frozen".
2. **v9 has no server-snapshot concept at all.** `@tanstack/react-store@0.11.1`'s `useSelector` —
   which is what `useTable` and `Subscribe` both use — passes the _same_ getter for both the client
   and the server snapshot (`dist/useSelector.js`):

   ```js
   const getSnapshot = useCallback(() => source.get(), [source])
   return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, compare)
   ```

   So upstream's own React binding does not distinguish an initial snapshot. Searching the
   `react-table` skills for `ssr|server|hydrat|getServerSnapshot` turns up only `initialState`
   references about reset semantics.

**Decision input:** if we keep our own `useSyncExternalStore` call anywhere, `table.initialState`
is the value to pass as `getServerSnapshot` — so `getInitialSnapshot` can become a thin wrapper
reading `table.initialState`, or be deleted outright if we adopt `useTable` / `useSelector` and stop
calling `useSyncExternalStore` ourselves. The types make either choice available; nothing forces a
new API.

### ▶ Does `atoms` accept a partial record?

**Answer: yes, unambiguously.** Confidence: high — it is `Partial<…>` in the declaration.

```ts
readonly atoms?: ExternalAtoms<TFeatures>

type ExternalAtoms<TFeatures extends TableFeatures> =
  Partial<{ [K in keyof TableState<TFeatures>]: Atom<TableState<TFeatures>[K]> }>
```

The option itself is optional, and every key within it is optional. The doc comment spells out the
consequence:

> Optionally, provide your own external writable atoms for individual state slices. When an atom is
> provided for a given slice, it takes precedence over `options.state[key]` and the internal base
> atom for that slice. Feature state update APIs write through the corresponding atom updater, so
> external atoms are the preferred v9 ownership model for app-managed table state slices.

So ownership is **per slice**: some slices external, the rest internal, in one table.
For the `draft` feature this means **one atom set, not two** — hand v9 exactly the slices the app
owns and let the table own the rest.

Precedence, stated twice in the source (`Atoms<T>` doc comment and the `atoms` option doc comment):
`options.atoms[key]` > `options.state[key]` > `baseAtoms[key]`. And from upstream's migration skill:
`table.reset()` does not reset externally owned atoms.

### Other option members on `TableOptions_Table`

```ts
readonly features: TFeatures & ValidateFeatureSlots<TFeatures>
readonly data: ReadonlyArray<TData>
readonly atoms?: ExternalAtoms<TFeatures>
readonly state?: Partial<TableState<TFeatures>>
readonly initialState?: Partial<TableState<TFeatures>>
readonly autoResetAll?: boolean
readonly key?: string                  // devtools identity only
readonly meta?: ExtractTableMeta<TFeatures, TData>
readonly mergeOptions?: (defaultOptions: TableOptions<TFeatures, TData>,
                         options: Partial<TableOptions<TFeatures, TData>>) => TableOptions<TFeatures, TData>
```

`initialState` is documented as _"Changing this object later does not reset table state, so it does
not need to be stable."_

### `TableState` is feature-derived

From `dist/types/TableState.d.ts`:

```ts
type TableState<TFeatures extends TableFeatures> = ExtractFeatureMapTypes<TFeatures, TableState_FeatureMap>
```

`TableState_FeatureMap` has 14 stock keys — `cellSelectionFeature`, `columnFilteringFeature`,
`columnGroupingFeature`, `columnOrderingFeature`, `columnPinningFeature`, `columnResizingFeature`,
`columnSizingFeature`, `columnVisibilityFeature`, `globalFilteringFeature`, `rowExpandingFeature`,
`rowPaginationFeature`, `rowPinningFeature`, `rowSelectionFeature`, `rowSortingFeature`.
A slice exists only if its feature is registered: with no `rowPaginationFeature` there is no
`pagination` key in `initialState`, `state`, `atoms`, `table.atoms`, `table.store` or `table.state`.

### The `on<Slice>Change` options that exist

Collected with `grep -rhno "on[A-Z][A-Za-z]*Change\??:" $CORE/dist --include="*.d.ts" | sort -u` —
exactly 14, one per state slice:

`onCellSelectionChange`, `onColumnFiltersChange`, `onColumnOrderChange`, `onColumnPinningChange`,
`onColumnResizingChange`, `onColumnSizingChange`, `onColumnVisibilityChange`, `onExpandedChange`,
`onGlobalFilterChange`, `onGroupingChange`, `onPaginationChange`, `onRowPinningChange`,
`onRowSelectionChange`, `onSortingChange`.

There is **no** top-level `onStateChange` and **no** `table.getState()` — both removed in v9.
Whole-state observation is `table.store.subscribe(...)`.

---

## 5. React adapter

Read from `@tanstack/react-table@9.2.4`'s `dist/index.d.ts`, `dist/useTable.d.ts`,
`dist/Subscribe.d.ts`, and the corresponding `.js` for construction behaviour.

`dist/index.d.ts` does `export * from "@tanstack/table-core"` and adds: `useTable`, `ReactTable`,
`Subscribe` (+ its five prop types + `SubscribeSource`), `FlexRender` / `flexRender` /
`FlexRenderProps` / `Renderable`, `createTableHook` (+ its `App*` types), `createTableHookContexts`
/ `TableHookContexts`. `useLegacyTable` is **not** on the main entry — it is behind
`@tanstack/react-table/legacy`, and upstream calls it a deprecated emergency bridge.

### `useTable`

```ts
declare function useTable<TFeatures extends TableFeatures, TData extends RowData, TSelected = TableState<TFeatures>>(
	tableOptions: TableOptions<TFeatures, TData>,
	selector?: (state: TableState<TFeatures>) => TSelected,
): ReactTable<TFeatures, TData, TSelected>
```

The optional selector projects from `table.store`; the result lands on `table.state` and is compared
with `shallow` for re-render. Omit it to subscribe to every registered slice.

```ts
type ReactTable<TFeatures, TData, TSelected = TableState<TFeatures>> = Omit<Table<TFeatures, TData>, 'store'> & {
	/** @deprecated Prefer `table.state` for render reads, `table.atoms.<slice>.get()` for slice
	 *  snapshots, or `table.Subscribe` / `useSelector(table.store, selector)` for explicit
	 *  subscriptions. */
	readonly store: Table<TFeatures, TData>['store']
	Subscribe: {
		/* three overloads, below */
	}
	FlexRender: <TValue extends CellData = CellData>(props: FlexRenderProps<TFeatures, TData, TValue>) => ReactNode
	readonly state: Readonly<TSelected>
}
```

Three behaviours in `dist/useTable.js` that matter to our adapter:

1. It injects the reactivity binding itself — `constructTable({ ...tableOptions, features: {
coreReactivityFeature: reactReactivity(), ...tableOptions.features } })`. Our `features` object
   must **not** supply `coreReactivityFeature`; note it is spread _after_, so a value we passed
   would win — and would break React rendering.
2. The table is constructed once in `useState(() => …)`, then `table_setOptions(coreTable, prev =>
({ ...prev, ...tableOptions }), { syncExternalState: false })` is called **during render** on
   every render. So `tableOptions` does not need to be referentially stable, but must be cheap to
   build.
3. **The returned value is a fresh object each render**: `useMemo(() => ({ ...table, options:
tableOptions, state }), [table, tableOptions, state])`. Table APIs survive this because
   `assignTableAPIs` assigns them as own properties directly on the instance. Row / column / cell /
   header methods are _not_ affected — those live on per-table prototypes on the objects themselves.
   But anything we attach to the table instance after construction must be attached before the
   spread, and identity comparisons on the returned table will not hold across renders.

### `Subscribe`

`table.Subscribe` is three overloads (deliberately overloads, not a union, so JSX contextual typing
works on `selector`):

```ts
Subscribe: {
  <TSourceValue>(props: {
    source: SubscribeSource<TSourceValue>
    selector?: undefined
    children: ((state: TSourceValue) => ReactNode) | ReactNode
  }): ReturnType<FunctionComponent>
  <TSourceValue, TSubSelected>(props: {
    source: SubscribeSource<TSourceValue>
    selector: (state: TSourceValue) => TSubSelected
    children: ((state: TSubSelected) => ReactNode) | ReactNode
  }): ReturnType<FunctionComponent>
  <TSubSelected>(props: Omit<SubscribePropsWithStore<TFeatures, TSubSelected>, 'source'>): ReturnType<FunctionComponent>
}
```

with

```ts
type SubscribeSource<TValue> = Atom<TValue> | ReadonlyAtom<TValue> | Store<TValue> | ReadonlyStore<TValue>

type SubscribePropsWithStore<TFeatures extends TableFeatures, TSelected> = {
	source: SubscribeSource<TableState<TFeatures>>
	/** Required in store mode so you never accidentally subscribe to the whole store
	 *  without an explicit projection. */
	selector: (state: TableState<TFeatures>) => TSelected
	children: ((state: TSelected) => ReactNode) | ReactNode
}
```

`table.Subscribe` defaults `source` to `table.store` when omitted (`useTable.js`), which is why the
third overload drops `source` and keeps `selector` required. The standalone `Subscribe` export has
the same three overloads but no default source. Its body is one line:

```js
function Subscribe(props) {
	const selected = useSelector(props.source, props.selector, { compare: shallow })
	return typeof props.children === 'function' ? props.children(selected) : props.children
}
```

### `atoms` / `state` / `on<Slice>Change` option shapes

These are core options, not React-specific — see §4. The React-relevant summary, which upstream
states as a table in its shared migration skill and which the installed types bear out:

| Need                            | v9 surface                                           |
| ------------------------------- | ---------------------------------------------------- |
| Full current snapshot           | `table.store.state`                                  |
| One current slice               | `table.atoms.<slice>.get()`                          |
| Adapter-selected reactive state | `table.state` (the `useTable` selector's projection) |
| Observe all changes             | `table.store.subscribe(...)`                         |
| Control one slice               | `state.<slice>` + `on<Slice>Change`                  |
| Externally own one slice        | `atoms.<slice>` with a writable `Atom`               |
| Leave a slice internal          | omit both `state.<slice>` and `atoms.<slice>`        |

---

## 6. Renames affecting us

Each confirmed against the installed `.d.ts`, not against the migration guide.

### `sortFn` — confirmed

`dist/features/row-sorting/rowSortingFeature.types.d.ts`:

```ts
sortFn?: SortFnOption<TFeatures, TData>                       // line 88, on the column def
type SortFnOption<TFeatures, TData> = 'auto' | ExtractSortFnKeys<TFeatures> | SortFn<TFeatures, TData>
sortDescFirst?: boolean                                        // lines 82, 203
sortUndefined?: false | -1 | 1 | 'first' | 'last'              // line 102
```

Static functions `column_getSortFn` and `column_getAutoSortFn` exist
(`dist/features/row-sorting/rowSortingFeature.utils.d.ts:70,98`), installed on the column prototype
as `getSortFn` / `getAutoSortFn`. The registry slot is `sortFns` (§1). `sortingFn` / `sortingFns` /
`SortingFn` / `getSortingFn()` / `getAutoSortingFn()` do not appear anywhere in `dist`.

Worth noting for our `sortUndefined` mapping decision: v9 accepts **both** the numeric `-1` / `1`
and the string `'first'` / `'last'` spellings. Our public API's `'first'` / `'last'` maps straight
through.

### `columnResizing` state — confirmed

`dist/features/column-resizing/columnResizingFeature.types.d.ts`:

```ts
interface TableState_ColumnResizing {
	columnResizing: columnResizingState
}
interface columnResizingState {
	columnSizingStart: Array<[string, number]>
	deltaOffset: null | number
	deltaPercentage: null | number
	isResizingColumn: false | string
	startOffset: null | number
	startSize: null | number
}
type ColumnResizeMode = 'onChange' | 'onEnd'
type ColumnResizeDirection = 'ltr' | 'rtl'
```

The state type's exported name is **`columnResizingState` with a lowercase `c`** — that is how it
appears in the file's `export {}` list. This looks like an upstream slip, but it is the name we must
import. Setter is `setColumnResizing`, callback is `onColumnResizingChange`, option is
`columnResizeMode`. `columnSizingInfo` / `setColumnSizingInfo` / `onColumnSizingInfoChange` appear
nowhere in `dist`.

`columnResizeDirection` remains `'ltr' | 'rtl'` — it did **not** move to logical start/end.

### `columnPinning.start` / `.end` and `column.pin('start'|'end')` — confirmed

`dist/features/column-pinning/columnPinningFeature.types.d.ts`:

```ts
type ColumnPinningPosition = false | 'start' | 'end'
interface ColumnPinningState { start: Array<string>; end: Array<string> }
interface TableState_ColumnPinning { columnPinning: ColumnPinningState }

pin: (position: ColumnPinningPosition) => void                          // line 71, on Column
getIsPinned: () => ColumnPinningPosition                                // line 62
getIsSomeColumnsPinned: (position?: ColumnPinningPosition) => boolean   // line 116
setColumnPinning: (updater: Updater<ColumnPinningState>) => void        // line 176
getPinnedLeafColumns: (position: ColumnPinningPosition | 'center') => Array<Column<…>>  // line 180
```

No `'left'` / `'right'` alias exists anywhere. The table-level switch is `enableColumnPinning`
(column-level `enablePinning` still exists and is unchanged).

This is logical naming only — it applies no CSS direction. The doc comment says start "usually
corresponds to left" in LTR and to right in RTL; sticky positioning is ours to write with
`inset-inline-start` / `inset-inline-end`.

### The `getStart*` / `getEnd*` method families — confirmed

Collected with `grep -rhno "get\(Start\|End\|Left\|Right\|Center\)[A-Za-z]*" $CORE/dist --include="*.d.ts" | sort -u`.
**No `getLeft*` or `getRight*` name exists in `dist` at all.** The complete set:

| Region | Table-level                                                                                                                                                                                    | Row-level               | Column-level |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------ |
| start  | `getStartFlatHeaders`, `getStartFooterGroups`, `getStartHeaderGroups`, `getStartLeafColumns`, `getStartLeafHeaders`, `getStartTotalSize`, `getStartVisibleLeafColumns`                         | `getStartVisibleCells`  | —            |
| end    | `getEndFlatHeaders`, `getEndFooterGroups`, `getEndHeaderGroups`, `getEndLeafColumns`, `getEndLeafHeaders`, `getEndTotalSize`, `getEndVisibleLeafColumns`                                       | `getEndVisibleCells`    | —            |
| center | `getCenterFlatHeaders`, `getCenterFooterGroups`, `getCenterHeaderGroups`, `getCenterLeafColumns`, `getCenterLeafHeaders`, `getCenterTotalSize`, `getCenterVisibleLeafColumns`, `getCenterRows` | `getCenterVisibleCells` | —            |

Plus the offset accessors that _take_ a position rather than being named for one:

```ts
// dist/features/column-sizing/columnSizingFeature.types.d.ts
getAfter: (position?: ColumnPinningPosition | 'center') => number // :108  (Column)
getStart: (position?: ColumnPinningPosition | 'center') => number // :120  (Column)
getStart: (position?: ColumnPinningPosition) => number // :134  (Header)
// dist/features/column-ordering/columnOrderingFeature.types.d.ts
getIndex: (position?: ColumnPinningPosition | 'center') => number // :42   (Column)
```

Note the bare `getStart` on a **header** does not accept `'center'`, while the one on a **column**
does — an asymmetry worth knowing before we write a shared helper.

### Other confirmed renames the design will hit

- `table.getState()` and the top-level `onStateChange` option: **gone**. Neither string appears in
  `dist` as an API.
- Row-selection predicates changed meaning, not name: `getIsSomeRowsSelected()` /
  `getIsSomePageRowsSelected()` now mean _at least one_, including the all-selected case.
  Indeterminate is `getIsSomeRowsSelected() && !getIsAllRowsSelected()`.
- Instance methods live on shared prototypes: destructuring, `Object.keys`, spreading and
  `JSON.stringify` no longer reveal or preserve row / cell / column / header methods. Table-instance
  methods are own properties and are not affected.
- `RowData` is now `Record<string, any> | Array<any>`, not `unknown`.
- Underscore-prefixed v8 internals are removed. `row._getAllCellsByColumnId()` →
  `row.getAllCellsByColumnId()`; `table._getPinnedRows()` → `getTopRows()` / `getCenterRows()` /
  `getBottomRows()`.

---

## 7. Removed from this inventory

Names the brief or the design named that could **not** be found in `dist`, and what exists instead:

1. **"the 16 stock features"** — the installed `StockFeatures` has **17** members. The extra key is
   `cellSpanningFeature`. Recorded as 17 in §2; a plan that enumerates 16 will miss one.
2. **`Object.freeze` on `initialState`** — `grep -rn "Object.freeze" $CORE/dist --include="*.js"`
   returns nothing. Nothing in v9 is frozen. §4 says "stable by reference", not "frozen".
3. **`assignRowAPIs` / `assignColumnAPIs` / `assignCellAPIs` / `assignHeaderAPIs`** — do not exist.
   Only `assignTableAPIs` and `assignPrototypeAPIs`. Recorded in §3.
4. **`baseAtoms` / `atoms` / `store` under `dist/types/`** — declared in
   `dist/core/table/coreTablesFeature.types.d.ts`. The brief's Step 5 grep path finds nothing;
   corrected in §4.
5. **`ColumnResizingState`** (uppercase `C`) — no such type. The exported name is
   `columnResizingState`, and it is re-exported from the package index under that spelling.
   (`grep -rn ColumnResizingState dist --include='*.d.ts'` returns two hits, but both are the
   substring inside `getDefaultColumnResizingState` — a factory returning `columnResizingState`,
   not a type of that name.) Recorded in §6.
6. **`flexRender` from `@tanstack/table-core`'s main index** — it is on the `./flex-render` subpath,
   and re-exported by `@tanstack/react-table`. Recorded in §0.
7. **`useLegacyTable` from `@tanstack/react-table`'s main entry** — it is only on
   `@tanstack/react-table/legacy`. Recorded in §5. We do not intend to use it.

## 8. Open questions

Things the types genuinely do not settle, with the experiment that would settle each:

- **Whether `cellSpanningFeature` is needed for our colSpan handling.** Our kits implement colSpan in
  the shadcn/heroui adapters; v9 now has a first-class feature with `cell.getColSpan()` /
  `cell.getRowSpan()` / `table.getCellSpanIndex()` (present in `dist/static-functions.d.ts`). Whether
  it subsumes what our adapters do is a behavioural question, not a type question. **Experiment:**
  register `cellSpanningFeature` on a throwaway table with one of our spanning examples' column defs
  and compare the rendered spans against the current adapters.
- **Whether `initialState` is safe to hand to React's `getServerSnapshot` as-is.** The type is right
  and the reference is stable, but `useSyncExternalStore` requires the server snapshot to be
  identical across calls _and_ consistent with what the client renders first. **Experiment:** render
  one grid through `renderToString` with a controlled slice set and assert no hydration mismatch —
  this is cheap once §5's adapter shape is decided, and only matters if we keep our own
  `useSyncExternalStore` rather than adopting `useTable`.
- **Whether our seven features can all express their table APIs through `assignTableAPIs`' `fn`
  shape** without the closure-over-mutable-data footgun. The types allow it; whether each feature's
  current implementation translates is per-feature work. No experiment — this is the next planning
  pass's job, feature by feature.
