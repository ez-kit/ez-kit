import { useGridComponents } from '../components-context'
import { FALLBACKS_KEY } from '../use-data-grid'

import { CreatingRow } from './creating-row'
import { EmptyStateRow } from './empty-state-row'
import { LoadingBody } from './loading-body'
import { NoResultsRow } from './no-results-row'
import { DataGridRow } from './row'
import { useTableContext } from './table-context'
import { VirtualBody } from './virtual-body'
import { useVirtualContext } from './virtual-context'

import type { FallbacksConfig } from '../use-data-grid'

/**
 * CSS custom property used to compute sticky offsets for pinned rows.
 * Override with `--dg-row-height` on the table container to match your row height.
 * Default: 49px (matches shadcn table row height).
 */
const ROW_HEIGHT_CSS = 'var(--dg-row-height, 49px)'

/**
 * Renders the table `<tbody>`.
 * When `loading: true` and `fallbacks.loading` is not false, renders skeleton rows.
 * When data is empty, renders empty state or no-results state based on filter context.
 * When `creating.mode` is `'row'` and creating is active, prepends a creating row.
 * When `creating.mode` is `'pin-row'`, always shows the creating row at the top.
 * When `pinning` is enabled, renders top-pinned / center / bottom-pinned row sections
 * with CSS sticky positioning.
 */
export function Body() {
	const { rowVirtualizer } = useVirtualContext()
	const table = useTableContext()
	const { Tbody } = useGridComponents()

	if (rowVirtualizer) return <VirtualBody />

	const fallbacks = (table as unknown as Record<symbol, unknown>)[FALLBACKS_KEY] as FallbacksConfig | undefined

	if (table.getIsLoading() && fallbacks?.loading !== false) {
		return <LoadingBody />
	}

	const creatingConfig = table.options.creating
	const creatingMode = creatingConfig?.mode ?? 'row'
	const isCreating = table.getCreatingState().isCreating
	const showCreatingRow =
		creatingConfig !== undefined && (creatingMode === 'pin-row' || (creatingMode === 'row' && isCreating))

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

	return (
		<Tbody>
			{showCreatingRow && <CreatingRow />}
			{topRows.map((row, index) => (
				<DataGridRow
					key={row.id}
					row={row}
					data-pinned='top'
					style={{
						position: 'sticky',
						top: `calc(${String(index)} * ${ROW_HEIGHT_CSS})`,
						zIndex: 2,
					}}
				/>
			))}
			{centerRows.map((row) => (
				<DataGridRow
					key={row.id}
					row={row}
				/>
			))}
			{bottomRows.map((row, index) => (
				<DataGridRow
					key={row.id}
					row={row}
					data-pinned='bottom'
					style={{
						position: 'sticky',
						bottom: `calc(${String(bottomRows.length - 1 - index)} * ${ROW_HEIGHT_CSS})`,
						zIndex: 2,
					}}
				/>
			))}
		</Tbody>
	)
}
