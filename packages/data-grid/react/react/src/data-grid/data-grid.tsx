import {
	canDropColumn,
	CreatingMode,
	dropColumn,
	EditingMode,
	featureConfig,
	isFeatureEnabled,
} from '@ez-kit/data-grid-core'
import { useCallback, useMemo, useRef } from 'react'

import { CellTypesProvider, mergeCellTypes } from '../cell-types-context'
import { GridComponentsProvider, useGridComponents } from '../components-context'
import { guardComponents } from '../components-guard'
import { GridFactoryDefaultsProvider } from '../data-grid-options-context'
import { useDataGrid, type UseDataGridConfig } from '../use-data-grid'
import { useGridMessages } from '../use-grid-messages'

import { ActionBar, buildSelectionBarArgs } from './action-bar'
import { ActiveFiltersBar } from './active-filters-bar'
import { Body } from './body'
import { BottomBar } from './bottom-bar'
import { DataGridCell } from './cell'
import { ClearFiltersButton } from './clear-filters-button'
import { ColumnDragHandle } from './column-drag-handle'
import { ColumnFilter } from './column-filter'
import { ComponentGuard } from './component-guard'
import { CreateTrigger } from './create-trigger'
import { CreatingModal } from './creating-modal'
import { DndAdapterProvider, DndBundleProvider, DragAxis, useDndAdapter, useDndBundleAdapter } from './dnd'
import { COLUMN_DROP_SCOPE } from './dnd/column-drop-scope'
import { buildDndAnnouncements } from './dnd-announcements'
import { EditingModal } from './editing-modal'
import { EmptyStateRow } from './empty-state-row'
import { FilterPanel } from './filter-panel'
import { Footer } from './footer'
import { DataGridFooterCell } from './footer-cell'
import { DataGridFooterRow } from './footer-row'
import { GlobalFilterInput } from './global-filter-input'
import { GroupByBar } from './group-by-bar'
import { Header } from './header'
import { DataGridHeaderCell } from './header-cell'
import { DataGridHeaderRow } from './header-row'
import { HeaderExtras, HeaderMain } from './header-slots'
import { LoadingBody } from './loading-body'
import { NoResultsRow } from './no-results-row'
import { PageSizer } from './page-sizer'
import { Pagination } from './pagination'
import { DataGridRow } from './row'
import { RowCountStatus } from './row-count-status'
import { RowDragHandle } from './row-drag-handle'
import { RowDragRegistryProvider, useRenderedRowIdsReader } from './row-drag-registry'
import { SortMenuTrigger } from './sort-menu-trigger'
import { DataGridTable } from './table'
import { TableProvider, useDataGridTable, useDataGridState } from './table-context'
import { Toolbar } from './toolbar'
import { VisibilityItem } from './visibility-item'
import { VisibilityTrigger } from './visibility-trigger'

import type { CellTypeRegistry } from '../cell-types-context'
import type { GridComponents } from '../contract'
import type { DataTable, ErasedRow, GridFeatures } from '../types'
import type { DndDragOverEvent, DndDropEvent } from './dnd'
import type {
	BulkConfirmationConfig,
	ConfirmationConfig,
	CreatingConfig,
	EditingConfig,
	GridMessages,
} from '@ez-kit/data-grid-core'
import type { Row, Table, TableFeatures } from '@tanstack/table-core'
import type { ReactNode } from 'react'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * The props both modes carry. Exported because `createDataGrid` rebuilds the uncontrolled half
 * around them when the factory binds a feature set — see `BoundDataGridProps`.
 */
export type DataGridSharedProps = {
	/** Local component overrides — merged with global GridComponentsProvider. */
	components?: GridComponents
	children?: ReactNode
}

/**
 * Controlled usage: the caller owns the table built by `useDataGrid` and passes it in.
 * Use this when several components need the same table, or to read its state from outside
 * the grid with `useDataGridSelector`.
 */
export type DataGridControlledProps<TFeatures extends TableFeatures, TRow extends object> = DataGridSharedProps & {
	/** Instance returned by `useDataGrid`. */
	table: DataTable<TFeatures, TRow>
	/** Custom cell type renderers. Merged with types from `useDataGrid`. */
	cellTypes?: CellTypeRegistry
}

/**
 * Uncontrolled usage: pass the same config `useDataGrid` accepts directly and
 * the grid runs the hook for you — no separate `useDataGrid` call needed.
 */
