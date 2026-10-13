'use client'

import { useFormGroup as useTanStackFormGroup } from '@tanstack/react-form'
import { useMemo } from 'react'

import { scopeFieldProps } from './field-scope'
import { createField } from './fields/field'
import { scopeGroupMembers, withMembers } from './group-fields'
import { formatOwnErrors } from './own-errors'

import type { BindableForm } from './bindable-form'
import type { NoRegistry } from './contract'
import type { FormFieldRegistry } from './field-registry'
import type { FormInstance } from './form-instance'
import type { FormGroupComponentOf, FormGroupInstance, FormGroupProps } from './group-types'
import type { DeepKeys } from '@tanstack/form-core'
import type { ReactNode } from 'react'

type NameScoped = (props: { name: string }) => ReactNode

/** The slice of TanStack's group state `errors` is read from. */
type GroupMeta = { errorMap: Record<string, unknown> }

function groupMeta(group: object): GroupMeta {
	return (group as { state: { meta: GroupMeta } }).state.meta
}

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
 * TanStack's form group over the branch `name`, plus `Field` and `NativeField` relative to it, and
 * `errors`: the group's own messages ({@link formatOwnErrors}).
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
	return useMemo(
		() => Object.assign(group, members, { errors: formatOwnErrors(Object.values(groupMeta(group).errorMap)) }),
		[group, members],
	) as unknown as FormGroupInstance<TFormData, TName>
}

/**
 * `form.FormGroup`: `useFormGroup` over this form, rendering `children(scope)` — the group plus the
 * bundle's flat fields under `memberKeys`, each named relative to the group (R69).
 */
export function createFormGroup<TFormData, TFields extends FormFieldRegistry>(
	form: FormInstance<TFormData, NoRegistry, NoRegistry>,
	memberKeys: readonly string[],
): FormGroupComponentOf<TFormData, TFields> {
	return function FormGroup({
		children,
		...options
	}: FormGroupProps<TFormData, DeepKeys<TFormData>, TFields>): ReactNode {
		const group = useFormGroup({ ...options, form })
		const members = useMemo(
			() => scopeGroupMembers(form, memberKeys, (props) => scopeFieldProps(props, options.name)),
			[options.name],
		)
		const scope = useMemo(() => withMembers(group, members), [group, members])
		return children(scope as never)
	} as FormGroupComponentOf<TFormData, TFields>
}
