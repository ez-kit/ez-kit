/**
 * A single choice offered by a select-like field.
 *
 * `value` is the value written into form state; `label` is what the kit renders.
 * Kept framework-agnostic so both UI kits consume the identical option list.
 */
export type SelectOption<TValue = string> = {
	label: string
	value: TValue
	disabled?: boolean
}
