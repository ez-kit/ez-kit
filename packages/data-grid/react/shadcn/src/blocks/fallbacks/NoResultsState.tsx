'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'

import { PlaceholderIcon, StatePlaceholder } from './StatePlaceholder'

import type { NoResultsStateProps } from '@ez-kit/data-grid-react'

export function NoResultsState(_props: NoResultsStateProps) {
	const messages = useGridMessages()
	return (
		<StatePlaceholder
			icon={
				<PlaceholderIcon>
					<circle
						cx='11'
						cy='11'
						r='8'
					/>
					<path d='m21 21-4.35-4.35' />
					<path d='M8 11h6' />
				</PlaceholderIcon>
			}
			title={messages.fallbacks.noResults}
			hint='Try adjusting your filters.'
		/>
	)
}
