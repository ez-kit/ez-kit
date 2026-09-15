'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'
import { Description, FieldError, Label } from '@heroui/react'

import { NumberFieldControl } from '../core/NumberField'

import type { CellTypeDefinition, FieldState, NumberCellConfig } from '@ez-kit/data-grid-react'

type NumberCellFieldProps = FieldState & {
	withSteppers: boolean
}

/**
 * Number cell field on HeroUI v3. `<Label>`, `<Description>` and `<FieldError>` appear only
 * when their data is set.
 *
 * View rendering for `number` is provided by the shared react package
 * (`toLocaleString`) — UI-kit specific styling is unnecessary here.
 */
function NumberCellField({
	id,
	value,
	onChange,
	onBlur,
	label,
	description,
	errors,
	withSteppers,
}: NumberCellFieldProps) {
	const hasError = errors.length > 0
	return (
		<NumberFieldControl
			id={id}
			value={typeof value === 'number' && !Number.isNaN(value) ? value : undefined}
			onChange={onChange}
			onBlur={onBlur}
			isInvalid={hasError}
			withSteppers={withSteppers}
			header={label === undefined ? null : <Label htmlFor={id}>{label}</Label>}
			footer={
				<>
					{description !== undefined && <Description>{description}</Description>}
					{hasError && <FieldError>{errors[0]}</FieldError>}
				</>
			}
		/>
	)
}

/** Number cell editor — with the decrement/increment buttons. */
function NumberCellInput(props: FieldState) {
	return (
		<NumberCellField
			{...props}
			withSteppers
		/>
	)
}

/** Number filter input — the same field without the steppers: a filter value is typed. */
function NumberFilterInput(props: FieldState) {
	return (
		<NumberCellField
			{...props}
			withSteppers={false}
		/>
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
	filtering: NumberFilterInput,
}

export { NumberCellInput, numberCellType, NumberFilterInput }
