import { Skeleton } from '@heroui/react'

import type { ReactNode } from 'react'

/**
 * The placeholder an option-bearing field shows while `loading` is true.
 *
 * HeroUI ships a real `Skeleton`, so nothing is hand-rolled here — this module only fixes
 * the two shapes the kit needs and the reason each one exists.
 *
 * `aria-hidden`: the skeleton says nothing a screen reader can use. The control beside it is
 * disabled while loading, which is what reports the state — React Aria filters unknown ARIA
 * props off its roots, so an `aria-busy` passed here would never reach the DOM anyway.
 */

/** How many rows the expanded widgets (radio group, checkbox group) stand in for. */
const PLACEHOLDER_ROWS = 3

/** The single bar that replaces a trigger's value while its options are still arriving. */
export function OptionSkeleton(): ReactNode {
	return (
		<Skeleton
			data-form-skeleton=''
			aria-hidden='true'
			className='h-4 w-24 rounded-md'
		/>
	)
}

/**
 * The loading stand-in for a widget that lays every choice out at once and so has no
 * trigger to put a single skeleton in: a short list of rows, one per expected option.
 */
export function OptionListSkeleton(): ReactNode {
	return (
		<div
			data-form-skeleton=''
			aria-hidden='true'
			className='flex flex-col gap-2'
		>
			{Array.from({ length: PLACEHOLDER_ROWS }, (_, row) => (
				<div
					key={row}
					className='flex items-center gap-2'
				>
					<Skeleton className='size-4 shrink-0 rounded-full' />
					<Skeleton className='h-4 w-24 rounded-md' />
				</div>
			))}
		</div>
	)
}
