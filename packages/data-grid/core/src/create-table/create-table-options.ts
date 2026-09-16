import { functionalUpdate, makeStateUpdater } from '@tanstack/table-core'

import { mapColumns } from '../column/map-columns'
import { buildColumnInvariants, enforceColumnInvariants, mergePinningSeed } from '../column-state'
import { DEFAULT_PAGE_SIZE, UNKNOWN_PAGE_COUNT } from '../defaults'
import { CreatingMode } from '../features/creating'
import { EditingMode } from '../features/editing'
import { buildOperatorRegistry } from '../features/operators'
import { RowActionsPlacement } from '../features/row-actions'
import { buildColumnList, extractPinningState } from '../system-columns'
import { ColumnResizeMode, ExpandingMode, GridDirection, MultiSortEvent, PaginationMode } from '../types'
import { featureConfig, isFeatureEnabled } from '../utils/feature-flag'
import { setIfDefined } from '../utils/set-if-defined'

import type { ColumnDef, SystemColumnDef } from '../column/types'
import type { ColumnInvariants } from '../column-state'
import type { DraftApplyHandlers } from '../features/deferred-apply'
import type { RowActionsConfig } from '../features/row-actions'
import type {
	GlobalFilterFn,
	GridDirection as GridDirectionValue,
	InitialTableState,
	MultiSortConfig,
	PinningConfig,
	RowPinningConfig,
	SortingState,
	TableConfig,
	VirtualizationConfig,
} from '../types'
import type { FeatureOption, FeatureToggle } from '../utils/feature-flag'
import type {
	ColumnFiltersState,
	ColumnOrderState,
	ColumnPinningState,
	ColumnSizingState,
	ColumnVisibilityState,
	ExpandedState,
	ExternalAtoms,
	PaginationState,
	RowPinningState,
	RowSelectionState,
	TableFeatures,
	TableState,
	Updater,
} from '@tanstack/table-core'

/** Translate our `sorting.multi` shape into TanStack option flags. */
function buildMultiSortOptions(multi: boolean | MultiSortConfig): Record<string, unknown> {
	if (multi === false) return { enableMultiSort: false }
	if (multi === true) return { enableMultiSort: true }
	const opts: Record<string, unknown> = { enableMultiSort: true }
	setIfDefined(opts, 'maxMultiSortColCount', multi.max)
	if (multi.removable === false) opts.enableMultiRemove = false
	if (multi.event === MultiSortEvent.Always) {
		opts.isMultiSortEvent = () => true
	} else if (multi.event === MultiSortEvent.Ctrl) {
		opts.isMultiSortEvent = (e: unknown) => {
			const event = e as { ctrlKey?: boolean; metaKey?: boolean } | null | undefined
			return Boolean(event?.ctrlKey) || Boolean(event?.metaKey)
		}
	}
	// MultiSortEvent.Shift (default) → omit; TanStack's built-in handler already requires shift.
	return opts
}

const IS_DEV = process.env.NODE_ENV !== 'production'

/** The `{}` half of a conditional spread, named so the union it forms stays nameable. */
type EmptyOption = Record<string, never>

/**
 * Config fields that only do anything when their feature is in the table's feature set.
 *
 * **This map is the only thing that catches such a field, and nothing stands behind it.**
 * {@link TableConfig} declares `sorting?: boolean | SortingConfig` and every sibling
 * unconditionally: `TFeatures` parameterises the type but gates no key on it, so
 * `{ features: tableFeatures({}), sorting: { multi: { max: 3 } } }` type-checks clean and produces
 * a grid with no `sorting` slice and no sorting API. Under v9 that is a silent no-op — the feature
 * contributes nothing at all — which is precisely why the check below is worth running on every
 * development construction rather than only on configs that arrived past the type system.
 *
 * An earlier revision of this comment said the opposite: that the field was "already a compile
 * error … but only where the call site is typed", which cast this guard as a backstop for a
 * type-level gate that has never existed. Worth recording rather than quietly fixing, because the
 * comment reads as authoritative and is the kind PR 4 documents the public API from. See the note
 * on {@link TableConfig.features} for why building the real gate is a separate piece of work.
 *
 * `resizing` needs two features, `columnResizingFeature` and `columnSizingFeature`, but upstream
 * already turns the missing prerequisite into a string literal type at the key
 * (`FeatureSlotPrereqs`), so `tableFeatures({…})` catches that half at compile time. Only the
 * feature named here is worth repeating at runtime.
 *
 * The grid's **own** features sit here beside the stock ones whenever they share the shape — one
 * config key naming one feature — because the failure is identical: under v9 a feature left out of
 * `tableFeatures({…})` contributes no state slice and no table API, so `editing: { onSave }`
 * without `editingFeature` produces a grid with no `table.editing` and no diagnostic at all. The
 * three whose "the config asked for this" signal is **not** a plain top-level key are in
 * {@link CONDITIONAL_REQUIRED_FEATURES} instead; `draft` joins this map with its own port.
 *
 * `deleting` belongs here and was checked against the paragraph below rather than assumed: a bare
 * `deleting: true` is legal and means "deleting is on with no handler yet" — the whole feature,
 * not one axis of it — and such a grid still renders the row-action Delete button, which calls
 * `table.deleting.request(rowId)`. Without `deletingFeature` that member does not exist, so the
 * warning fires on exactly the configurations that are broken and on no correct one.
 *
 * **Before adding an entry, check what the key being *enabled* actually means.** The guard fires on
 * `isFeatureEnabled(config[key])`, which is true for a bare `key: true` — so a key that can be
 * `true` while the behaviour you are gating lives on a **sub-axis** does not belong here. That is
 * exactly what disqualified `ordering`: `ordering: true` means column reordering only, so an
 * `ordering: 'rowOrderingFeature'` entry would have demanded row reordering from every grid in the
 * repo that merely reorders columns. A guard that fires on a correct configuration is worse than
 * no guard, and the symptom is a false positive shipped to consumers, not a failing test.
 *
 * `draft` was checked against that paragraph and passes cleanly: a bare `draft: true` is the whole
 * feature — there is no sub-axis it could mean instead — and such a grid always needs `table.draft`,
 * because the draft bar's Apply and Reset buttons are calls on it. Without `draftFeature` the
 * member does not exist and the bar throws on first click, so the guard fires on exactly the
 * configurations that are broken.
 *
 * **The four catalogues were considered for consolidation into one `{ option, member, askedBy }`
 * list, and deliberately kept apart.** The proposal was to move every predicate to the guard site
 * under `satisfies Record<Key, boolean>` — the mechanism {@link CONDITIONAL_REQUIRED_FEATURES}
 * already uses, which makes a missing predicate a `TS1360`. What it would cost is this map's own,
 * stronger check, and the cost is not hypothetical: each key here does **double duty** as the
 * config field the loop reads (`config[option]`) and the label the warning prints, and
 * `satisfies Partial<Record<keyof TableConfig<…>, string>>` therefore turns a key that is not a
 * real config field into a `TS2561` — with a "did you mean 'sorting'?" on a typo. Split into a
 * free-text `option` beside a hand-written `askedBy`, the printed label and the field actually
 * read become two independent strings, and a guard that says `sorting` while testing `filtering`
 * compiles and ships. That is this branch's signature defect — a read that quietly stops pointing
 * where it says — one level up, in the code whose job is to catch it.
 *
 * Two smaller losses on the other side: {@link REQUIRED_FACETED_FEATURES} emits **one** sentence
 * naming every missing member, which three sibling entries would turn into three warnings for one
 * mistake; and {@link FILTER_FNS_SLOT}'s message names *which axis* asked, assembled from two
 * independent conditions, which a static `option` string cannot say. The three guards also run at
 * three different points in this function, each after the locals its predicate needs.
 *
 * So the shapes differ because the checks differ. Re-proposing the merge needs a way to keep the
 * key-is-the-field property, not a new argument for uniformity.
 */
