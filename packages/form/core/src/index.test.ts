import { describe, expect, it } from 'vitest'

import { FORM_FIELD_TYPES, FormFieldType, formatFieldErrors, hasFieldErrors } from './index'

describe('@ez-kit/form-core public surface', () => {
	it('exports the error helpers', () => {
		expect(formatFieldErrors).toBeTypeOf('function')
		expect(hasFieldErrors).toBeTypeOf('function')
	})

	it('exports every built-in field type exactly once', () => {
		expect(FORM_FIELD_TYPES).toEqual([
			FormFieldType.Text,
			FormFieldType.Number,
			FormFieldType.Textarea,
			FormFieldType.Select,
			FormFieldType.Checkbox,
			FormFieldType.Switch,
			FormFieldType.RadioGroup,
			FormFieldType.Slider,
			FormFieldType.Date,
			FormFieldType.DateRange,
			FormFieldType.MultiSelect,
			FormFieldType.CheckboxGroup,
		])
		expect(new Set(FORM_FIELD_TYPES).size).toBe(FORM_FIELD_TYPES.length)
	})
})
