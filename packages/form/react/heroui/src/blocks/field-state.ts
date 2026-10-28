import type { FieldRenderProps } from '@ez-kit/form-react'
import type { ComponentPropsWithoutRef, ElementType } from 'react'

/**
 * React Aria's spellings of what the contract computes and {@link fieldRoot} sets — plus the
 * uncontrolled twins of the bound value and `children`, which the field renders. None of them is
 * an author's to pass on a root.
 */
type ComputedRootKey =
	| 'defaultValue'
	| 'isSelected'
	| 'defaultSelected'
	| 'isInvalid'
	| 'isDisabled'
	| 'isRequired'
	| 'children'

/**
 * The props a field forwards to its React Aria root, as its kit props: everything `TRoot` takes
 * except what the contract computes (`TRenderProps`), the {@link ComputedRootKey}s and `TOmit`.
 *
 * The root, not the `<input>`, because that is where React Aria takes input attributes — `type`,
 * `autoComplete`, `inputMode`, `maxLength`, … are props of `TextField` / `NumberField`, which wire
 * them to the input they render. A field whose input needs one React Aria does not take there
 * (`placeholder`, `rows`) declares it beside these and places it itself.
 *
 * Every member is optional, as a slot requires: they come off a component's props, which name
 * nothing as mandatory.
 */
export type RootProps<TRoot extends ElementType, TRenderProps, TOmit extends PropertyKey = never> = Omit<
	ComponentPropsWithoutRef<TRoot>,
	keyof TRenderProps | ComputedRootKey | TOmit
>

/** The keys of a field's props that {@link fieldRoot} turns into root props. */
type RootStateKey = 'invalid' | 'disabled' | 'required' | 'data-field' | 'data-field-type' | 'data-form-id'

/** The half of a field's props {@link fieldRoot} takes. */
export type RootState = Pick<FieldRenderProps, RootStateKey>

/**
 * Splits a field's props into what {@link fieldRoot} turns into root props and everything else —
 * the computed control props (`value`, `id`, …), the chrome (`label`, `errors`, …) and the kit
 * props an author wrote beside them, which the field forwards to its root.
 */
export function splitRootState<TProps extends RootState>(
	props: TProps,
): { state: RootState; rest: Omit<TProps, RootStateKey> } {
	const {
		invalid,
		disabled,
		required,
		'data-field': dataField,
		'data-field-type': dataFieldType,
		'data-form-id': dataFormId,
		...rest
	} = props
	return {
		state: {
			invalid,
			disabled,
			required,
			'data-field': dataField,
			'data-field-type': dataFieldType,
			'data-form-id': dataFormId,
		},
		rest,
	}
}

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
export function fieldRoot({ invalid, disabled, required, ...data }: RootState): {
	'data-field': string
	'data-field-type': string
	'data-form-id': string
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
