import type { FormComponents, FormFieldSlots } from './contract'
import type { FormFieldRegistry } from './field-registry'
import type { ReactNode } from 'react'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * Every key of {@link FormComponents}, as a runtime list.
 *
 * `satisfies Record<keyof FormComponents, true>` is what keeps it honest: add a slot to the
 * contract and this object stops satisfying it, so the omission is a compile error here rather
 * than a slot the guard silently stops checking.
 */
const COMPONENT_KEYS = {
	ArrayField: true,
	ArrayItem: true,
	Button: true,
	Form: true,
	Section: true,
	GridItem: true,
	Wizard: true,
} satisfies Record<keyof FormComponents, true>

/**
 * Every key of {@link FormFieldSlots}, as a runtime list, kept honest the same way.
 *
 * Exported because it is the only enumeration of the twelve built-ins that cannot drift from
 * the contract, which makes it what `field-registry.test.ts` drives the id derivation from.
 */
export const FIELD_KEYS = {
	TextField: true,
	NumberField: true,
	TextareaField: true,
	SelectField: true,
	CheckboxField: true,
	SwitchField: true,
	RadioGroupField: true,
	SliderField: true,
	MultiSelectField: true,
	CheckboxGroupField: true,
	DateField: true,
	DateRangeField: true,
} satisfies Record<keyof FormFieldSlots, true>

/**
 * The two bags `createForm` takes, named so the guard's message can point at the half of the
 * option a reader has to fix rather than at `createForm` in general.
 *
 * A `const` object plus a same-named union rather than a bare `'components' | 'fields'`, per the
 * project's closed-set rule: the parameter type and the call sites were four spellings of one
 * two-member set with nothing linking them, so adding a third bag or renaming one would have let
 * them drift until the guard named an option that no longer exists.
 */
export const GuardedOption = {
	Components: 'components',
	Fields: 'fields',
} as const

export type GuardedOption = (typeof GuardedOption)[keyof typeof GuardedOption]

/**
 * Stands in for a component the kit did not supply: renders nothing, and says so once.
 *
 * Once per placeholder rather than once per render — a missing field inside a list would
 * otherwise print a line per row per render, burying the one message that matters.
 *
 * `option` names the bag the slot belongs to, so the message points at the half of
 * `createForm` the reader has to fix rather than at `createForm` in general.
 */
function createMissingComponent(key: string, option: GuardedOption): () => ReactNode {
	let hasWarned = false
	return function MissingFormComponent(): ReactNode {
		if (IS_DEV && !hasWarned) {
			hasWarned = true
			console.warn(
				`[form] The UI kit supplied no "${key}", so nothing is rendered in its place. ` +
					`Pass it through createForm({ ${option} }) — see https://ez-kit-docs.vercel.app/docs/form/custom-kit`,
			)
		}
		return null
	}
}

/**
 * Fills the gaps in the **chrome** set with warn-once placeholders that render nothing.
 *
 * A kit written in TypeScript cannot reach this: `CreateFormOptions.components` is
 * `FormComponents`, every member required, so a forgotten slot is a compile error. The guard
 * exists for the cases the type system does not see — a kit consumed from JavaScript, one
 * assembled at runtime from a spread, and a kit built against an older version of the
 * contract than the adapter it runs on.
 *
 * What it buys is a **named** failure. Without it a missing slot reaches React as `undefined`
 * and dies on first render with "Element type is invalid", naming neither the slot nor the kit;
 * the rest of the form dies with it. Here the one component goes blank, the console names it,
 * and everything else still renders — which is also what makes a partially-implemented kit
 * usable while it is being written.
 *
 * Applied once per `createForm` call, so the placeholder identities are as stable as the real
 * components and React never remounts on their account.
 */
export function guardComponents(components: FormComponents): FormComponents {
	const guarded = { ...components } as Record<keyof FormComponents, unknown>

	for (const key of Object.keys(COMPONENT_KEYS) as (keyof FormComponents)[]) {
		if (typeof guarded[key] !== 'function') guarded[key] = createMissingComponent(key, GuardedOption.Components)
	}

	return guarded as FormComponents
}

/**
 * The same for the **field** registry, with one difference that follows from the registry
 * being open.
 *
 * An open registry has no key list to check a caller's set against, so this can only assert
 * the twelve built-ins — a key the app invented is, by construction, a key nothing can say is
 * missing. That is the correct scope, not an oversight: widening it would mean inventing a
 * required set for something whose whole point is that the set is the author's.
 *
 * Extra keys are passed through untouched; only absent built-ins are filled.
 */
export function guardFields(fields: FormFieldRegistry): FormFieldRegistry {
	const guarded = { ...fields } as Record<string, unknown>

	for (const key of Object.keys(FIELD_KEYS)) {
		if (typeof guarded[key] !== 'function') guarded[key] = createMissingComponent(key, GuardedOption.Fields)
	}

	return guarded as FormFieldRegistry
}
