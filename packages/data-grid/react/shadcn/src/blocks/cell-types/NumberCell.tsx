'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Input } from '@grid-shadcn/components/ui/input'

import type { CellTypeDefinition, FieldState, NumberCellConfig } from '@ez-kit/data-grid-react'

/**
 * Number cell input. Wraps shadcn Field/Input(type='number')/FieldError;
 * renders `<FieldLabel>` only when `field.label` is provided.
 *
 * View rendering for `number` is provided by the shared react package
 * (`toLocaleString`) — UI-kit specific styling is unnecessary here.
 */
function NumberCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	const numericValue = typeof value === 'number' && !Number.isNaN(value) ? value : ''
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Input
				id={id}
				type='number'
				value={numericValue}
				onChange={(e) => {
					const n = e.target.valueAsNumber
					onChange(Number.isNaN(n) ? undefined : n)
				}}
				onBlur={onBlur}
				aria-invalid={hasError || undefined}
			/>
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{hasError && <FieldError errors={errors.map((message) => ({ message }))} />}
		</Field>
	)
}

/**
 * This kit's `number` registry entry — importable on its own, so a consumer can register only the
 * cell types it uses. `blocks/cell-types.ts` composes the default registry from these.
 *
 * Annotated rather than inferred, and restating the phantom `__config` the spread carries: see
 * the note on `KitCellTypes` in `../cell-types.ts` for what an inferred type does to the
 * bundled declarations.
 */
const numberCellType: CellTypeDefinition<NumberCellConfig> & { __config?: NumberCellConfig } = {
	...baseCellTypes.number,
	editing: NumberCellInput,
	filtering: NumberCellInput,
}

export { NumberCellInput, numberCellType }
