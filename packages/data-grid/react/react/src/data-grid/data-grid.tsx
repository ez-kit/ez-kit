import { featureConfig } from '@ez-kit/data-grid-core'
import { useRef } from 'react'

import { CellTypesProvider, mergeCellTypes } from '../cell-types-context'
import { GridComponentsProvider, useGridComponents } from '../components-context'
import { FilterChipsPosition } from '../types'
import { ActionBarVariant, useDataGrid, type UseDataGridConfig } from '../use-data-grid'

import { resolveActionBarVariant } from './action-bar-variant'
import { ActiveFiltersBar } from './active-filters-bar'
import { Body } from './body'
import { DataGridCell } from './cell'
import { ClearFiltersButton } from './clear-filters-button'
import { ComponentGuard } from './component-guard'
import { CreateTrigger } from './create-trigger'
import { CreatingModal } from './creating-modal'
import { DraftBar } from './draft-bar'
import { EditingModal } from './editing-modal'
import { EmptyStateRow } from './empty-state-row'
import { FilterPanel } from './filter-panel'
import { Footer } from './footer'
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
import { SortTrigger } from './sort-trigger'
import { DataGridTable } from './table'
import { TableContext, useDataGridTable, useDataGridState } from './table-context'
import { Toolbar } from './toolbar'
import { VisibilityTrigger } from './visibility-trigger'

import type { CellTypeRegistry } from '../cell-types-context'
import type { GridComponents } from '../contract'
import type { BulkConfirmationConfig, ConfirmationConfig, DataTable } from '@ez-kit/data-grid-core'
import type { Row, Table } from '@tanstack/table-core'
import type { ReactNode } from 'react'

const IS_DEV = process.env.NODE_ENV !== 'production'

type DataGridSharedProps = {
	/** Local component overrides — merged with global GridComponentsProvider. */
	components?: GridComponents
	children?: ReactNode
}

/**
 * Controlled usage: the caller owns the table built by `useDataGrid` and passes it in.
 * Use this when several components need the same table, or to read its state from outside
 * the grid with `useDataGridSelector`.
 */
export type DataGridControlledProps<TRow extends object> = DataGridSharedProps & {
	/** Instance returned by `useDataGrid`. */
	table: DataTable<TRow>
	/** Custom cell type renderers. Merged with types from `useDataGrid`. */
	cellTypes?: CellTypeRegistry
}

/**
 * Uncontrolled usage: pass the same config `useDataGrid` accepts directly and
 * the grid runs the hook for you — no separate `useDataGrid` call needed.
 */
