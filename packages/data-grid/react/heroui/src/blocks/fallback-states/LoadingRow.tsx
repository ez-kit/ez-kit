import { Skeleton } from '@heroui/react'

import type { LoadingRowProps } from '@ez-kit/data-grid-react'

export function LoadingRow({ columnCount }: LoadingRowProps) {
	return (
		<tr>
			{Array.from({ length: columnCount }, (_, i) => (
				<td
					key={i}
					className='py-3 px-4'
				>
					<Skeleton className='h-4 w-full rounded' />
				</td>
			))}
		</tr>
	)
}
