import {
	assignTableInstanceData,
	readForeignSlice,
	readOwnSlice,
	writeForeignSlice,
	writeOwnSlice,
} from '../../feature-state'
import { featureConfig, isFeatureEnabled } from '../../utils/feature-flag'

import type { AnyTable } from '../../feature-state'
import type { FeatureToggle } from '../../utils/feature-flag'
import type { Row, RowData, RowSelectionState, TableFeature, TableFeatures } from '@tanstack/table-core'

/**
 * A row, as this feature's **public** context types name it.
 *
 * `Row` is generic over the table's feature set in v9, and these types are handed to a consumer's
 * callback without knowing it — so `TableFeatures` here is the **widest** row, not a neutral one.
 * `interface TableFeatures extends Partial<CoreFeatures>, Partial<StockFeatures>, Partial<Plugins>`
 * (`types/TableFeatures.d.ts:140`), so `keyof TableFeatures` is every feature key and
 * `ExtractFeatureMapTypes` (`:39`) intersects **every** `Row_FeatureMap` entry rather than none.
 * Concretely: a consumer whose table omits `rowSelectionFeature` still gets a context row typed
 * with `getIsSelected`, which does not exist on it at runtime.
 *
 * That over-claim is accepted, because every alternative is worse rather than because it is
 * harmless. Making these types generic over `TFeatures` would be a breaking change to a documented
 * API with no inference variable to carry the feature set from the table to a sibling config field
 * — the shape of problem the `ColumnInputRenderer` note in `../../column/types.ts` describes.
 * Degrading to a structural stand-in would silently drop `row.getValue()` and the rest from a
 * documented API, which is the trap `row-actions.ts` already fell into. And the members that are
 * over-claimed are real `Row` members whenever the feature is registered; what a delete prompt
 * actually reaches for — `row.original`, `row.getValue()` — is on `Row_Core` either way.
 *
 * `TData & object` rather than `TData`: v9's `RowData` is `Record<string, any> | Array<any>`, and
 * `TData` is unconstrained here because {@link ConfirmationConfig} defaults it to `unknown`. The
 * intersection adds nothing for any real row type — rows are objects — and is what lets the alias
 * name `Row` at all.
 */
type PublicRow<TData> = Row<TableFeatures, TData & object>

/**
 * Confirmation copy for deleting one row.
 *
 * Generic over the row for the same reason {@link DeletingContext} is: the prompt worth writing
 * names the thing being deleted — `Delete "${row.original.name}"?` — and with `Row<unknown>` the
 * ordinary case opened with a cast.
 */
export type ConfirmationConfig<TData = unknown> = FeatureToggle & {
	title?: string
	description?: string | ((row: PublicRow<TData>) => string)
}

/**
 * Confirmation copy for a bulk delete. Separate from {@link ConfirmationConfig} for one
 * reason: `description` is handed the whole selection, not a row. A prompt that cannot say
 * "Delete 3 orders?" is not a prompt for deleting three orders.
 */
export type BulkConfirmationConfig<TData = unknown> = FeatureToggle & {
	title?: string
	description?: string | ((rows: PublicRow<TData>[]) => string)
}

/**
 * Context passed to {@link DeletingConfig.onDelete}.
 *
 * @typeParam TData - row data type
 */
export type DeletingContext<TData> = {
	/** ID of the row being deleted (TanStack row.id). */
	rowId: string
	/** Full TanStack row instance — access `row.original`, `row.getValue()`, etc. */
	row: PublicRow<TData>
	/** Aborted when the user cancels deletion via deleting.cancel() or the table unmounts. */
	signal: AbortSignal
}

/**
 * Context passed to {@link BulkDeletingConfig.onDelete}.
 *
 * @typeParam TData - row data type
 */
export type BulkDeletingContext<TData> = {
	/** IDs of every selected row, in selection order. */
	rowIds: string[]
	/** The selected rows themselves — `row.original`, `row.getValue()`, … */
	rows: PublicRow<TData>[]
	/** Aborted when the user cancels the staged bulk delete, or the table unmounts. */
	signal: AbortSignal
}

