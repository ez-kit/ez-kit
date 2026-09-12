import { Skeleton } from '@grid-shadcn/components/ui/skeleton'
import { TableCell, TableRow } from '@grid-shadcn/components/ui/table'

import type { LoadingRowProps } from '@ez-kit/data-grid-react'

/**
 * One skeleton row of the loading body.
 *
 * It is a row of the table but not a row of the data, so it carries `data-slot="tr"` — as every
 * row in the body does — and no `data-row-id`, which keeps it out of any `[data-row-id]` count.
 * `data-loading-row` marks it for what it is. The kit draws this row itself (the shared layer
 * hands it only a `columnCount`), so the kit is what stamps the contract onto it; without that
 * the kit's own default wins and the skeleton becomes the one row `[data-slot="tr"]` misses.
 */
export function LoadingRow({ columnCount }: LoadingRowProps) {
	return (
		<TableRow
			data-slot='tr'
			data-loading-row='true'
		>
			{Array.from({ length: columnCount }, (_, i) => (
				<TableCell
					key={i}
					data-slot='td'
				>
					<Skeleton className='h-4 w-full' />
				</TableCell>
			))}
		</TableRow>
	)
}
