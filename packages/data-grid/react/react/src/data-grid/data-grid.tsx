import { CreatingMode, EditingMode, featureConfig, isFeatureEnabled } from '@ez-kit/data-grid-core'
import { useRef } from 'react'

import { CellTypesProvider, mergeCellTypes } from '../cell-types-context'
import { GridComponentsProvider, useGridComponents } from '../components-context'
import { GridFactoryDefaultsProvider } from '../data-grid-options-context'
import { useDataGrid, type UseDataGridConfig } from '../use-data-grid'

import { ActiveFiltersBar } from './active-filters-bar'
import { Body } from './body'
import { BottomBar } from './bottom-bar'
import { DataGridCell } from './cell'
import { ClearFiltersButton } from './clear-filters-button'
import { ColumnFilter } from './column-filter'
import { ComponentGuard } from './component-guard'
import { CreateTrigger } from './create-trigger'
import { CreatingModal } from './creating-modal'
import { DraftBar } from './draft-bar'
import { EditingModal } from './editing-modal'
import { EmptyStateRow } from './empty-state-row'
import { FilterPanel } from './filter-panel'
import { Footer } from './footer'
import { DataGridFooterCell } from './footer-cell'
import { DataGridFooterRow } from './footer-row'
import { GlobalFilterInput } from './global-filter-input'
import { Header } from './header'
import { DataGridHeaderCell } from './header-cell'
import { DataGridHeaderRow } from './header-row'
import { LoadingBody } from './loading-body'
import { NoResultsRow } from './no-results-row'
import { PageSizer } from './page-sizer'
import { Pagination } from './pagination'
import { DataGridRow } from './row'
import { SelectionBar, buildSelectionBarArgs } from './selection-bar'
import { SortMenuTrigger } from './sort-menu-trigger'
import { DataGridTable } from './table'
import { TableProvider, useDataGridTable, useDataGridState } from './table-context'
import { Toolbar } from './toolbar'
import { VisibilityTrigger } from './visibility-trigger'

import type { CellTypeRegistry } from '../cell-types-context'
import type { GridComponents } from '../contract'
import type { DataTable, ErasedRow, GridFeatures } from '../types'
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
		// The factory option layer a bound `<DataGrid>` publishes has done its job by the time we
		// get here — this table is built. Close it off so it stops at the grid it configures:
		// without this, a nested `<DataGrid data columns />` rendered among `children` would
		// silently inherit the outer kit's defaults instead of standing on its own.
		<GridFactoryDefaultsProvider defaults={undefined}>
			<CellTypesProvider cellTypes={resolvedCellTypes}>
				<GridComponentsProvider {...(components !== undefined ? { components } : {})}>
					<TableProvider table={table}>
						{IS_DEV && <ComponentGuard />}
						<GridRoot>
							<GridBody>{children}</GridBody>
							{writeOptions.creating?.mode === CreatingMode.Modal && <CreatingModal />}
							{writeOptions.editing?.mode === EditingMode.Modal && <EditingModal />}
							<ConfirmDialogRenderer />
						</GridRoot>
					</TableProvider>
				</GridComponentsProvider>
			</CellTypesProvider>
		</GridFactoryDefaultsProvider>
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
function DataGridRoot<TFeatures extends TableFeatures, TRow extends object>(props: DataGridProps<TFeatures, TRow>) {
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
 * restating twenty-eight members that would then drift.
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
	Body: typeof Body
	Row: typeof DataGridRow
	Cell: typeof DataGridCell
	Pagination: typeof Pagination
	PageSizer: typeof PageSizer
	BottomBar: typeof BottomBar
	ColumnFilter: typeof ColumnFilter
	SelectionBar: typeof SelectionBar
	DraftBar: typeof DraftBar
	CreateTrigger: typeof CreateTrigger
	VisibilityTrigger: typeof VisibilityTrigger
	SortMenuTrigger: typeof SortMenuTrigger
	GlobalFilterInput: typeof GlobalFilterInput
	ActiveFiltersBar: typeof ActiveFiltersBar
	ClearFiltersButton: typeof ClearFiltersButton
	FilterPanel: typeof FilterPanel
	CreatingModal: typeof CreatingModal
	EditingModal: typeof EditingModal
	LoadingBody: typeof LoadingBody
	EmptyStateRow: typeof EmptyStateRow
	NoResultsRow: typeof NoResultsRow
}

type DataGridType = typeof DataGridRoot & DataGridStatics

export const DataGrid = DataGridRoot as DataGridType
DataGrid.Toolbar = Toolbar
DataGrid.Table = DataGridTable
DataGrid.Footer = Footer
DataGrid.FooterRow = DataGridFooterRow
DataGrid.FooterCell = DataGridFooterCell
DataGrid.Header = Header
DataGrid.HeaderRow = DataGridHeaderRow
DataGrid.HeaderCell = DataGridHeaderCell
DataGrid.Body = Body
DataGrid.Row = DataGridRow
DataGrid.Cell = DataGridCell
DataGrid.Pagination = Pagination
DataGrid.PageSizer = PageSizer
DataGrid.BottomBar = BottomBar
DataGrid.ColumnFilter = ColumnFilter
DataGrid.SelectionBar = SelectionBar
DataGrid.DraftBar = DraftBar
DataGrid.CreateTrigger = CreateTrigger
DataGrid.VisibilityTrigger = VisibilityTrigger
DataGrid.SortMenuTrigger = SortMenuTrigger
DataGrid.GlobalFilterInput = GlobalFilterInput
DataGrid.ActiveFiltersBar = ActiveFiltersBar
DataGrid.ClearFiltersButton = ClearFiltersButton
DataGrid.FilterPanel = FilterPanel
DataGrid.CreatingModal = CreatingModal
DataGrid.EditingModal = EditingModal
DataGrid.LoadingBody = LoadingBody
DataGrid.EmptyStateRow = EmptyStateRow
DataGrid.NoResultsRow = NoResultsRow