const REQUIRED_FEATURE = {
	sorting: 'rowSortingFeature',
	filtering: 'columnFilteringFeature',
	globalFiltering: 'globalFilteringFeature',
	pagination: 'rowPaginationFeature',
	selection: 'rowSelectionFeature',
	visibility: 'columnVisibilityFeature',
	expanding: 'rowExpandingFeature',
	resizing: 'columnResizingFeature',
	editing: 'editingFeature',
	creating: 'creatingFeature',
	deleting: 'deletingFeature',
	draft: 'draftFeature',
} as const satisfies Partial<Record<keyof TableConfig<TableFeatures, object>, string>>

/**
 * The grid's own features that {@link REQUIRED_FEATURE} cannot key, and what asks for each.
 *
 * A fourth sibling of {@link REQUIRED_FEATURE}, {@link REQUIRED_FACETED_FEATURES} and
 * {@link FILTER_FNS_SLOT}. `REQUIRED_FEATURE` is one `keyof TableConfig` → one feature, required
 * whenever that key is enabled. These three have no such key:
 *
 * - **`rowOrderingFeature`** is asked for by `ordering.row`, one axis of a grouped option. A bare
 *   `ordering: true` means columns only and keeps meaning that, so keying this by `ordering` would
 *   demand row reordering from every grid that only reorders columns — a false positive on the
 *   commonest configuration.
 * - **`infiniteFeature`** is asked for by `pagination.mode: 'infinite'`, a *value* of another
 *   feature's option rather than an option of its own. `pagination` itself already maps to
 *   `rowPaginationFeature` above, so the key is taken and means something else.
 * - **`loadingFeature`** has no config key whatsoever. Its slice is fully user-owned — the
 *   consumer feeds it through `initialState.loading` or an external `atoms.loading` — so supplying
 *   one of those *is* the ask, and each is named separately below so the warning quotes what the
 *   consumer actually wrote.
 *
 * The condition cannot live in the constant — it reads locals resolved inside the function — so
 * this carries the label and the feature name, and the guard below supplies the predicates as an
 * object **keyed by these same keys**. That is the point of the record shape: the guard's literal
 * is `satisfies Record<ConditionalFeatureKey, boolean>`, so an entry added here without a predicate
 * there is a compile error rather than a check that silently never runs.
 */
const CONDITIONAL_REQUIRED_FEATURES = {
	orderingRow: { option: 'ordering.row', feature: 'rowOrderingFeature' },
	paginationInfinite: { option: "pagination.mode: 'infinite'", feature: 'infiniteFeature' },
	initialLoading: { option: 'initialState.loading', feature: 'loadingFeature' },
	loadingAtom: { option: 'atoms.loading', feature: 'loadingFeature' },
} as const satisfies Record<string, { option: string; feature: string }>

type ConditionalFeatureKey = keyof typeof CONDITIONAL_REQUIRED_FEATURES

/**
 * What faceted filtering needs in the feature set, on top of `columnFilteringFeature`.
 *
 * A sibling of {@link REQUIRED_FEATURE} rather than an entry in it, for two reasons the table's
 * shape cannot express. `faceted` is not a top-level config field — it is `filtering.faceted`
 * **and** each column's `filtering.faceted`, and one column asking for it is enough — so there is
 * no `keyof TableConfig` to key it by; and it needs three members rather than one.
 *
 * The two row-model slots are here because this function used to attach them itself
 * (`getFacetedRowModel()` / `getFacetedUniqueValues()`), which is exactly why their absence is
 * silent now: in v9 they are slots the consumer registers, and a config that asks for faceting
 * without them produces no facets and no diagnostic.
 *
 * `facetedMinMaxValues` is deliberately absent: nothing in our config can ask for it — the
 * attachment it would replace never existed — so requiring it would warn about a slot no
 * configuration needs.
 */
const REQUIRED_FACETED_FEATURES = ['columnFacetingFeature', 'facetedRowModel', 'facetedUniqueValues'] as const

/**
 * The feature-set slot v9 resolves a **named** filter function through.
 *
 * A third sibling of {@link REQUIRED_FEATURE} and {@link REQUIRED_FACETED_FEATURES} rather than an
 * entry in either, because it matches the shape of neither. `REQUIRED_FEATURE` is one config key →
 * one feature, required whenever that key is enabled; `REQUIRED_FACETED_FEATURES` is three members
 * required by one condition. This is **one member reached by two independent conditions**, and
 * neither condition is "the option is enabled" — each is "the option resolved to a *name* rather
 * than to a *function*":
 *
 * - A column with no operators carries `filterFn: 'auto'`, a name. A column whose operators
 *   resolved carries the inline dispatcher `createOperatorFilterFn` built, a function — so a table
 *   whose every column has operators needs nothing here, and warning at it would be a false
 *   positive.
 * - `globalFilterFn` is `'includesString'` by default, and stays a string for a `fn: '<name>'` the
 *   consumer's own `fns` registry did not answer. An inline `fn`, or one this package resolved out
 *   of `fns`, is a function and needs nothing.
 *
 * Getting this wrong is silent in the worst way: the name resolves to no comparator, the filtered
 * row model keeps every row, and the grid looks like a filter that matches everything. That is the
 * same defect `sortFns` had — a registry sitting where v9 never reads it — one axis over.
 */
const FILTER_FNS_SLOT = 'filterFns'

/**
 * Warn about a column seeded into a state the user can never leave.
 *
 * `visibility: { initialHidden }` and `pinning: { initialSide }` both say "starts this way, the
 * user changes it from here" — but the affordance that lets them change it belongs to the
 * *table*-level feature. With that feature off the seed still applies (a seed is what the
 * developer wrote, and silently dropping it would be worse), so the column starts hidden or
 * pinned with no route back: `initialSide` becomes indistinguishable from the static `side`,
 * and an `initialHidden` column simply never appears.
 *
 * Both are legitimate configurations — a column can exist in the model without being shown, and
 * its values still feed global search. So this is a warning, not an error, and it is stripped
 * from production builds.
 */
