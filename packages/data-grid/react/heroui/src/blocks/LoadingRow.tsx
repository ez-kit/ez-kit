import { Skeleton } from '@heroui/react'

import type { LoadingRowProps } from '@ez-kit/data-grid-react'

export function LoadingRow({ columnCount }: LoadingRowProps) {
	return (
		<tr>
			{Array.from({ length: columnCount }, (_, i) => (
				<td key={i} style={{ padding: '0.75rem 1rem' }}>
					<Skeleton className='h-4 w-full rounded' />
				</td>
			))}
		</tr>
	)
}
