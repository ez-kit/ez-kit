'use client'

import { Button } from '@/components/ui/button'

/** Presentational segmented control — holds no state; the caller reads and writes the store. */
export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
}: {
	options: readonly T[]
	value: T
	onChange: (next: T) => void
}) {
	return (
		<div className='flex gap-1'>
			{options.map((option) => (
				<Button
					key={option}
					size='sm'
					variant={value === option ? 'default' : 'outline'}
					aria-pressed={value === option}
					onClick={() => {
						onChange(option)
					}}
				>
					{option}
				</Button>
			))}
		</div>
	)
}
