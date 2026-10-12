'use client'

import { useFieldGroup as useTanStackFieldGroup } from '@tanstack/react-form'
import { useMemo } from 'react'

import type { NoRegistry } from './contract'
import type { FormInstance } from './form-instance'
import type { FieldGroupInstance } from './group-types'
import type { DeepKeysOfType, FieldsMap } from '@tanstack/form-core'
import type { PropsWithChildren, ReactNode } from 'react'

/** What `useFieldGroup` and a `withFieldGroup` block take: the parent form and where the group lies in it. */
export type FieldGroupOptions<TFormData, TGroup> = {
	form: FormInstance<TFormData, NoRegistry, NoRegistry>
	fields: DeepKeysOfType<TFormData, TGroup | null | undefined> | FieldsMap<TFormData, TGroup>
	defaultValues?: TGroup
}

type GroupSource = {
	form: { NativeField: (props: object) => ReactNode }
	getFormFieldOptions: <TOptions extends { name: string }>(props: TOptions) => TOptions
}

/**
 * TanStack's field group, plus `NativeField`.
 *
 * TanStack's own hook, re-exported until now, types `form` as its `FormApi`, which the instance no
 * longer satisfies once `FormGroup` (and, next, `Field`) is retyped with `Omit` (a `private` member
 * does not survive it). The group itself is TanStack's, created once per component; `NativeField`
 * maps `name` through the group's `fields` with TanStack's own `getFormFieldOptions` and renders the
 * form's `NativeField`.
 *
 * Like TanStack's, the group is read on the first render only: a `fields` changed after mount is
 * not picked up.
 */
export function useFieldGroup<TFormData, TGroup>(
	options: FieldGroupOptions<TFormData, TGroup>,
): FieldGroupInstance<TGroup> {
	const group = useTanStackFieldGroup(options as never) as unknown as GroupSource
	return useMemo(() => {
		const NativeField = (props: { name: string }): ReactNode => (
			<group.form.NativeField {...group.getFormFieldOptions(props)} />
		)
		return Object.assign(group, { NativeField })
	}, [group]) as unknown as FieldGroupInstance<TGroup>
}

/**
 * A reusable block of fields, typed by its own shape and placed in any form through `fields`.
 *
 * Built on `useFieldGroup` rather than on TanStack's `withFieldGroup` for the reason `useFieldGroup`
 * gives. It is the same function in every bundle until stage 5 gives groups the bundle's flat fields.
 */
export function withFieldGroup<TGroup, TSubmitMeta = never, TRenderProps extends object = Record<never, never>>({
	render,
	props,
	defaultValues,
}: {
	defaultValues?: TGroup
	props?: TRenderProps
	render: (
		props: PropsWithChildren<NoInfer<TRenderProps> & { group: FieldGroupInstance<TGroup, TSubmitMeta> }>,
	) => ReactNode
}): <TFormData>(params: PropsWithChildren<NoInfer<TRenderProps> & FieldGroupOptions<TFormData, TGroup>>) => ReactNode {
	return function FieldGroupBlock(params) {
		const group = useFieldGroup({ form: params.form, fields: params.fields, defaultValues })
		// The spread of two generic object types, which TypeScript cannot prove equal to the declared props.
		return render({ ...props, ...params, group } as never)
	}
}
