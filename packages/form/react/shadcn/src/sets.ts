import { ArrayField } from './blocks/array'
import { DateField, DateRangeField } from './blocks/date'
import {
	CheckboxField,
	NumberField,
	RadioGroupField,
	SliderField,
	SwitchField,
	TextareaField,
	TextField,
} from './blocks/fields'
import { SubmitButton } from './blocks/form-parts'
import { Grid, Section } from './blocks/layout'
import { CheckboxGroupField, MultiSelectField } from './blocks/multi-value'
import { SelectField } from './blocks/select'

import type { AllFormComponents, AllFormFieldSlots } from '@ez-kit/form-react'

/**
 * Every field kind the shadcn kit ships, keyed as `createForm({ fields })` takes them.
 *
 * Importing it is a deliberate "everything": it names all thirteen components, so a bundle that
 * reaches this object keeps the date picker and the comboboxes with it. An app that wants less
 * imports the components it renders by name instead. `satisfies AllFormFieldSlots` makes a
 * forgotten field kind a compile error.
 *
 * Every entry is a `blocks/` adapter — the vendored shadcn primitives under `components/ui/`
 * are never edited (see CLAUDE.md).
 */
export const allFormFields = {
	TextField,
	NumberField,
	TextareaField,
	SelectField,
	CheckboxField,
	SwitchField,
	RadioGroupField,
	SliderField,
	MultiSelectField,
	CheckboxGroupField,
	DateField,
	DateRangeField,
	ArrayField,
} satisfies AllFormFieldSlots

/** Every form-aware component the shadcn kit ships, keyed as `createForm({ components })` takes them. */
export const allFormComponents = { SubmitButton, Section, Grid } satisfies AllFormComponents
