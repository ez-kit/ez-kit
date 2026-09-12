'use client'

import { LoadMoreTrigger, useGridMessages } from '@ez-kit/data-grid-react'
import { Button, Spinner } from '@heroui/react'
import { AlertCircle } from 'lucide-react'

import type { LoadMoreRowProps } from '@ez-kit/data-grid-react'

/**
 * Infinite-scroll loader row (HeroUI flavour).
 *
 * Renders one of three states inside the full-width cell the react layer provides:
 * - `error` → message + "Retry"
 * - `isFetching` → spinner
 * - `trigger` is {@link LoadMoreTrigger.Manual} and more available → "Load more" button
 */
export function LoadMoreRow({ isFetching, hasNextPage, error, trigger, onTrigger, onRetry }: LoadMoreRowProps) {
	const messages = useGridMessages()
	if (error != null) {
		return (
			<div
				data-slot='load-more'
				data-state='error'
				className='dg-load-more flex items-center justify-center gap-2 py-3 text-sm'
			>
				<AlertCircle
					className='size-4 text-danger'
					aria-hidden='true'
				/>
				<span>{messages.fallbacks.loadMoreError}</span>
				<Button
					size='sm'
					variant='outline'
					onPress={onRetry}
				>
					{messages.fallbacks.retry}
				</Button>
			</div>
		)
	}

	if (isFetching) {
		return (
			<div
				data-slot='load-more'
				data-state='loading'
				className='dg-load-more flex items-center justify-center py-3'
			>
				<Spinner
					size='sm'
					aria-label={messages.fallbacks.loadingMore}
				/>
			</div>
		)
	}

	if (trigger === LoadMoreTrigger.Manual && hasNextPage) {
		return (
			<div
				data-slot='load-more'
				className='flex items-center justify-center py-3'
			>
				<Button
					size='sm'
					variant='outline'
					onPress={onTrigger}
				>
					{messages.fallbacks.loadMore}
				</Button>
			</div>
		)
	}

	return null
}