/**
 * Deleting the selected rows at once.
 *
 * Lives here, under `deleting`, rather than on the selection bar that happens to render the
 * button: bulk delete is the delete feature operating on more than one row, and its handler and
 * its prompt belong next to the per-row ones. It used to sit on `selection.bar`, so a grid
 * that had configured `deleting` got no bulk affordance until it repeated the handler and the
 * confirmation copy under a presentational option.
 */
export type BulkDeletingConfig<TData> = FeatureToggle & {
	/**
	 * One call for the whole selection — the shape a server API for "delete these ids" wants.
	 *
	 * Omit it and the grid falls back to {@link DeletingConfig.onDelete}, once per selected row,
	 * which is what a client-side store needs and means `bulk: true` is the whole config for it.
	 *
	 * Either way the deleted ids leave `state.rowSelection` once the handler resolves — a bar
	 * counting rows that no longer exist is never what anyone wanted, and clearing it by hand
	 * from every handler was the previous shape's parting gift.
	 */
	onDelete?: (ctx: BulkDeletingContext<TData>) => void | Promise<void>
	/**
	 * Prompt before deleting. `true` uses count-aware default copy;
	 * {@link BulkConfirmationConfig} overrides it. Independent of
	 * {@link DeletingConfig.confirmation} — deleting twelve rows at once may deserve a prompt
	 * where deleting one does not.
	 */
	confirmation?: boolean | BulkConfirmationConfig<TData>
}

export type DeletingConfig<TData> = FeatureToggle & {
	/** Delete one row. Required — it is what makes the feature exist at all. */
	onDelete: (ctx: DeletingContext<TData>) => void | Promise<void>
	/** Prompt before deleting one row. `true` uses default copy. */
	confirmation?: boolean | ConfirmationConfig<TData>
	/**
	 * Delete the current selection in one gesture. `false` / omitted — no bulk affordance;
	 * `true` — enabled, looping {@link DeletingConfig.onDelete} over the selected rows;
	 * {@link BulkDeletingConfig} — a single handler for the whole set, its own prompt, or both.
	 *
	 * The selection bar renders the Delete button iff this resolves to on and row selection is
	 * enabled — there is nothing to bulk-delete without a selection.
	 */
	bulk?: boolean | BulkDeletingConfig<TData>
}

/**
 * Deleting's state slice, held in `state.deleting`.
 *
 * One named slice, like {@link EditingState} and {@link CreatingState} — the three write
 * features now hold their state the same way they expose their API. It was two flat keys on
 * `TableState`, `pendingDeleteRowId` and `pendingBulkDelete`, so subscribing to "is a delete
 * awaiting confirmation" meant knowing two names, neither of which was the feature's.
 *
 * Both fields are transient: the feature hard-resets them at construction, which is why
 * `deleting` is one of the slices {@link InitialTableState} forbids seeding.
 */
export type DeletingState = {
	/** Id of the row whose confirmation is staged, or `null`. */
	pendingRowId: string | null
	/** True while a bulk (selection-bar) delete is staged awaiting confirmation. */
	pendingBulk: boolean
}

/**
 * The bulk half of {@link DeletingApi}, reached as `table.deleting.bulk`.
 *
 * Its own object rather than four `*Bulk*` methods beside the per-row four: the two halves take
 * different arguments and are gated by different options, and nesting keeps `request` / `confirm`
 * / `cancel` spelled the same on both.
 */
export type BulkDeletingApi = {
	/** Delete the given rows — the bulk handler, or `onDelete` per row when there is none. */
	delete: (rowIds: string[]) => Promise<void>
	/** Delete the current selection, staging a confirmation first when one is configured. */
	request: () => void
	/** Run the staged bulk delete. */
	confirm: () => Promise<void>
	/** Drop the staged bulk delete without running it. */
	cancel: () => void
}