export type DataGridUncontrolledProps<TFeatures extends TableFeatures, TRow extends object> = DataGridSharedProps &
	UseDataGridConfig<TFeatures, TRow> & {
		/** Mutually exclusive with the inline config — never pass both. */
		table?: never
	}

/**
 * `DataGrid` accepts **either** a ready `table` (controlled) **or** the
 * full `useDataGrid` config inline (uncontrolled). The two shapes are mutually
 * exclusive — pick one mode for the lifetime of the component, since switching
 * remounts the grid and resets its state.
 *
 * @example — controlled (explicit table)
 * const table = useDataGrid({ data, columns, sorting: true })
 * return <DataGrid table={table} />
 *
 * @example — uncontrolled (no hook)
 * return <DataGrid data={data} columns={columns} sorting />
 */
export type DataGridProps<TFeatures extends TableFeatures, TRow extends object> =
	| DataGridControlledProps<TFeatures, TRow>
	| DataGridUncontrolledProps<TFeatures, TRow>

function resolveConfirmationText<TRow extends object>(
	options: ConfirmationConfig<TRow>,
	row: Row<GridFeatures, TRow> | undefined,
	messages: GridMessages['deleting'],
): { title: string; description: string } {
	const title = options.title ?? messages.title
	const desc = options.description
	let description: string
	if (typeof desc === 'function') {
		description = row ? desc(row) : messages.description
	} else {
		description = desc ?? messages.description
	}
	return { title, description }
}

/**
 * Bulk confirmation text. The `description` function is handed the whole selection rather than
 * one row — see {@link BulkConfirmationConfig} — and falls back to count-aware default copy.
 */
function resolveBulkConfirmationText<TRow extends object>(
	options: BulkConfirmationConfig<TRow>,
	rows: Row<GridFeatures, TRow>[],
	messages: GridMessages['deleting'],
): { title: string; description: string } {
	const title = options.title ?? messages.bulkTitle
	const desc = options.description
	const description =
		typeof desc === 'function' ? desc(rows) : (desc ?? messages.bulkDescription({ count: rows.length }))
	return { title, description }
}

/** The bulk-delete prompt's config, or `undefined` when bulk delete asks for no prompt. */

function bulkConfirmationOptions<TRow extends object>(
	table: Table<GridFeatures, TRow>,
): BulkConfirmationConfig<TRow> | undefined {
	const confirmation = featureConfig(table.options.deleting?.bulk)?.confirmation
	// `featureConfig` yields `undefined` for the bare `true`, which here means "prompt, with the
	// default copy" — so the on/off decision reads `isFeatureEnabled` and only the copy comes
	// from the object.
	if (!isFeatureEnabled(confirmation)) return undefined
	return featureConfig(confirmation) ?? {}
}

/** Whether either the per-row or the bulk confirmation dialog is configured. */
function hasConfirmDialog<TRow extends object>(table: Table<GridFeatures, TRow>): boolean {
	return isFeatureEnabled(table.options.deleting?.confirmation) || bulkConfirmationOptions(table) !== undefined
}

function ConfirmDialogRenderer() {
	const table = useDataGridTable()
	const { ConfirmDialog } = useGridComponents().deleting
	// Narrow: re-render only when a pending delete target changes. Other
	// state mutations (editing, sorting, etc.) leave these stable.
	// Optional-chained because these two hooks run **before** the `hasConfirmDialog` gate below —
	// a hook cannot sit after an early return — so they execute on every grid, including one with
	// no deleting feature registered. See `feature-optionality.test.tsx`.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const pendingId = useDataGridState((s) => s.deleting?.pendingRowId ?? null)
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const pendingBulk = useDataGridState((s) => s.deleting?.pendingBulk ?? false)
	// Confirming clears the pending target, which closes the dialog, which fires the kit's
	// close handler — the same `onCancel` a dismissal uses. Without this flag that close would
	// abort the delete request the confirm just started.
	const hasConfirmed = useRef(false)

	// The gate lives here rather than at the call site: both halves then read the *same*
	// row-erased table from context, instead of the caller's table deciding whether a
	// component that reads the erased one should mount.
	if (!hasConfirmDialog(table)) return null

	// A staged bulk delete takes precedence: it is the gesture the user just made. Core owns
	// both the staging and the run, so this only renders the prompt and reports the answer.
	const bulkOptions = bulkConfirmationOptions(table)
	if (pendingBulk && bulkOptions) {
		const { selectedRows } = buildSelectionBarArgs(table)
		const { title, description } = resolveBulkConfirmationText(bulkOptions, selectedRows, table.grid.messages.deleting)
		return (
			<ConfirmDialog
				open
				title={title}
				description={description}
				onConfirm={() => {
					hasConfirmed.current = true
					void table.deleting.bulk.confirm()
				}}
				onCancel={() => {
					if (hasConfirmed.current) {
						hasConfirmed.current = false
						return
					}
					table.deleting.bulk.cancel()
				}}
			/>
		)
	}

	const confirmation = table.options.deleting?.confirmation
	if (!isFeatureEnabled(confirmation)) return null
	const options: ConfirmationConfig<ErasedRow> = featureConfig(confirmation) ?? {}
	const pendingRow = pendingId !== null ? table.getRowModel().rows.find((r) => r.id === pendingId) : undefined
	const { title, description } =
		pendingId !== null
			? resolveConfirmationText(options, pendingRow, table.grid.messages.deleting)
			: { title: '', description: '' }

	return (
		<ConfirmDialog
			open={pendingId !== null}
			title={title}
			description={description}
			onConfirm={() => {
				hasConfirmed.current = true
				void table.deleting.confirm()
			}}
			onCancel={() => {
				if (hasConfirmed.current) {
					hasConfirmed.current = false
					return
				}
				table.deleting.cancel()
			}}
		/>
	)
}

