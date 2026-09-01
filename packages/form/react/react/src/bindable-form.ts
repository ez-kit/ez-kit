import type { DateRangeValue } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * The value types the v1 fields write back into form state.
 *
 * Two of them are composite. A multi-select holds `string[]`, and a date range holds one
 * `{ start, end }` object: each is a single field under a single `name`, never a pair of
 * sibling paths — see the `daterange` node in `@ez-kit/form-core`'s `schema.ts`.
 */
export type FieldValue = string | number | boolean | string[] | DateRangeValue | undefined

/**
 * The slice of a TanStack field the flat wrappers read.
 *
 * `AnyFieldApi` erases the field's value type to `any`, which would spread untyped values
 * through every wrapper. Narrowing to exactly what the wrappers touch keeps the render path
 * free of `any` while the consumer-facing `name` prop stays precisely typed.
 */
export type BoundFieldApi = {
	name: string
	handleBlur: () => void
	handleChange: (value: FieldValue) => void
	state: {
		value: unknown
		/**
		 * `isTouched` gates whether the field's errors are *displayed* — see
		 * `fieldRenderProps`. TanStack sets it on the field's first change (`setFieldValue`)
		 * or blur, and on every field at submit, which is exactly the "has the user had a go
		 * at this yet?" question error display has to ask.
		 */
		meta: { errors: readonly unknown[]; isTouched: boolean }
	}
}

/** The one member `<Form>` needs from an instance to wire the `<form>` element's submit. */
export type SubmittableForm = {
	handleSubmit: () => Promise<void>
}

/**
 * The slice of the TanStack Form instance the flat field components actually use.
 *
 * The real `useAppForm` return type carries a dozen inference-driven generics; threading
 * them through every wrapper would add no safety here, because the wrappers only ever
 * touch these three members. So the instance is narrowed to this structural type once, at
 * the `createForm` boundary, and stays fully typed for the consumer.
 */
export type BindableForm = SubmittableForm & {
	AppField: (props: { name: string; children: (field: BoundFieldApi) => ReactNode }) => ReactNode
	Subscribe: <TSelected>(props: {
		selector: (state: SubmitState) => TSelected
		children: (selected: TSelected) => ReactNode
	}) => ReactNode
}

/** The form-state members `SubmitButton` subscribes to. */
export type SubmitState = {
	canSubmit: boolean
	isSubmitting: boolean
}
