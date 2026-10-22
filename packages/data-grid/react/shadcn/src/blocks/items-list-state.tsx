'use client'

import { useGridMessages } from '@ez-kit/data-grid-react/kit'

/**
 * Announces a value list's loading and failure to a screen reader, beside the control rather than
 * inside its popover.
 *
 * Both regions are mounted with the control and stay mounted, empty while there is nothing to
 * say, so a change of state is a change of their content — which is what a screen reader
 * announces. A region inserted already holding its text is often skipped, and a listbox may hold
 * only options, so the popover is not the place for either.
 */
export function ListStateAnnouncer({ isLoading, error }: { isLoading: boolean; error: unknown }) {
	const messages = useGridMessages()
	return (
		<>
			<span
				role='status'
				className='sr-only'
			>
				{isLoading ? messages.fallbacks.loading : ''}
			</span>
			<span
				role='alert'
				className='sr-only'
			>
				{error !== undefined ? messages.filtering.itemsError : ''}
			</span>
		</>
	)
}