/**
 * The grid's one root element, around everything a grid renders.
 *
 * Without it the grid is a list of siblings in its parent's flow, so a parent that lays its own
 * children out — `display: flex`, `grid`, a `gap` — lays out the toolbar, the table and the
 * pagination row separately instead of the grid as a whole.
 *
 * A plain `div` unless a kit registers `core.Root`, and styled only by what it is given:
 * `layout.classNames.root`, joined across the option layers like the shell's other two boxes.
 * It is read here rather than in `DataGridControlled` because that component is the one
 * *providing* the components context, and cannot consume it.
 */
function GridRoot({ children }: { children: ReactNode }) {
	// `core.Root` is the slot; `GridRoot` is this component around it, named for what it renders
	// rather than for the slot so the two do not collide in one scope.
	const { Root = 'div' } = useGridComponents().core
	const table = useDataGridTable()

	return (
		<Root
			data-slot='grid-root'
			className={table.grid.layout.classNames?.root}
		>
			{children}
		</Root>
	)
}

/**
 * Shared core that mounts the provider tree around a ready table. Both the
 * controlled and uncontrolled paths funnel through here, so every compound
 * child (`DataGrid.Table`, etc.) sees the same `TableContext`.
 */
/**
 * What a grid renders between its modals: `children ?? core.Layout ?? <DataGrid.Table/>`.
 *
 * `children` wins, because a call site that wrote its own composition means it. Otherwise a
 * registered `core.Layout` renders — the tier beside `FEATURE_COMPONENTS`, reached through the
 * ordinary components DI, so the app-wide form (`DataGridOptionsProvider`,
 * `createDataGrid({ components })`) and the per-instance one both come for free, and a nested
 * grid inherits it with the rest of `components`. With neither, the grid is a table and nothing
 * else.
 *
 * That last fallback is the point of the slot: this package ships **no** rich default and does
 * not import one. The presets in `../layouts` are what a kit binds to `core.Layout` in its own
 * `data-grid.tsx`, the way each already binds `allDataGridFeatures` — so a kit's `<DataGrid>`
 * still renders toolbar, table and pagination with no children, while a grid composed through
 * `createDataGrid` carries only what it names.
 *
 * No recursion risk: a layout renders `DataGrid.Table`, never `DataGrid`.
 */
function GridBody({ children }: { children: ReactNode }) {
	const { Layout } = useGridComponents().core
	if (children !== undefined) return <>{children}</>
	if (Layout) return <Layout />
	return <DataGridTable />
}

/**
 * Mounts the registered adapter's own provider, and commits what it reports.
 *
 * A component rather than a few lines inside {@link DataGridControlled}, because reading the
 * adapter is a hook and rendering `children` unchanged when there is none has to be a *render*
 * decision, not a branch around one.
 *
 * The commit is one call: `table.ordering.dropRow` resolves controlled versus uncontrolled itself
 * and refuses anything the step path would have refused — the same rules, applied to a target the
 * user named rather than one reached by stepping. It is safe to call unconditionally; with row
 * ordering off it reads its own config and returns.
 */
