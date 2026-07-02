import type { LoadMoreRowProps } from '@ez-kit/data-grid-react'

export function LoadMoreRow({ isFetching, hasMore, error, trigger, onTrigger, onRetry }: LoadMoreRowProps) {
	if (error != null) {
		return (
			<button type='button' onClick={onRetry}>
				Retry
			</button>
		)
	}
	if (isFetching) return <span>Loading more…</span>
	if (trigger === 'manual' && hasMore) {
		return (
			<button type='button' onClick={onTrigger}>
				Load more
			</button>
		)
	}
	return null
}
