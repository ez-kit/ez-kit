import type { BaseInputProps } from '@ez-kit/form-react'

/**
 * React Aria's boolean state props, which HeroUI v3 exposes on every field root.
 *
 * Built by spreading rather than passing directly: under `exactOptionalPropertyTypes` an
 * explicit `undefined` is rejected, and "not disabled" has to mean the key is absent.
 */
export function ariaFieldState({
	invalid,
	disabled,
	required,
	'aria-describedby': describedBy,
	'aria-labelledby': labelledBy,
}: Pick<BaseInputProps, 'invalid' | 'disabled' | 'required' | 'aria-describedby' | 'aria-labelledby'>): {
	isInvalid?: boolean
	isDisabled?: boolean
	isRequired?: boolean
	'aria-describedby'?: string
	'aria-labelledby'?: string
} {
	return {
		...(invalid !== undefined ? { isInvalid: invalid } : {}),
		...(disabled !== undefined ? { isDisabled: disabled } : {}),
		...(required !== undefined ? { isRequired: required } : {}),
		...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {}),
		// React Aria cannot see the frame's label — it is a sibling of this composition, not a
		// child — so without this the roots warn and composite widgets go unlabelled.
		...(labelledBy !== undefined ? { 'aria-labelledby': labelledBy } : {}),
	}
}