function GridDndProvider({ children }: { children: ReactNode }) {
	const adapter = useDndAdapter()
	const table = useDataGridTable()
	const messages = useGridMessages()
	const readRenderedRowIds = useRenderedRowIdsReader()

	/**
	 * The current table and dictionary, for callbacks that outlive the render that built them.
	 *
	 * Assigned during render on purpose — the same shape the controlled/uncontrolled warning below
	 * uses. An effect would be a frame late, and nothing reads this during render; the readers below
	 * are invoked from the drag library's own event handling, which is strictly after paint.
	 */
	const latestRef = useRef({ table, messages })
	latestRef.current = { table, messages }

	const readTable = useCallback(() => latestRef.current.table, [])
	const readMessages = useCallback(() => latestRef.current.messages, [])

	/**
	 * What a drag says, in the application's language — built here because this is the only layer
	 * that holds both halves of the sentence.
	 *
	 * The drag library hands its own announcement callbacks the ids it is moving and nothing else, so
	 * the best it can do unaided is name a record id. A column's heading, a row's place among the
	 * rows on screen and the message catalogue all live here; a kit's adapter has none of them and
	 * exists in order not to. So the grid writes whole sentences and the adapter speaks them.
	 *
	 * **Built once, and every dependency is a reader — this memo must stay stable.** The drag
	 * library's plugin registry reuses a plugin instance keyed by its constructor and only reassigns
	 * `options`, and `@dnd-kit/dom@0.1.21`'s `Accessibility` reads the bag in its constructor alone,
	 * so a bag rebuilt per render is a bag the live region never sees. Adding `table` or `messages`
	 * back to the dependency list therefore does not refresh the announcements — it freezes them at
	 * the first render *and* churns a value nothing re-reads. `messages` in particular is rebuilt on
	 * every render of any grid with a `messages` override.
	 *
	 * `readRenderedRowIds` is stable per registry and is a reader for an adjacent reason: a
	 * virtualized body republishes its window under a drag's auto-scroll without this provider
	 * re-rendering.
	 */
	const announcements = useMemo(
		() => buildDndAnnouncements(readTable, readMessages, readRenderedRowIds),
		[readTable, readMessages, readRenderedRowIds],
	)

	const onDrop = useCallback(
		(event: DndDropEvent) => {
			/*
			 * One arm per axis, and the two commit through **different calls** rather than through
			 * one widened branch: `dropRow` describes a move and `table.ordering` performs it, while
			 * `dropColumn` returns a whole `ColumnOrderState` this layer writes with
			 * `setColumnOrder`. Written as a `switch` over the closed set so a third axis would be a
			 * compile error rather than a silent fallthrough.
			 */
			switch (event.axis) {
				case DragAxis.Row: {
					/*
					 * Both ends are ids, so there is no mapping to make and no list to make it
					 * against: `dropRow` resolves the pair itself, against the table's own model.
					 *
					 * **This replaced resolving the target from a landing index.** That needed the
					 * rendered-row list a row registers its index in, read here at drop time, and the
					 * two readers had to agree about a list a virtualized body renumbers mid-gesture.
					 * They did not — a drag's auto-scroll grew the library's index space past the
					 * list's and the drop committed three or four rows beyond the one released on.
					 * `DndDropEvent` has the measurement. The list now has exactly one reader, the
					 * registration side, which is the only side a position means anything on.
					 */
					if (event.targetId === event.sourceId) return
					table.ordering.dropRow(event.sourceId, event.targetId)
					return
				}
				case DragAxis.Column: {
					if (event.targetId === event.sourceId) return
					const scope = COLUMN_DROP_SCOPE[event.surface]
					/*
					 * Asked before committing, because `dropColumn` answers a refusal with the
					 * current order — indistinguishable from a legal drop that changed nothing — so
					 * an unguarded call would fire `onChange` on a drop across a header group or a
					 * pin band. `drop.ts` states this as the reason `canDropColumn` exists at all.
					 *
					 * **This is a backstop, not the enforcement point.** `canDrop` refuses the
					 * illegal *step*, so a drag cannot arrive here across a boundary in the first
					 * place — and now that both ask about the same target **id**, they are literally
					 * the same question rather than two that could disagree through a mapping. What
					 * keeps this here is time: the two are asked at different moments, so an async
					 * load that repins a column between the last hover and the release can still
					 * make them differ. See `canDrop` below for that caveat in full.
					 *
					 * The scope comes from the surface, not from `dropColumn`'s default: a header drop
					 * is judged under `ColumnMoveScope.Visible`, because a hidden column renders no
					 * header cell and can be neither end of a drop there, and a panel drop under
					 * `All`, because listing hidden columns so they can be reordered is what the
					 * panel is for. `COLUMN_DROP_SCOPE` has the whole argument.
					 */
					if (!canDropColumn(table, event.sourceId, event.targetId, scope)) return
					table.setColumnOrder(dropColumn(table, event.sourceId, event.targetId, scope))
					return
				}
			}
		},
		[table],
	)

	/**
	 * Whether the held item may land where the pointer currently is — the same question `onDrop`'s
	 * commit asks, asked while the drag is still in flight.
	 *
	 * It exists because refusing at release is not enough: an adapter's library displaces the
	 * neighbours and reassigns its own indices as the pointer moves, and a refusal writes no state,
	 * so nothing re-renders to push the real indices back. The two index spaces then disagree, the
	 * grid is left visibly permuted, and the next drag on that axis commits nothing.
	 * `DndProviderProps.canDrop` has the measurement. The commit's own guards stay where they are —
	 * this makes their refusal unreachable, it does not replace it.
	 *
	 * Both arms are optional-called, for the reason every feature read on a render path is: a grid
	 * may register the drag adapter and not the ordering feature for one axis, in which case there
	 * is nothing draggable on it and nothing to answer.
	 *
	 * **One caveat, narrow and worth naming rather than engineering around.** This answers from the
	 * table's state at hover time and the commit answers from it at release, so a change in between
	 * — an async load that hides or repins a column — can make the two disagree, and that one drag
	 * gets the old behaviour: the step is allowed, the commit refuses it, and the library's indices
	 * are left permuted. Nothing short of freezing the column model for the drag's duration closes
	 * it, which costs more than it buys.
	 */
	const canDrop = useCallback(
		(event: DndDragOverEvent): boolean => {
			/*
			 * A self-hover is normal and is allowed here rather than left to the adapter to filter.
			 * Once a sortable has displaced its first neighbour the source occupies its destination,
			 * so the collision resolves to the source on nearly every later frame; and every
			 * `canDrop*` helper answers `false` for a drop onto oneself, quite correctly, since as a
			 * *drop* it is nothing. Asking them would therefore stop every legal step after the
			 * first, silently.
			 *
			 * Both in-repo adapters already filter it, and keep doing so — the reason belongs in
			 * their prose. But the grid is the side that knows a self-hover means "no question", and
			 * an invariant that every future adapter has to remember, with total and silent failure
			 * as the penalty for forgetting, does not belong distributed across them.
			 */
			if (event.sourceId === event.targetId) return true

			switch (event.axis) {
				case DragAxis.Row:
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
					return table.ordering?.canDropRow?.(event.sourceId, event.targetId) ?? false
				case DragAxis.Column:
					// Same scope the commit will use, from the same lookup: a step the surface's own
					// scope allows must not be refused here, and one it forbids must not be allowed.
					return canDropColumn(table, event.sourceId, event.targetId, COLUMN_DROP_SCOPE[event.surface])
			}
		},
		[table],
	)

	if (!adapter) return <>{children}</>

	return (
		<adapter.Provider
			onDrop={onDrop}
			canDrop={canDrop}
			announcements={announcements}
		>
			{children}
		</adapter.Provider>
	)
}

