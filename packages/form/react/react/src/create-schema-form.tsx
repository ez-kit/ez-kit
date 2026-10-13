'use client'

import { useMemo } from 'react'

import { createFormInternals } from './create-form'
import { splitFormProps } from './form-options'
import { FormShell } from './form-shell'
import { FormFactoryName } from './reserved-keys'
import { assertNoReservedFieldKeyCollision } from './schema/registries'
import {
	isSchemaFormControlled,
	renderSchemaFields,
	resolveSchemaValidators,
	schemaDefaultValues,
	stripHiddenValuesOnSubmit,
} from './schema/schema-form'

import type { FormComponentRegistry, NoRegistry } from './contract'
import type { CreateFormOptions } from './create-form'
import type { FormFieldRegistry } from './field-registry'
import type { FormBehaviourOptions } from './form-behaviour'
import type { CustomFieldRegistry } from './schema/registries'
import type {
	AnySchemaFormProps,
	SchemaFormControlledProps,
	SchemaFormUncontrolledImplProps,
	SchemaFormUncontrolledProps,
} from './schema/schema-form'
import type { FormAsyncValidateOrFn, FormOptions, FormValidateOrFn } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * `createForm` plus the config-driven form: the same options, the same bundle, and `SchemaForm`
 * beside it.
 *
 * A separate factory so the schema renderer is reached only by an app that asks for it —
 * `createForm` never names it, so a bundle that writes its forms in JSX does not ship it.
 *
 * The fields are registered **once**, through the same `createForm` internals, so a field
 * registered here is reachable from JSX as `form.RatingField` and from a document as
 * `{ type: 'rating' }`, and the two halves cannot disagree.
 *
 * @example
 * export const { useForm, Form, SchemaForm } = createSchemaForm({
 *   FormElement,
 *   fields: { TextField, NumberField, RatingField },
 *   components: { SubmitButton, Section },
 * })
 *
 * <SchemaForm schema={schema} onSubmit={({ value }) => save(value)} />
 */
export function createSchemaForm<
	TFields extends FormFieldRegistry = NoRegistry,
	TComponents extends FormComponentRegistry = NoRegistry,
>(options: CreateFormOptions<TFields, TComponents> = {}) {
	const { bundle, internals } = createFormInternals<TFields, TComponents>(options, FormFactoryName.CreateSchemaForm)
	const { useForm, FormElement, fields, components, fieldTypeIds } = internals

	/**
	 * The registry, re-keyed by the document id each component name derives — what the schema
	 * renderer resolves a `{ type: 'rating' }` node against. The ids were derived (and validated)
	 * by the shared internals, so this is a lookup and cannot fail.
	 *
	 * This is the **only** field registration site — `SchemaForm` has no `fields` prop. The
	 * built-in ids in here (`text`, `number`, …) are unreachable by construction:
	 * `isCustomFieldNode` pulls them out before `RenderNode` ever consults this map, so a replaced
	 * `TextField` still goes through its own bespoke binder.
	 */
	const customFieldsById: CustomFieldRegistry = Object.fromEntries(
		Object.entries(fieldTypeIds).map(([id, key]) => [id, fields[key] as CustomFieldRegistry[string]]),
	)

	/**
	 * Uncontrolled mode for `SchemaForm`, split out for the same reason as `createForm`'s
	 * `UncontrolledForm` — the hook must run unconditionally.
	 */
	function UncontrolledSchemaForm<
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
	>(
		props: SchemaFormUncontrolledProps<
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
		>,
	): ReactNode {
		const { schema, translate, keepHiddenValues, blocks, rules, form: _ignored, ...rest } = props
		assertNoReservedFieldKeyCollision(blocks)
		const { options, elementProps } = splitFormProps(rest)
		// Spec §4.6: the schema's own `defaultValue` entries seed the form when the caller
		// supplies none — theirs wins whenever they do.
		const defaultValues = {
			...schemaDefaultValues(schema),
			...(options.defaultValues as Record<string, unknown> | undefined),
		}
		// Spec §7.4, §9.3: the schema's `validate` constraints drive `validators.onChange` /
		// `onSubmit`, or the caller's own `validators` are used verbatim — never both. This
		// only works because this component is the one calling `useForm` — same reason
		// `stripHiddenValuesOnSubmit` below only exists in this mode.
		//
		// Memoised: `resolveSchemaValidators` re-walks the whole schema tree, and when the
		// schema declares constraints it builds a brand-new `buildValidator` instance and a
		// brand-new `{ onChange, onSubmit }` object each call. Without this, `useForm` would
		// receive a differently-identitied `validators` value on every render — the same
		// reason `fields` and the merged instance below are memoised.
		const validators = useMemo(
			() => resolveSchemaValidators(schema, options.validators, rules, translate),
			[schema, options.validators, rules, translate],
		)
		// Spec §6: strip fields the schema currently hides out of the submitted value, unless
		// the caller opted out with `keepHiddenValues`. This only works because this component
		// is the one calling `useForm` — see `stripHiddenValuesOnSubmit`'s doc comment on why
		// the controlled overload below cannot do the same.
		const instance = useForm({
			...options,
			validators,
			onSubmit: stripHiddenValuesOnSubmit(schema, options.onSubmit, keepHiddenValues),
			defaultValues,
		} as FormOptions<
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
		> &
			FormBehaviourOptions<TFormData>)

		return (
			<FormShell
				form={instance}
				FormElement={FormElement}
				elementProps={elementProps}
			>
				{renderSchemaFields(schema, instance, components, translate, customFieldsById, blocks)}
			</FormShell>
		)
	}

	/**
	 * Renders one bound field component per field node in `schema`, through the very same
	 * `form.TextField` / `form.NumberField` / … components the JSX API exposes — see
	 * `renderNode`. A config-driven form and a hand-written one therefore produce identical
	 * DOM.
	 *
	 * Two overloads for the same reason as `Form`: TypeScript does not infer generics
	 * through a union target.
	 */
	function SchemaForm<TValues>(props: SchemaFormControlledProps<TValues, TFields>): ReactNode
	function SchemaForm<
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
	>(
		props: SchemaFormUncontrolledProps<
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
		>,
	): ReactNode
	function SchemaForm(props: AnySchemaFormProps): ReactNode {
		if (isSchemaFormControlled<unknown, TFields>(props)) {
			const { form, schema, translate, blocks, rules: _rules, ...elementProps } = props
			assertNoReservedFieldKeyCollision(blocks)
			return (
				<FormShell
					form={form}
					FormElement={FormElement}
					elementProps={elementProps}
				>
					{renderSchemaFields(schema, form, components, translate, customFieldsById, blocks)}
				</FormShell>
			)
		}

		// Overload resolution has already checked the caller; the implementation signature is
		// deliberately the loose one, so the shape is spelled out again for the inner component.
		return <UncontrolledSchemaForm {...(props as SchemaFormUncontrolledImplProps)} />
	}

	return { ...bundle, SchemaForm }
}

/**
 * The bundle `createSchemaForm` returns — `FormBundle` plus `SchemaForm`.
 *
 * Spelled with an explicit instantiation for the reason `FormBundle` is: a bare
 * `ReturnType<typeof createSchemaForm>` instantiates at the constraint and loses the app's own
 * field kinds.
 */
export type SchemaFormBundle<
	TFields extends FormFieldRegistry = NoRegistry,
	TComponents extends FormComponentRegistry = NoRegistry,
> = ReturnType<typeof createSchemaForm<TFields, TComponents>>
