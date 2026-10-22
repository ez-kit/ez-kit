'use client'

import { useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Spinner } from '@heroui/react'

/**
 * The loading or failed state of a select's value list, above the list itself — a listbox may hold
 * only its options, so the state cannot be one of them.
 */
export function ItemsListState({ isLoading, error }: { isLoading: boolean; error: unknown }) {
	const messages = useGridMessages()
	if (isLoading) {
		return (
			<div
				data-slot='select-items-loading'
				className='flex items-center gap-2 px-2 py-1.5 text-sm text-muted'
			>
				<Spinner
					size='sm'
					color='current'
					aria-hidden
				/>
				{messages.fallbacks.loading}
			</div>
		)
	}
	if (error === undefined) return null
	return (
		<div
			data-slot='select-items-error'
			className='px-2 py-1.5 text-sm text-danger'
		>
			{messages.filtering.itemsError}
		</div>
	)
}

/**
 * What a trigger shows over an **empty** list that is loading or failed. React Aria does not open a
 * select whose collection is empty, so the state in the popover would never be seen; the trigger
 * is the one place left to say it. `undefined` when the list has items or is simply settled.
 */
export function useEmptyListLabel(itemCount: number, isLoading: boolean, error: unknown): string | undefined {
	const messages = useGridMessages()
	if (itemCount > 0) return undefined
	if (isLoading) return messages.fallbacks.loading
	if (error !== undefined) return messages.filtering.itemsError
	return undefined
}

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
