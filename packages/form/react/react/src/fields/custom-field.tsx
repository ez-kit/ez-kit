import { useRef } from 'react'

import { BASE_FIELD_PROP_KEYS } from '../field-registry'
import { fieldControlProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'
import { propsOutside } from '../kit-props'

import type { BindableForm } from '../bindable-form'
import type { BaseFieldProps } from '../field-props'
import type { CustomFieldRenderProps } from '../schema/registries'
import type { ReactNode } from 'react'

/** The flat props a custom field's JSX call site writes: the binding, plus the author's own. */
type FlatCustomFieldProps = BaseFieldProps<unknown, unknown> & Record<string, unknown>

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
	const next = propsOutside(props, BASE_FIELD_PROP_KEYS)
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
 * {@link CustomFieldRenderProps} shape: the same binding, `value` and `onChange` — assembled by
 * `fieldControlProps`, which `form.Field` hands its own control too — and the same nested `props`.
 * One component therefore serves both entry points.
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
						{...fieldControlProps(field, typeId, { label, description, disabled, required, validate })}
						props={authored}
					/>
				)}
			</form.AppField>
		)
	}
}
