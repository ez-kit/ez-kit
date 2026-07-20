import { Label as LabelPrimitive } from '@form-shadcn/components/ui/label'
import { cn } from '@form-shadcn/lib/utils'

import type { FieldRenderProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The chrome shared by every shadcn field: wrapper, label, description, error text — plus
 * the ids that tie them together for assistive technology.
 *
 * shadcn fields are plain siblings in a grid, so this kit *can* factor the chrome out into
 * one component. `@ez-kit/form-react` deliberately does not: a React-Aria kit needs its
 * chrome nested inside the field root instead, which is why the contract hands each kit a
 * flat props object and lets it build its own tree.
 *
 * These are `blocks/` adapters over the vendored primitives in `components/ui/`, which stay
 * untouched (see CLAUDE.md).
 */

/** Suffixes appended to the field id to build the ids `aria-describedby` points at. */
const DESCRIPTION_ID_SUFFIX = '-description'
const ERROR_ID_SUFFIX = '-error'

/**
 * A checkbox reads as `[control] Label`, with description and error on their own rows
 * below — hence `flex-wrap` plus `w-full` on those two, rather than a two-column grid:
 * Radix renders a hidden `<input>` next to the control, and a grid would give that phantom
 * element a cell of its own and push the label onto the next row.
 */
const CHECKBOX_LAYOUT = 'flex flex-wrap items-center gap-x-2 gap-y-1'
const STACKED_LAYOUT = 'grid gap-2'

/** What the shell hands the control so every field wires accessibility identically. */
export type FieldControlBinding = {
	'aria-describedby': string | undefined
}

export type FieldShellProps = Omit<FieldRenderProps, 'name' | 'onBlur' | 'disabled' | 'required'> & {
	children: (binding: FieldControlBinding) => ReactNode
	/** Renders the control before the label — the checkbox reading order. */
	controlFirst?: boolean
}

export function FieldShell({
	id,
	label,
	description,
	errors,
	invalid,
	children,
	controlFirst,
	...data
}: FieldShellProps): ReactNode {
	const descriptionId = description != null ? `${id}${DESCRIPTION_ID_SUFFIX}` : undefined
	const errorId = invalid ? `${id}${ERROR_ID_SUFFIX}` : undefined
	const describedBy = [descriptionId, errorId].filter((value) => value !== undefined).join(' ') || undefined

	const labelNode = label != null && (
		<LabelPrimitive
			data-slot='form-label'
			htmlFor={id}
		>
			{label}
		</LabelPrimitive>
	)
	const control = children({ 'aria-describedby': describedBy })
	/** In the wrapped checkbox row, help text and errors each claim a row of their own. */
	const asideClass = controlFirst === true ? 'w-full' : undefined

	return (
		<div
			data-slot='form-field'
			data-invalid={invalid || undefined}
			className={cn(controlFirst === true ? CHECKBOX_LAYOUT : STACKED_LAYOUT)}
			{...data}
		>
			{controlFirst === true ? control : labelNode}
			{controlFirst === true ? labelNode : control}
			{descriptionId !== undefined && (
				<p
					data-slot='form-description'
					id={descriptionId}
					className={cn('text-sm text-muted-foreground', asideClass)}
				>
					{description}
				</p>
			)}
			{errorId !== undefined && (
				<p
					data-slot='form-error'
					id={errorId}
					role='alert'
					className={cn('text-sm font-medium text-destructive', asideClass)}
				>
					{errors.join(', ')}
				</p>
			)}
		</div>
	)
}
