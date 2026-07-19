'use client'

import { twc } from '@ez-kit/twc'

import type { ComponentPropsWithoutRef } from 'react'

type BadgeProps = ComponentPropsWithoutRef<'span'> & { count: number }

/** An existing component that knows nothing about Tailwind — it just accepts `className`. */
function CountBadge({ count, children, ...props }: BadgeProps) {
	return (
		<span {...props}>
			{children} <strong>{count}</strong>
		</span>
	)
}

const StyledBadge = twc(
	CountBadge,
	{
		base: 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs',
		variants: {
			tone: {
				info: 'bg-fd-muted text-fd-foreground',
				danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
			},
		},
		defaultVariants: { tone: 'info' },
	},
	'StyledBadge',
)

export default function WrappingExample() {
	return (
		<div className='flex items-center gap-3'>
			<StyledBadge count={3}>Open</StyledBadge>
			<StyledBadge
				tone='danger'
				count={12}
			>
				Failing
			</StyledBadge>
		</div>
	)
}
