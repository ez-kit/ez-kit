'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Input } from '@grid-shadcn/components/ui/input'

import type { CellTypeDefinition, CellViewProps, FieldState, ImageCellConfig } from '@ez-kit/data-grid-react'

function ImageCellView({ value, config }: CellViewProps<ImageCellConfig>) {
	const src = String(value ?? '')

	if (!src) return null

	return (
		<span style={{ display: 'inline-flex', alignItems: 'center' }}>
			<img
				src={src}
				alt={config?.alt ?? ''}
				width={config?.width}
				height={config?.height}
			/>
		</span>
	)
}

/** Image (URL) cell input. Wraps shadcn Field/Input(type='url'). */
function ImageCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Input
				id={id}
				type='url'
				value={String(value ?? '')}
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
