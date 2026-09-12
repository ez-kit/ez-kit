'use client'

import { LoadMoreTrigger, useGridMessages } from '@ez-kit/data-grid-react'
import { AlertCircle } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import { Spinner } from '@grid-shadcn/components/ui/spinner'

import type { LoadMoreRowProps } from '@ez-kit/data-grid-react'

/**
 * Infinite-scroll loader row (shadcn flavour).
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
				className='flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground'
			>
				<AlertCircle
					className='size-4 text-destructive'
					aria-hidden='true'
				/>
				<span>{messages.fallbacks.loadMoreError}</span>
				<Button
					variant='outline'
					size='sm'
					onClick={onRetry}
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
				className='flex items-center justify-center py-3 text-muted-foreground'
			>
				<Spinner aria-label={messages.fallbacks.loadingMore} />
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
					variant='outline'
					size='sm'
					onClick={onTrigger}
				>
					{messages.fallbacks.loadMore}
				</Button>
			</div>
		)
	}

	return null
}
