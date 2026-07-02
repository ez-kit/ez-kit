'use client'

import { Spinner } from '@heroui/react'

import type { RefetchOverlayProps } from '@ez-kit/data-grid-react'

/**
 * Refetch overlay — HeroUI flavour.
 *
 * Rendered inside `data-slot="refetch-overlay"` when a server-side refetch is in
 * flight over existing rows (`isFetching && !isInitialLoad && rows.length > 0`).
 *
 * Visual: semi-transparent backdrop that dims the existing rows, centred HeroUI Spinner.
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
				backgroundColor: 'color-mix(in oklab, var(--background) 60%, transparent)',
				zIndex: 10,
				pointerEvents: 'none',
			}}
		>
			<Spinner
				aria-label='Refreshing'
				size='md'
			/>
		</div>
	)
}
