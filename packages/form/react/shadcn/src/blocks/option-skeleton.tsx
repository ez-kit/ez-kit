import { cn } from '@form-shadcn/lib/utils'

import type { ReactNode } from 'react'

/**
 * The placeholder an option-bearing field shows while `loading` is true.
 *
 * shadcn's registry ships a `skeleton` primitive, but this kit does not vendor it — one
 * pulsing block is not worth a new file under the immutable `components/ui/**`, and an
 * adapter in `blocks/` is where kit-owned visuals belong anyway (see CLAUDE.md). The
 * classes are the registry's own, so the shape matches the rest of the kit.
 *
 * `aria-hidden`: the skeleton carries no information a screen reader can use. The control
 * beside it is disabled while loading, which is what actually reports the state.
 */

/** How many rows the expanded widgets (radio group, checkbox group) stand in for. */
const PLACEHOLDER_ROWS = 3

export function OptionSkeleton({ className }: { className?: string }): ReactNode {
	return (
		<div
			data-slot='form-option-skeleton'
			data-form-skeleton=''
			aria-hidden='true'
			className={cn('bg-accent animate-pulse rounded-md', className)}
		/>
	)
}

/**
 * The loading stand-in for a widget that lays every choice out at once and so has no
 * trigger to put a single skeleton in: a short list of rows, one per expected option.
 */
export function OptionListSkeleton(): ReactNode {
	return (
		<div className='flex flex-col gap-2'>
			{Array.from({ length: PLACEHOLDER_ROWS }, (_, row) => (
				<div
					key={row}
					className='flex items-center gap-2'
				>
					<OptionSkeleton className='size-4 shrink-0' />
					<OptionSkeleton className='h-4 w-24' />
				</div>
			))}
		</div>
	)
}
