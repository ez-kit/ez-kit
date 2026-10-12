import type { FormFieldSlots } from './contract'
import type { FormFieldRegistry } from './field-registry'
import type { KitFormApi } from './kit-form'
import type { FormAsyncValidateOrFn, FormOptions, FormValidateOrFn } from '@ez-kit/form-core'
import type { FunctionComponent, PropsWithChildren } from 'react'

/**
 * One composed block: the component `withForm` returns, and the shape of the `render` prop
 * it was built from.
 *
 * The only thing that differs from TanStack's own `WithFormProps['render']` is `form`:
 * TanStack types it as `AppFieldExtendedReactFormApi<…>` — parameterised by the components
 * injected through `createFormHook`, and we inject none — while the kit's flat field
 * components are attached afterwards in `useForm`. Spelling it as `KitFormApi` here is what
 * makes `form.TextField` compile inside a block; see spec §12.
 *
 * `NoInfer<TRenderProps>` mirrors TanStack: the extra render props are inferred from the
 * `props` option, never from the render function's own parameter.
 */
export type KitFormBlock<
	TFormData,
	TOnMount extends undefined | FormValidateOrFn<TFormData>,
	TOnChange extends undefined | FormValidateOrFn<TFormData>,
	TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TOnBlur extends undefined | FormValidateOrFn<TFormData>,
	TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
	TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
	TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
	TSubmitMeta,
	TRenderProps extends object,
	/**
	 * Bound by the factory, never by the consumer: `withForm` is declared inside
	 * `createForm<TFields>`, so the app's registry is already in lexical scope there and the
	 * call site writes nothing. Defaulted so every existing twelve-argument spelling of this
	 * type keeps compiling and keeps meaning "the kit's twelve".
	 *
	 * Without it a block sees `FormFieldSlots` while the instance it is handed carries the
	 * app's fields too, and `<form.RatingField />` inside a block is a compile error against a
	 * form that demonstrably has one.
	 */
	TFields extends FormFieldRegistry = FormFieldSlots,
> = FunctionComponent<
	PropsWithChildren<
		NoInfer<TRenderProps> & {
			form: KitFormApi<
				TFormData,
				TOnMount,
				TOnChange,
				TOnChangeAsync,
				TOnBlur,
				TOnBlurAsync,
				TOnSubmit,
				TOnSubmitAsync,
				TOnDynamic,
				TOnDynamicAsync,
				TOnServer,
				TSubmitMeta,
				TFields
			>
		}
	>
>

/**
 * What `withForm` takes: the form options the block is typed against — the same list
 * `useForm` accepts, so validator and submit-meta inference survives — plus the render
 * function and the optional extra props handed to it.
 */
export type KitWithFormProps<
	TFormData,
	TOnMount extends undefined | FormValidateOrFn<TFormData>,
	TOnChange extends undefined | FormValidateOrFn<TFormData>,
	TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TOnBlur extends undefined | FormValidateOrFn<TFormData>,
	TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
	TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
	TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
	TSubmitMeta,
	TRenderProps extends object,
	/** Bound by the factory — see {@link KitFormBlock}'s own `TFields`. */
	TFields extends FormFieldRegistry = FormFieldSlots,
> = FormOptions<
	TFormData,
	TOnMount,
	TOnChange,
	TOnChangeAsync,
	TOnBlur,
	TOnBlurAsync,
	TOnSubmit,
	TOnSubmitAsync,
	TOnDynamic,
	TOnDynamicAsync,
	TOnServer,
	TSubmitMeta
> & {
	props?: TRenderProps
	render: KitFormBlock<
		TFormData,
		TOnMount,
		TOnChange,
		TOnChangeAsync,
		TOnBlur,
		TOnBlurAsync,
		TOnSubmit,
		TOnSubmitAsync,
		TOnDynamic,
		TOnDynamicAsync,
		TOnServer,
		TSubmitMeta,
		TRenderProps,
		TFields
	>
}
