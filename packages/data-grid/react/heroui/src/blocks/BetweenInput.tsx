'use client'

import { Input, Slider } from '@heroui/react'

import { DateCellInput } from './cell-types/DateCell'

import type { BetweenInputProps } from '@ez-kit/data-grid-react'

const LABEL_STYLE = {
	fontSize: '0.75rem',
	fontVariantNumeric: 'tabular-nums',
	minWidth: '2ch',
} as const

export function BetweenInput({ value, onChange, variant, type, min, max }: BetweenInputProps) {
	if (variant === 'slider') {
		const sliderMin = min ?? 0
		const sliderMax = max ?? 100
		const fromVal = typeof value.from === 'number' ? value.from : sliderMin
		const toVal = typeof value.to === 'number' ? value.to : sliderMax

		return (
			<div
				role='group'
				aria-label='Range filter'
				style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 220 }}
			>
				<span style={{ ...LABEL_STYLE, textAlign: 'right' }}>{fromVal}</span>
				<Slider
					aria-label='Range'
					minValue={sliderMin}
					maxValue={sliderMax}
					value={[fromVal, toVal]}
					onChange={(vals) => {
						if (!Array.isArray(vals)) return
						const [nextFrom, nextTo] = vals
						onChange({ from: nextFrom, to: nextTo })
					}}
					style={{ flex: 1 }}
				>
					<Slider.Track>
						{({ state }) => (
							<>
								<Slider.Fill />
								{state.values.map((_, i) => (
									<Slider.Thumb
										key={i}
										index={i}
									/>
								))}
							</>
						)}
					</Slider.Track>
				</Slider>
				<span style={LABEL_STYLE}>{toVal}</span>
			</div>
		)
	}

	if (type === 'date') {
		return (
			<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
				<DateCellInput
					id='between-from'
					value={value.from}
					onChange={(v) => {
						onChange({ ...value, from: v })
					}}
					onBlur={() => {}}
					error={undefined}
					errors={[]}
					isValidating={false}
				/>
				<span aria-hidden>–</span>
				<DateCellInput
					id='between-to'
					value={value.to}
					onChange={(v) => {
						onChange({ ...value, to: v })
					}}
					onBlur={() => {}}
					error={undefined}
					errors={[]}
					isValidating={false}
				/>
			</div>
		)
	}

	return (
		<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
			<Input
				type='number'
				placeholder='From'
				value={(value.from as number | undefined) ?? ''}
				{...(min !== undefined ? { min } : {})}
				{...(max !== undefined ? { max } : {})}
				onChange={(e) => {
					const next = Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
					onChange({ ...value, from: next })
				}}
			/>
			<span aria-hidden>–</span>
			<Input
				type='number'
				placeholder='To'
				value={(value.to as number | undefined) ?? ''}
				{...(min !== undefined ? { min } : {})}
				{...(max !== undefined ? { max } : {})}
				onChange={(e) => {
					const next = Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
					onChange({ ...value, to: next })
				}}
			/>
		</div>
	)
}
