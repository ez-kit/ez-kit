'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'
import { LINK_HREF_VALUE_TOKEN, LinkTarget } from '@ez-kit/data-grid-react/kit'

import { Button } from '@grid-shadcn/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Input } from '@grid-shadcn/components/ui/input'

import type { CellTypeDefinition, CellViewProps, FieldState, LinkCellConfig } from '@ez-kit/data-grid-react'

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

/**
 * This kit's `link` registry entry — importable on its own, so a consumer can register only the
 * cell types it uses. `blocks/cell-types.ts` composes the default registry from these.
 *
 * Annotated rather than inferred, and restating the phantom `__config` the spread carries: see
 * the note on `KitCellTypes` in `../cell-types.ts` for what an inferred type does to the
 * bundled declarations.
 */
const linkCellType: CellTypeDefinition<LinkCellConfig> & { __config?: LinkCellConfig } = {
	...baseCellTypes.link,
	view: LinkCellView,
	editing: LinkCellInput,
}

export { LinkCellInput, linkCellType, LinkCellView }
