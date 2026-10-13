'use client'

import { useFieldGroup as useTanStackFieldGroup } from '@tanstack/react-form'
import { useMemo } from 'react'

import { createField } from './fields/field'
import { missingFormMessage, useOptionalFormContext } from './form-context'
import { useFormGroup } from './form-group'
import { scopeGroupMembers, withMembers } from './group-fields'

import type { BindableForm } from './bindable-form'
import type { NoRegistry } from './contract'
import type { FormFieldRegistry } from './field-registry'
import type { AnyFormInstance } from './form-context'
import type { FormInstance } from './form-instance'
import type { FieldGroupBlock, FieldGroupInstance, WithFieldGroupOptions } from './group-types'
import type { DeepKeysOfType, FieldsMap } from '@tanstack/form-core'
import type { ReactNode } from 'react'

/** What `useFieldGroup` and a `withFieldGroup` block take: the parent form and where the group lies in it. */
export type FieldGroupOptions<TFormData, TGroup> = {
	form: FormInstance<TFormData, NoRegistry, NoRegistry>
	fields: DeepKeysOfType<TFormData, TGroup | null | undefined> | FieldsMap<TFormData, TGroup>
	defaultValues?: TGroup
}

type GroupSource = {
	AppField: BindableForm['AppField']
	form: { NativeField: (props: object) => ReactNode }
	getFormFieldOptions: <TOptions extends { name: string }>(props: TOptions) => TOptions
}

/**
 * TanStack's field group, with this package's `Field`, plus `NativeField`.
 *
 * TanStack's own hook, re-exported until now, types `form` as its `FormApi`, which the instance no
 * longer satisfies once `FormGroup` (and, next, `Field`) is retyped with `Omit` (a `private` member
 * does not survive it). The group itself is TanStack's, created once per component; `NativeField`
 * maps `name` through the group's `fields` with TanStack's own `getFormFieldOptions` and renders the
 * form's `NativeField`.
 *
 * `Field` **must** be overwritten here: TanStack's own `group.Field` renders the instance's `Field`,
 * which is this package's by now, so it would hand the author a mapped name to a component that
 * expects a render prop of control props — and type it as TanStack's. Ours is `createField` over the
 * group's `AppField`, which TanStack builds to map the name through `fields` and render the
 * instance's `AppField` — the binding seam.
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
		return Object.assign(group, { Field: createField({ AppField: group.AppField }), NativeField })
	}, [group]) as unknown as FieldGroupInstance<TGroup>
}

type AnyPlacement = {
	form?: AnyFormInstance | undefined
	fields: string | Record<string, string>
	/**
	 * Typed per block at the placement; here only passed on. TanStack calls it with
	 * `{ value, groupApi, meta }`, a superset of the documented `{ value, meta }`.
	 */
	onGroupSubmit?: ((props: never) => unknown) | undefined
	children?: ReactNode
}

/**
 * The bundle's `withFieldGroup`, over the members its `fields` registry binds (R69, R23).
 *
 * A reusable block of fields, typed by its own shape and placed in any form through `fields`. Built
 * on `useFieldGroup` rather than on TanStack's `withFieldGroup` for the reason `useFieldGroup`
 * gives. A block placed without `form` takes the form above it (R68).
 */
export function createWithFieldGroup<TFields extends FormFieldRegistry>(memberKeys: readonly string[]) {
	return function withFieldGroup<TGroup, TSubmitMeta = never, TRenderProps extends object = Record<never, never>>(
		options: WithFieldGroupOptions<TGroup, TSubmitMeta, TRenderProps, TFields>,
	): FieldGroupBlock<TGroup, TSubmitMeta, TRenderProps> {
		function FieldGroupBlockImpl(placement: AnyPlacement): ReactNode {
			const contextForm = useOptionalFormContext()
			const form = placement.form ?? contextForm
			if (form === null) throw new Error(missingFormMessage('withFieldGroup'))
			// Two components rather than one with a branch inside, so each placement's hooks stay
			// unconditional. The choice is made on every render: a `fields` that switches between a path
			// and a map swaps the component, which remounts the block.
			return typeof placement.fields === 'string' ? (
				<BranchBlock
					options={options as never}
					placement={placement}
					form={form}
					memberKeys={memberKeys}
				/>
			) : (
				<MappedBlock
					options={options as never}
					placement={placement}
					form={form}
					memberKeys={memberKeys}
				/>
			)
		}
		return FieldGroupBlockImpl
	}
}

type BlockProps = {
	options: WithFieldGroupOptions<unknown, unknown, object, FormFieldRegistry>
	placement: AnyPlacement
	form: AnyFormInstance
	memberKeys: readonly string[]
}

/** The field group plus its flat members — shared by both placements. */
function useBlockScope({ options, placement, form, memberKeys }: BlockProps): object {
	const lens = useFieldGroup({ form, fields: placement.fields, defaultValues: options.defaultValues })
	const source = lens as unknown as GroupSource
	const members = useMemo(
		() => scopeGroupMembers(form, memberKeys, (props) => source.getFormFieldOptions(props)),
		[form, memberKeys, source],
	)
	return useMemo(() => withMembers(lens, members), [lens, members])
}

/** What `BranchBlock` reads off its native group. */
type BranchGroup = { errors: string[]; handleSubmit: (meta?: unknown) => Promise<void> }

/**
 * A block over a path: TanStack's form group is mounted on the branch, always (R66), so the block's
 * `validators`, `onGroupSubmit`, `errors` and `handleSubmit` are the native group's. The block's
 * `defaultValues` is deliberately not the group's `defaultValue`, which TanStack would write over the
 * form's own defaults while the group is untouched.
 */
function BranchBlock(props: BlockProps): ReactNode {
	const scope = useBlockScope(props)
	const { onGroupSubmit } = props.placement
	const branch = useFormGroup({
		form: props.form,
		name: props.placement.fields as string,
		validators: props.options.validators,
		...(onGroupSubmit !== undefined && { onGroupSubmit }),
	} as never) as unknown as BranchGroup
	const group = useMemo(
		() => Object.assign(Object.create(scope) as object, { errors: branch.errors, handleSubmit: branch.handleSubmit }),
		[scope, branch],
	)
	return props.options.render({ ...props.options.props, ...props.placement, group } as never)
}

function MappedBlock(props: BlockProps): ReactNode {
	const group = useBlockScope(props)
	return props.options.render({ ...props.options.props, ...props.placement, group } as never)
}
