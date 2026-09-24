import { cn } from '@grid-shadcn/lib/utils'

import type { RootProps } from '@ez-kit/data-grid-react'

/**
 * The grid's root box — the element that holds toolbar, table, pagination row and the bars, and
 * the reason a grid is one item in its parent's layout rather than a run of siblings.
 *
 * The shared layer falls back to a plain `div`, so what this adds is `cn`: `layout.classNames.root`
 * **accumulates** across the option layers (kit defaults, a provider, the grid itself), and the
 * shared layer de-conflicts nothing. Running the result through tailwind-merge is what lets an
 * app's `rounded-none` beat a kit default's `rounded-xl` instead of both landing on the element.
 */
export function Root({ className, ...props }: RootProps) {
	return (
		<div
			{...props}
			className={cn(className)}
		/>
	)
}
