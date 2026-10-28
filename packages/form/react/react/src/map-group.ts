import { focusesOnError, focusFirstFieldWithErrors } from './focus-first-error'
import { hasOwnErrorsIn, isPathWithin, registerMapGroup, validateGroups } from './group-registry'
import { serverErrorsOf } from './server-errors'
import { createValidatedScope, GROUP_ERROR_KEY_PREFIX, ScopeCause, scopeErrorKey } from './validated-scope'

import type { GroupHost, ValidatedGroup } from './group-registry'
import type { GroupValidators, OnGroupSubmit } from './group-types'
import type { ScopeHost } from './validated-scope'

/** A mounted field or group, at the one member a block submit calls. */
type ValidatableInstance = {
	validate: (
		cause: typeof ScopeCause.Submit,
		options: { skipFormValidation: boolean; skipGroupValidation: boolean },
	) => unknown
}

/** The members of the instance a map group reads and writes. */
export type MapGroupHost = GroupHost &
	ScopeHost & {
		formId: string
		fieldInfo: Partial<Record<string, { instance: ValidatableInstance | null }>>
		getFieldValue: (name: string) => unknown
	}

/** A map group: one block placed with a field map, validated and submitted by this package (R67). */
export type MapGroup = ValidatedGroup & {
	/** The key it writes under, on its fields' `errorMap` and on the form's. */
	errorKey: string
	/** The block's value, assembled from the mapped fields. */
	value: () => Record<string, unknown>
	/** The block's own submit: valid, it calls `onGroupSubmit`; invalid, it focuses the first error. */
	submit: (meta: unknown, onGroupSubmit: OnGroupSubmit<unknown, unknown> | undefined) => Promise<void>
	/** Start listening — mount, change, blur — and register for the form's submit; returns the disconnect. */
	connect: () => () => void
}

type MapGroupOptions = {
	form: MapGroupHost
	map: Readonly<Record<string, string>>
	validators: GroupValidators<unknown> | undefined
	id: string
	toAbsolute: (relative: string) => string
}

/** The first accessor of a relative path — `rows` in `rows[0].x`, `password` in `password`. */
const FIRST_ACCESSOR = /^[^.[]*/

/**
 * The controller of one map block (R67). TanStack's field group has no validators and no submit, so
 * the block's validators run on a {@link createValidatedScope} over its mapped fields: a change of a
 * mapped value, a blur of a mapped field, mount and submit, written under `onGroup:<id>`.
 */
export function createMapGroup({ form, map, validators = {}, id, toAbsolute }: MapGroupOptions): MapGroup {
	const errorKey = scopeErrorKey(GROUP_ERROR_KEY_PREFIX, id)
	const mapped = Object.values(map)
	const isMapped = (name: string): boolean => mapped.some((path) => isPathWithin(path, name))
	const value = (): Record<string, unknown> =>
		Object.fromEntries(Object.entries(map).map(([key, path]) => [key, form.getFieldValue(path)]))
	const scope = createValidatedScope({
		form,
		errorKey,
		validators,
		value,
		paths: {
			knows: (relative) => Object.hasOwn(map, FIRST_ACCESSOR.exec(relative)?.[0] ?? relative),
			toAbsolute,
		},
		watches: isMapped,
		watched: () => mapped.map((path) => form.getFieldValue(path)),
	})

	const hasOwnErrors = (): boolean => scope.ownErrors().length > 0
	/** The groups a block submit runs: those mounted inside a mapped path, but itself (R82). */
	const inside = (other: ValidatedGroup): boolean =>
		other.owner !== group.owner && mapped.some((path) => other.within(path))
	const isValid = (): boolean =>
		scope.isClean() &&
		!hasOwnErrorsIn(form, inside) &&
		Object.keys(form.fieldInfo).every((name) => !isMapped(name) || (form.getFieldMeta(name)?.errors.length ?? 0) === 0)

	/** Mark every mounted field inside the block touched, and run its own submit pass alone. */
	const validateFields = async (): Promise<void> => {
		const fieldPasses = Object.entries(form.fieldInfo).map(async ([name, info]) => {
			const instance = info?.instance
			if (instance === null || instance === undefined || !isMapped(name)) return
			form.setFieldMeta(name, (prev) => (prev.isTouched ? prev : { ...prev, isTouched: true }))
			await instance.validate(ScopeCause.Submit, { skipFormValidation: true, skipGroupValidation: true })
		})
		await Promise.all(fieldPasses)
	}

	const group: MapGroup = {
		owner: {},
		errorKey,
		within: (branch) => mapped.every((path) => isPathWithin(branch, path)),
		validate: () => scope.run(ScopeCause.Submit),
		hasOwnErrors,
		value,
		async submit(meta, onGroupSubmit) {
			serverErrorsOf(form)?.clearWhere(isMapped)
			await validateFields()
			await validateGroups(form, inside)
			if (!(await scope.run(ScopeCause.Submit))) return
			if (!isValid()) {
				if (focusesOnError(form)) focusFirstFieldWithErrors(form, isMapped)
				return
			}
			await onGroupSubmit?.({ value: value(), meta })
		},
		connect() {
			const unregister = registerMapGroup(form, group)
			const unlisten = scope.listen()
			void scope.run(ScopeCause.Mount)
			return () => {
				unlisten()
				unregister()
				scope.clear()
			}
		},
	}
	return group
}
