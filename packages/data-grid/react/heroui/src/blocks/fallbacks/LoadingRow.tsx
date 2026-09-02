import { Skeleton, Table } from '@heroui/react'

import type { LoadingRowProps } from '@ez-kit/data-grid-react'

/**
 * React Aria builds the table body from a collection, so only its own `Row` / `Cell`
 * nodes are picked up — a bare `<tr>` here is dropped from the collection entirely
 * (the skeleton never rendered) and React logs an invalid-nesting hydration error.
 */
export function LoadingRow({ columnCount }: LoadingRowProps) {
	return (
		<Table.Row>
			{Array.from({ length: columnCount }, (_, i) => (
				<Table.Cell
					key={i}
					className='py-3 px-4'
				>
					<Skeleton className='h-4 w-full rounded' />
				</Table.Cell>
			))}
		</Table.Row>
	)
}
