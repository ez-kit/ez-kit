import { useRef } from 'react'

import { BASE_FIELD_PROP_KEYS } from '../field-registry'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'

import type { BindableForm, FieldValue } from '../bindable-form'
import type { BaseFieldProps } from '../field-props'
import type { CustomFieldRenderProps } from '../schema/registries'
import type { ReactNode } from 'react'

/** The flat props a custom field's JSX call site writes: the binding, plus the author's own. */
type FlatCustomFieldProps = BaseFieldProps<unknown, unknown> & Record<string, unknown>

/**
 * Split a flat call site's props into the binding half and the author's half.
 *
 * The author's keys are whatever is **not** in `BASE_FIELD_PROP_KEYS`, which is the list
 * `satisfies Record<keyof BaseFieldProps<never, never>, true>` keeps in step with the type —
 * so a seventh base prop cannot quietly start arriving in the component's `props` bag.
 *
 * `Object.hasOwn`, not `in`: `BASE_FIELD_PROP_KEYS` is an object literal, so `in` walks
 * `Object.prototype` too and would silently swallow an author prop named `toString`,
 * `constructor`, `valueOf` or any other member of it. The prop would vanish between the call
 * site and the component with nothing reported anywhere.
 */
function authoredProps(props: Record<string, unknown>): Record<string, unknown> {
	const authored: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(props)) {
		if (!Object.hasOwn(BASE_FIELD_PROP_KEYS, key)) authored[key] = value
	}
	return authored
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const keys = Object.keys(a)
	if (keys.length !== Object.keys(b).length) return false
	return keys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
}

/**
 * The author's `props` bag, kept referentially stable while its contents do not change.
 *
 * Without this the split allocates a fresh object every render, and the two entry points stop
 * behaving alike: a document's `node.props` is a stable reference off the schema object, so a
 * field driven from a document keeps its `React.memo` and its `useMemo(…, [props.props])`
 * intact across a parent render while the identical field written in JSX loses both. One
 * component is supposed to serve both paths identically; that is the whole reason the bag is
 * nested, and an identity that depends on which entry point mounted the field would make the
 * claim false in the one way an author actually feels.
 *
 * Shallow rather than deep: it mirrors what `React.memo` and a dependency array compare, so a
 * bag this hook calls unchanged is exactly a bag those two would also treat as unchanged.
 */
function useStableAuthoredProps(props: Record<string, unknown>): Record<string, unknown> {
	const next = authoredProps(props)
	const previous = useRef(next)

	if (previous.current !== next && !shallowEqual(previous.current, next)) previous.current = next

	return previous.current
}

/**
 * Build the component for a field kind the kit did not declare — the one generic binder,
 * used for every registry key that is not one of the twelve built-ins.
 *
 * It is the JSX counterpart of the `AppField` block `RenderNode` already hand-writes for a
 * schema document's custom field node, and hands the component the same values in the same
 * {@link CustomFieldRenderProps} shape: same binding through `fieldRenderProps`, same `value` /
 * `onChange`, same nested `props`. One component therefore serves both entry points.
 *
 * `disabled` is the one prop the two paths do not spell identically: `RenderNode` always
 * computes a boolean — `false` when the node declares no `disabledWhen` — while a call site
 * here that omits the prop passes `undefined`. Both falsy, both rendered the same by every
 * kit, so this is a difference in spelling rather than in behaviour and is deliberately not
 * normalised by a binder. It is why the parity test pins `disabled={false}` explicitly.
 *
 * The one deliberate difference from the schema side: `validate` is passed through
 * `fieldValidators`, as every built-in binder does, because a JSX caller's constraints have
 * nowhere else to run. A document's constraints are compiled into the *form*-level validator
 * instead, so the render-node version passes `validate: undefined` — attaching them per field
 * as well would run every constraint twice.
 */
export function createCustomField(
	form: BindableForm,
	typeId: string,
	Component: (props: CustomFieldRenderProps) => ReactNode,
): (props: FlatCustomFieldProps) => ReactNode {
	return function CustomField(props: FlatCustomFieldProps): ReactNode {
		const { name, label, description, disabled, required, validate } = props
		const authored = useStableAuthoredProps(props)

		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<Component
						{...fieldRenderProps(field, typeId, { label, description, disabled, required, validate })}
						value={field.state.value}
						onChange={(value: unknown) => {
							// A custom field's value type is the author's, and `FieldValue` enumerates the
							// built-in ones — the same cast `RenderNode`'s custom branch makes, for the
							// same reason.
							field.handleChange(value as FieldValue)
						}}
						props={authored}
					/>
				)}
			</form.AppField>
		)
	}
}
