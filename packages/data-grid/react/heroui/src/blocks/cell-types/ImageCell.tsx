'use client'

import { Description, FieldError, Input, Label, TextField } from '@heroui/react'

import type { CellViewProps, FieldState, ImageCellConfig } from '@ez-kit/data-grid-react'

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

export { ImageCellInput, ImageCellView }
