'use client'

import { LINK_HREF_VALUE_TOKEN, LinkTarget } from '@ez-kit/data-grid-react'
import { Description, FieldError, Input, Label, Link, TextField } from '@heroui/react'

import type { CellViewProps, FieldState, LinkCellConfig } from '@ez-kit/data-grid-react'

function LinkCellView({ value, config }: CellViewProps<LinkCellConfig>) {
	const raw = String(value ?? '')
	if (!raw) return null

	const href = config?.href ? config.href.replaceAll(LINK_HREF_VALUE_TOKEN, encodeURIComponent(raw)) : raw
	const target = config?.target ?? LinkTarget.Self

	return (
		<Link
			href={href}
			target={target}
			{...(target === LinkTarget.Blank ? { rel: 'noreferrer' } : {})}
		>
			{config?.label ?? raw}
		</Link>
	)
}

/** Link (URL) cell input on HeroUI v3. */
function LinkCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
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

export { LinkCellInput, LinkCellView }
