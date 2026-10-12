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
 *
 * It forwards **every** prop it receives, not only the three the binders pass: the instance's
 * `AppField` keeps TanStack's type, so a caller can hand it `listeners`, `defaultValue`, `mode`,
 * `asyncDebounceMs`, … and each of them has to reach TanStack's `Field` rather than compile and
 * vanish.
 */
export function createFieldBinding(NativeField: NativeFieldLike): BindableForm['AppField'] {
	return function FieldBinding({ children, ...options }): ReactNode {
		return <NativeField {...options}>{children}</NativeField>
	}
}

/**
 * TanStack's `Field`, read once.
 *
 * Read **before** the instance's `AppField` is replaced by the seam. The `??` guard is defensive:
 * TanStack's `AppField` and a field group's members read `form.Field` at render, so a capture that
 * ever re-ran on an instance this package had already augmented — a future memo shape, say —
 * would find `NativeField` and keep it rather than read whatever `Field` is by then. Today it never
 * fires: React's StrictMode calls the memo factory twice **before** the assign, and a `formId`
 * change gives TanStack a fresh instance. It becomes load-bearing once this package assigns its
 * own `form.Field`.
 *
 * Only the capture lives here; `useForm` builds the seam itself with {@link createFieldBinding},
 * so the call crosses this module's boundary and a test that wraps the export watches the real
 * path.
 */
export function nativeFieldOf(form: { Field: NativeFieldLike; NativeField?: NativeFieldLike }): NativeFieldLike {
	return form.NativeField ?? form.Field
}