/**
 * Everything deleting can be told to do, reached as `table.deleting`.
 *
 * A namespace, like `table.creating`, `table.editing` and `table.draft` — the three write
 * features now read the same way. It replaces eight flat methods on the table root
 * (`requestDeleteRow`, `confirmBulkDelete`, … — now gone), which spelled one concept in two vocabularies
 * and put eight names into the completion list for `table.`.
 */
export type DeletingApi = {
	/** Delete one row now, skipping any confirmation. */
	delete: (rowId: string) => Promise<void>
	/** Delete one row, staging a confirmation first when one is configured. */
	request: (rowId: string) => void
	/** Run the staged per-row delete. */
	confirm: () => Promise<void>
	/** Drop the staged per-row delete without running it. */
	cancel: () => void
	/** Deleting the current selection in one gesture. */
	bulk: BulkDeletingApi
	/** The current {@link DeletingState}. Sibling of `table.editing.getState()` / `table.creating.getState()`. */
	getState: () => DeletingState
}

/**
 * The single in-flight `AbortController` for a table, held in a box rather than directly.
 *
 * `initTableInstanceData` installs the member once; every swap after that mutates
 * `box.controller`, so nothing ever reassigns the property that was installed. That is what lets
 * `resetTableInstanceData` clear the controller without needing the whole `Table_FeatureMap` entry
 * back in hand, and what keeps `table.deleting`'s closure and the reset hook looking at one box.
 */
// `| undefined` explicitly: under `exactOptionalPropertyTypes` a bare `controller?:` could not be
// cleared by assignment, and clearing it is what `cancel` and `resetTableInstanceData` both do.
export type DeletingAbortBox = { controller?: AbortController | undefined }

declare module '@tanstack/table-core' {
	// Declaration merging needs interfaces; these are the shapes upstream declares as such.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Plugins {
		deletingFeature: TableFeature
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_FeatureMap {
		deletingFeature: { deleting: DeletingState }
	}

	// `TableState_FeatureMap` feeds `TableState<TFeatures>` only; `TableState_All` is what feature
	// internals — and `SliceKey` in `../../feature-state` — read through. A feature that augments
	// only the first cannot name its own slice at `readOwnSlice(table, 'deleting')`.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_All {
		deleting?: DeletingState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		deletingFeature: { deleting?: DeletingConfig<TData> }
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		deletingFeature: {
			/** The whole delete flow — per-row and bulk, staged or immediate. */
			deleting: DeletingApi
			/** Internal. The in-flight delete controller. See {@link DeletingAbortBox}. */
			_deletingAbort: DeletingAbortBox
		}
	}
}

/**
 * The idle state — nothing staged — which `getInitialState` seeds and `table.reset()` restores.
 *
 * **Frozen, and the freeze is defensive rather than load-bearing.** Stated plainly because the
 * twins' doc comments say the opposite about theirs, and the difference is real:
 *
 * - `creating` and `editing` write `{ ...INITIAL_STATE }` into the slice at `cancel` / `commit`,
 *   a *shallow* copy, so the nested `values` and `errors` a closed form holds are the constant's
 *   own objects, shared across every table in the process. That is why their freeze has to reach
 *   two levels, and why they have a test that fails without it.
 * - `deleting` has neither half of that. `DeletingState` is two primitives, so there is nothing
 *   nested to alias; and nothing writes the whole constant at runtime — every write is a field
 *   patch through {@link writeDeleting}. The seed does not escape either: `constructTable`
 *   deep-clones `initialState` (`cloneState`, `dist/utils.js:15`), so no table ever holds this
 *   object. **Verified, not assumed** — the first version of the test below asserted two tables
 *   shared the seed and failed.
 *
 * So the freeze cannot be falsified from outside this module today, and no test pretends to. It is
 * kept for one reason that will outlive that: the three write features declare their closed state
 * identically, and if a nested field is ever added here the freeze is already in place where the
 * twins' comments say it belongs. The case below pins what *is* observable — each table's slice is
 * its own, and every write replaces it.
 */
