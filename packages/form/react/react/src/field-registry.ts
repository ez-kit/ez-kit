import { RESERVED_NODE_TYPES } from '@ez-kit/form-core'

import type { FormFieldSlots } from './contract'
import type { BaseFieldProps, BuiltInFormFieldComponents } from './field-props'
import type { CustomFieldRenderProps } from './schema/registries'
import type { ReactNode } from 'react'

/**
 * The suffix a field slot's name may end in, and which the document id drops.
 *
 * Declared once because two things depend on it agreeing with itself: `fieldTypeIdFor`
 * strips it, and `FormFieldSlots`' twelve keys all carry it.
 */
export const FIELD_NAME_SUFFIX = 'Field'

/**
 * One registered field kind: the component, plus the two phantoms `defineFieldType` writes.
 *
 * Both markers are **type-only** — `defineFieldType` returns its argument untouched, so
 * nothing here reaches the bundle and the component's identity is the author's own.
 */
export type FieldTypeDefinition<TProps = Record<string, unknown>, TValue = unknown> = ((
	props: CustomFieldRenderProps<TValue, TProps>,
) => ReactNode) & {
	__props?: TProps
	__value?: TValue
}

/**
 * What `createForm({ fields })` accepts: the kit's twelve slots spread beside whatever the
 * app registers, keyed by component name.
 *
 * The `any` is the same trade `CellTypeRegistry` makes in `@ez-kit/data-grid-react`, and for
 * the same reason: `FormFieldSlots`' twelve members take twelve different, mutually
 * incompatible props shapes, and an arbitrary custom definition takes a thirteenth — no
 * single non-`any` parameter type accepts all of them, because a function parameter is
 * contravariant and `unknown` would reject every one. The real check is not here: it is the
 * kit's own `satisfies FormFieldSlots` on the twelve, `defineFieldType`'s phantoms on the
 * rest, and — for a built-in key — `CreateFormOptions.fields`' `& Partial<FormFieldSlots>`,
 * which re-asserts the twelve at the option where a spread-and-override is written.
 * Narrowing this bound would not buy safety, it would only make a correct kit uncompilable.
 *
 * It cannot be spelled `FieldTypeDefinition<any, any>`, which looks like the same shape and is
 * not: that types the parameter as `CustomFieldRenderProps<any, any>` — a specific object, not
 * `any` — so every built-in slot stops fitting (`TextFieldRenderProps` has `placeholder` and
 * `type`, which `CustomFieldRenderProps` does not). Tried, and it fails on the twelve. The
 * duplication between this bound and {@link FieldTypeDefinition} is therefore real but not
 * removable by naming: one describes what a *registry entry* may be, the other what a
 * *declared* field kind is, and only the second can afford a precise parameter.
 */
export type FormFieldRegistry = Record<
	string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	((props: any) => ReactNode) & { __props?: unknown; __value?: unknown }
>

/**
 * Declares a custom field kind and pins both the props it takes and the value it binds to.
 *
 * Curried so `TProps` and `TValue` can be given explicitly while the definition keeps its
 * own inferred type — the `defineCellType` shape, with **two** parameters rather than one.
 * The second is what a cell type has no need of: a form field is *bound to a value*, and
 * `BaseFieldProps` narrows `name` to the paths whose value type matches. Without `TValue`,
 * `<form.RatingField name='email' />` would compile.
 *
 * `TValue` defaults to `unknown`, which — measured, see `field-registry.test.ts` — makes
 * `DeepKeysOfType<TFormData, unknown>` yield every path in the form data while still
 * rejecting one that does not exist. A field declared without a value type is therefore
 * unnarrowed but not unchecked.
 *
 * @example
 * export const RatingField = defineFieldType<{ max: number }, number>()(({ value, onChange, props }) => (
 *   <Stars value={value} max={props.max} onChange={onChange} />
 * ))
 * // → `<form.RatingField name='score' max={5} />`, and `{ type: 'rating' }` in a document
 */
export function defineFieldType<TProps = Record<string, unknown>, TValue = unknown>() {
	return <TDefinition extends (props: CustomFieldRenderProps<TValue, TProps>) => ReactNode>(
		definition: TDefinition,
	): TDefinition & { __props?: TProps; __value?: TValue } => definition
}

