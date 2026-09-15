'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'
import { Description, FieldError, Input, Label, NumberField, ProgressBar } from '@heroui/react'

import type { CellTypeDefinition, CellViewProps, FieldState, ProgressCellConfig } from '@ez-kit/data-grid-react'

function ProgressCellView({ value, config }: CellViewProps<ProgressCellConfig>) {
	const max = config?.max ?? 100
	const num = Number(value)
	const pct = Number.isFinite(num) ? (num / max) * 100 : 0
	return (
		<span className='inline-flex items-center gap-2 w-full'>
			<ProgressBar
				value={pct}
				className='flex-1'
			>
				<ProgressBar.Track>
					<ProgressBar.Fill />
				</ProgressBar.Track>
			</ProgressBar>
			<span className='text-xs tabular-nums'>{num}</span>
		</span>
	)
}

/** Progress (numeric) cell input on HeroUI v3. */
function ProgressCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	const numericValue = typeof value === 'number' && !Number.isNaN(value) ? value : NaN
	return (
		<NumberField
			value={numericValue}
			onChange={(n) => {
				onChange(Number.isNaN(n) ? undefined : n)
			}}
			isInvalid={hasError}
		>
			{label !== undefined && <Label htmlFor={id}>{label}</Label>}
			<Input
				id={id}
				onBlur={onBlur}
			/>
			{description !== undefined && <Description>{description}</Description>}
			{hasError && <FieldError>{errors[0]}</FieldError>}
		</NumberField>
	)
}

/**
 * This kit's `progress` registry entry — importable on its own, so a consumer can register only the
 * cell types it uses. `blocks/cell-types.ts` composes the default registry from these.
 *
 * Annotated rather than inferred, and restating the phantom `__config` the spread carries: see
 * the note on `KitCellTypes` in `../cell-types.ts` for what an inferred type does to the
 * bundled declarations.
 */
const progressCellType: CellTypeDefinition<ProgressCellConfig> & { __config?: ProgressCellConfig } = {
	...baseCellTypes.progress,
	view: ProgressCellView,
	editing: ProgressCellInput,
}

export { ProgressCellInput, progressCellType, ProgressCellView }
