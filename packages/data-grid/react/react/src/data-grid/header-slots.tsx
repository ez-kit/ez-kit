import { useGridComponents } from '../components-context'

import type { HeaderExtrasProps, HeaderMainProps } from '../types'

/**
 * The two boxes a header cell is built from, as components.
 *
 * Composing a header cell means returning its contents yourself — the render function is
 * all-or-nothing — so every call site that swaps `filter` for `filterPopover`, or leaves the
 * filter out, previously had to write `<div data-slot='header-main'>` by hand. That put a
 * structural contract of this package into eleven consumer files: a slot rename would have gone
 * red in the kits' CSS and silent in every one of them. These components move the literal back
 * to one module — `header-cell.tsx`'s own default renders them too.
 *
 * `apps/docs/test/composition-slots.test.ts` is what keeps it there.
 */

/**
 * The header cell's first row: the label or sort affordance, and the column menu beside it.
 *
 * `data-slot` is written after the spread, so a caller cannot displace the attribute the
 * stylesheet selects on. Everything else — `className`, `style`, event handlers — passes
 * through untouched; this package authors no class of its own.
 */
export function HeaderMain({ children, ...rest }: HeaderMainProps) {
	const { HeaderMain: Main = 'div' } = useGridComponents().core

	return (
		<Main
			{...rest}
			data-slot='header-main'
		>
			{children}
		</Main>
	)
}

/** The header cell's second row: the column's filter control, when the header renders one. */
export function HeaderExtras({ children, ...rest }: HeaderExtrasProps) {
	const { HeaderExtras: Extras = 'div' } = useGridComponents().core

	return (
		<Extras
			{...rest}
			data-slot='header-extras'
		>
			{children}
		</Extras>
	)
}
