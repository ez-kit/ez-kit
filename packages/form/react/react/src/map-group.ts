import { isStandardSchemaValidator, standardSchemaValidators } from '@tanstack/form-core'

import { focusesOnError, focusFirstFieldWithErrors } from './focus-first-error'
import { hasOwnErrorsIn, isPathWithin, registerMapGroup, validateGroups } from './group-registry'
import { formatOwnErrors } from './own-errors'
import { serverErrorsOf } from './server-errors'

import type { GroupHost, ValidatedGroup } from './group-registry'
import type { GroupAsyncValidator, GroupValidator, GroupValidators, OnGroupSubmit } from './group-types'

/** The `errorMap` key a map group owns on its fields and on the form — `onGroup:<block id>` (R67). */
export const GROUP_ERROR_KEY_PREFIX = 'onGroup:'

const FORM_SOURCE = 'form'
const PATHLESS_KEY = ''
const SUBMIT = 'submit'
const NO_DEBOUNCE_MS = 0

/** The trigger a validation pass answers to. */
const MapGroupCause = { Mount: 'mount', Change: 'change', Blur: 'blur', Submit: 'submit' } as const
type MapGroupCause = (typeof MapGroupCause)[keyof typeof MapGroupCause]

/** A slot of results, named as TanStack names its `errorMap` keys; an async slot writes its sync one. */
type SyncSlot = 'onMount' | 'onChange' | 'onBlur' | 'onSubmit'
type AsyncSlot = 'onChangeAsync' | 'onBlurAsync' | 'onSubmitAsync'

/** Which slots a pass runs, in TanStack's order: a submit runs change, blur and submit (R62). */
const SYNC_SLOTS: Record<MapGroupCause, readonly SyncSlot[]> = {
	mount: ['onMount'],
	change: ['onChange'],
	blur: ['onBlur'],
	submit: ['onChange', 'onBlur', 'onSubmit'],
}
const ASYNC_SLOTS: Record<MapGroupCause, readonly AsyncSlot[]> = {
	mount: [],
	change: ['onChangeAsync'],
	blur: ['onBlurAsync'],
	submit: ['onChangeAsync', 'onBlurAsync', 'onSubmitAsync'],
}
/** The sync slot each async one reports into, as TanStack's `errorMap` does. */
const ASYNC_TARGET: Record<AsyncSlot, SyncSlot> = {
	onChangeAsync: 'onChange',
	onBlurAsync: 'onBlur',
	onSubmitAsync: 'onSubmit',
}

type FieldMetaLike = { isTouched: boolean; errorMap: Record<string, unknown>; errors: readonly unknown[] }

/** A mounted field or group, at the one member a block submit calls. */
type ValidatableInstance = {
	validate: (cause: typeof SUBMIT, options: { skipFormValidation: boolean; skipGroupValidation: boolean }) => unknown
}

/** The members of the instance a map group reads and writes. */
export type MapGroupHost = GroupHost & {
	formId: string
	state: { errorMap: Record<string, unknown> }
	fieldInfo: Partial<Record<string, { instance: ValidatableInstance | null }>>
	getFieldValue: (name: string) => unknown
	getFieldMeta: (name: string) => FieldMetaLike | undefined
	setFieldMeta: (name: string, updater: (prev: FieldMetaLike) => FieldMetaLike) => void
	setErrorMap: (errorMap: Record<string, unknown>) => void
	store: { subscribe: (listener: () => void) => { unsubscribe: () => void } }
}

/** One pass's issues: by absolute field path, and the block's own. */
type Outcome = { fields: ReadonlyMap<string, readonly unknown[]>; own: readonly unknown[] }

const EMPTY: Outcome = { fields: new Map(), own: [] }

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

const blurListeners = new WeakMap<object, Set<(name: string) => void>>()

/** Called by `useForm`'s composed `listeners.onBlur` — TanStack runs it after the field's blur pass. */
export function emitFieldBlur(form: object, name: string): void {
	for (const listener of blurListeners.get(form) ?? []) listener(name)
}

function onBlurOf(form: object, listener: (name: string) => void): () => void {
	const set = blurListeners.get(form) ?? new Set<(name: string) => void>()
	blurListeners.set(form, set)
	set.add(listener)
	return () => {
		set.delete(listener)
	}
}

function asList(error: unknown): readonly unknown[] {
	return Array.isArray(error) ? error : [error]
}

function isGroupResult(raw: unknown): raw is { fields?: Record<string, unknown>; group?: unknown } {
	return typeof raw === 'object' && raw !== null && 'fields' in raw
}

/** How a block's relative paths resolve: whether one names a field of the block, and where it lies. */
type Paths = { knows: (relative: string) => boolean; toAbsolute: (relative: string) => string }

