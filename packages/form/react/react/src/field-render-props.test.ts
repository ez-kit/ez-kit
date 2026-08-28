import { FormFieldType } from '@ez-kit/form-core'
import { describe, expect, expectTypeOf, test } from 'vitest'

import { fieldRenderProps } from './field-render-props'

import type { BoundFieldApi } from './bindable-form'

function boundField(overrides: { isTouched: boolean; errors?: readonly unknown[] }): BoundFieldApi {
	return {
		name: 'email',
		handleBlur: () => {},
		handleChange: () => {},
		state: {
			value: '',
			meta: { errors: overrides.errors ?? [], isTouched: overrides.isTouched },
		},
	}
}

const CHROME = { label: 'Email', description: undefined, disabled: undefined, required: true }

describe('fieldRenderProps — error display gate', () => {
	test('hides the errors of a field the user has not touched yet', () => {
		const props = fieldRenderProps(
			boundField({ isTouched: false, errors: ['This field is required'] }),
			FormFieldType.Text,
			CHROME,
		)

		expect(props.errors).toEqual([])
		expect(props.invalid).toBe(false)
	})

	test('shows them once the field has been touched', () => {
		const props = fieldRenderProps(
			boundField({ isTouched: true, errors: ['This field is required'] }),
			FormFieldType.Text,
			CHROME,
		)

		expect(props.errors).toEqual(['This field is required'])
		expect(props.invalid).toBe(true)
	})
})

describe('fieldRenderProps — field type', () => {
	test('accepts a custom field kind without a cast, and passes it through verbatim', () => {
		// A custom `type` is any author-chosen string, so narrowing this parameter to
		// `FormFieldType` would force an `as unknown as` at the custom-field call site. A
		// violation fails `typecheck`, which is the point of the type assertion below.
		expectTypeOf(fieldRenderProps).parameter(1).toEqualTypeOf<string>()

		const props = fieldRenderProps(boundField({ isTouched: true }), 'rating-stars', CHROME)

		expect(props['data-field-type']).toBe('rating-stars')
	})
})