/**
 * The document id a registry key resolves to: drop a trailing `Field`, lowercase the rest.
 *
 * `RatingField` → `rating`, and every one of the twelve built-ins round-trips to its own
 * `FormFieldType` member (asserted in `field-registry.test.ts`, driven from both lists).
 * This direction rather than the reverse because the reverse is lossy — `radiogroup` cannot
 * yield `RadioGroupField`.
 */
export function fieldTypeIdFor(key: string): string {
	const base = key.endsWith(FIELD_NAME_SUFFIX) ? key.slice(0, -FIELD_NAME_SUFFIX.length) : key
	if (base === '') {
		throw new Error(`"${key}" derives an empty field type id. Name the component after the kind it renders.`)
	}
	return base.toLowerCase()
}

/**
 * Every registry key mapped to the document id it derives, checked for the two ways the
 * derivation can go wrong.
 *
 * Run **once, at `createForm` time** — the registry is static, authored config, so the
 * answer cannot change between renders and paying a per-node cost for it would be wasted
 * work (the principle `assertNoReservedFieldKeyCollision` already states for the other
 * registry).
 *
 * It throws when two keys derive one id, and when an id collides with a reserved container
 * node type — without which a slot named `SectionField` would silently shadow `section`.
 * It deliberately does **not** throw when a built-in key derives its own built-in id:
 * replacing a kit's `TextField` at its own key is the whole point of an open registry.
 */
/**
 * The members of the bound field set that are **not** field kinds — the five the builder writes
 * over the registry's own output after the loop.
 *
 * A registry key that collides with one of these is accepted by every other check and then
 * silently overwritten: `form.GridItem` renders the layout component and the author's field
 * never appears, with no error anywhere. Three of the five used to be caught only *by accident*,
 * because their derived ids (`section`, `array`) happen to be reserved node types;
 * `submitbutton` and `griditem` are not, and were not caught at all.
 *
 * `satisfies Record<Exclude<keyof BuiltInFormFieldComponents<unknown>, keyof FormFieldSlots>, true>`
 * is what stops this becoming a hand-written list that drifts from the builder: the five are
 * derived from the bound type, so adding a sixth member there is a compile error here.
 */
export const LAYOUT_COMPONENT_KEYS = {
	SubmitButton: true,
	Section: true,
	GridItem: true,
	ArrayField: true,
	Array: true,
} satisfies Record<Exclude<keyof BuiltInFormFieldComponents<unknown>, keyof FormFieldSlots>, true>

export function deriveFieldTypeIds(fields: FormFieldRegistry): Record<string, string> {
	const ids: Record<string, string> = {}

	for (const key of Object.keys(fields)) {
		const id = fieldTypeIdFor(key)

		if ((RESERVED_NODE_TYPES as readonly string[]).includes(id)) {
			throw new Error(
				`Field "${key}" derives the type id "${id}", which is a reserved node type and would shadow it in a schema document.`,
			)
		}

		if (Object.hasOwn(LAYOUT_COMPONENT_KEYS, key)) {
			throw new Error(
				`Field "${key}" collides with the form's own "${key}" component and would be silently overwritten. Rename it.`,
			)
		}

		const existing = ids[id]
		if (existing !== undefined) {
			throw new Error(`Fields "${existing}" and "${key}" both derive the type id "${id}". Rename one of them.`)
		}

		ids[id] = key
	}

	return ids
}

/**
 * Every key of {@link BaseFieldProps}, as a runtime list — the split the generic binder
 * makes between what binds the field and what the author wrote.
 *
 * `satisfies Record<keyof BaseFieldProps<never, never>, true>` is what keeps it honest: a
 * seventh base prop added later is a compile error here rather than a prop that silently
 * stops reaching the component and starts turning up in its `props` bag instead. (The same
 * technique `COMPONENT_KEYS` uses in `component-guard.tsx`.)
 */
export const BASE_FIELD_PROP_KEYS = {
	name: true,
	label: true,
	description: true,
	disabled: true,
	required: true,
	validate: true,
} satisfies Record<keyof BaseFieldProps<never, never>, true>