function DataGridControlled<TFeatures extends TableFeatures, TRow extends object>({
	table,
	components,
	cellTypes,
	children,
}: DataGridControlledProps<TFeatures, TRow>) {
	// The one guarantee lost by returning the table itself rather than a wrapper type only
	// `useDataGrid` could produce: a bare `createTable()` result now typechecks here. Its
	// `table.grid` is **core's** bag, not this layer's resolved options, so the first compound
	// child that reads a resolved option would crash on a property access. Say so instead.
	//
	// The probe is `messages`, not `grid` itself: since v9 core seeds `table.grid` with its own
	// four members (`rowActions`, `rowPinning`, `virtualization`, `direction`) at construction,
	// so `grid !== undefined` is true for a raw table too and this guard stopped firing —
	// `<DataGrid table={createTable(…)}>` crashed on `grid.selection.bar` instead of naming the
	// problem. `messages` is written only by `prepareDataGridTable` / `useDataGrid`, and it is
	// always written by both.
	// `grid` is declared non-optional on `DataTable`, because every table the React layer
	// renders is meant to carry it — which is exactly the claim being checked here, so asking
	// the question at all needs a cast.
	// Read in the shared core rather than in `DataGridRoot`: `DataGridUncontrolled` sits between
	// the two and is where `useDataGrid` runs, so reading higher would fork the controlled and
	// uncontrolled paths for no gain.
	const bundleDndAdapter = useDndBundleAdapter()

	const isPrepared = (table as { grid?: { messages?: unknown } }).grid?.messages !== undefined
	if (IS_DEV && !isPrepared) {
		throw new Error(
			'<DataGrid table={…}> was given a table that has not been prepared for the React layer. ' +
				'Build it with `useDataGrid(...)`, or pass a raw `createTable(...)` result through ' +
				'`prepareDataGridTable(...)` first.',
		)
	}

	// Read cellTypes stored on the table by useDataGrid, merge with direct prop
	const tableCellTypes = table.grid.cellTypes
	const resolvedCellTypes = mergeCellTypes(tableCellTypes ?? {}, cellTypes ?? {})

	// The two write-feature options, read at the **widest** instantiation.
	//
	// `creating` and `editing` reach `table.options` through core's `TableOptions_FeatureMap`
	// augmentations, which resolve only once the feature set is concrete. `TFeatures` is a
	// parameter in this component, so on `DataTable<TFeatures, TRow>` neither key exists and
	// both reads are a `TS2339`. Every component *below* this provider avoids that by taking
	// the table from `useDataGridTable()`, which is the widest instantiation — see
	// `actions-cell.tsx`, which reads exactly these two keys and needs no cast. This is that
	// same read, written out because this component is the one place still holding the
	// generic table.
	const writeOptions = table.options as {
		creating?: CreatingConfig<TRow> | undefined
		editing?: EditingConfig<TRow> | undefined
	}

	return (
		// The bundle's drag adapter, promoted to this grid's own layer and then closed off — the
		// same move as the factory option layer below, for the same reason. Every root publishes a
		// grid-level value, **including `null`**: without that, a nested `<DataGrid>` rendered among
		// another grid's `children` would read the outer grid's adapter, since every context in this
		// package is created at module scope and is therefore shared by everything resolving the
		// same copy of it. A grid says what it runs on; it never inherits it.
		<DndBundleProvider adapter={null}>
			<DndAdapterProvider adapter={bundleDndAdapter}>
				{/*
				 * The factory option layer a bound `<DataGrid>` publishes has done its job by the time
				 * we get here — this table is built. Close it off so it stops at the grid it
				 * configures: without this, a nested `<DataGrid data columns />` rendered among
				 * `children` would silently inherit the outer kit's defaults instead of standing on
				 * its own.
				 */}
				<GridFactoryDefaultsProvider defaults={undefined}>
					<CellTypesProvider cellTypes={resolvedCellTypes}>
						<GridComponentsProvider
							{...(components !== undefined ? { components } : {})}
							{...(IS_DEV ? { guard: guardComponents } : {})}
						>
							<TableProvider table={table}>
								{IS_DEV && <ComponentGuard />}
								{/*
								 * Inside `TableProvider`, because the commit reads the table — and
								 * around everything that renders a row, because that is what the drag
								 * layer has to contain.
								 */}
								{/*
								 * The registry sits **above** the drag provider, and this order is load bearing:
								 * `GridDndProvider` reads it. Specifically it calls `useRenderedRowIdsReader()`
								 * and hands that reader to `buildDndAnnouncements`, which is how a row-drag
								 * announcement can say "row 3 of 20" — the position has to be counted in the
								 * window a virtualized body published, since that is the only list the drag's own
								 * index space agrees with. Nested the other way round the registry context is
								 * unreachable from `GridDndProvider` and there is no window to count in.
								 *
								 * **Check that read before changing this.** This nesting existed once with nothing
								 * behind it — a landing-index resolution that had already been replaced by an id —
								 * and was correctly reverted as an arbitrary order dressed up as a requirement. If
								 * `GridDndProvider` stops reading the registry, revert it again.
								 *
								 * What makes the read safe, where the removed one was not: a position that is only
								 * ever **read aloud** has no second side to disagree with. The old reader fed a
								 * commit, so a stale window meant the wrong row moved; a stale window here costs
								 * one wrong number in one sentence. The registry is otherwise a plain store that
								 * only rows and handles touch, so hoisting it costs nothing.
								 */}
								<RowDragRegistryProvider>
									<GridDndProvider>
										<GridRoot>
											<RowCountStatus />
											<GridBody>{children}</GridBody>
											{writeOptions.creating?.mode === CreatingMode.Modal && <CreatingModal />}
											{writeOptions.editing?.mode === EditingMode.Modal && <EditingModal />}
											<ConfirmDialogRenderer />
										</GridRoot>
									</GridDndProvider>
								</RowDragRegistryProvider>
							</TableProvider>
						</GridComponentsProvider>
					</CellTypesProvider>
				</GridFactoryDefaultsProvider>
			</DndAdapterProvider>
		</DndBundleProvider>
	)
}

