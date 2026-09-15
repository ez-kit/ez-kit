'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Input } from '@grid-shadcn/components/ui/input'

import type { CellTypeDefinition, FieldState, TextCellConfig } from '@ez-kit/data-grid-react'

/**
 * Default text cell input. Wraps shadcn Field/Input/FieldError; renders
 * `<FieldLabel>` only when `field.label` is provided (form-context).
 * In inline contexts (cell-mode editing, creating-row, filter) the wrapper
 * still renders, but contains only the bare `<Input>`.
 *
 * View rendering for `text` falls back to TanStack `flexRender` — no UI-kit
 * specific component is needed.
 */
function TextCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Input
				id={id}
				value={(value ?? '') as string}
				onChange={(e) => {
					onChange(e.target.value)
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
