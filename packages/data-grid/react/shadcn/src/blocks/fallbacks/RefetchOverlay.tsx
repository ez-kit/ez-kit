'use client'

import { Loader2 } from 'lucide-react'

import type { RefetchOverlayProps } from '@ez-kit/data-grid-react'

/**
 * Refetch overlay — shadcn flavour.
 *
 * Rendered inside `data-slot="refetch-overlay"` when a server-side refetch is in
 * flight over existing rows (`isFetching && !isInitialLoad && rows.length > 0`).
 *
 * Visual: semi-transparent backdrop that dims the existing rows, centred spinner.
 * Uses `position: absolute` to overlay the tbody without shifting layout.
 */
export function RefetchOverlay(_props: RefetchOverlayProps) {
	return (
		<div
			data-slot='refetch-overlay-inner'
			style={{
				position: 'absolute',
				inset: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: 'hsl(var(--background) / 0.6)',
				zIndex: 10,
				pointerEvents: 'none',
			}}
		>
			<Loader2
				aria-label='Refreshing'
				style={{ width: '1.25rem', height: '1.25rem', animation: 'spin 1s linear infinite' }}
			/>
		</div>
	)
}