/**
 * Uncontrolled path: builds the table with `useDataGrid` from inline config, then renders
 * the shared core. `cellTypes` (if any) flows through `config` into the table, so it is not
 * forwarded a second time.
 */
function DataGridUncontrolled<TFeatures extends TableFeatures, TRow extends object>({
	components,
	children,
	...config
}: DataGridUncontrolledProps<TFeatures, TRow>) {
	const table = useDataGrid<TFeatures, TRow>(config)
	return (
		<DataGridControlled
			table={table}
			{...(components !== undefined ? { components } : {})}
		>
			{children}
		</DataGridControlled>
	)
}

/**
 * Root compound component for the data grid. Dispatches to the controlled core
 * (when a `table` instance is supplied) or the uncontrolled wrapper (when inline
 * `useDataGrid` config is supplied). Holds no state of its own beyond a dev-only
 * mode-switch guard.
 *
 * @example — controlled, default layout
 * <DataGrid table={table} />
 *
 * @example — uncontrolled, no hook
 * <DataGrid data={data} columns={columns} sorting />
 *
 * @example — custom layout via compound pattern (either mode)
 * <DataGrid data={data} columns={columns}>
 *   <DataGrid.Toolbar />
 *   <DataGrid.Table />
 *   <DataGrid.Pagination />
 * </DataGrid>
 */
