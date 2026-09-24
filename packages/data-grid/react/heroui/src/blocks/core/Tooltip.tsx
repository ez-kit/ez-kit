'use client'

import { Tooltip as TooltipRoot } from '@heroui/react'

import type { TooltipProps } from '@ez-kit/data-grid-react'

/**
 * The kit's hover hint — HeroUI's `Tooltip` behind the grid's two-prop contract.
 *
 * `delay={0}` because this hint explains something the user is looking at right now. HeroUI's
 * 700 ms default suits a discoverable affordance, not a readout of pending state.
 *
 * **`tabIndex={-1}` is the fix for a dead tab stop, and it is deliberately the only override.**
 * `Tooltip.Trigger` wraps its child in a `div`, runs `useFocusable` — which supplies
 * `tabIndex={0}` — and hardcodes `role='button'`. That is right for the triggers its docs
 * demonstrate, an avatar and a chip standing in for controls, and wrong for the readouts this
 * slot wraps: a tab stop that answers neither Enter nor Space is one the keyboard has to walk
 * past for nothing. The trigger spreads the caller's props over its own
 * (`<dom.div role='button' {...mergeProps(focusableProps, props)}>`), so naming either here wins.
 *
 * **`role` is left alone on purpose, and this is the known residual.** Passing `role={undefined}`
 * does remove it, and then react-aria's own dev check fires
 * `<Focusable> child must have an interactive ARIA role.` on every render, in every consuming
 * app's console, permanently. Measured both ways rather than reasoned about; the matrix is in the
 * commit. So the element stays out of the tab order but keeps a `button` role in the accessibility
 * tree, where a reader browsing by element still meets it. Trading a silent wart for perpetual
 * console noise is not an improvement, and the wart is bounded: whatever `content` says is also
 * the accessible name of what the tooltip wraps, so nothing here is the only copy of anything.
 *
 * Fixing it properly means an `asChild`-style trigger upstream — the shadcn flavour has one, via
 * Radix, which is why that kit adds no element at all.
 */
export function Tooltip({ content, children }: TooltipProps) {
	return (
		<TooltipRoot delay={0}>
			<TooltipRoot.Trigger tabIndex={-1}>{children}</TooltipRoot.Trigger>
			<TooltipRoot.Content>{content}</TooltipRoot.Content>
		</TooltipRoot>
	)
}
