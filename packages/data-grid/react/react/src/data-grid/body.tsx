import { Fragment } from 'react'

import { useGridComponents } from '../components-context'
import { EXPAND_KEY, FALLBACKS_KEY } from '../use-data-grid'

import { CreatingRow } from './creating-row'
import { EmptyStateRow } from './empty-state-row'
import { ExpandedRow } from './expanded-row'
import { LoadMoreFooter } from './load-more-footer'
import { LoadingBody } from './loading-body'
import { NoResultsRow } from './no-results-row'
import { RefetchOverlayHost } from './refetch-overlay'
import { DataGridRow } from './row'
import { useDataGridInstance, useDataGridStore } from './table-context'
import { VirtualBody } from './virtual-body'
import { useVirtualContext } from './virtual-context'

import type { ExpandedRowProps , FallbacksConfig } from '../use-data-grid'
import type { ComponentType, CSSProperties } from 'react'

/**
 * CSS custom property used to compute sticky offsets for pinned rows.
 * Override with `--dg-row-height` on the table container to match your row height.
 * Default: 49px (matches shadcn table row height).
 */
const ROW_HEIGHT_CSS = 'var(--dg-row-height, 49px)'

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
export function Body() {
	const { rowVirtualizer } = useVirtualContext()
	const instance = useDataGridInstance()
	const table = instance.table
	const { Tbody } = useGridComponents()

	// Narrow subscriptions: each returns a referentially stable slice. Body
	// re-renders only when one of these slices actually changes. Editing,
	// columnVisibility, columnSizing, columnPinning, rowSelection updates do
	// NOT touch any of these → no Body re-render.
	const isPending = useDataGridStore((s) => s.loading.isPending)
	const isFetching = useDataGridStore((s) => s.loading.isFetching)
	const isCreatingOpen = useDataGridStore((s) => s.creating.isOpen)
	// Slices that affect getRowModel() / getTopRows() / getBottomRows() output:
	useDataGridStore((s) => s.sorting)
	useDataGridStore((s) => s.columnFilters)
	useDataGridStore<unknown>((s) => s.globalFilter)
	useDataGridStore((s) => s.pagination)
	useDataGridStore((s) => s.expanded)
	useDataGridStore((s) => s.rowPinning)

	if (rowVirtualizer) return <VirtualBody />

	const fallbacks = (table as unknown as Record<symbol, unknown>)[FALLBACKS_KEY] as FallbacksConfig | undefined
	const expandConfig = (table as unknown as Record<symbol, unknown>)[EXPAND_KEY] as
		| { renderExpanded?: ComponentType<ExpandedRowProps<object>> }
		| undefined
	const renderExpanded = expandConfig?.renderExpanded

	if (isPending && fallbacks?.loading !== false) {
		return <LoadingBody />
	}

	const creatingConfig = table.options.creating
	const creatingMode = creatingConfig?.mode ?? 'row'
	const showCreatingRow =
		creatingConfig !== undefined && (creatingMode === 'pin-row' || (creatingMode === 'row' && isCreatingOpen))

	const hasPinning = Boolean(table.options.enableRowPinning)
	const topRows = hasPinning ? table.getTopRows() : []
	const centerRows = hasPinning ? table.getCenterRows() : table.getRowModel().rows
	const bottomRows = hasPinning ? table.getBottomRows() : []
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
						style={{ '--dg-row-pin-offset': `calc(${String(index)} * ${ROW_HEIGHT_CSS})` } as CSSProperties}
					/>
					{renderExpanded && row.getIsExpanded() && <ExpandedRow row={row} />}
				</Fragment>
			))}
			{centerRows.map((row) => (
				<Fragment key={row.id}>
					<DataGridRow row={row} />
					{renderExpanded && row.getIsExpanded() && <ExpandedRow row={row} />}
				</Fragment>
			))}
			{bottomRows.map((row, index) => (
				<Fragment key={row.id}>
					<DataGridRow
						row={row}
						data-pinned='bottom'
						style={{ '--dg-row-pin-offset': `calc(${String(bottomRows.length - 1 - index)} * ${ROW_HEIGHT_CSS})` } as CSSProperties}
					/>
					{renderExpanded && row.getIsExpanded() && <ExpandedRow row={row} />}
				</Fragment>
			))}
			<LoadMoreFooter />
			{showRefetchOverlay && <RefetchOverlayHost columnCount={columnCount} />}
		</Tbody>
	)
}