export function DataGridRoot<TFeatures extends TableFeatures, TRow extends object>(
	props: DataGridProps<TFeatures, TRow>,
) {
	const isControlled = props.table != null

	// Dev-only: flipping a mounted grid between controlled and uncontrolled
	// remounts the internal subtree and silently resets grid state. Warn so the
	// mistake is visible in development; stripped from production builds.
	const wasControlledRef = useRef(isControlled)
	if (IS_DEV && wasControlledRef.current !== isControlled) {
		const describe = (controlled: boolean) => (controlled ? 'controlled (table prop)' : 'uncontrolled (inline config)')
		console.error(
			`<DataGrid> switched from ${describe(wasControlledRef.current)} to ${describe(isControlled)}. ` +
				'Pick one mode for the lifetime of the component — switching remounts the grid and resets its state.',
		)
	}
	wasControlledRef.current = isControlled

	if (props.table == null) {
		/*
		 * The one place this component asserts what its own runtime check just established.
		 *
		 * `DataGridProps` is a union of two **intersections**, and `table` is `never` on one side
		 * rather than a literal, so TypeScript will not use it as a discriminant: `props` stays a
		 * union past the check above, and the rest-spread below then fails on `data`, `columns`
		 * and `features` at once — the three members the controlled half does not have. Tried and
		 * rejected before writing this: narrowing on `!= null` instead, and spelling the marker
		 * `table?: undefined` rather than `table?: never`. Neither narrows an intersection.
		 *
		 * The assertion is safe for the reason the check is: the controlled member declares
		 * `table` **required and non-nullable**, so `props.table == null` is reachable only for
		 * the uncontrolled one.
		 */
		const { table: _table, ...rest } = props as DataGridUncontrolledProps<TFeatures, TRow>
		return <DataGridUncontrolled<TFeatures, TRow> {...rest} />
	}

	const { table, components, cellTypes, children } = props
	return (
		<DataGridControlled
			table={table}
			{...(components !== undefined ? { components } : {})}
			{...(cellTypes !== undefined ? { cellTypes } : {})}
		>
			{children}
		</DataGridControlled>
	)
}

// ── Attach sub-components as static properties ────────────────────────────

/**
 * The compound namespace hung off `DataGrid`.
 *
 * Named and exported so a *bound* grid — one `createDataGrid` rebuilt around a factory-level
 * feature set — can wear the identical namespace beside its own call signature, instead of
 * restating thirty members that would then drift.
 */