const INITIAL_STATE: DeletingState = Object.freeze({
	pendingRowId: null,
	pendingBulk: false,
})

/**
 * A table, as this feature's free functions see it.
 *
 * Every helper below takes it as its first argument rather than closing over one — the shape
 * `editing` and `creating` established, and what lets `initTableInstanceData` hand the table in
 * rather than have the API object capture it from a `createTable` closure that no longer exists
 * in v9.
 *
 * `getRowModel` is spelled structurally because `AnyTable` deliberately carries only the two atom
 * bags; the **row** type is the real `Row`, which this feature can name now that nothing redeclares
 * it at v8 arity. Note that `Row<TableFeatures, RowData>` is the **widest** row — see
 * {@link PublicRow} — so it over-claims members here just as it does there. That is safe only
 * because the helpers below read exactly one thing off a row, `r.id`, which is on `Row_Core` and
 * present whatever the feature set is; every other use hands the row straight to the consumer's
 * callback. **A feature member called on one of these rows would compile and then throw at
 * runtime on a table that does not register the owning feature** — so if this file ever needs
 * more than `id`, narrow the type here rather than reaching for it.
 */
type DeletingTable = AnyTable & {
	getRowModel: () => { rows: Row<TableFeatures, RowData>[] }
}

/**
 * The feature's own option, read off a table whose `TFeatures` is unresolved.
 *
 * `table.options` is `TableOptions<TFeatures, TData>`, assembled from `TableOptions_FeatureMap`
 * by feature key, so a key this feature merged in is not provable inside the feature itself.
 * Upstream's custom-feature skill reads its own option the same way. This survived the removal of
 * the v8 `declare module` blocks unchanged, as it was expected to: it is a property of feature
 * code, not of the shadowing those blocks did.
 */
const deletingOption = (table: { readonly options: object }): DeletingConfig<RowData> | undefined =>
	(table.options as { deleting?: DeletingConfig<RowData> }).deleting

/**
 * The table's abort box, read off a table whose `TFeatures` is unresolved.
 *
 * Same reason as {@link deletingOption}: `Table_FeatureMap` contributes `_deletingAbort` only when
 * `deletingFeature` is provably in `TFeatures`, which it is not from inside the feature. The
 * **write** side needs no cast — `assignTableInstanceData` checks the member names against the
 * declaration above.
 */
const abortBox = (table: AnyTable): DeletingAbortBox =>
	(table as unknown as { _deletingAbort: DeletingAbortBox })._deletingAbort

/** The current slice. `deleting` is this feature's own, so the read is not optional. */
function readDeleting(table: AnyTable): DeletingState {
	return readOwnSlice(table, 'deleting')
}

/**
 * Merge a patch into the slice — the one writer of `deleting`.
 *
 * `writeOwnSlice`, not `table.setState`: the write now touches one slice instead of rebuilding the
 * whole `TableState`, so a subscriber to another slice is not woken by staging a confirmation.
 */
function writeDeleting(table: AnyTable, patch: Partial<DeletingState>): void {
	writeOwnSlice(table, 'deleting', (prev) => ({ ...prev, ...patch }))
}

/** Abort whatever is in flight and install a fresh controller in the box. */
function resetController(table: AnyTable): AbortController {
	const box = abortBox(table)
	box.controller?.abort()
	const c = new AbortController()
	box.controller = c
	return c
}

/** Abort whatever is in flight and leave the box empty. What `cancel` and the reset hook share. */
function teardownController(table: AnyTable): void {
	const box = abortBox(table)
	box.controller?.abort()
	box.controller = undefined
}

