import { Fragment } from 'react'

import { useGridComponents } from '../components-context'

import { CreatingRow } from './creating-row'
import { EmptyStateRow } from './empty-state-row'
import { ExpandedRow } from './expanded-row'
import { LoadMoreFooter } from './load-more-footer'
import { LoadingBody } from './loading-body'
import { NoResultsRow } from './no-results-row'
import { RefetchOverlayHost } from './refetch-overlay'
import { DataGridRow } from './row'
import { useDataGridTable, useDataGridState } from './table-context'
import { usePinnedRowOffsets } from './use-pinned-row-offsets'
import { VirtualBody } from './virtual-body'
import { useVirtualContext } from './virtual-context'

import type { ExpandedRowProps } from '../use-data-grid'
import type { Row, Table } from '@tanstack/table-core'
import type { ComponentType, ReactNode } from 'react'

/** What a `<DataGrid.Body>` render function receives. */
export type DataGridBodyRenderArgs = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table: Table<any>
	/** The rows of the current row model, already sorted / filtered / paginated. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	rows: Row<any>[]
}

export type DataGridBodyProps = {
	/**
	 * Custom body content, rendered inside the kit's `<Tbody>`.
	 *
	 * Omit it for the built-in body — pinned rows, the creating row, expanded panels, the
	 * loading / empty / no-results fallbacks, the infinite-scroll footer and the refetch
	 * overlay. Supplying `children` opts out of **all** of that in exchange for full control;
	 * compose the rows yourself from `<DataGrid.Row>` (or anything else).
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.Body>
	 *   {({ rows }) => rows.map((row) => <DataGrid.Row key={row.id} row={row} />)}
	 * </DataGrid.Body>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridBodyRenderArgs) => ReactNode)
}

/**
 * Renders the table `<tbody>`.
 *
 * Subscribes only to the slices that actually change row composition or
 * top-level branching (loading skeleton, creating row, pinned rows). Editing,
 * column visibility, column sizing, row selection mutations do NOT re-render
 * Body — those are handled by leaf components with their own narrow
 * subscriptions.
 *
 * Pinned rows (top / bottom) get `data-pinned="top" | "bottom"` plus a
 * `--dg-row-pin-offset` CSS variable carrying the computed offset; the
 * structural stylesheet shipped with this package applies the actual
 * `position: sticky` + offset.
 */
export function Body({ children }: DataGridBodyProps = {}) {
	const { rowVirtualizer } = useVirtualContext()
	const table = useDataGridTable()
	const { Tbody } = useGridComponents().core

	// Narrow subscriptions: each returns a referentially stable slice. Body
	// re-renders only when one of these slices actually changes. Editing,
	// columnVisibility, columnSizing, columnPinning, rowSelection updates do
	// NOT touch any of these → no Body re-render.
	const isPending = useDataGridState((s) => s.loading.isPending)
	const isFetching = useDataGridState((s) => s.loading.isFetching)
	const isCreatingOpen = useDataGridState((s) => s.creating.isOpen)
	// Slices that affect getRowModel() / getTopRows() / getBottomRows() output:
	useDataGridState((s) => s.sorting)
	useDataGridState((s) => s.columnFilters)
	useDataGridState<unknown>((s) => s.globalFilter)
	useDataGridState((s) => s.pagination)
	useDataGridState((s) => s.expanded)
	useDataGridState((s) => s.rowPinning)

	// Read before the early returns below: the offset hooks must run on every render.
	const hasPinning = Boolean(table.options.enableRowPinning)
	const topRows = hasPinning ? table.getTopRows() : []
	const bottomRows = hasPinning ? table.getBottomRows() : []
	const registerTopRow = usePinnedRowOffsets(
		'top',
		topRows.map((row) => row.id),
	)
	const registerBottomRow = usePinnedRowOffsets(
		'bottom',
		bottomRows.map((row) => row.id),
	)

	// Custom body: the consumer owns the whole `<tbody>`. Checked before every built-in
	// branch (virtualization, fallbacks, pinned rows) — those all compose rows, which is
	// precisely the job being taken over.
	if (children !== undefined) {
		return (
			<Tbody data-slot='tbody'>
				{typeof children === 'function' ? children({ table, rows: table.getRowModel().rows }) : children}
			</Tbody>
		)
	}

	if (rowVirtualizer) return <VirtualBody />

	const fallbacks = table.grid.fallbacks
	const expandedComponent = table.grid.expanding.component as ComponentType<ExpandedRowProps<object>> | undefined

	if (isPending && fallbacks?.loading !== false) {
		return <LoadingBody />
	}

	const creatingConfig = table.options.creating
	const creatingMode = creatingConfig?.mode ?? 'row'
	const showCreatingRow =
		creatingConfig !== undefined && (creatingMode === 'pin-row' || (creatingMode === 'row' && isCreatingOpen))

	const centerRows = hasPinning ? table.getCenterRows() : table.getRowModel().rows
	const allRows = table.getRowModel().rows
	const rawDataLength = (table.options.data as unknown[]).length

	if (!showCreatingRow && allRows.length === 0) {
		if (rawDataLength === 0 && fallbacks?.empty !== false) {
			return <EmptyStateRow />
		}
		if (rawDataLength > 0 && fallbacks?.noResults !== false) {
			return <NoResultsRow />
		}
	}

	const columnCount = table.getVisibleLeafColumns().length
	const showRefetchOverlay = isFetching && !isPending && allRows.length > 0

	return (
		<Tbody data-slot='tbody'>
			{showCreatingRow && <CreatingRow />}
			{topRows.map((row, index) => (
				<Fragment key={row.id}>
					<DataGridRow
						row={row}
						data-pinned='top'
						ref={registerTopRow(index)}
					/>
					{expandedComponent && row.getIsExpanded() && <ExpandedRow row={row} />}
				</Fragment>
			))}
			{centerRows.map((row) => (
				<Fragment key={row.id}>
					<DataGridRow row={row} />
					{expandedComponent && row.getIsExpanded() && <ExpandedRow row={row} />}
				</Fragment>
			))}
			{bottomRows.map((row, index) => (
				<Fragment key={row.id}>
					<DataGridRow
						row={row}
						data-pinned='bottom'
						ref={registerBottomRow(index)}
					/>
					{expandedComponent && row.getIsExpanded() && <ExpandedRow row={row} />}
				</Fragment>
			))}
			<LoadMoreFooter />
			{showRefetchOverlay && <RefetchOverlayHost columnCount={columnCount} />}
		</Tbody>
	)
}
