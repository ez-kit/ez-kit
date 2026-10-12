import type { FormFieldSlots } from './contract'
import type { FormFieldRegistry } from './field-registry'
import type { KitFormApi } from './kit-form'

/**
 * `any`, named once, for the twelve TanStack parameters `FormInstance` deliberately leaves open.
 *
 * TanStack's `FormApi` is invariant in its validator parameters — they appear in both argument and
 * return positions through `options.listeners` and `_handleSubmit` — so no non-`any` default is a
 * supertype of an instance that has validators: `undefined | FormValidateOrFn<T>` rejects
 * `useForm({ validators: { onChange } })`, and `unknown` for the submit meta rejects one whose meta
 * is `undefined`. TanStack's own `AnyFormApi` makes the same trade. Values and field names stay
 * typed, because they come from `TValues` and `TFields`, not from these.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Open = any

/**
 * The form instance `useForm` returns, as a name an app can write: a component that receives a
 * form of a known shape types its prop with this.
 *
 * Replaces `KitFormApi`, `BoundForm`, `RendererForm` and `BoundFieldApi` on the public surface. The
 * full twelve-parameter shape stays internal — `useForm` needs it to infer validators — and is
 * assignable to this one.
 */
export type FormInstance<TValues, TFields extends FormFieldRegistry = FormFieldSlots> = KitFormApi<
	TValues,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	TFields
>