/** Ids of the currently selected rows, in the order TanStack holds them. */
function selectedRowIds(table: AnyTable): string[] {
	// `readForeignSlice`: `rowSelection` belongs to `rowSelectionFeature`, which is legitimately
	// optional — a grid may configure `deleting` and no selection at all — so an absent slice is
	// an empty selection, not an error.
	return (
		Object.entries(readForeignSlice(table, 'rowSelection') ?? {})
			// v9 narrowed `RowSelectionState` from v8's `Record<string, boolean>` to
			// `Record<string, true>` — stock code removes a deselected id rather than writing
			// `false` — so the type says this filter is dead and the linter agrees. It is kept
			// because the atom may be **consumer-owned** (that is the premise of `deselect` below),
			// and nothing stops an app's own writer from putting a literal `false` in it at
			// runtime. Dropping it would turn such an entry into a selected row, which is the v8
			// behaviour this port must not change.
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			.filter(([, isSelected]) => isSelected)
			.map(([id]) => id)
	)
}

/**
 * Drop ids from the selection. Run after a bulk delete: leaving deleted rows selected means a
 * selection bar counting rows that no longer exist, and every consumer clearing it by hand from
 * its own handler.
 *
 * **`writeForeignSlice`, and this is the module's first real caller.** `rowSelection` is not this
 * feature's slice: `rowSelectionFeature` may be absent (then the write must no-op rather than
 * throw), and when it is present the consumer may own the atom through `options.atoms.rowSelection`
 * (then `baseAtoms.rowSelection` is the wrong target and a write aimed at it would go nowhere,
 * silently). `writeOwnSlice` gets the first of those wrong and a hand-written `baseAtoms` write
 * gets the second.
 *
 * This is also the only slice this feature writes that is not its own, and it is never written in
 * the same synchronous gesture as `deleting`: `bulk.confirm` clears `pendingBulk` and *then*
 * awaits the handler, so the two writes are already separated by a microtask — under v8 they were
 * two separate `table.setState` calls for the same reason. Nothing here needs `batch`.
 */
function deselect(table: AnyTable, rowIds: string[]): void {
	if (rowIds.length === 0) return
	const removed = new Set(rowIds)
	writeForeignSlice(
		table,
		'rowSelection',
		(prev: RowSelectionState): RowSelectionState =>
			Object.fromEntries(Object.entries(prev).filter(([id]) => !removed.has(id))),
	)
}

async function deleteRow(table: DeletingTable, rowId: string): Promise<void> {
	const config = deletingOption(table)
	if (!config) return
	const row = table.getRowModel().rows.find((r) => r.id === rowId)
	if (!row) return
	const c = resetController(table)
	await config.onDelete({ rowId, row, signal: c.signal })
}

async function deleteRows(table: DeletingTable, rowIds: string[]): Promise<void> {
	const config = deletingOption(table)
	if (!config) return
	const bulk = featureConfig(config.bulk)
	const rows = rowIds
		.map((id) => table.getRowModel().rows.find((r) => r.id === id))
		.filter((r): r is Row<TableFeatures, RowData> => r !== undefined)
	if (rows.length === 0) return
	const c = resetController(table)
	const ids = rows.map((r) => r.id)
	if (bulk?.onDelete) {
		await bulk.onDelete({ rowIds: ids, rows, signal: c.signal })
		deselect(table, ids)
		return
	}
	// No single-call handler: the per-row one, once per row. Sequential rather than
	// `Promise.all` so a store that mutates an array per call sees each write land, and
	// so a failure stops the run instead of leaving a partial set half-applied.
	for (const row of rows) {
		await config.onDelete({ rowId: row.id, row, signal: c.signal })
	}
	deselect(table, ids)
}

