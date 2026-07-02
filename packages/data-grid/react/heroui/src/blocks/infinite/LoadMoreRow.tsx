'use client'

import { Button, Spinner } from '@heroui/react'
import { AlertCircle } from 'lucide-react'

import type { LoadMoreRowProps } from '@ez-kit/data-grid-react'

/**
 * Infinite-scroll loader row (HeroUI flavour).
 *
 * Renders one of three states inside the full-width cell the react layer provides:
 * - `error` → message + "Retry"
 * - `isFetching` → spinner
 * - `trigger === 'manual'` and more available → "Load more" button
 */
export function LoadMoreRow({ isFetching, hasMore, error, trigger, onTrigger, onRetry }: LoadMoreRowProps) {
	if (error != null) {
		return (
			<div
				data-slot='load-more'
				data-state='error'
				className='flex items-center justify-center gap-2 py-3 text-sm text-default-500'
			>
				<AlertCircle
					className='size-4 text-danger'
					aria-hidden='true'
				/>
				<span>Couldn’t load more.</span>
				<Button
					size='sm'
					variant='outline'
					onPress={onRetry}
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
				className='flex items-center justify-center gap-2 py-3 text-sm text-default-500'
			>
				<Spinner
					size='sm'
					aria-label='Loading more'
				/>
				<span>Loading more…</span>
			</div>
		)
	}

	if (trigger === 'manual' && hasMore) {
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
					Load more
				</Button>
			</div>
		)
	}

	return null
}
