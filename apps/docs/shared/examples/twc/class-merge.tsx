'use client'

import { twc } from '@ez-kit/twc'

const Card = twc.div(
	{
		base: 'rounded-lg border border-fd-border bg-fd-card p-4 text-sm',
		variants: { tone: { neutral: 'text-fd-foreground', muted: 'text-fd-muted-foreground' } },
		defaultVariants: { tone: 'neutral' },
	},
	'Card',
)

export default function ClassMergeExample() {
	return (
		<div className='flex flex-col gap-3'>
			<Card>
				<code>p-4</code> from <code>base</code>
			</Card>

			{/* `p-8` conflicts with the generated `p-4`; tailwind-merge keeps the incoming one. */}
			<Card className='p-8'>
				<code>p-8</code> passed as <code>className</code> — it replaces <code>p-4</code>
			</Card>

			{/* No conflict, so both survive. */}
			<Card
				tone='muted'
				className='shadow-md'
			>
				<code>shadow-md</code> has nothing to conflict with — it is simply added
			</Card>
		</div>
	)
}
