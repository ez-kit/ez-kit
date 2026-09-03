import { runFieldValidate } from '@ez-kit/form-core'

import type { BoundFieldValidators } from './bindable-form'
import type { FieldConstraintKey, FieldValidate } from '@ez-kit/form-core'

/**
 * The flat fields' `validate` prop: the schema's own `FieldValidate` vocabulary, minus the
 * two keys that only mean something to a **document**.
 *
 * Sharing the vocabulary is the point — `validate={{ maxLength: 2 }}` in JSX and
 * `validate: { maxLength: 2 }` in a schema node compile to the same call into
 * `@ez-kit/form-core`'s engine — so this subtracts rather than reinvents.
 *
 * **`rule` is not available here.** It names a rule in a registry because JSON cannot carry
 * code; JSX can. There is no registry on this side to look a name up in, so the honest
 * answers were "forbid it" or "throw at the first keystroke", and forbidding wins: a JSX
 * caller who needs custom logic already has two better spellings than a string indirection —
 * a TanStack field validator, or a standard-schema validator (zod / valibot / arktype) on
 * the form. `rule?: never` also rejects a whole `FieldValidate` object handed straight in,
 * which is exactly the case worth catching; `fieldValidators` throws for anything that
 * reaches runtime past a cast.
 *
 * **`messages` takes plain strings here, not `LocalizedText`.** Resolving a
 * `{ key, params }` message needs a `translate`, and `translate` is a prop of
 * `<FormRenderer>` — the schema-driven component — not of `<Form>` or `useForm`. Rather
 * than invent a second translate channel for the JSX API, or accept a key that could only
 * ever throw when the constraint finally fails, the type asks for the finished copy the
 * caller already has in hand.
 */
export type FieldValidateProps = Omit<FieldValidate, 'rule' | 'messages'> & {
	rule?: never
	messages?: Partial<Record<FieldConstraintKey, string>>
}

/**
 * The visual `required` the kit should render, given both props.
 *
 * `validate.required` implies it: a caller who declares the field mandatory must not have to
 * write `required` a second time for the asterisk. An explicit `required={false}` does not
 * override that — the constraint is what the form will actually enforce, so marking the
 * control is the honest thing to do. The bare `required` prop keeps its own job (see
 * {@link BaseFieldProps}) and is passed through untouched otherwise, `undefined` included.
 */
export function resolveRequired(
	required: boolean | undefined,
	validate: FieldValidateProps | undefined,
): boolean | undefined {
	return validate?.required === true ? true : required
}

/**
 * Turn a `validate` prop into the TanStack field validators entry the flat fields hand to
 * `form.AppField`.
 *
 * **`onChange`**, deliberately: it is where the schema side attaches its generated validator
 * too (spec §7.2), so both entry points run at the same moment and both are gated for
 * *display* by the same `isTouched` check in `fieldRenderProps`.
 */
export function fieldValidators(
	name: string,
	validate: FieldValidateProps | undefined,
): BoundFieldValidators | undefined {
	if (validate === undefined) return undefined
	// Widened on purpose: `rule` is typed `never` above, so a bare `validate.rule` is
	// statically dead. The only way one arrives is past a cast — precisely the case a
	// runtime guard is for.
	const { rule } = validate as FieldValidate
	if (rule !== undefined) {
		throw new Error(
			`Field "${name}" passes \`validate.rule\`, which only a FormSchema document can use — there is no rule registry on the JSX side. Write the check as a TanStack validator instead.`,
		)
	}

	return {
		// No `translate`: `messages` is plain strings here, so there is nothing to resolve.
		onChange: ({ value, fieldApi }) => runFieldValidate(value, fieldApi.form.state.values, validate),
	}
}
