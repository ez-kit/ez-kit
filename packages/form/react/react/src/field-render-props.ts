import { formatFieldErrors } from '@ez-kit/form-core'

import type { BoundFieldApi } from './bindable-form'
import type { FieldRenderProps } from './contract'
import type { FormFieldType } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * The half of a field's props that is identical for every field kind: identity, chrome
 * content, validation state and the blur handler.
 *
 * Everything visible is assembled by the kit from these; this package renders no element of
 * its own, not even a wrapper.
 */
export function fieldRenderProps(
	field: BoundFieldApi,
	fieldType: FormFieldType,
	{
		label,
		description,
		disabled,
		required,
	}: { label: ReactNode; description: ReactNode; disabled: boolean | undefined; required: boolean | undefined },
): FieldRenderProps {
	const errors = formatFieldErrors(field.state.meta.errors)

	return {
		'data-field': field.name,
		'data-field-type': fieldType,
		id: field.name,
		name: field.name,
		label,
		description,
		errors,
		invalid: errors.length > 0,
		onBlur: field.handleBlur,
		disabled,
		required,
	}
}