export type DataGridStatics = {
	Toolbar: typeof Toolbar
	Table: typeof DataGridTable
	Footer: typeof Footer
	FooterRow: typeof DataGridFooterRow
	FooterCell: typeof DataGridFooterCell
	Header: typeof Header
	HeaderRow: typeof DataGridHeaderRow
	HeaderCell: typeof DataGridHeaderCell
	HeaderMain: typeof HeaderMain
	HeaderExtras: typeof HeaderExtras
	Body: typeof Body
	Row: typeof DataGridRow
	Cell: typeof DataGridCell
	Pagination: typeof Pagination
	PageSizer: typeof PageSizer
	BottomBar: typeof BottomBar
	ColumnFilter: typeof ColumnFilter
	ActionBar: typeof ActionBar
	CreateTrigger: typeof CreateTrigger
	VisibilityTrigger: typeof VisibilityTrigger
	VisibilityItem: typeof VisibilityItem
	SortMenuTrigger: typeof SortMenuTrigger
	GlobalFilterInput: typeof GlobalFilterInput
	ActiveFiltersBar: typeof ActiveFiltersBar
	GroupByBar: typeof GroupByBar
	ClearFiltersButton: typeof ClearFiltersButton
	FilterPanel: typeof FilterPanel
	CreatingModal: typeof CreatingModal
	EditingModal: typeof EditingModal
	LoadingBody: typeof LoadingBody
	EmptyStateRow: typeof EmptyStateRow
	NoResultsRow: typeof NoResultsRow
	ColumnDragHandle: typeof ColumnDragHandle
	RowDragHandle: typeof RowDragHandle
}

type DataGridType = typeof DataGridRoot & DataGridStatics

/**
 * The compound `DataGrid`: the root's call signature with {@link DataGridStatics} hung off it.
 *
 * **One annotated `Object.assign` with a flat object literal, deliberately — do not spread into
 * it, and do not go back to `DataGrid.Toolbar = Toolbar` assignments.** The shape is what lets a
 * bundler drop the whole namespace when a consumer imports something else from this package's
 * root, and all three halves of it are load-bearing.
 *
 * It was 29 top-level `DataGrid.X = …` statements, and **esbuild** cannot drop a top-level
 * assignment: it kept every one, and each one anchored its component and everything that
 * component reached. So any partial import of `./index` paid for nearly the whole surface. As one
 * annotated call, a hook import costs a fraction of it, while `{ DataGrid }` is unchanged — which
 * is correct and is the point: this name *is* everything, and what got cheaper is the import that
 * never asked for it. `apps/docs/test/tree-shaking.test.ts` holds that, so a regression fails
 * there rather than in prose that goes stale.
 *
 * **Read "a bundler" as esbuild, and only esbuild — the other two were probed and neither was
 * ever affected.** Rollup dropped the namespace on the assignment form already, and so did
 * Turbopack through a real `next build` of a one-page app. Both measure identically after this
 * change. Webpack was not probed — Next 16 no longer ships a runnable terser plugin and the
 * package is not otherwise installed here. So this fix is worth real bytes to a consumer bundling
 * with esbuild and nothing to one on Rollup, Vite's production build or Next; it cannot cost any
 * of them anything, which is why it shipped anyway.
 *
 * The annotation works here and does **not** work for `allDataGridFeatures` one package over —
 * the two are opposite sides of one line, which AGENTS.md states with the probe behind it:
 * esbuild drops an annotated call whose argument is a plain object and keeps the identical call
 * when the object **spreads**, because a spread may run getters. Hence the flat literal. Adding a
 * `...someGroup` to it silently restores the defect and costs the comment bytes on top.
 *
 * A getter namespace (`Object.defineProperties(DataGrid, { Toolbar: { get: () => Toolbar } … })`)
 * was measured as the cheaper-looking alternative and came out worse than doing nothing. A
 * top-level call that names the component anchors it whatever form the call takes.
 */
export const DataGrid: DataGridType = /* @__PURE__ */ Object.assign(DataGridRoot, {
	Toolbar,
	Table: DataGridTable,
	Footer,
	FooterRow: DataGridFooterRow,
	FooterCell: DataGridFooterCell,
	Header,
	HeaderRow: DataGridHeaderRow,
	HeaderCell: DataGridHeaderCell,
	HeaderMain,
	HeaderExtras,
	Body,
	Row: DataGridRow,
	Cell: DataGridCell,
	Pagination,
	PageSizer,
	BottomBar,
	ColumnFilter,
	ActionBar,
	CreateTrigger,
	VisibilityTrigger,
	VisibilityItem,
	SortMenuTrigger,
	GlobalFilterInput,
	ActiveFiltersBar,
	GroupByBar,
	ClearFiltersButton,
	FilterPanel,
	CreatingModal,
	EditingModal,
	LoadingBody,
	EmptyStateRow,
	NoResultsRow,
	ColumnDragHandle,
	RowDragHandle,
})
