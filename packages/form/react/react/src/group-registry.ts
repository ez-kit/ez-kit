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
	getInfo: () => { instance: NativeGroupApi | null }
}

/** One group the submit passes run: a native one, or a map group (`map-group.ts`). */
export type ValidatedGroup = {
	/** What the group is, compared by identity — a group's own pass skips itself. */
	owner: object
	/** Whether the group lies at or under `scope`. */
	within: (scope: string) => boolean
	/** The group's submit pass. */
	validate: () => Promise<unknown>
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

const hookedGroups = new WeakSet()

/**
 * Run the groups mounted inside `group` after its own field pass, once per group instance (R63).
 * The instance is TanStack's real `FormGroupApi` — `getInfo().instance`, set on mount — whose
 * `_handleSubmit` calls `this.validateAllFields`.
 */
export function hookGroupFields(group: NativeGroupApi, form: GroupHost): void {
	if (hookedGroups.has(group)) return
	hookedGroups.add(group)
	const { validateAllFields } = group
	Object.assign(group, {
		validateAllFields: async (cause: ValidationCause) => {
			const results = await validateAllFields(cause)
			if (cause === SUBMIT) {
				await validateGroups(form, (other) => other.owner !== group && other.within(group.name))
			}
			return results
		},
	})
}
