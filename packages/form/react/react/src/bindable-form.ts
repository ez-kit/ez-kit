import type { ReactNode } from 'react'

/** The value types the v1 fields write back into form state. */
export type FieldValue = string | number | boolean | undefined

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
		meta: { errors: readonly unknown[] }
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
