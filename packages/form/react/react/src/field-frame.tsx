import { formatFieldErrors } from '@ez-kit/form-core'

import type { BoundFieldApi } from './bindable-form'
import type { FormComponents } from './contract'
import type { FormFieldType } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/** Suffixes appended to the field id to build the ids the input's aria attributes point at. */
const LABEL_ID_SUFFIX = '-label'
const DESCRIPTION_ID_SUFFIX = '-description'
const ERROR_ID_SUFFIX = '-error'

/** What the frame hands to the input so every field wires accessibility identically. */
export type FieldInputBinding = {
	id: string
	name: string
	onBlur: () => void
	invalid: boolean
	'aria-describedby': string | undefined
	'aria-labelledby': string | undefined
}

export type FieldFrameProps = {
	components: FormComponents
	field: BoundFieldApi
	fieldType: FormFieldType
	label: ReactNode
	description: ReactNode
	renderInput: (binding: FieldInputBinding) => ReactNode
}

/**
 * The chrome shared by every field: root wrapper, label, description, error text — plus
 * the ids that tie them together for assistive technology.
 *
 * It contributes **no styling**, only `data-field`, `data-field-type` and `data-invalid`
 * for kit CSS to hook onto. The input itself comes from the kit via `renderInput`.
 */
export function FieldFrame({
	components,
	field,
	fieldType,
	label,
	description,
	renderInput,
}: FieldFrameProps): ReactNode {
	const { FieldRoot, Label, Description, ErrorText } = components

	const id = field.name
	const errors = formatFieldErrors(field.state.meta.errors)
	const invalid = errors.length > 0

	const labelId = label != null ? `${id}${LABEL_ID_SUFFIX}` : undefined
	const descriptionId = description != null ? `${id}${DESCRIPTION_ID_SUFFIX}` : undefined
	const errorId = invalid ? `${id}${ERROR_ID_SUFFIX}` : undefined
	const describedBy = [descriptionId, errorId].filter((value) => value !== undefined).join(' ') || undefined

	return (
		<FieldRoot
			data-field={id}
			data-field-type={fieldType}
			data-invalid={invalid || undefined}
		>
			{labelId !== undefined && (
				<Label
					htmlFor={id}
					id={labelId}
				>
					{label}
				</Label>
			)}
			{descriptionId !== undefined && <Description id={descriptionId}>{description}</Description>}
			{renderInput({
				id,
				name: field.name,
				onBlur: field.handleBlur,
				invalid,
				'aria-describedby': describedBy,
				'aria-labelledby': labelId,
			})}
			{errorId !== undefined && (
				<ErrorText
					id={errorId}
					errors={errors}
				/>
			)}
		</FieldRoot>
	)
}
