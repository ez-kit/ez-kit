import type { ValidationCause } from '@tanstack/form-core'

const SUBMIT = 'submit'
/** A group's pass inside a larger submit: the form and the related fields have their own pass. */
const GROUP_SUBMIT_PASS = { skipFormValidation: true, skipRelatedFieldValidation: true }

/** The member of an instance the submit passes read: TanStack's mounted form groups. */
export type GroupHost = { formGroupApis: ReadonlySet<NativeGroupApi> }

/** TanStack's `FormGroupApi`, at the members the submit passes call and wrap. */
export type NativeGroupApi = {
	name: string
	validate: (
		cause: typeof SUBMIT,
		options: { skipFormValidation: boolean; skipRelatedFieldValidation: boolean },
	) => unknown
	validateAllFields: (cause: ValidationCause) => Promise<unknown[]>
	areRelatedFieldsValid: () => boolean
	getInfo: () => { instance: NativeGroupApi | null }
	options: { validators?: Record<string, unknown> | undefined }
}

/** One group the submit passes run: a native one, or a map group (`map-group.ts`). */
export type ValidatedGroup = {
	/** What the group is, compared by identity — a group's own pass skips itself. */
	owner: object
	/** Whether the group lies at or under `scope`. */
	within: (scope: string) => boolean
	/** The group's submit pass. */
	validate: () => Promise<unknown>
	/**
	 * Whether the group has errors of its own that no field and no TanStack verdict counts — a map
	 * group's pathless issues, kept in the form's `errorMap` (R83). Always `false` for a native group,
	 * whose own errors sit on its meta, which TanStack reads.
	 */
	hasOwnErrors: () => boolean
}

/** Is `name` the path `scope` or a path inside it — TanStack's own test, which it keeps private. */
export function isPathWithin(scope: string, name: string): boolean {
	return name === scope || name.startsWith(`${scope}.`) || name.startsWith(`${scope}[`)
}

const mapGroups = new WeakMap<object, Set<ValidatedGroup>>()

/** Register a map group for the submit passes; returns the unregister. */
export function registerMapGroup(form: object, group: ValidatedGroup): () => void {
	const set = mapGroups.get(form) ?? new Set<ValidatedGroup>()
	mapGroups.set(form, set)
	set.add(group)
	return () => {
		set.delete(group)
	}
}

/** Every mounted group of `form`, as the submit passes run them: the native ones, then the map ones. */
export function groupsOf(form: GroupHost): readonly ValidatedGroup[] {
	const native = [...form.formGroupApis].map((api) => ({
		owner: api,
		within: (scope: string) => isPathWithin(scope, api.name),
		validate: async () => {
			await api.validate(SUBMIT, GROUP_SUBMIT_PASS)
		},
		hasOwnErrors: () => false,
	}))
	return [...native, ...(mapGroups.get(form) ?? [])]
}

/** Run the submit validators of the groups `accept` picks — after the fields, never before (R62). */
export async function validateGroups(form: GroupHost, accept: (group: ValidatedGroup) => boolean): Promise<void> {
	await Promise.all(
		groupsOf(form)
			.filter(accept)
			.map((group) => group.validate()),
	)
}

/** Whether a group `accept` picks has errors of its own that only this package counts (R83). */
export function hasOwnErrorsIn(form: GroupHost, accept: (group: ValidatedGroup) => boolean): boolean {
	return groupsOf(form).some((group) => accept(group) && group.hasOwnErrors())
}

const hookedGroups = new WeakSet()

/**
 * Run the groups mounted inside `group` after its own field pass, once per group instance (R63), and
 * let a nested map group's own errors block it (R83). The instance is TanStack's real `FormGroupApi`
 * — `getInfo().instance`, set on mount — whose `_handleSubmit` calls `this.validateAllFields`, then
 * decides on `this.areRelatedFieldsValid()`, which reads only field metas.
 *
 * "Inside" is `isPathWithin`, so two groups on the same name each count as inside the other: a
 * `form.FormGroup name='security'` around `<Block fields='security' />` runs the block's validators,
 * and the block's own submit runs the outer group's. That holds while at most one of them carries
 * validators: TanStack keeps a group's meta under its name, so two groups on one name share one
 * `errorMap`, and the later pass erases the other's own (pathless) errors. One validating group per
 * branch is the supported layout; {@link warnOnStackedGroups} says so in development (R86).
 */
export function hookGroupFields(group: NativeGroupApi, form: GroupHost): void {
	if (hookedGroups.has(group)) return
	hookedGroups.add(group)
	const { validateAllFields, areRelatedFieldsValid } = group
	const inside = (other: ValidatedGroup): boolean => other.owner !== group && other.within(group.name)
	Object.assign(group, {
		validateAllFields: async (cause: ValidationCause) => {
			const results = await validateAllFields(cause)
			if (cause === SUBMIT) await validateGroups(form, inside)
			return results
		},
		areRelatedFieldsValid: () => areRelatedFieldsValid() && !hasOwnErrorsIn(form, inside),
	})
}

/** The development message for two validating native groups on one branch (R86). */
export function stackedGroupsMessage(name: string): string {
	return `Two form groups with validators are mounted on '${name}'. They share one meta, so each pass erases the other's own errors — keep one validating group per branch: move the rules into one of them, or give the outer group no validators.`
}

function hasValidators(group: NativeGroupApi): boolean {
	return Object.values(group.options.validators ?? {}).some((validator) => validator !== undefined)
}

const warnedNames = new WeakMap<object, Set<string>>()

/**
 * Warn, once per form and name, when two or more mounted native groups on `name` carry validators —
 * `form.FormGroup`, `useFormGroup` and a path-placed `withFieldGroup` block alike (R86). Called after
 * the groups mount; the caller keeps it to development builds.
 */
export function warnOnStackedGroups(form: GroupHost, name: string): void {
	const validating = [...form.formGroupApis].filter((group) => group.name === name && hasValidators(group))
	if (validating.length < 2) return
	const warned = warnedNames.get(form) ?? new Set<string>()
	warnedNames.set(form, warned)
	if (warned.has(name)) return
	warned.add(name)
	console.error(stackedGroupsMessage(name))
}
