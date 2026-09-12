/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Progress as ProgressPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@grid-shadcn/lib/utils'

function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
	return (
		<ProgressPrimitive.Root
			data-slot='progress'
			// Upstream shadcn destructures `value` for the indicator's transform and never hands it
			// back to the root, so Radix renders `data-state="indeterminate"` with no
			// `aria-valuenow` — the bar looks right and announces nothing. Forwarded here rather
			// than patched around in `blocks/`, because the missing attribute is on the element
			// that carries `role="progressbar"`, and only the root can set it.
			value={value}
			className={cn('relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted', className)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				data-slot='progress-indicator'
				className='size-full flex-1 bg-primary transition-all'
				style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
			/>
		</ProgressPrimitive.Root>
	)
}

export { Progress }
