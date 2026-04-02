import { useGridComponents } from '../components-context'
import { getCommonPinStyles } from '../utils/pin-styles'

import { flexRender } from './flex-render'
import { useTableContext } from './table-context'

/**
 * Renders the table `<thead>` with all header groups.
 * - Clicking a sortable header toggles sort.
 * - If filtering is enabled on a column, renders a filter input below the header.
 */
export function Header() {
	const table = useTableContext()
	const { Thead, Tr, Th, Input } = useGridComponents()
	const hasFiltering = Boolean(table.options.getFilteredRowModel)

	return (
		<Thead data-slot='thead'>
			{table.getHeaderGroups().map((headerGroup) => (
				<Tr
					data-slot='tr'
					key={headerGroup.id}
				>
					{headerGroup.headers.map((header) => {
						const meta = header.column.columnDef.meta
						const canSort = header.column.getCanSort()
						const sortDir = header.column.getIsSorted()
						const pinStyles = getCommonPinStyles(header.column)

						return (
							<Th
								data-slot='th'
								key={header.id}
								colSpan={header.colSpan}
								style={pinStyles}
								onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
							>
								{header.isPlaceholder
									? null
									: flexRender(
											header.column.columnDef.header,
											header.getContext() as unknown as Record<string, unknown>,
										)}
								{canSort && <span aria-hidden>{sortDir === 'asc' ? ' ▲' : sortDir === 'desc' ? ' ▼' : ' ⇅'}</span>}
								{hasFiltering && meta?.filtering !== false && !meta?.isSystemColumn && header.column.getCanFilter() && (
									<div>
										<Input
											placeholder={`Filter ${header.column.id}…`}
											value={(header.column.getFilterValue() as string | undefined) ?? ''}
											onChange={(e) => {
												header.column.setFilterValue(e.target.value)
											}}
											onClick={(e) => {
												e.stopPropagation()
											}}
										/>
									</div>
								)}
							</Th>
						)
					})}
				</Tr>
			))}
		</Thead>
	)
}
