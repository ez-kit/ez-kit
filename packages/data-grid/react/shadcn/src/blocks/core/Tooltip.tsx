'use client'

import {
	Tooltip as TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@grid-shadcn/components/ui/tooltip'

import type { TooltipProps } from '@ez-kit/data-grid-react'

/**
 * The kit's hover hint — the vendored shadcn tooltip behind the grid's two-prop contract.
 *
 * `asChild` on the trigger is not a detail: the contract hands this component elements that sit
 * in a flex row, so the trigger has to *become* the child rather than wrap it in a button of its
 * own — which would both change the layout and put interactive markup around static text.
 *
 * The provider is mounted here rather than expected around the grid. It is what carries the
 * delay, and a consumer who never mounted one would otherwise get a runtime error out of a
 * decoration; nesting one inside an app's own provider is supported by the primitive.
 */
export function Tooltip({ content, children }: TooltipProps) {
	return (
		<TooltipProvider>
			<TooltipRoot>
				<TooltipTrigger asChild>{children}</TooltipTrigger>
				<TooltipContent>{content}</TooltipContent>
			</TooltipRoot>
		</TooltipProvider>
	)
}
