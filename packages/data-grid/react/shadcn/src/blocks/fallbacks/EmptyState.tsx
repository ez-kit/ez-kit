import { PlaceholderIcon, StatePlaceholder } from './StatePlaceholder'

import type { EmptyStateProps } from '@ez-kit/data-grid-react'

export function EmptyState(_props: EmptyStateProps) {
	return (
		<StatePlaceholder
			icon={
				<PlaceholderIcon>
					<ellipse
						cx='12'
						cy='5'
						rx='9'
						ry='3'
					/>
					<path d='M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5' />
					<path d='M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3' />
				</PlaceholderIcon>
			}
			title='No data'
			hint='Add a row to get started.'
		/>
	)
}
