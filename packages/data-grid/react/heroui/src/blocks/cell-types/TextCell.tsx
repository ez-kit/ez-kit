'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'
import { Description, FieldError, Input, Label, TextField } from '@heroui/react'

import type { CellTypeDefinition, FieldState, TextCellConfig } from '@ez-kit/data-grid-react'

/**
 * Default text cell input on HeroUI v3. Wraps `<TextField>` (always rendered);
 * `<Label>`, `<Description>`, `<FieldError>` appear only when their data is set.
 *
 * View rendering for `text` falls back to TanStack `flexRender` — no UI-kit
 * specific component is needed.
 */
function TextCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	return (
		<TextField isInvalid={hasError}>
			{label !== undefined && <Label htmlFor={id}>{label}</Label>}
			<Input
				id={id}
				value={(value ?? '') as string}
				onChange={(e) => {
					onChange(e.target.value)
				}}
				onBlur={onBlur}
			/>
			{description !== undefined && <Description>{description}</Description>}
			{hasError && <FieldError>{errors[0]}</FieldError>}
		</TextField>
	)
}

/**
 * This kit's `text` registry entry — importable on its own, so a consumer can register only the
 * cell types it uses. `blocks/cell-types.ts` composes the default registry from these.
 *
 * Annotated rather than inferred, and restating the phantom `__config` the spread carries: see
 * the note on `KitCellTypes` in `../cell-types.ts` for what an inferred type does to the
 * bundled declarations.
 */
const textCellType: CellTypeDefinition<TextCellConfig> & { __config?: TextCellConfig } = {
	...baseCellTypes.text,
	editing: TextCellInput,
	filtering: TextCellInput,
}

export { TextCellInput, textCellType }
