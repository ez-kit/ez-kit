'use client'

import { Tooltip as TooltipRoot } from '@heroui/react'

import type { TooltipProps } from '@ez-kit/data-grid-react'

/**
 * The kit's hover hint — HeroUI's `Tooltip` behind the grid's two-prop contract.
 *
 * `Tooltip.Trigger` is the custom-trigger form: it adopts whatever it is given rather than
 * drawing a button, which is what the contract requires — the elements handed here sit in a flex
 * row, and a box between them and their parent would move them.
 *
 * `delay={0}` because this hint explains something the user is looking at right now. HeroUI's
 * 700 ms default suits a discoverable affordance, not a readout of pending state.
 */
export function Tooltip({ content, children }: TooltipProps) {
	return (
		<TooltipRoot delay={0}>
			<TooltipRoot.Trigger>{children}</TooltipRoot.Trigger>
			<TooltipRoot.Content>{content}</TooltipRoot.Content>
		</TooltipRoot>
	)
}
