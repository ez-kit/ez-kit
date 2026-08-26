import type { AnyFormOptions } from '@ez-kit/form-core'

/**
 * Every key TanStack Form's options object carries.
 *
 * In uncontrolled mode `<Form>` takes the form options and the `<form>` element's own DOM
 * props side by side, so at runtime the two have to be told apart. Declaring the set as a
 * `Record<keyof AnyFormOptions, true>` makes that split self-checking: a key TanStack adds
 * is a compile error here (missing property) and one it drops is a compile error too
 * (excess property), rather than an option silently leaking onto the DOM element — where
 * React would warn about an unknown attribute and the form would quietly lose the option.
 */
const FORM_OPTION_KEYS: Record<keyof AnyFormOptions, true> = {
	asyncAlways: true,
	asyncDebounceMs: true,
	canSubmitWhenInvalid: true,
	defaultState: true,
	defaultValues: true,
	formId: true,
	listeners: true,
	onSubmit: true,
	onSubmitInvalid: true,
	onSubmitMeta: true,
	transform: true,
	validationLogic: true,
	validators: true,
}

type SplitProps = {
	/** What `useForm` receives. */
	options: Record<string, unknown>
	/** What the kit's `<form>` element receives. */
	elementProps: Record<string, unknown>
}

/**
 * Split uncontrolled `<Form>` props into the TanStack options and the DOM props.
 *
 * `children` belongs to neither — the caller has already taken it.
 */
export function splitFormProps(props: Record<string, unknown>): SplitProps {
	const options: Record<string, unknown> = {}
	const elementProps: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(props)) {
		if (Object.hasOwn(FORM_OPTION_KEYS, key)) {
			options[key] = value
		} else {
			elementProps[key] = value
		}
	}

	return { options, elementProps }
}