/**
 * One validator's raw result as an {@link Outcome}: TanStack's `{ fields, group }`, or a plain error.
 * A routed key that names no field of the block — a misspelt one — is the block's own error, so it
 * shows in `group.errors` rather than blocking the submit with no message anywhere.
 */
function toOutcome(raw: unknown, paths: Paths): Outcome {
	if (raw === undefined || raw === null || raw === false || raw === '') return EMPTY
	if (!isGroupResult(raw)) return { fields: new Map(), own: asList(raw) }
	const fields = new Map<string, readonly unknown[]>()
	const own = raw.group === undefined ? [] : [...asList(raw.group)]
	for (const [relative, error] of Object.entries(raw.fields ?? {})) {
		if (error === undefined || error === null || error === false) continue
		if (paths.knows(relative)) fields.set(paths.toAbsolute(relative), asList(error))
		else own.push(...asList(error))
	}
	return { fields, own }
}

/** A standard schema's `{ form, fields }` record as `{ fields, group }`: `''` holds the pathless issues. */
function fromSchemaRecord(result: unknown): unknown {
	if (result === undefined) return undefined
	const { fields } = result as { fields: Record<string, unknown> }
	const { [PATHLESS_KEY]: own, ...paths } = fields
	return { fields: paths, group: own }
}

function runSync(validator: GroupValidator<unknown>, value: unknown): unknown {
	if (!isStandardSchemaValidator(validator)) return validator({ value })
	return fromSchemaRecord(standardSchemaValidators.validate({ value, validationSource: FORM_SOURCE }, validator))
}

async function runAsync(
	validator: GroupAsyncValidator<unknown>,
	value: unknown,
	signal: AbortSignal,
): Promise<unknown> {
	if (!isStandardSchemaValidator(validator)) return validator({ value, signal })
	return fromSchemaRecord(
		await standardSchemaValidators.validateAsync({ value, validationSource: FORM_SOURCE }, validator),
	)
}

function isEmpty(outcome: Outcome): boolean {
	return outcome.fields.size === 0 && outcome.own.length === 0
}

/** Every outcome's issues together, by path and own. */
function union(outcomes: Iterable<Outcome>): Outcome {
	const fields = new Map<string, unknown[]>()
	const own: unknown[] = []
	for (const outcome of outcomes) {
		for (const [path, issues] of outcome.fields) fields.set(path, [...(fields.get(path) ?? []), ...issues])
		own.push(...outcome.own)
	}
	return { fields, own }
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		if (ms <= NO_DEBOUNCE_MS) {
			resolve()
			return
		}
		const timeout = setTimeout(resolve, ms)
		signal.addEventListener('abort', () => {
			clearTimeout(timeout)
			resolve()
		})
	})
}

function debounceOf(validators: GroupValidators<unknown>, cause: MapGroupCause): number {
	if (cause === MapGroupCause.Change) return validators.onChangeAsyncDebounceMs ?? NO_DEBOUNCE_MS
	if (cause === MapGroupCause.Blur) return validators.onBlurAsyncDebounceMs ?? NO_DEBOUNCE_MS
	return NO_DEBOUNCE_MS
}