/** The one table member this feature installs — a namespace object, not a method. */
function createDeletingApi(table: DeletingTable): DeletingApi {
	return {
		delete: (rowId) => deleteRow(table, rowId),

		request: (rowId) => {
			const config = deletingOption(table)
			if (!config) return
			if (isFeatureEnabled(config.confirmation)) {
				writeDeleting(table, { pendingRowId: rowId })
			} else {
				void deleteRow(table, rowId)
			}
		},

		confirm: async () => {
			const { pendingRowId } = readDeleting(table)
			if (!pendingRowId) return
			writeDeleting(table, { pendingRowId: null })
			await deleteRow(table, pendingRowId)
		},

		cancel: () => {
			teardownController(table)
			writeDeleting(table, { pendingRowId: null })
		},

		bulk: {
			delete: (rowIds) => deleteRows(table, rowIds),

			request: () => {
				const config = deletingOption(table)
				if (!config || !isFeatureEnabled(config.bulk)) return
				if (isFeatureEnabled(featureConfig(config.bulk)?.confirmation)) {
					writeDeleting(table, { pendingBulk: true })
					return
				}
				void deleteRows(table, selectedRowIds(table))
			},

			confirm: async () => {
				if (!readDeleting(table).pendingBulk) return
				const ids = selectedRowIds(table)
				writeDeleting(table, { pendingBulk: false })
				await deleteRows(table, ids)
			},

			cancel: () => {
				teardownController(table)
				writeDeleting(table, { pendingBulk: false })
			},
		},

		getState: () => readDeleting(table),
	}
}

/**
 * Deleting rows, as a v9 table feature.
 *
 * Owns the `deleting` slice — transient staged-confirmation state, never seeded from
 * `initialState` — and installs one namespace object, `table.deleting`.
 *
 * `deleting` goes in through `initTableInstanceData` rather than `constructTableAPIs`: it is a
 * namespace **object**, and `assignTableAPIs` installs one function per key, so it cannot express
 * `table.deleting.bulk.confirm`. `_deletingAbort` belongs there for the other reason the hook
 * exists — it is mutable per-table data.
 *
 * Nothing is installed on the row prototype: a staged delete is a property of the table, not of a
 * row, so there is no `assignRowPrototype` here.
 */
export const deletingFeature: TableFeature = {
	// `deleting` last, not `initialState` last as most features spread it: this slice is transient
	// staged-confirmation state and is hard-reset at construction, the rule `editing` and
	// `creating` follow. `TableConfig` forbids seeding it, so there is nothing to preserve.
	getInitialState: (initialState) => ({
		...initialState,
		deleting: { ...INITIAL_STATE },
	}),

	initTableInstanceData: (table) => {
		// Not a hand-written cast: `assignTableInstanceData` checks both member names against the
		// `Table_FeatureMap` entry above, so a misspelled one cannot install silently.
		assignTableInstanceData('deletingFeature', table, {
			// The one cast. The hook is handed a `Table<TFeatures, TData>` whose rows are
			// `Row<TFeatures, TData>`; this feature cannot name `TFeatures`, so it works in
			// `Row<TableFeatures, RowData>`, and `Row` is invariant in both parameters, so the two
			// do not convert. The objects are the same rows at runtime — but the cast **widens**
			// the row's claimed type rather than merely restating it (see {@link DeletingTable}),
			// so it is sound only while the helpers read nothing but `id`.
			//
			// Preferred over a structural `{ id: string }` stand-in, which would have compiled with
			// no cast at all and silently stopped matching if `Row` ever lost `id` — but that is a
			// trade, not a free win: the stand-in would have been the narrower, more honest
			// internal type. The real `Row` wins because it keeps one vocabulary between this file
			// and the public context types, and because the widening is confined to this one line.
			deleting: createDeletingApi(table as unknown as DeletingTable),
			_deletingAbort: {},
		})
	},

	// Runs after `table.reset()` has restored internally owned atoms, so this does **only** the
	// part state restoration cannot: tearing down the in-flight controller, so a late `onDelete`
	// resolution writes nothing. Clearing the staged confirmation is already done by then —
	// `table_reset` writes every key of `table.initialState` back through `baseAtoms` in one batch,
	// and this feature's `getInitialState` put `deleting: INITIAL_STATE` in that snapshot. Do not
	// clear the slice here as well: it would write an atom the reset pass already wrote, outside
	// its batch.
	//
	// Behaviour v8 did not have — the controller lived in a closure with no reset hook to reach it.
	resetTableInstanceData: (table) => {
		teardownController(table)
	},
}