export type DataGridUncontrolledProps<TRow extends object> = DataGridSharedProps &
	UseDataGridConfig<TRow> & {
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
export type DataGridProps<TRow extends object> = DataGridControlledProps<TRow> | DataGridUncontrolledProps<TRow>

const DEFAULT_CONFIRM_TITLE = 'Are you sure?'
const DEFAULT_CONFIRM_DESCRIPTION = 'This action cannot be undone.'
const DEFAULT_BULK_CONFIRM_TITLE = 'Delete selected rows?'
const ROW_NOUN_SINGULAR = 'row'
const ROW_NOUN_PLURAL = 'rows'

function defaultBulkConfirmDescription(count: number): string {
	const noun = count === 1 ? ROW_NOUN_SINGULAR : ROW_NOUN_PLURAL
	return `Delete ${String(count)} ${noun}? ${DEFAULT_CONFIRM_DESCRIPTION}`
}

function resolveConfirmationText(
	options: ConfirmationConfig,
	row: Row<unknown> | undefined,
): { title: string; description: string } {
	const title = options.title ?? DEFAULT_CONFIRM_TITLE
	const desc = options.description
	let description: string
	if (typeof desc === 'function') {
		description = row ? desc(row) : DEFAULT_CONFIRM_DESCRIPTION
	} else {
		description = desc ?? DEFAULT_CONFIRM_DESCRIPTION
	}
	return { title, description }
}

/**
 * Bulk confirmation text. The `description` function is handed the whole selection rather than
 * one row — see {@link BulkConfirmationConfig} — and falls back to count-aware default copy.
 */
function resolveBulkConfirmationText(
	options: BulkConfirmationConfig,
	rows: Row<unknown>[],
): { title: string; description: string } {
	const title = options.title ?? DEFAULT_BULK_CONFIRM_TITLE
	const desc = options.description
	const description = typeof desc === 'function' ? desc(rows) : (desc ?? defaultBulkConfirmDescription(rows.length))
	return { title, description }
}

/** The bulk-delete prompt's config, or `undefined` when bulk delete asks for no prompt. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bulkConfirmationOptions(table: Table<any>): BulkConfirmationConfig | undefined {
	const confirmation = featureConfig(table.options.deleting?.bulk)?.confirmation
	if (!confirmation) return undefined
	return confirmation === true ? {} : confirmation
}

/** Whether either the per-row or the bulk confirmation dialog is configured. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasConfirmDialog(table: Table<any>): boolean {
	return Boolean(table.options.deleting?.confirmation) || bulkConfirmationOptions(table) !== undefined
}

function ConfirmDialogRenderer() {
	const table = useDataGridTable()
	const { ConfirmDialog } = useGridComponents().editing
	// Narrow: re-render only when a pending delete target changes. Other
	// state mutations (editing, sorting, etc.) leave these stable.
	const pendingId = useDataGridState((s) => s.pendingDeleteRowId)
	const pendingBulk = useDataGridState((s) => s.pendingBulkDelete)

	// A staged bulk delete takes precedence: it is the gesture the user just made. Core owns
	// both the staging and the run, so this only renders the prompt and reports the answer.
	const bulkOptions = bulkConfirmationOptions(table)
	if (pendingBulk && bulkOptions) {
		const { selectedRows } = buildSelectionBarArgs(table)
		const { title, description } = resolveBulkConfirmationText(bulkOptions, selectedRows)
		return (
			<ConfirmDialog
				open
				title={title}
				description={description}
				onConfirm={() => void table.deleting.bulk.confirm()}
				onCancel={() => {
					table.deleting.bulk.cancel()
				}}
			/>
		)
	}

	const confirmation = table.options.deleting?.confirmation

	if (!confirmation) return null

	const options: ConfirmationConfig = confirmation === true ? {} : confirmation
	const pendingRow = pendingId !== null ? table.getRowModel().rows.find((r) => r.id === pendingId) : undefined
	const { title, description } =
		pendingId !== null ? resolveConfirmationText(options, pendingRow) : { title: '', description: '' }

	return (
		<ConfirmDialog
			open={pendingId !== null}
			title={title}
			description={description}
			onConfirm={() => void table.deleting.confirm()}
			onCancel={() => {
				table.deleting.cancel()
			}}
		/>
	)
}

function DefaultLayout() {
	// Reads only config refs, no state — so we use the table
	// without subscribing. Avoids cascading re-renders to Body / Table on
	// state mutations the layout doesn't actually depend on.
	const table = useDataGridTable()
	const variant = resolveActionBarVariant(table)

	const chipsConfig = table.grid.filtering.chips
	const chipsAbove = chipsConfig?.position === FilterChipsPosition.Above ? <ActiveFiltersBar /> : null
	const chipsBelow = chipsConfig?.position === FilterChipsPosition.Below ? <ActiveFiltersBar /> : null

	if (variant === ActionBarVariant.Inline) {
		return (
			<>
				<DraftBar />
				<SelectionBar />
				<Toolbar />
				{chipsAbove}
				<DataGridTable />
				{chipsBelow}
				<Pagination />
			</>
		)
	}

	return (
		<>
			<Toolbar />
			{chipsAbove}
			<DataGridTable />
			{chipsBelow}
			<Pagination />
			<DraftBar />
			<SelectionBar />
		</>
	)
}

/**
 * Shared core that mounts the provider tree around a ready table. Both the
 * controlled and uncontrolled paths funnel through here, so every compound
 * child (`DataGrid.Table`, etc.) sees the same `TableContext`.
 */
function DataGridControlled<TRow extends object>({
	table,
	components,
	cellTypes,
	children,
}: DataGridControlledProps<TRow>) {
	// The one guarantee lost by returning the table itself rather than a wrapper type only
	// `useDataGrid` could produce: a bare `createTable()` result now typechecks here. It has no
	// `table.grid`, so the first compound child that reads a resolved option would crash on a
	// property access. Say so instead.
	// `grid` is declared non-optional on `DataTable`, because every table the React layer
	// renders is meant to carry it — which is exactly the claim being checked here, so asking
	// the question at all needs a cast.
	const isPrepared = (table as { grid?: unknown }).grid !== undefined
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

	return (
		<CellTypesProvider types={resolvedCellTypes}>
			<GridComponentsProvider {...(components !== undefined ? { components } : {})}>
				<TableContext value={table}>
					{IS_DEV && <ComponentGuard />}
					{children ?? <DefaultLayout />}
					{table.options.creating?.mode === 'modal' && <CreatingModal />}
					{table.options.editing?.mode === 'modal' && <EditingModal />}
					{hasConfirmDialog(table) && <ConfirmDialogRenderer />}
				</TableContext>
			</GridComponentsProvider>
		</CellTypesProvider>
	)
}

/**
 * Uncontrolled path: builds the table with `useDataGrid` from inline config, then renders
 * the shared core. `cellTypes` (if any) flows through `config` into the table, so it is not
 * forwarded a second time.
 */
function DataGridUncontrolled<TRow extends object>({
	components,
	children,
	...config
}: DataGridUncontrolledProps<TRow>) {
	const table = useDataGrid<TRow>(config)
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
function DataGridRoot<TRow extends object>(props: DataGridProps<TRow>) {
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

	if (props.table != null) {
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

	// Strip a possibly-present `table: undefined` before handing config to the hook.
	const { table: _table, ...rest } = props
	return <DataGridUncontrolled<TRow> {...rest} />
}

// ── Attach sub-components as static properties ────────────────────────────

type DataGridType = typeof DataGridRoot & {
	Toolbar: typeof Toolbar
	Table: typeof DataGridTable
	Footer: typeof Footer
	Header: typeof Header
	HeaderRow: typeof DataGridHeaderRow
	HeaderCell: typeof DataGridHeaderCell
	Body: typeof Body
	Row: typeof DataGridRow
	Cell: typeof DataGridCell
	Pagination: typeof Pagination
	PageSizer: typeof PageSizer
	SelectionBar: typeof SelectionBar
	DraftBar: typeof DraftBar
	CreateTrigger: typeof CreateTrigger
	VisibilityTrigger: typeof VisibilityTrigger
	SortTrigger: typeof SortTrigger
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

export const DataGrid = DataGridRoot as DataGridType
DataGrid.Toolbar = Toolbar
DataGrid.Table = DataGridTable
DataGrid.Footer = Footer
DataGrid.Header = Header
DataGrid.HeaderRow = DataGridHeaderRow
DataGrid.HeaderCell = DataGridHeaderCell
DataGrid.Body = Body
DataGrid.Row = DataGridRow
DataGrid.Cell = DataGridCell
DataGrid.Pagination = Pagination
DataGrid.PageSizer = PageSizer
DataGrid.SelectionBar = SelectionBar
DataGrid.DraftBar = DraftBar
DataGrid.CreateTrigger = CreateTrigger
DataGrid.VisibilityTrigger = VisibilityTrigger
DataGrid.SortTrigger = SortTrigger
DataGrid.GlobalFilterInput = GlobalFilterInput
DataGrid.ActiveFiltersBar = ActiveFiltersBar
DataGrid.ClearFiltersButton = ClearFiltersButton
DataGrid.FilterPanel = FilterPanel
DataGrid.CreatingModal = CreatingModal
DataGrid.EditingModal = EditingModal
DataGrid.LoadingBody = LoadingBody
DataGrid.EmptyStateRow = EmptyStateRow
DataGrid.NoResultsRow = NoResultsRow
