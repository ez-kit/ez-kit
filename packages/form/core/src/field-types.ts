/**
 * The closed set of built-in field kinds shipped in v1.
 *
 * Every injectable input in the UI-kit contract maps to exactly one member, so the
 * field kind is never spelled as a bare string at a call site. Extended kinds
 * (switch, date picker, combobox, …) join this enum when they ship.
 */
export enum FormFieldType {
	Text = 'text',
	Number = 'number',
	Textarea = 'textarea',
	Select = 'select',
	Checkbox = 'checkbox',
	Switch = 'switch',
	RadioGroup = 'radiogroup',
	Slider = 'slider',
}

/** Every built-in field kind, in the order the contract declares them. */
export const FORM_FIELD_TYPES = [
	FormFieldType.Text,
	FormFieldType.Number,
	FormFieldType.Textarea,
	FormFieldType.Select,
	FormFieldType.Checkbox,
	FormFieldType.Switch,
	FormFieldType.RadioGroup,
	FormFieldType.Slider,
] as const