function warnUnreachableSeed(columnId: string, seed: string, feature: string): void {
	console.warn(
		`[data-grid] Column "${columnId}" sets \`${seed}\`, but the table-level \`${feature}\` feature is off, ` +
			`so nothing can change it back — the seed becomes permanent. ` +
			`Enable \`${feature}\` on the table to give the user that control, or drop the seed.`,
	)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectInitialHidden<TRow extends object>(defs: ColumnDef<TRow, any>[]): Record<string, boolean> {
	const acc: Record<string, boolean> = {}
	for (const def of defs) {
		if (def.visibility && typeof def.visibility === 'object' && def.visibility.initialHidden) {
			const colId = def.id ?? def.accessorKey
			if (colId !== undefined) acc[colId] = false
		}
		if (def.columns !== undefined) {
			Object.assign(acc, collectInitialHidden(def.columns))
		}
	}
	return acc
}

/**
 * Ids of columns seeded with `pinning: { initialSide }`. Only the dynamic seed — a static
 * `pinning: 'start'` / `{ side }` is meant to be unchangeable, so it has nothing to warn about.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectInitialPinned<TRow extends object>(defs: ColumnDef<TRow, any>[]): string[] {
	const acc: string[] = []
	for (const def of defs) {
		if (def.pinning && typeof def.pinning === 'object' && def.pinning.initialSide !== undefined) {
			const colId = def.id ?? def.accessorKey
			if (colId !== undefined) acc.push(colId)
		}
		if (def.columns !== undefined) {
			acc.push(...collectInitialPinned(def.columns))
		}
	}
	return acc
}

function normalizePinning(pinning: boolean | PinningConfig | undefined): {
	column: boolean
	row: RowPinningConfig | false
} {
	if (!isFeatureEnabled(pinning)) return { column: false, row: false }
	if (pinning === true) return { column: true, row: { top: true, bottom: true } }
	const config = featureConfig(pinning)
	if (!config) return { column: false, row: false }
	// Both halves take the same `boolean | Config` shape every feature option takes, `enabled`
	// included: a defaults layer that configured row pinning app-wide is turned off for one grid
	// with `pinning: { row: { enabled: false } }`, without restating its settings.
	const rowCfg = config.row
	const row: RowPinningConfig | false = rowCfg === true ? { top: true, bottom: true } : (featureConfig(rowCfg) ?? false)
	return { column: isFeatureEnabled(config.column), row }
}

/**
 * Config the React layer reads that is **not** a TanStack option and holds no table state.
 *
 * These three used to ride along on the options object, which forced
 * `features/row-actions/row-actions.ts` to declaration-merge `rowActions` and `pinning` into
 * `TableOptionsResolved` — a type v9 does not have. They describe how the grid is drawn, not
 * how the table models its rows, so they travel beside the options rather than inside them.
 */
export type GridOptions<TRow extends object> = {
	/** Layout of the actions cell, and the per-row entries an application contributes. */
	rowActions: {
		placement: RowActionsPlacement
		actions?: NonNullable<RowActionsConfig<TRow>['actions']>
	}
	/** Normalized row-pinning config. Absent when row pinning is off. */
	rowPinning?: RowPinningConfig
	/**
	 * Row virtualization config, or the bare `true` that turns it on with defaults. Absent when
	 * virtualization is off. Passed through unresolved, as it was on `options`: the React layer
	 * owns virtualization entirely and there is nothing for the core to resolve.
	 */
	virtualization?: boolean | VirtualizationConfig
	/** The grid's text direction, declared once at the root. */
	direction: GridDirectionValue
}

/**
 * The eleven per-feature callbacks, resolved from config and keyed by feature.
 *
 * Internal to this module since the state funnel died: they are read by the `on<Slice>Change`
 * handlers {@link createTableOptions} builds, and by nothing else.
 */
type FeatureOnChangeHandlers = {
	sorting?: ((next: SortingState) => void) | undefined
	filtering?: ((next: ColumnFiltersState) => void) | undefined
	globalFiltering?: ((next: unknown) => void) | undefined
	pagination?: ((next: PaginationState) => void) | undefined
	selection?: ((next: RowSelectionState, ids: string[]) => void) | undefined
	visibility?: ((next: ColumnVisibilityState) => void) | undefined
	columnOrdering?: ((next: ColumnOrderState) => void) | undefined
	columnPinning?: ((next: ColumnPinningState) => void) | undefined
	rowPinning?: ((next: RowPinningState) => void) | undefined
	resizing?: ((next: ColumnSizingState) => void) | undefined
	expanding?: ((next: ExpandedState) => void) | undefined
}

/**
 * The part of a constructed v9 table an `on<Slice>Change` handler needs.
 *
 * Structural on purpose, and it stays that way now that the v8 `declare module` blocks are gone
 * and `Table` resolves properly: this function is pure and its handlers are bound to a table it
 * never sees the feature set of, so naming `Table<TFeatures, TRow>` would drag `TFeatures` into a
 * type that does not need it. These three members are exactly what {@link makeStateUpdater}
 * declares it needs plus the readonly atom the handler reads the previous slice from.
 */
export type StateHandlerTable = {
	readonly options: { readonly atoms?: object | undefined }
	readonly baseAtoms: Record<string, unknown>
	readonly atoms: Record<string, { get: () => unknown } | undefined>
}

/** One `on<Slice>Change` option. Heterogeneous by slice, so the payload is not nameable here. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StateChangeHandler = (updater: Updater<any>) => void

/**
 * Build one `on<Slice>Change` handler, or `undefined` when the table needs none.
 *
 * Supplying the option **replaces** v9's built-in writer — `table_setSorting` and its siblings
 * do nothing but call `options.on<Slice>Change` (`utils.js` `setStateSlice`), and the stock
 * default that writes the atom is itself just an `on<Slice>Change` contributed by the feature's
 * `getDefaultTableOptions`. So a handler that only forwarded to the consumer would stop the
 * feature working. Every handler here writes the slice itself, through the same
 * {@link makeStateUpdater} the stock default uses, before calling the consumer back.
 *
 * That is also why a slice with nothing to add gets no handler at all: leaving the built-in in
 * place is strictly safer than reimplementing it.
 *
 * @param key The `TableState` slice, e.g. `'sorting'`.
 * @param notify The consumer's callback, if they supplied one.
 * @param constrain Column-derived invariants to force onto the value, for the two slices that
 *   have any. See `../column-state`.
 */
function buildSliceHandler<TSlice>(
	table: StateHandlerTable,
	key: string,
	notify: ((next: TSlice) => void) | undefined,
	constrain?: (next: TSlice) => TSlice,
): StateChangeHandler | undefined {
	if (notify === undefined && constrain === undefined) return undefined
	// A slice exists only when its feature is registered. Without the base atom there is
	// nothing to write, and `makeStateUpdater` would throw on the first change.
	if (table.baseAtoms[key] === undefined) return undefined

	const write = makeStateUpdater(key, table) as (next: TSlice) => void

	return (updater: Updater<TSlice>): void => {
		// Read and write are deliberately not the same channel, and they stay that way: the draft
		// port settled it by moving ownership rather than by unifying these two.
		// `table.atoms[key]` is the *derived* atom, so it honours the precedence
		// `options.atoms[key]` > `options.state[key]` > `baseAtoms[key]` — the updater therefore
		// composes against what the table currently shows. `makeStateUpdater` writes to
		// `options.atoms[key] ?? baseAtoms[key]`, skipping `options.state`, because a controlled
		// slice is the consumer's to set and the write reaches them through `notify` below. The
		// two diverge only under a controlled `options.state`, and only there.
		const prev = table.atoms[key]?.get() as TSlice
		const requested = functionalUpdate(updater, prev)
		const next = constrain === undefined ? requested : constrain(requested)
		write(next)
		// Reference comparison, as the state funnel did: `setStateSlice` hands us an updater
		// that returns the *current* reference for a structural no-op, so an unchanged slice
		// compares equal here and the consumer is not told about a change that did not happen.
		if (notify !== undefined && next !== prev) notify(next)
	}
}

/** `{ [option]: handler }`, or `{}` — the conditional-spread shape the options object uses. */
function named(option: string, handler: StateChangeHandler | undefined): Record<string, StateChangeHandler> {
	return handler === undefined ? {} : { [option]: handler }
}

/**
 * Resolve a {@link TableConfig} into the v9 table options that describe it — purely.
 *
 * Everything in `options` is a function of `config` alone: no store, no table instance, no live
 * wiring. `state` is deliberately absent; it is the controlled half, and `createTable` supplies
 * it at the construction site.
 *
 * The one thing that cannot be resolved here is the set of `on<Slice>Change` handlers: each has
 * to write through the table's own atoms, and the table does not exist while its options are
 * being built. They come back as {@link bindStateHandlers}, a function `createTable` calls with
 * the constructed table and merges through `setOptions`.
 *
 * @param config The grid config.
 * @param externals Per-slice writable atoms the application owns. Ownership is per slice:
 *   whatever is named here the app owns, the table owns the rest.
 */
export function createTableOptions<TFeatures extends TableFeatures, TRow extends object>(
	config: TableConfig<TFeatures, TRow>,
	externals?: { atoms?: ExternalAtoms<TFeatures> },
) {
	/**
	 * `{ atoms }` when the application owns any slice, `{}` when it owns none.
	 *
	 * Spread rather than written as `atoms: externals?.atoms`, because under
	 * `exactOptionalPropertyTypes` an explicit `undefined` is not the same as an absent key and
	 * upstream reads the key's presence. Built here as an **annotated local** rather than inline
	 * at the spread: inline, the conditional's type is a fresh object literal, and this function's
	 * *inferred* return type expands `ExternalAtoms<TFeatures>` structurally — an expansion that
	 * names `@tanstack/store`'s `Atom<…>`, a package this one does not depend on, which made
	 * emitting the declaration a `TS2742`. The annotation is what keeps the alias by name, and the
	 * alias is a `@tanstack/table-core` type the consumer already has. `DraftAtoms` is written as
	 * a `Pick` of `ExternalAtoms_All` for the same reason.
	 */
	const atomsOption: { atoms: ExternalAtoms<TFeatures> } | EmptyOption =
		externals?.atoms === undefined ? {} : { atoms: externals.atoms }

	// ── resolved feature options ─────────────────────────────────────────────
	// Every feature is read through `isFeatureEnabled` / `featureConfig` exactly once, here.
	// A config object means "on with these settings" unless it carries `enabled: false`, and
	// `featureConfig` returns `undefined` for a feature that is off — so a disabled feature
	// never contributes its `manual`, `onChange` or `fn` to the built table.
	const sortingCfg = featureConfig(config.sorting)
	const filteringCfg = featureConfig(config.filtering)
	const globalFilteringCfg = featureConfig(config.globalFiltering)
	const paginationCfg = featureConfig(config.pagination)
	const selectionCfg = featureConfig(config.selection)
	const expandingCfg = featureConfig(config.expanding)
	const resizingCfg = featureConfig(config.resizing)
	const creatingCfg = featureConfig(config.creating)
	const editingCfg = featureConfig(config.editing)
	const deletingCfg = featureConfig(config.deleting)

	const hasSorting = isFeatureEnabled(config.sorting)
	const hasColumnFiltering = isFeatureEnabled(config.filtering)
	const hasGlobalFiltering = isFeatureEnabled(config.globalFiltering)
	const hasPagination = isFeatureEnabled(config.pagination)
	const hasSelection = isFeatureEnabled(config.selection)
	const hasExpanding = isFeatureEnabled(config.expanding)
	const hasResizing = isFeatureEnabled(config.resizing)
	const hasEditing = isFeatureEnabled(config.editing)
	// Cell editing is entered by double-clicking the cell itself, never from the actions column:
	// the pencil there calls `editing.start(rowId)`, which is the row flow and opens nothing in
	// this mode. So it is not a reason to mount the actions column, nor to reserve its width.
	const hasRowEditAction = hasEditing && editingCfg?.mode !== EditingMode.Cell
	const hasDeleting = isFeatureEnabled(config.deleting)
	const hasInlineCreating = isFeatureEnabled(config.creating) && creatingCfg?.mode !== CreatingMode.Modal
	const hasPinRowCreating = hasInlineCreating && creatingCfg?.mode === CreatingMode.PinRow

	const hasDraft = isFeatureEnabled(config.draft)

	if (hasDraft) {
		const sortingManual = sortingCfg?.manual === true
		const filteringManual = filteringCfg?.manual === true
		const globalFilteringManual = globalFilteringCfg?.manual === true
		if (!sortingManual && !filteringManual && !globalFilteringManual) {
			throw new Error(
				'`draft` requires `manual: true` on at least one of `sorting`, `filtering` or `globalFiltering`. ' +
					'Client-side deferral is not supported: without manual mode the row models recompute ' +
					'on every draft edit, so nothing is actually deferred.',
			)
		}
	}

	const deferred = hasDraft

	// ── registered vs. configured ────────────────────────────────────────────
	/**
	 * `config.features` as something the `in` operator can safely be applied to.
	 *
	 * All four guards below ask "is this member registered?", and `in` throws a `TypeError` on a
	 * non-object right-hand side. `features` is declared required, so the checker says that cannot
	 * happen — but the entire premise of these guards is a config that reached this function
	 * *past* the type system, through a cast or parsed from JSON, and such a config is exactly the
	 * one that arrives with no `features` at all. A guard that crashes the construction it was
	 * meant to comment on is strictly worse than the silent no-op it replaced, and the crash
	 * masks whatever the caller was actually doing wrong.
	 *
	 * The cast widens before the `??` because otherwise the checker calls the fallback
	 * unreachable — which is the very assumption this line exists to stop trusting.
	 */
	const registeredFeatures = (config.features as Record<string, unknown> | undefined) ?? {}

	if (IS_DEV) {
		for (const [option, feature] of Object.entries(REQUIRED_FEATURE)) {
			const value = (config as Record<string, unknown>)[option]
			if (isFeatureEnabled(value as FeatureOption<FeatureToggle>) && !(feature in registeredFeatures)) {
				console.warn(
					`[data-grid] \`${option}\` is configured, but \`${feature}\` is not in \`features\` — ` +
						`the option has no effect. Add it to your \`tableFeatures({ … })\` call.`,
				)
			}
		}
	}

	// ── row identity ─────────────────────────────────────────────────────────
	const getRowId =
		config.getRowId ??
		((row: TRow, index: number): string => {
			const id = (row as Record<string, unknown>).id
			return id != null ? String(id) : String(index)
		})

	// ── operator registry ────────────────────────────────────────────────────
	// One option, two jobs: `items` seeds the registry, and the option's presence is the
	// table-wide switch every column falls back to. `undefined` is a third state — neither on
	// nor off — so a table that never mentions operators keeps the per-column opt-in.
	const tableOperatorsCfg = filteringCfg?.operators
	const operatorRegistry = buildOperatorRegistry(
		typeof tableOperatorsCfg === 'object' ? tableOperatorsCfg.items : undefined,
	)
	const tableOperators: boolean | undefined = tableOperatorsCfg === undefined ? undefined : tableOperatorsCfg !== false

	// ── faceted opt-in ───────────────────────────────────────────────────────
	// The table-level flag, which the mapper reads. In v9 a faceted row model is a slot in the
	// feature set (`facetedRowModel`, `facetedUniqueValues`), which the consumer registers, so
	// there is no row model left here to attach on a column's behalf.
	const tableFaceted = filteringCfg?.faceted === true

	// Column-level opt-in, detected even when the table-level flag is off: one column asking for
	// facets is enough to need the slots, which is what this used to gate the row models on.
	const hasColumnFaceted = config.columns.some(function check(c): boolean {
		const f = c.filtering
		if (f && typeof f === 'object' && f.faceted === true) return true
		if (c.columns) return c.columns.some(check)
		return false
	})
	const facetedNeeded = tableFaceted || hasColumnFaceted

	if (IS_DEV && facetedNeeded) {
		const missing = REQUIRED_FACETED_FEATURES.filter((member) => !(member in registeredFeatures))
		if (missing.length > 0) {
			const names = missing.map((member) => `\`${member}\``).join(', ')
			console.warn(
				`[data-grid] \`filtering.faceted\` is configured, but ${names} ` +
					`${missing.length === 1 ? 'is' : 'are'} not in \`features\` — the option has no effect. ` +
					`Add ${missing.length === 1 ? 'it' : 'them'} to your \`tableFeatures({ … })\` call.`,
			)
		}
	}

	// ── map user columns → TanStack columns ──────────────────────────────────
	const mappedUserColumns = mapColumns(config.columns, operatorRegistry, {
		tableFaceted,
		...(tableOperators !== undefined ? { tableOperators } : {}),
	})

	const expandMode = expandingCfg?.mode ?? ExpandingMode.SubContent
	const normalizedPinning = normalizePinning(config.pinning)
	const rowPinConfig = normalizedPinning.row
	const hasPinning = Boolean(rowPinConfig && (rowPinConfig.top ?? rowPinConfig.bottom))

	// `ordering` groups the axes, so the callback hangs off the axis, not the group — the same
	// shape `pinning.column` / `pinning.row` already use.
	const orderingCfgResolved = featureConfig(config.ordering)
	const columnOrderingOnChange =
		typeof orderingCfgResolved?.column === 'object' ? orderingCfgResolved.column.onChange : undefined
	// The row axis turns on only by being named: a bare `ordering: true` is columns, and keeps
	// being columns, so an upgrade cannot hand an existing grid an affordance nobody asked for.
	// Resolved to the config object the feature reads, or `undefined` when the axis is off.
	const rowOrderingCfg = isFeatureEnabled(orderingCfgResolved?.row)
		? (featureConfig(orderingCfgResolved?.row) ?? {})
		: undefined

	// ── registered vs. configured, the three that need a predicate ───────────
	// The second half of the guard above, run here rather than beside it because these read
	// resolved locals (`rowOrderingCfg`, `paginationCfg`) that do not exist that far up.
	// `registeredFeatures` is the hardened bag — never a fresh `in config.features`, which throws
	// on a config that arrived without one.
	if (IS_DEV) {
		// `initialState` and the external atom bag are keyed by the registered feature set, so
		// neither `loading` key is provable here; widened for the same reason and in the same way
		// as `registeredFeatures` itself.
		const initialStateBag = config.initialState as Record<string, unknown> | undefined
		const externalAtomsBag = externals?.atoms as Record<string, unknown> | undefined

		// One predicate per catalogue key. `satisfies` is what makes a missing one a compile error.
		const asked = {
			orderingRow: rowOrderingCfg !== undefined,
			paginationInfinite: paginationCfg?.mode === PaginationMode.Infinite,
			initialLoading: initialStateBag?.loading !== undefined,
			loadingAtom: externalAtomsBag?.loading !== undefined,
		} satisfies Record<ConditionalFeatureKey, boolean>

		for (const key of Object.keys(CONDITIONAL_REQUIRED_FEATURES) as ConditionalFeatureKey[]) {
			const { option, feature } = CONDITIONAL_REQUIRED_FEATURES[key]
			if (asked[key] && !(feature in registeredFeatures)) {
				console.warn(
					`[data-grid] \`${option}\` is configured, but \`${feature}\` is not in \`features\` — ` +
						`the option has no effect. Add it to your \`tableFeatures({ … })\` call.`,
				)
			}
		}
	}

	const pinningCfgResolved = featureConfig(config.pinning)
	const columnPinningOnChange =
		typeof pinningCfgResolved?.column === 'object' ? pinningCfgResolved.column.onChange : undefined
	const rowPinningOnChange = typeof pinningCfgResolved?.row === 'object' ? pinningCfgResolved.row.onChange : undefined

	// Resolve `globalFilterFn`:
	// - inline function → used as-is
	// - string id → look up in user `fns` registry first; otherwise pass through
	//   so TanStack resolves built-in names like 'includesString' itself
	// - omitted → 'includesString' (overrides TanStack's 'auto' default so global
	//   search behaves as a predictable cross-column substring match)
	const resolvedGlobalFilterFn: GlobalFilterFn<TFeatures> | string | undefined = (():
		| GlobalFilterFn<TFeatures>
		| string
		| undefined => {
		if (!hasGlobalFiltering) return undefined
		const fn = globalFilteringCfg?.fn
		if (fn === undefined) return 'includesString'
		if (typeof fn === 'function') return fn
		const fromRegistry = globalFilteringCfg?.fns?.[fn]
		return fromRegistry ?? fn
	})()

	// ── named filter functions vs. the `filterFns` slot ──────────────────────
	if (IS_DEV) {
		// A leaf column with no resolved operators keeps TanStack's `'auto'`; `mapColumns` sets
		// `filterFn` to a function only where it built the operator dispatcher. Group columns hold
		// no values and are never filtered, so only leaves are asked.
		const needsByColumn =
			hasColumnFiltering &&
			mappedUserColumns.some(function check(col): boolean {
				const children = (col as { columns?: unknown[] }).columns
				if (children !== undefined) return children.some(check as (c: unknown) => boolean)
				return typeof (col as { filterFn?: unknown }).filterFn !== 'function'
			})
		const needsByGlobal = hasGlobalFiltering && typeof resolvedGlobalFilterFn === 'string'

		const axes: string[] = []
		if (needsByColumn) axes.push('a column filter')
		if (needsByGlobal) axes.push('`globalFiltering`')

		// Asked for last, so a config needing neither axis is never even questioned — and through
		// {@link registeredFeatures}, like the two guards above. An earlier revision of this file
		// claimed those two were shielded from a missing `features` by their `isFeatureEnabled`
		// conjunct short-circuiting first. **That was wrong**, and worth recording so it is not
		// re-derived: `isFeatureEnabled(value)` returning *true* is precisely the path that
		// reaches the `in`, and the faceted guard is gated on `facetedNeeded`, which reads config
		// options and involves no `isFeatureEnabled` at all. Both threw.
		if (axes.length > 0 && !(FILTER_FNS_SLOT in registeredFeatures)) {
			console.warn(
				`[data-grid] ${axes.join(' and ')} resolve${axes.length === 1 ? 's' : ''} a filter function by ` +
					'name, but `filterFns` is not in `features` — the name resolves to nothing and no row is ever ' +
					'filtered out. Add `filterFns` to your `tableFeatures({ … })` call.',
			)
		}
	}

	// `rowActions` defaults to on: omitting it must keep the actions column appearing as soon as
	// editing / deleting / row pinning is in play, which is what it has always done. Only an
	// explicit `false` (or `{ enabled: false }`) suppresses the column outright — the read-only
	// escape hatch for one grid under a defaults layer that configured row actions app-wide.
	const rowActionsEnabled = config.rowActions === undefined || isFeatureEnabled(config.rowActions)
	const rowActionsCfg = featureConfig(config.rowActions)
	const rowActionsPlacement = rowActionsCfg?.placement ?? RowActionsPlacement.Inline
	const customRowActions = rowActionsCfg?.actions

	// Row-erased on the way in, like every other structural setting the mapper carries: a system
	// column renders no row value, so nothing downstream has a `TRow` left to keep.
	const selectionColumn = selectionCfg?.column as SystemColumnDef<TableFeatures> | undefined
	const expandingColumn = featureConfig(config.expanding)?.column as SystemColumnDef<TableFeatures> | undefined
	const rowActionsColumn = rowActionsCfg?.column as SystemColumnDef<TableFeatures> | undefined

	// Where an inline draft row puts its save / cancel pair. It shares the actions cell with the
	// row actions — but only when that column is there anyway, or when the draft row itself is
	// permanent. `mode: 'row'` in a grid with no row actions deliberately does **not** mount it:
	// the column would sit empty until someone pressed the create trigger, and mounting it on
	// open would take its fixed width off the `1fr` tracks, so every column would jump on each
	// open and again on each close. Such a grid puts the pair in the toolbar instead, in place of
	// the create trigger (data-grid-react `create-trigger.tsx`) — the toolbar is already there,
	// so nothing reflows. `mode: 'modal'` needs neither: the dialog has its own footer.
	const hasOtherRowActions =
		rowActionsEnabled &&
		(hasRowEditAction || hasDeleting || hasPinning || rowOrderingCfg !== undefined || customRowActions !== undefined)
	const creatingInActionsColumn = hasPinRowCreating || (hasInlineCreating && hasOtherRowActions)

	const allColumns = buildColumnList(mappedUserColumns, {
		selection: hasSelection,
		expanding: hasExpanding,
		editing: rowActionsEnabled && hasRowEditAction,
		deleting: rowActionsEnabled && hasDeleting,
		pinning: rowActionsEnabled && hasPinning,
		ordering: rowActionsEnabled && rowOrderingCfg !== undefined,
		creating: creatingInActionsColumn,
		rowActionsPlacement,
		customRowActions: rowActionsEnabled && customRowActions !== undefined,
		...(selectionColumn !== undefined ? { selectionColumn } : {}),
		...(expandingColumn !== undefined ? { expandingColumn } : {}),
		...(rowActionsColumn !== undefined ? { rowActionsColumn } : {}),
	})

	const { start: pinnedStart, end: pinnedEnd } = extractPinningState(allColumns)

	// ── build TanStack options ────────────────────────────────────────────────
	const defaultPageSize = paginationCfg?.pageSize ?? DEFAULT_PAGE_SIZE

	const initialHidden = collectInitialHidden(config.columns)

	// The seeds still apply with their feature off — see `warnUnreachableSeed` — but say so.
	if (IS_DEV) {
		if (!isFeatureEnabled(config.visibility)) {
			for (const columnId of Object.keys(initialHidden)) {
				warnUnreachableSeed(columnId, 'visibility.initialHidden', 'visibility')
			}
		}
		if (!normalizedPinning.column) {
			for (const columnId of collectInitialPinned(config.columns)) {
				warnUnreachableSeed(columnId, 'pinning.initialSide', 'pinning')
			}
		}
	}

	// Column-derived rules that no state input may violate — see `../column-state`.
	const columnInvariants: ColumnInvariants = buildColumnInvariants(allColumns)

	/**
	 * The consumer's seed, read at the widest feature set rather than at this table's.
	 *
	 * `InitialTableState<TFeatures>` resolves its slices through `ExtractFeatureMapTypes`, which
	 * inside a function still generic over `TFeatures` is deferred — so the type has no statically
	 * known keys and `userInitialState.columnPinning` is a `TS2339`, not because the key is absent
	 * but because the checker cannot yet say which keys there are. The all-features instantiation
	 * names every slice optionally and correctly typed, which is exactly what reading a seed needs:
	 * a slice the consumer's own set does not have simply arrives `undefined`.
	 */
	const userInitialState = config.initialState as InitialTableState<TableFeatures> | undefined
	// `columnPinning` / `columnVisibility` merge with the column-derived defaults instead of
	// replacing them: a whole-slice spread would silently drop static pins, system-column pins
	// and `initialHidden` columns the consumer never mentioned.
	const seededPinning = mergePinningSeed({ start: pinnedStart, end: pinnedEnd }, userInitialState?.columnPinning)
	const mergedVisibility = { ...initialHidden, ...userInitialState?.columnVisibility }
	// Same reason as the two above, and the one slice where it was missed: spreading
	// `userInitialState` replaces `pagination` wholesale, so seeding only `pageIndex`
	// (a deep link to page 3) dropped the resolved `pageSize` to `undefined`.
	const mergedPagination = {
		pageIndex: 0,
		pageSize: defaultPageSize,
		...userInitialState?.pagination,
	}

	// Two routes to one value, kept on purpose: `pagination.pageSize` is where an author states
	// the size, `initialState.pagination.pageSize` is where a deep link restores the one the user
	// picked. They only collide when both are written, and then the seed — the more specific,
	// per-mount one — wins silently. Say so in development rather than leaving it to be found by
	// a page that opens on a size nobody asked for.
	if (IS_DEV && paginationCfg?.pageSize !== undefined && userInitialState?.pagination?.pageSize !== undefined) {
		console.warn(
			`[data-grid] Both \`pagination.pageSize\` (${String(paginationCfg.pageSize)}) and ` +
				`\`initialState.pagination.pageSize\` (${String(userInitialState.pagination.pageSize)}) are set. ` +
				`The seed wins; the option is ignored. Set one of them.`,
		)
	}

	// Infinite mode shows ALL accumulated rows — no client-side page slicing, no footer. In v8
	// that was `getPaginationRowModel` simply not being attached here; in v9 the paginated row
	// model is a slot in the feature set, so the only way to leave the rows unsliced is for the
	// consumer to leave it out. Configuring the mode no longer suppresses it, so say so rather
	// than let a grid show one page of what it promised was everything.
	if (
		IS_DEV &&
		hasPagination &&
		paginationCfg?.mode === PaginationMode.Infinite &&
		'paginatedRowModel' in registeredFeatures
	) {
		console.warn(
			"[data-grid] `pagination.mode: 'infinite'` shows every accumulated row, but " +
				'`paginatedRowModel` is registered in `features`, so the rows are still sliced to one ' +
				'page. Drop it from your `tableFeatures({ … })` call for this table.',
		)
	}

	// Row ordering records an order as row ids, and a row with no `id` field falls back to its
	// index — which changes the moment a row moves, so the recorded order would refer to
	// whichever rows now sit in those positions. This is the feature's one real
	// misconfiguration, and it is silent without saying so.
	if (IS_DEV && rowOrderingCfg !== undefined && config.getRowId === undefined) {
		const first = config.data[0] as Record<string, unknown> | undefined
		if (first !== undefined && first.id == null) {
			console.warn(
				'[data-grid] `ordering: { row: ... }` needs a stable `getRowId`. These rows have no `id`, ' +
					'so a row id is its index, which changes as soon as a row moves — the order would then ' +
					'refer to the wrong rows.',
			)
		}
	}

	// `draft` is ours and is **seed-only**: it names what the live axes start at, which
	// `createDraftAtoms` reads straight off `config.initialState`. It is not a state slice, so it
	// is dropped here rather than handed to `constructTable`, which would otherwise mint a `draft`
	// base atom, a `draft` entry in `table.atoms` and a `draft` member of every store snapshot.
	// `draftFeature.getInitialState` drops it as well, for the construction paths that do not come
	// through this function.
	const { draft: _draftSeed, ...seededSlices } = userInitialState ?? {}

	// Assembled at the all-features instantiation for the reason {@link userInitialState} gives,
	// then widened to this table's. The `unknown` hop is not a shrug: the source names every slice
	// and the target names a set the checker has not resolved, so the two have no members in common
	// to compare and a direct assertion is rejected outright (`TS2352`). What makes it sound is that
	// every key here is a real `TableState` slice — `pagination`, `columnPinning`,
	// `columnVisibility` and whatever the consumer seeded — and a table whose set omits one of them
	// ignores the key rather than mistyping it.
	const initialState = enforceColumnInvariants(
		{
			// Consumer-provided seed wins over computed defaults (e.g. loading, sorting).
			...seededSlices,
			pagination: mergedPagination,
			columnPinning: seededPinning,
			...(Object.keys(mergedVisibility).length > 0 ? { columnVisibility: mergedVisibility } : {}),
		},
		columnInvariants,
	) as unknown as Partial<TableState<TFeatures>>

	// The named comparator registry is a **feature slot** in v9, not a table option: upstream
	// destructures `sortFns` straight out of `tableOptions.features` (`constructTable.js`) onto
	// `table._rowModelFns`, and nothing ever reads a top-level `options.sortFns`. So
	// `sorting.fns` — which stays in our config as the ergonomic spelling — is merged into the
	// feature set here rather than spread into the options bag, where it resolved no comparator
	// at all. The consumer's own `tableFeatures({ sortFns })` entries stay: `sorting.fns` is the
	// more specific, per-table statement, so it wins on a key collision.
	//
	// `config.features` passes through by reference when there is nothing to merge, so a
	// consumer can still compare the set they handed in against `options.features`.
	const sortFns = sortingCfg?.fns
	const features =
		sortFns === undefined
			? config.features
			: ({
					...config.features,
					sortFns: { ...(config.features as { sortFns?: object }).sortFns, ...sortFns },
				} as TFeatures)

	// The three deferred axes' consumer callbacks, handed to `draftFeature` rather than to the
	// per-slice handlers. Built unconditionally and read only when `deferred`, so the shape stays
	// one expression; `Object.keys` below decides whether it reaches the options at all.
	const onDraftApply: DraftApplyHandlers = {
		...(sortingCfg?.onChange ? { sorting: sortingCfg.onChange } : {}),
		...(filteringCfg?.onChange ? { columnFilters: filteringCfg.onChange } : {}),
		...(globalFilteringCfg?.onChange ? { globalFilter: globalFilteringCfg.onChange } : {}),
	}

	// Build options without an explicit type annotation to avoid exactOptionalPropertyTypes
	// conflicts — let TypeScript infer, then cast at the call site.
	const options = {
		// The consumer composes the set; this function only resolves what is configured on it.
		// Row models are slots in that set too (`sortedRowModel`, `filteredRowModel`, …) and
		// each falls back to the previous stage when absent, so there is no `getXRowModel`
		// option left to attach — what survives below is the *gates*.
		features,
		data: config.data,
		columns: allColumns,
		getRowId,
		initialState,
		// Per-slice external ownership: whatever the application names it owns, the table owns
		// the rest. Spread conditionally for `exactOptionalPropertyTypes`.
		...atomsOption,
		// Sorting / Filtering / ColumnVisibility / ColumnPinning are gated at the table level:
		// when the corresponding config field is falsy (undefined or false), the feature is
		// fully OFF — `enableX: false` makes `column.getCanX()` return false for all columns
		// regardless of per-column config. Truthy config (true or object) leaves the TanStack
		// default in place so per-column overrides keep working.
		...(hasSorting ? {} : { enableSorting: false }),
		// Filtering: each axis is gated independently:
		// - `filtering` falsy → enableColumnFilters: false (per-column UI disabled)
		// - `globalFiltering` falsy → enableGlobalFilter: false (search disabled)
		...(hasColumnFiltering ? {} : { enableColumnFilters: false }),
		...(hasGlobalFiltering ? {} : { enableGlobalFilter: false }),
		...(resolvedGlobalFilterFn !== undefined ? { globalFilterFn: resolvedGlobalFilterFn } : {}),
		// `isFeatureEnabled`, not `=== true`: the option grew a config object (for `onChange`),
		// and a strict boolean check would have left `{ onChange }` reading as "off".
		...(isFeatureEnabled(config.visibility) ? {} : { enableHiding: false }),
		...(normalizedPinning.column ? {} : { enableColumnPinning: false }),
		...(hasExpanding && expandMode === ExpandingMode.Tree
			? {
					getSubRows:
						expandingCfg?.getSubRows ??
						((row: TRow) => (row as Record<string, unknown>).children as TRow[] | undefined),
				}
			: {}),
		...(hasExpanding && expandMode === ExpandingMode.SubContent && expandingCfg?.getRowCanExpand
			? { getRowCanExpand: expandingCfg.getRowCanExpand }
			: {}),
		// Row selection
		enableRowSelection: hasSelection,
		// Single-row selection. TanStack defaults `enableMultiRowSelection` to true, so the gate
		// has to be spelled out — the same shape as the `enableHiding` / `enableColumnResizing`
		// gates above.
		...(selectionCfg?.multi === false ? { enableMultiRowSelection: false } : {}),
		// Pagination manual
		...(paginationCfg?.manual
			? {
					manualPagination: true,
					// When rowCount is provided, omit pageCount so TanStack derives it
					// automatically from rowCount ÷ pageSize. When only pageCount is
					// given (or neither), fall back to the explicit value or -1 (unknown).
					...(paginationCfg.rowCount !== undefined
						? { rowCount: paginationCfg.rowCount }
						: { pageCount: paginationCfg.pageCount ?? UNKNOWN_PAGE_COUNT }),
				}
			: {}),
		// Filtering manual — TanStack has a single `manualFiltering` switch covering both column
		// filters and global search, so either axis asking for manual mode turns it on for both.
		...(filteringCfg?.manual || globalFilteringCfg?.manual ? { manualFiltering: true } : {}),
		// Sorting manual
		...(sortingCfg?.manual ? { manualSorting: true } : {}),
		// Sorting: per-direction default
		...(sortingCfg?.descFirst !== undefined ? { sortDescFirst: sortingCfg.descFirst } : {}),
		// Sorting: third-click removal
		...(sortingCfg?.clearable === false ? { enableSortingRemoval: false } : {}),
		// Sorting: multi-column
		...(sortingCfg?.multi !== undefined ? buildMultiSortOptions(sortingCfg.multi) : {}),
		// Feature configs. These five still ride on the options object and are untyped until
		// each feature declaration-merges `TableOptions_FeatureMap` in its own task.
		...(rowOrderingCfg ? { rowOrdering: rowOrderingCfg } : {}),
		...(creatingCfg ? { creating: creatingCfg } : {}),
		...(editingCfg ? { editing: editingCfg } : {}),
		...(deletingCfg ? { deleting: deletingCfg } : {}),
		// Column resizing. `columnResizeDirection` is an option of `columnResizingFeature` and
		// does not exist without it, so it is set only when resizing is on — the grid's own
		// direction reaches the React layer through `grid.direction` regardless.
		...(hasResizing
			? {
					enableColumnResizing: true,
					columnResizeMode: resizingCfg?.mode ?? ColumnResizeMode.OnChange,
					columnResizeDirection: config.direction ?? GridDirection.Ltr,
				}
			: // TanStack defaults `enableColumnResizing` to true, so the table-level gate has to be
				// spelled out explicitly — otherwise `column.getCanResize()` stays true with the
				// feature off. Same shape as the `enableHiding: false` gate above.
				{ enableColumnResizing: false }),
		// Row pinning — a stock feature, no separate row model needed.
		...(hasPinning ? { enableRowPinning: true, keepPinnedRows: false } : {}),
		// Mirrored onto options so the React layer can gate the draft UI on the flag itself — and
		// so `draftFeature` can tell "registered and on" from "registered and off".
		//
		// `onDraftApply` carries the three deferred axes' consumer callbacks to the feature, which
		// fires them from `apply()`. They are deliberately **not** wired into `onSortingChange` /
		// `onColumnFiltersChange` / `onGlobalFilterChange` below while deferral is on: those fire
		// on every live edit, which is the notification deferral exists to hold back. Spread only
		// when at least one exists, so the option is absent rather than an empty object on the
		// commonest configuration.
		...(deferred ? { draft: true } : {}),
		...(deferred && Object.keys(onDraftApply).length > 0 ? { onDraftApply } : {}),
	}

	const onChange: FeatureOnChangeHandlers = {
		sorting: sortingCfg?.onChange,
		filtering: filteringCfg?.onChange,
		globalFiltering: globalFilteringCfg?.onChange,
		pagination: paginationCfg?.onChange,
		selection: selectionCfg?.onChange,
		visibility: featureConfig(config.visibility)?.onChange,
		columnOrdering: columnOrderingOnChange,
		columnPinning: columnPinningOnChange,
		rowPinning: rowPinningOnChange,
		resizing: featureConfig(config.resizing)?.onChange,
		expanding: featureConfig(config.expanding)?.onChange,
	}

	// The consumer's selection callback takes the ids as well as the map, so it is adapted
	// rather than forwarded.
	//
	// **Do not simplify the filter to a bare `Object.keys(next)`.** v9 narrowed
	// `RowSelectionState` from v8's `Record<string, boolean>` to `Record<string, true>` — stock
	// code deletes a deselected id rather than writing `false` — so on the types this filter looks
	// like it only drops holes. But the atom can be **consumer-owned** (`options.atoms.rowSelection`),
	// and nothing stops an app's own writer putting a literal `false` in it; dropping the filter
	// would then report a deselected row as selected, to the one callback the consumer relies on
	// for that. `deleting.ts`'s `selectedRowIds` keeps the same filter for the same reason, behind
	// a documented lint disable — it needs one because the value there is read without an index
	// signature, so the checker calls the test dead. Here `noUncheckedIndexedAccess` makes
	// `next[id]` `true | undefined`, so the linter still believes the test, and only this comment
	// stands between it and a tidy-up.
	const notifySelection =
		onChange.selection === undefined
			? undefined
			: (next: RowSelectionState): void => {
					onChange.selection?.(
						next,
						Object.keys(next).filter((id) => next[id]),
					)
				}

	/**
	 * Build the `on<Slice>Change` options for a constructed table.
	 *
	 * Called by `createTable` after `constructTable`, and merged in through `setOptions`. It
	 * cannot be part of `options`: every handler writes through `table.atoms` / `table.baseAtoms`,
	 * which do not exist until the table does.
	 *
	 * The alternative — hosting them on a feature's `getDefaultTableOptions(table)` — was tried
	 * and rejected: a default only wins if its feature is enumerated *after* the stock feature
	 * that supplies the same key, and when it loses the stock writer still updates the state, so
	 * the consumer's callback and the invariants silently stop with nothing visibly broken. It
	 * also means synthesising a feature and injecting it into the set the consumer composed.
	 * Binding afterwards is order-independent and leaves `options.features` the consumer's own.
	 */
	const bindStateHandlers = (table: StateHandlerTable): Record<string, StateChangeHandler> => ({
		// The three deferred axes. Under `draft` the consumer's callback is withheld here and
		// handed to `draftFeature` through `options.onDraftApply` instead — the notification moves
		// to `apply()`, the write does not. With no callback and no invariant left,
		// `buildSliceHandler` returns `undefined` and `named` contributes nothing, so v9's own
		// `makeStateUpdater` default stays in place and keeps writing the slice. That default
		// resolves `options.atoms[key] ?? baseAtoms[key]`, which is the external draft atom.
		...named(
			'onSortingChange',
			buildSliceHandler<SortingState>(table, 'sorting', deferred ? undefined : onChange.sorting),
		),
		...named(
			'onColumnFiltersChange',
			buildSliceHandler<ColumnFiltersState>(table, 'columnFilters', deferred ? undefined : onChange.filtering),
		),
		...named(
			'onGlobalFilterChange',
			buildSliceHandler<unknown>(table, 'globalFilter', deferred ? undefined : onChange.globalFiltering),
		),
		...named('onPaginationChange', buildSliceHandler<PaginationState>(table, 'pagination', onChange.pagination)),
		...named('onRowSelectionChange', buildSliceHandler<RowSelectionState>(table, 'rowSelection', notifySelection)),
		...named('onColumnOrderChange', buildSliceHandler<ColumnOrderState>(table, 'columnOrder', onChange.columnOrdering)),
		...named('onRowPinningChange', buildSliceHandler<RowPinningState>(table, 'rowPinning', onChange.rowPinning)),
		// `columnSizing` only — `columnResizing` (v8's `columnSizingInfo`) churns on every
		// pointer move mid-drag, so its built-in writer is left alone.
		...named('onColumnSizingChange', buildSliceHandler<ColumnSizingState>(table, 'columnSizing', onChange.resizing)),
		...named('onExpandedChange', buildSliceHandler<ExpandedState>(table, 'expanded', onChange.expanding)),
		// The two slices an invariant constrains. These get a handler whether or not the
		// consumer asked for a callback: the column-derived rules have to hold on every write,
		// not only on the seed, because the affordance that would undo a violation is
		// deliberately absent from the UI.
		...named(
			'onColumnPinningChange',
			buildSliceHandler<ColumnPinningState>(
				table,
				'columnPinning',
				onChange.columnPinning,
				(next) => enforceColumnInvariants({ columnPinning: next }, columnInvariants).columnPinning,
			),
		),
		...named(
			'onColumnVisibilityChange',
			buildSliceHandler<ColumnVisibilityState>(
				table,
				'columnVisibility',
				onChange.visibility,
				(next) => enforceColumnInvariants({ columnVisibility: next }, columnInvariants).columnVisibility,
			),
		),
	})

	const grid: GridOptions<TRow> = {
		// Read by the React layer to lay out the actions cell (inline vs. menu).
		rowActions: {
			placement: rowActionsPlacement,
			...(rowActionsEnabled && customRowActions ? { actions: customRowActions } : {}),
		},
		...(hasPinning && rowPinConfig !== false ? { rowPinning: rowPinConfig } : {}),
		// The `!== undefined` conjunct is unreachable at runtime — `isFeatureEnabled(undefined)`
		// is already `false` — and exists only to narrow the type so the scalar `true` survives.
		// Do **not** "simplify" it to `typeof config.virtualization === 'object'`: that drops
		// `virtualization: true` (on with defaults) and silently disables row virtualization for
		// every grid using the scalar form.
		...(isFeatureEnabled(config.virtualization) && config.virtualization !== undefined
			? { virtualization: config.virtualization }
			: {}),
		// A fact about the grid, not a resize setting, so it does not wait for `resizing` to be
		// on — unlike `columnResizeDirection`, which is an option of the resizing feature.
		direction: config.direction ?? GridDirection.Ltr,
	}

	return { options, deferred, grid, bindStateHandlers }
}
