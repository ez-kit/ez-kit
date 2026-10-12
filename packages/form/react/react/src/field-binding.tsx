'use client'

import type { BindableForm, BoundFieldApi, BoundFieldValidators } from './bindable-form'
import type { ReactNode } from 'react'

/** TanStack's render-prop `Field`, at the shape this package calls it with. */
export type NativeFieldLike = (props: {
	name: string
	validators?: BoundFieldValidators | undefined
	children: (field: BoundFieldApi) => ReactNode
}) => ReactNode

/**
 * The one component every bound field reaches TanStack through.
 *
 * It replaces TanStack's own `AppField` on the instance (see `useForm` in `create-form.tsx`), so
 * the twelve built-in binders, the generic binder of a registered field, `form.Field`, the fields
 * of an array entry and of a group, and the schema renderer's custom node all pass here — and only
 * `form.NativeField` does not. Behaviour that has to see every field a user can address through
 * this package attaches here rather than to each binder.
 */
export function createFieldBinding(NativeField: NativeFieldLike): BindableForm['AppField'] {
	return function FieldBinding({ name, validators, children }): ReactNode {
		return (
			<NativeField
				name={name}
				validators={validators}
			>
				{children}
			</NativeField>
		)
	}
}

/**
 * TanStack's `Field`, read once.
 *
 * Read **before** the instance's `AppField` is replaced by the seam, and idempotently: TanStack's
 * `AppField` and a field group's members read `form.Field` at render, so once this package assigns
 * its own `Field`, reading `form.Field` again would capture ours. A memo that re-runs on an
 * instance it already augmented — React's StrictMode double render — finds `NativeField` and keeps
 * it.
 *
 * Only the capture lives here; `useForm` builds the seam itself with {@link createFieldBinding},
 * so the call crosses this module's boundary and a test that wraps the export watches the real
 * path.
 */
export function nativeFieldOf(form: { Field: NativeFieldLike; NativeField?: NativeFieldLike }): NativeFieldLike {
	return form.NativeField ?? form.Field
}
