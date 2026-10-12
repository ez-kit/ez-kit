'use client'

import { useFormGroup as useTanStackFormGroup } from '@tanstack/react-form'
import { useMemo } from 'react'

import { scopeFieldProps } from './field-scope'
import { createField } from './fields/field'

import type { BindableForm } from './bindable-form'
import type { NoRegistry } from './contract'
import type { FormInstance } from './form-instance'
import type { FormGroupComponentOf, FormGroupInstance, FormGroupProps } from './group-types'
import type { DeepKeys } from '@tanstack/form-core'
import type { ReactNode } from 'react'

type NameScoped = (props: { name: string }) => ReactNode

/**
 * `Inner` with its names read relative to `prefix` — `name` and the validators' listen-to lists
 * ({@link scopeFieldProps}); `[0].label` under `tags` is `tags[0].label`. Every other prop is
 * passed through, so it scopes TanStack's `Field` and the binding seam alike.
 */
export function scopeName<TProps extends { name: string }>(
	Inner: (props: TProps) => ReactNode,
	prefix: string,
): (props: TProps) => ReactNode {
	return function Scoped(props) {
		return <Inner {...scopeFieldProps(props, prefix)} />
	}
}

/**
 * TanStack's form group over the branch `name`, plus `Field` and `NativeField` relative to it.
 *
 * `Field` is `createField` over the instance's `AppField` — the binding seam — scoped like
 * `NativeField`, so a form group's own control is bound like every other field.
 *
 * TanStack's group object is rebuilt on every change of its state, so the members are built once
 * per form and name and written onto each new object.
 */
export function useFormGroup<TFormData, const TName extends DeepKeys<TFormData>>(
	options: Omit<FormGroupProps<TFormData, TName>, 'children'> & {
		form: FormInstance<TFormData, NoRegistry, NoRegistry>
	},
): FormGroupInstance<TFormData, TName> {
	const group = useTanStackFormGroup(options as never) as unknown as object
	const { NativeField: native, AppField: appField } = options.form as unknown as {
		NativeField: NameScoped
		AppField: BindableForm['AppField']
	}
	const members = useMemo(
		() => ({
			Field: createField({ AppField: scopeName(appField, options.name) }),
			NativeField: scopeName(native, options.name),
		}),
		[appField, native, options.name],
	)
	return useMemo(() => Object.assign(group, members), [group, members]) as unknown as FormGroupInstance<
		TFormData,
		TName
	>
}

/** `form.FormGroup`: `useFormGroup` over this form, rendering `children(group)`. */
export function createFormGroup<TFormData>(
	form: FormInstance<TFormData, NoRegistry, NoRegistry>,
): FormGroupComponentOf<TFormData> {
	return function FormGroup({ children, ...options }: FormGroupProps<TFormData, DeepKeys<TFormData>>): ReactNode {
		const group = useFormGroup({ ...options, form })
		return children(group)
	} as FormGroupComponentOf<TFormData>
}