/** The first accessor of a relative path — `rows` in `rows[0].x`, `password` in `password`. */
const FIRST_ACCESSOR = /^[^.[]*/

type ResetListener = { before: () => void; after: () => void }

const resetListeners = new WeakMap<object, Set<ResetListener>>()
const hookedInstances = new WeakSet()

/** Run `reset` with every map group of `form` told before and after it (see {@link createMapGroup}). */
export function resetMapGroups(form: object, reset: () => void): void {
	const listeners = [...(resetListeners.get(form) ?? [])]
	for (const listener of listeners) listener.before()
	try {
		reset()
	} finally {
		for (const listener of listeners) listener.after()
	}
}

/** The member of an instance whose `reset` is wrapped. */
export type ResettableForm = { reset: (...args: never[]) => void }

/**
 * Announce the instance's own `reset` to its map groups, once per instance. The instance's `reset` is
 * TanStack's copy of the core's, so the core hook (`core-hooks.ts`) does not reach it (R60).
 */
export function hookInstanceReset(form: ResettableForm): void {
	if (hookedInstances.has(form)) return
	hookedInstances.add(form)
	const { reset } = form
	Object.assign(form, {
		reset: (...args: Parameters<typeof reset>) => {
			resetMapGroups(form, () => {
				reset(...args)
			})
		},
	})
}

function onResetOf(form: object, listener: ResetListener): () => void {
	const set = resetListeners.get(form) ?? new Set<ResetListener>()
	resetListeners.set(form, set)
	set.add(listener)
	return () => {
		set.delete(listener)
	}
}

function errorsIn(value: unknown): readonly unknown[] {
	return value === undefined ? [] : asList(value)
}

/**
 * Whether two `errorMap` values hold the same errors — a write that changes nothing is skipped.
 *
 * The raw values are compared first, item by item: an error that formats to no text (an issue with an
 * empty `message`, R77) still blocks the submit, so it must not compare equal to no error at all.
 * Only lists of the same length fall back to the formatted text, which keeps a fresh pass that reports
 * the same messages from rewriting the store.
 */
function sameMessages(a: unknown, b: unknown): boolean {
	const left = errorsIn(a)
	const right = errorsIn(b)
	if (left.length !== right.length) return false
	if (left.every((error, index) => Object.is(error, right[index]))) return true
	const leftText = formatOwnErrors([left])
	const rightText = formatOwnErrors([right])
	return leftText.length === rightText.length && leftText.every((message, index) => message === rightText[index])
}

/** One pass in flight: what aborts it, and what settles when it has. */
type Pass = { controller: AbortController; done: Promise<boolean> }

/**
 * The controller of one map block (R67). TanStack's field group has no validators and no submit, so
 * this runs the block's validators on its triggers — mount, a change of a mapped value, a blur of a
 * mapped field, a submit — and writes what they report under a key of its own: on each mapped
 * field's `errorMap` for an issue with a path, on the form's for the block's own. TanStack's slots are
 * not used, because a field's own validation rewrites them. The key is counted in `meta.errors`, so
 * the kit shows the message and the submit is blocked; `form.Submit` leaves it out of `formErrors`.
 *
 * Passes of one cause supersede each other as TanStack's do: a new pass aborts the previous one's
 * async half, and a superseded pass settles with the pass that replaced it, so its caller reads that
 * pass's verdict, never a half-run one. A reset forgets every result and runs no change pass for the
 * values it restores.
 */
export function createMapGroup({ form, map, validators = {}, id, toAbsolute }: MapGroupOptions): MapGroup {
	const errorKey = `${GROUP_ERROR_KEY_PREFIX}${id}`
	const mapped = Object.values(map)
	const isMapped = (name: string): boolean => mapped.some((path) => isPathWithin(path, name))
	const paths: Paths = {
		knows: (relative) => Object.hasOwn(map, FIRST_ACCESSOR.exec(relative)?.[0] ?? relative),
		toAbsolute,
	}
	const slots = new Map<SyncSlot, Outcome>()
	const passes = new Map<MapGroupCause, Pass>()
	let written: ReadonlySet<string> = new Set()
	let snapshot: readonly unknown[] = []
	let resetting = false

	const value = (): Record<string, unknown> =>
		Object.fromEntries(Object.entries(map).map(([key, path]) => [key, form.getFieldValue(path)]))
	const mappedValues = (): readonly unknown[] => mapped.map((path) => form.getFieldValue(path))

	/** Make every slot this block owns match `outcome`; a slot is only written when its messages changed. */
	const writeOutcome = (outcome: Outcome): void => {
		for (const path of new Set([...written, ...outcome.fields.keys()])) {
			const meta = form.getFieldMeta(path)
			if (meta === undefined) continue
			const issues = outcome.fields.get(path)
			if (sameMessages(meta.errorMap[errorKey], issues)) continue
			form.setFieldMeta(path, (prev) => ({ ...prev, errorMap: { ...prev.errorMap, [errorKey]: issues } }))
		}
		written = new Set(outcome.fields.keys())
		const own = outcome.own.length > 0 ? outcome.own : undefined
		if (!sameMessages(form.state.errorMap[errorKey], own)) form.setErrorMap({ [errorKey]: own })
	}
	const write = (): void => {
		writeOutcome(union(slots.values()))
	}

	/** A superseded pass settles with the one that replaced it; with none (a reset, a disconnect), as not run. */
	const settleSuperseded = async (cause: MapGroupCause, controller: AbortController): Promise<boolean> => {
		const latest = passes.get(cause)
		if (latest === undefined || latest.controller === controller) return false
		return latest.done
	}

	/** The async half of a pass, once its sync half reported nothing. */
	const runAsyncSlots = async (cause: MapGroupCause, controller: AbortController): Promise<boolean> => {
		const pending = ASYNC_SLOTS[cause].flatMap((slot) => {
			const validator = validators[slot]
			return validator === undefined ? [] : [[slot, validator] as const]
		})
		if (pending.length === 0) return true
		const superseded = (): boolean => controller.signal.aborted
		await wait(debounceOf(validators, cause), controller.signal)
		if (superseded()) return settleSuperseded(cause, controller)
		const current = value()
		const results = await Promise.all(
			pending.map(async ([slot, validator]) => {
				return [slot, toOutcome(await runAsync(validator, current, controller.signal), paths)] as const
			}),
		)
		if (superseded()) return settleSuperseded(cause, controller)
		for (const [slot, outcome] of results) slots.set(ASYNC_TARGET[slot], outcome)
		write()
		return true
	}

	/**
	 * One pass: the sync slots, written at once, then the async ones if the sync ones passed. A clean
	 * pass other than a submit clears the submit slot, as TanStack does for a field. Settles `false`
	 * when it was cancelled with nothing to replace it.
	 */
	const runPass = async (cause: MapGroupCause, controller: AbortController): Promise<boolean> => {
		const current = value()
		const results = SYNC_SLOTS[cause].map((slot) => {
			const validator = validators[slot]
			return [slot, validator === undefined ? EMPTY : toOutcome(runSync(validator, current), paths)] as const
		})
		for (const [slot, outcome] of results) slots.set(slot, outcome)
		const passed = results.every(([, outcome]) => isEmpty(outcome))
		if (passed && cause !== MapGroupCause.Submit) slots.delete('onSubmit')
		write()
		return passed ? runAsyncSlots(cause, controller) : true
	}

	/** Start a pass of `cause`, aborting the one in flight — before its sync half, as TanStack does. */
	const run = (cause: MapGroupCause): Promise<boolean> => {
		passes.get(cause)?.controller.abort()
		const controller = new AbortController()
		const pass: Pass = { controller, done: Promise.resolve(false) }
		passes.set(cause, pass)
		pass.done = runPass(cause, controller)
		return pass.done
	}

	const cancelPasses = (): void => {
		for (const pass of passes.values()) pass.controller.abort()
		passes.clear()
	}

	const hasOwnErrors = (): boolean => union(slots.values()).own.length > 0
	/** The groups a block submit runs: those mounted inside a mapped path, but itself (R82). */
	const inside = (other: ValidatedGroup): boolean =>
		other.owner !== group.owner && mapped.some((path) => other.within(path))
	const isValid = (): boolean =>
		isEmpty(union(slots.values())) &&
		!hasOwnErrorsIn(form, inside) &&
		Object.keys(form.fieldInfo).every((name) => !isMapped(name) || (form.getFieldMeta(name)?.errors.length ?? 0) === 0)

	/** Mark every mounted field inside the block touched, and run its own submit pass alone. */
	const validateFields = async (): Promise<void> => {
		const fieldPasses = Object.entries(form.fieldInfo).map(async ([name, info]) => {
			const instance = info?.instance
			if (instance === null || instance === undefined || !isMapped(name)) return
			form.setFieldMeta(name, (prev) => (prev.isTouched ? prev : { ...prev, isTouched: true }))
			await instance.validate(SUBMIT, { skipFormValidation: true, skipGroupValidation: true })
		})
		await Promise.all(fieldPasses)
	}

	/** Connect to the store, the blur bus and the reset hooks; returns what disconnects them. */
	const listen = (): (() => void) => {
		snapshot = mappedValues()
		const subscription = form.store.subscribe(() => {
			if (resetting) return
			const next = mappedValues()
			if (next.every((entry, index) => Object.is(entry, snapshot[index]))) return
			snapshot = next
			void run(MapGroupCause.Change)
		})
		const offBlur = onBlurOf(form, (name) => {
			if (isMapped(name)) void run(MapGroupCause.Blur)
		})
		const offReset = onResetOf(form, {
			before: () => {
				resetting = true
				cancelPasses()
			},
			after: () => {
				slots.clear()
				writeOutcome(EMPTY)
				snapshot = mappedValues()
				resetting = false
			},
		})
		return () => {
			subscription.unsubscribe()
			offBlur()
			offReset()
		}
	}

	const group: MapGroup = {
		owner: {},
		errorKey,
		within: (scope) => mapped.every((path) => isPathWithin(scope, path)),
		validate: () => run(MapGroupCause.Submit),
		hasOwnErrors,
		value,
		async submit(meta, onGroupSubmit) {
			serverErrorsOf(form)?.clearWhere(isMapped)
			await validateFields()
			await validateGroups(form, inside)
			if (!(await run(MapGroupCause.Submit))) return
			if (!isValid()) {
				if (focusesOnError(form)) focusFirstFieldWithErrors(form, isMapped)
				return
			}
			await onGroupSubmit?.({ value: value(), meta })
		},
		connect() {
			const unregister = registerMapGroup(form, group)
			const unlisten = listen()
			void run(MapGroupCause.Mount)
			return () => {
				unlisten()
				unregister()
				cancelPasses()
				slots.clear()
				writeOutcome(EMPTY)
			}
		},
	}
	return group
}
