'use client'

import { LoadMoreTrigger } from '@ez-kit/data-grid-react'
import { AlertCircle, Loader2 } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'

import type { LoadMoreRowProps } from '@ez-kit/data-grid-react'

/**
 * Infinite-scroll loader row (shadcn flavour).
 *
 * Renders one of three states inside the full-width cell the react layer provides:
 * - `error` → message + "Retry"
 * - `isFetching` → spinner
 * - `trigger` is {@link LoadMoreTrigger.Manual} and more available → "Load more" button
 */
export function LoadMoreRow({ isFetching, hasMore, error, trigger, onTrigger, onRetry }: LoadMoreRowProps) {
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
				<span>Couldn’t load more.</span>
				<Button
					variant='outline'
					size='sm'
					onClick={onRetry}
				>
					Retry
				</Button>
			</div>
		)
	}

	if (isFetching) {
		return (
			<div
				data-slot='load-more'
				data-state='loading'
				className='flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground'
			>
				<Loader2
					className='size-4 animate-spin'
					aria-hidden='true'
				/>
				<span>Loading more…</span>
			</div>
		)
	}

	if (trigger === LoadMoreTrigger.Manual && hasMore) {
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
					Load more
				</Button>
			</div>
		)
	}

	return null
}
