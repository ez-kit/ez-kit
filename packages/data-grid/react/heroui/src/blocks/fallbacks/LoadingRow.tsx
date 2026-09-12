import { Skeleton, Table } from '@heroui/react'

import type { LoadingRowProps } from '@ez-kit/data-grid-react'

/**
 * React Aria builds the table body from a collection, so only its own `Row` / `Cell`
 * nodes are picked up — a bare `<tr>` here is dropped from the collection entirely
 * (the skeleton never rendered) and React logs an invalid-nesting hydration error.
 *
 * It is a row of the table but not a row of the data, so it carries `data-slot="tr"` like every
 * row in the body and no `data-row-id`, plus `data-loading-row` to mark what it is. The kit draws
 * this row itself, so the kit is what stamps that contract onto it.
 */
export function LoadingRow({ columnCount }: LoadingRowProps) {
	return (
		<Table.Row
			data-slot='tr'
			data-loading-row='true'
		>
			{Array.from({ length: columnCount }, (_, i) => (
				<Table.Cell
					key={i}
					data-slot='td'
					className='py-3 px-4'
				>
					<Skeleton className='h-4 w-full rounded' />
				</Table.Cell>
			))}
		</Table.Row>
	)
}
