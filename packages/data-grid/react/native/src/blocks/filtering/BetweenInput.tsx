import type { BetweenInputProps } from '@ez-kit/data-grid-react'

export function BetweenInput({ value, onChange, type, presets, onPresetSelect }: BetweenInputProps) {
	const inputType = type === 'number' ? 'number' : 'date'
	const presetRow =
		presets && presets.length > 0 && onPresetSelect ? (
			<div
				data-slot='between-presets'
				style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}
			>
				{presets.map((p) => (
					<button
						key={p.id}
						type='button'
						onClick={() => {
							onPresetSelect(p)
						}}
					>
						{p.label}
					</button>
				))}
			</div>
		) : null
	const inputs = (
		<div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
			<input
				type={inputType}
				placeholder='From'
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
			<span>–</span>
			<input
				type={inputType}
				placeholder='To'
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
	if (!presetRow) return inputs
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
			{presetRow}
			{inputs}
		</div>
	)
}
