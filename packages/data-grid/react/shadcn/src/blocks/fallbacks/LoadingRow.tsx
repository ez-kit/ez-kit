import { Skeleton } from '@grid-shadcn/components/ui/skeleton'
import { TableCell, TableRow } from '@grid-shadcn/components/ui/table'

import type { LoadingRowProps } from '@ez-kit/data-grid-react'

export function LoadingRow({ columnCount }: LoadingRowProps) {
	return (
		<TableRow>
			{Array.from({ length: columnCount }, (_, i) => (
				<TableCell key={i}>
					<Skeleton className='h-4 w-full' />
				</TableCell>
			))}
		</TableRow>
	)
}
