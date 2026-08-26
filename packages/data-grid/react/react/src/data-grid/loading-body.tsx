import { useGridComponents } from '../components-context'

import { flexRender } from './flex-render'
import { useDataGridState, useDataGridTable } from './table-context'

const DEFAULT_LOADING_ROWS = 5

export function LoadingBody() {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnVisibility)
	const gridComponents = useGridComponents()
	const { Tbody, Tr, Td } = gridComponents.core
	const { LoadingRow } = gridComponents['fallback-states']

	const fallbacks = table.grid.fallbacks
	const loadingConfig = fallbacks?.loading

	const columnCount = table.getVisibleLeafColumns().length
	const customContent = typeof loadingConfig === 'object' ? loadingConfig.content : undefined

	if (customContent !== undefined) {
		return (
			<Tbody data-slot='tbody'>
				<Tr data-slot='tr'>
					<Td
						data-slot='loading-body-cell'
						colSpan={columnCount}
					>
						{flexRender(customContent, { columnCount })}
					</Td>
				</Tr>
			</Tbody>
		)
	}

	return (
		<Tbody data-slot='tbody'>
			{Array.from({ length: DEFAULT_LOADING_ROWS }, (_, i) => (
				<LoadingRow
					key={i}
					columnCount={columnCount}
				/>
			))}
		</Tbody>
	)
}
