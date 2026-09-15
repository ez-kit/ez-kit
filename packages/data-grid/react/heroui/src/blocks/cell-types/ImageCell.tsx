'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'
import { Description, FieldError, Input, Label, TextField } from '@heroui/react'

import type { CellTypeDefinition, CellViewProps, FieldState, ImageCellConfig } from '@ez-kit/data-grid-react'

function ImageCellView({ value, config }: CellViewProps<ImageCellConfig>) {
	const src = String(value ?? '')
	if (!src) return null
	return (
		<span className='inline-flex items-center'>
			<img
				src={src}
				alt={config?.alt ?? ''}
				width={config?.width}
				height={config?.height}
			/>
		</span>
	)
}

/** Image (URL) cell input on HeroUI v3. */
function ImageCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	return (
		<TextField isInvalid={hasError}>
			{label !== undefined && <Label htmlFor={id}>{label}</Label>}
			<Input
				id={id}
				type='url'
				value={String(value ?? '')}
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
 * This kit's `image` registry entry — importable on its own, so a consumer can register only the
 * cell types it uses. `blocks/cell-types.ts` composes the default registry from these.
 *
 * Annotated rather than inferred, and restating the phantom `__config` the spread carries: see
 * the note on `KitCellTypes` in `../cell-types.ts` for what an inferred type does to the
 * bundled declarations.
 */
const imageCellType: CellTypeDefinition<ImageCellConfig> & { __config?: ImageCellConfig } = {
	...baseCellTypes.image,
	view: ImageCellView,
	editing: ImageCellInput,
}

export { ImageCellInput, imageCellType, ImageCellView }
