import { Input } from '../components/ui/input'
import { Slider } from '../components/ui/slider'

import type { BetweenInputProps } from '@ez-kit/data-grid-react'

export function BetweenInput({ value, onChange, variant, type, min, max }: BetweenInputProps) {
	if (variant === 'slider') {
		const sliderMin = min ?? 0
		const sliderMax = max ?? 100
		const fromVal = typeof value.from === 'number' ? value.from : sliderMin
		const toVal = typeof value.to === 'number' ? value.to : sliderMax

		return (
			<div className='flex items-center gap-2 px-1'>
				<span className='min-w-[2ch] text-right text-xs tabular-nums'>{fromVal}</span>
				<Slider
					min={sliderMin}
					max={sliderMax}
					value={[fromVal, toVal]}
					onValueChange={(vals) => {
						onChange({ from: vals[0], to: vals[1] })
					}}
					className='w-24'
				/>
				<span className='min-w-[2ch] text-xs tabular-nums'>{toVal}</span>
			</div>
		)
	}

	const inputType = type === 'date' ? 'date' : 'number'

	return (
		<div className='flex items-center gap-1'>
			<Input
				type={inputType}
				placeholder='From'
				className='h-7 w-24 text-xs'
				value={(value.from as string | number | undefined) ?? ''}
				onChange={(e) => {
					const v =
						inputType === 'number'
							? Number.isNaN(e.target.valueAsNumber)
								? undefined
								: e.target.valueAsNumber
							: e.target.value || undefined
					onChange({ ...value, from: v })
				}}
			/>
			<span className='text-muted-foreground text-xs'>–</span>
			<Input
				type={inputType}
				placeholder='To'
				className='h-7 w-24 text-xs'
				value={(value.to as string | number | undefined) ?? ''}
				onChange={(e) => {
					const v =
						inputType === 'number'
							? Number.isNaN(e.target.valueAsNumber)
								? undefined
								: e.target.valueAsNumber
							: e.target.value || undefined
					onChange({ ...value, to: v })
				}}
			/>
		</div>
	)
}
