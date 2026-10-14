'use client'

import { useFormGroup as useTanStackFormGroup } from '@tanstack/react-form'
import { useEffect, useMemo } from 'react'

import { scopeFieldProps } from './field-scope'
import { createField } from './fields/field'
import { focusesOnError, focusFirstFieldWithErrors } from './focus-first-error'
import { scopeGroupMembers, withMembers } from './group-fields'
import { hookGroupFields, isPathWithin, warnOnStackedGroups } from './group-registry'
import { formatOwnErrors } from './own-errors'
import { serverErrorsOf } from './server-errors'

import type { BindableForm } from './bindable-form'
import type { NoRegistry } from './contract'
import type { FormFieldRegistry } from './field-registry'
import type { FormInstance } from './form-instance'
import type { GroupHost, NativeGroupApi } from './group-registry'
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
 * TanStack's group object, at the members its submit is built from. `_handleSubmit` is what its own
 * `handleSubmit` calls; it is read rather than `handleSubmit`, which the memo below overwrites — so
 * StrictMode's second run of that memo does not wrap the first one's wrapper.
 */
type NativeSubmit = {
	_handleSubmit: (meta?: unknown) => Promise<void>
	getInfo: NativeGroupApi['getInfo']
}

/**
 * TanStack's form group over the branch `name`, plus `Field` and `NativeField` relative to it, and
 * `errors`: the group's own messages ({@link formatOwnErrors}).
 *
 * `Field` is `createField` over the instance's `AppField` — the binding seam — scoped like
 * `NativeField`, so a form group's own control is bound like every other field.
 *
 * `handleSubmit` submits the branch as a group submit should (R61, R63, R71): it clears the server
 * errors inside the branch, runs the groups mounted inside it after its own fields, and an invalid
 * submit focuses the branch's first error, as the form's `focusOnError` says. The nested groups are
 * hooked on the first submit, because TanStack sets `getInfo().instance` only when the group mounts.
 *
 * TanStack's group object is rebuilt on every change of its state, so the members are built once
 * per form and name and written onto each new object.
 */
export function useFormGroup<TFormData, const TName extends DeepKeys<TFormData>>(
	options: Omit<FormGroupProps<TFormData, TName>, 'children'> & {
		form: FormInstance<TFormData, NoRegistry, NoRegistry>
	},
): FormGroupInstance<TFormData, TName> {
	const group = useTanStackFormGroup({
		...options,
		onGroupSubmitInvalid: (props: unknown) => {
			if (focusesOnError(options.form)) {
				focusFirstFieldWithErrors(options.form, (name) => isPathWithin(options.name, name))
			}
			;(options as { onGroupSubmitInvalid?: (props: unknown) => void }).onGroupSubmitInvalid?.(props)
		},
	} as never) as unknown as object
	useEffect(() => {
		if (process.env.NODE_ENV !== 'production') {
			warnOnStackedGroups(options.form as unknown as GroupHost, options.name)
		}
	}, [options.form, options.name])
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
	return useMemo(() => {
		const native = group as NativeSubmit
		return Object.assign(group, members, {
			errors: formatOwnErrors(Object.values(groupMeta(group).errorMap)),
			handleSubmit: async (meta?: unknown): Promise<void> => {
				serverErrorsOf(options.form)?.clearWhere((field) => isPathWithin(options.name, field))
				const instance = native.getInfo().instance
				if (instance !== null) hookGroupFields(instance, options.form as unknown as GroupHost)
				await native._handleSubmit(meta)
			},
		})
	}, [group, members, options.form, options.name]) as unknown as FormGroupInstance<TFormData, TName>
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
