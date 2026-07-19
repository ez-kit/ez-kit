'use client'

import { twc } from '@ez-kit/twc'
import { useState } from 'react'

const Button = twc.button(
	{
		base: 'rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50',
		variants: {
			intent: {
				primary: 'bg-fd-primary text-fd-primary-foreground hover:opacity-90',
				ghost: 'border border-fd-border bg-fd-card hover:bg-fd-muted',
			},
			size: { sm: 'text-xs px-3 py-1', lg: 'text-base px-5 py-2' },
		},
		compoundVariants: [{ intent: 'ghost', size: 'lg', class: 'tracking-wide' }],
		defaultVariants: { intent: 'primary', size: 'sm' },
	},
	'Button',
)

type Intent = 'primary' | 'ghost'
type Size = 'sm' | 'lg'

const INTENTS: Intent[] = ['primary', 'ghost']
const SIZES: Size[] = ['sm', 'lg']

export default function ButtonExample() {
	const [intent, setIntent] = useState<Intent>('primary')
	const [size, setSize] = useState<Size>('sm')

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-wrap items-center gap-2 text-xs text-fd-muted-foreground'>
				<span>intent</span>
				{INTENTS.map((value) => (
					<Button
						key={value}
						intent={value === intent ? 'primary' : 'ghost'}
						onClick={() => {
							setIntent(value)
						}}
					>
						{value}
					</Button>
				))}
				<span className='ml-2'>size</span>
				{SIZES.map((value) => (
					<Button
						key={value}
						intent={value === size ? 'primary' : 'ghost'}
						onClick={() => {
							setSize(value)
						}}
					>
						{value}
					</Button>
				))}
			</div>

			<Button
				intent={intent}
				size={size}
			>
				Preview
			</Button>
		</div>
	)
}
