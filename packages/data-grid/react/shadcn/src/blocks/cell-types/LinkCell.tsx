'use client'

import { LINK_HREF_VALUE_TOKEN, LinkTarget } from '@ez-kit/data-grid-react'

import { Button } from '@grid-shadcn/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Input } from '@grid-shadcn/components/ui/input'

import type { CellViewProps, FieldState, LinkCellConfig } from '@ez-kit/data-grid-react'

function LinkCellView({ value, config }: CellViewProps<LinkCellConfig>) {
	const raw = String(value ?? '')
	if (!raw) return null

	const href = config?.href ? config.href.replaceAll(LINK_HREF_VALUE_TOKEN, encodeURIComponent(raw)) : raw
	const target = config?.target ?? LinkTarget.Self

	return (
		<Button
			variant='link'
			asChild
		>
			<a
				href={href}
				target={target}
				{...(target === LinkTarget.Blank ? { rel: 'noreferrer' } : {})}
			>
				{config?.label ?? raw}
			</a>
		</Button>
	)
}

/** Link (URL) cell input. Wraps shadcn Field/Input(type='url'). */
function LinkCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
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

export { LinkCellInput, LinkCellView }
