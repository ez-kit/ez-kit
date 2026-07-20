import type { FieldRenderProps } from '@ez-kit/form-react'

/**
 * Everything that goes on a HeroUI field root: the shared `data-field` hooks kit CSS and
 * tests target, plus React Aria's boolean state props, which HeroUI v3 exposes on every
 * root.
 *
 * `isDisabled` / `isRequired` are spread rather than passed directly: under
 * `exactOptionalPropertyTypes` an explicit `undefined` is rejected, and "not disabled" has
 * to mean the key is absent.
 *
 * Deliberately no `data-slot`: HeroUI sets its own (`checkbox`, `textfield`, …) *before*
 * spreading props, so ours would win and silently break `@heroui/styles` selectors.
 *
 * Nothing here fakes accessibility wiring either. The label, description and error live
 * *inside* the field root in this kit, so React Aria derives `id` / `aria-describedby` /
 * `aria-labelledby` itself — exactly as it does in HeroUI's own examples.
 */
export function fieldRoot({
	invalid,
	disabled,
	required,
	...data
}: Pick<FieldRenderProps, 'invalid' | 'disabled' | 'required' | 'data-field' | 'data-field-type'>): {
	'data-field': string
	'data-field-type': string
	isInvalid: boolean
	isDisabled?: boolean
	isRequired?: boolean
} {
	return {
		...data,
		isInvalid: invalid,
		...(disabled !== undefined ? { isDisabled: disabled } : {}),
		...(required !== undefined ? { isRequired: required } : {}),
	}
}
