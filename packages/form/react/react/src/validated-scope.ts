import { isStandardSchemaValidator, standardSchemaValidators } from '@tanstack/form-core'

import { formatOwnErrors } from './own-errors'

import type { GroupAsyncValidator, GroupValidator, GroupValidators } from './group-types'

/** The `errorMap` key a map group owns on its fields and on the form — `onGroup:<block id>` (R67). */
export const GROUP_ERROR_KEY_PREFIX = 'onGroup:'

/** The `errorMap` key a step owns on its fields and on the form — `onStep:<step name>`. */
export const STEP_ERROR_KEY_PREFIX = 'onStep:'

/** The `errorMap` key of one scope: a prefix above and the scope's id — `onStep:payment`. */
export function scopeErrorKey(
	prefix: typeof GROUP_ERROR_KEY_PREFIX | typeof STEP_ERROR_KEY_PREFIX,
	id: string,
): string {
	return `${prefix}${id}`
}

/** Whether an `errorMap` key belongs to a validated scope — a map group's or a step's, not the form's. */
export function isScopeErrorKey(key: string): boolean {
	return key.startsWith(GROUP_ERROR_KEY_PREFIX) || key.startsWith(STEP_ERROR_KEY_PREFIX)
}

const FORM_SOURCE = 'form'
const PATHLESS_KEY = ''
const NO_DEBOUNCE_MS = 0

/** The trigger a validation pass answers to. */
export const ScopeCause = { Mount: 'mount', Change: 'change', Blur: 'blur', Submit: 'submit' } as const
export type ScopeCause = (typeof ScopeCause)[keyof typeof ScopeCause]

/**
 * A slot of results, named as TanStack names its `errorMap` keys; an async slot writes its sync one.
 *
 * Literal unions rather than the const-object form the closed-set rule prefers, on purpose: the tables
 * below are top-level, and a table that reads `SyncSlot.Mount` is a property read esbuild cannot prove
 * pure, so it stayed in every bundle of the package — the config-layer helpers' included. Literal
 * tables are dropped when unused.
 */
type SyncSlot = 'onMount' | 'onChange' | 'onBlur' | 'onSubmit'
type AsyncSlot = 'onChangeAsync' | 'onBlurAsync' | 'onSubmitAsync'

/** The slot a clean pass other than a submit clears. */
const SUBMIT_SLOT: SyncSlot = 'onSubmit'

/** Which slots a pass runs, in TanStack's order: a submit runs change, blur and submit. */
const SYNC_SLOTS: Record<ScopeCause, readonly SyncSlot[]> = {
	mount: ['onMount'],
	change: ['onChange'],
	blur: ['onBlur'],
	submit: ['onChange', 'onBlur', 'onSubmit'],
}
const ASYNC_SLOTS: Record<ScopeCause, readonly AsyncSlot[]> = {
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

export type FieldMetaLike = { isTouched: boolean; errorMap: Record<string, unknown>; errors: readonly unknown[] }

/** The members of the instance a validated scope reads and writes. */
export type ScopeHost = {
	state: { errorMap: Record<string, unknown> }
	getFieldMeta: (name: string) => FieldMetaLike | undefined
	setFieldMeta: (name: string, updater: (prev: FieldMetaLike) => FieldMetaLike) => void
	setErrorMap: (errorMap: Record<string, unknown>) => void
	store: { subscribe: (listener: () => void) => { unsubscribe: () => void } }
}

/** One pass's issues: by absolute field path, and the scope's own. */
type Outcome = { fields: ReadonlyMap<string, readonly unknown[]>; own: readonly unknown[] }

const EMPTY: Outcome = { fields: new Map(), own: [] }

/** How a scope's paths resolve: whether one names a field of the scope, and where it lies. */
export type ScopePaths = { knows: (path: string) => boolean; toAbsolute: (path: string) => string }

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

/**
 * One validator's raw result as an {@link Outcome}: TanStack's `{ fields, group }`, or a plain error.
 * A routed key that names no field of the scope — a misspelt one — is the scope's own error, so it
 * shows rather than blocking the submit with no message anywhere.
 */
function toOutcome(raw: unknown, paths: ScopePaths, dropUnknown: boolean): Outcome {
	if (raw === undefined || raw === null || raw === false || raw === '') return EMPTY
	if (!isGroupResult(raw)) return { fields: new Map(), own: asList(raw) }
	const fields = new Map<string, readonly unknown[]>()
	const own = raw.group === undefined ? [] : [...asList(raw.group)]
	for (const [path, error] of Object.entries(raw.fields ?? {})) {
		if (error === undefined || error === null || error === false) continue
		if (paths.knows(path)) fields.set(paths.toAbsolute(path), asList(error))
		else if (!dropUnknown) own.push(...asList(error))
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

function debounceOf(validators: GroupValidators<unknown>, cause: ScopeCause): number {
	if (cause === ScopeCause.Change) return validators.onChangeAsyncDebounceMs ?? NO_DEBOUNCE_MS
	if (cause === ScopeCause.Blur) return validators.onBlurAsyncDebounceMs ?? NO_DEBOUNCE_MS
	return NO_DEBOUNCE_MS
}

type ResetListener = { before: () => void; after: () => void }

const resetListeners = new WeakMap<object, Set<ResetListener>>()
const hookedInstances = new WeakSet()

/** Run `reset` with every validated scope of `form` told before and after it. */
export function resetScopes(form: object, reset: () => void): void {
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
 * Announce the instance's own `reset` to its validated scopes, once per instance. The instance's
 * `reset` is TanStack's copy of the core's, so the core hook (`core-hooks.ts`) does not reach it (R60).
 */
export function hookInstanceReset(form: ResettableForm): void {
	if (hookedInstances.has(form)) return
	hookedInstances.add(form)
	const { reset } = form
	Object.assign(form, {
		reset: (...args: Parameters<typeof reset>) => {
			resetScopes(form, () => {
				reset(...args)
			})
		},
	})
}

/** Be told before and after every reset of `form`; returns the unsubscribe. */
export function onResetOf(form: object, listener: ResetListener): () => void {
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

export type ValidatedScopeOptions = {
	form: ScopeHost
	/** The key it writes under, on its fields' `errorMap` and on the form's. */
	errorKey: string
	/** The validators, or a read of the current ones — a step's change from render to render. */
	validators: GroupValidators<unknown> | (() => GroupValidators<unknown>)
	/** The value its validators are handed. */
	value: () => unknown
	paths: ScopePaths
	/** Whether a blur of the field `name` runs the scope's blur pass. */
	watches: (name: string) => boolean
	/** The values whose change runs the scope's change pass, compared entry by entry. */
	watched: () => readonly unknown[]
	/**
	 * Whether an issue on a path the scope does not know is dropped. Off, it is the scope's own error,
	 * which suits a block, where such a key is a misspelling; on, it suits a step, whose validator sees
	 * the whole form and reports on fields of other steps.
	 */
	dropUnknown?: boolean
}

/** How a pass may run: `async: false` stops after the sync slots, as when a check elsewhere failed. */
export type PassOptions = { async?: boolean }

/** A set of validators run on their triggers, writing what they report under a key of its own. */
export type ValidatedScope = {
	/** Run a pass of `cause`; settles `true` once it ran, `false` when it was cancelled. */
	run: (cause: ScopeCause, options?: PassOptions) => Promise<boolean>
	/** Whether the last passes reported nothing at all. */
	isClean: () => boolean
	/** The issues the last passes reported with no path to a field. */
	ownErrors: () => readonly unknown[]
	/** Connect to the store, the blur bus and the reset hooks; returns what disconnects them. */
	listen: () => () => void
	/** Cancel every pass and erase everything the scope wrote. */
	clear: () => void
}

/**
 * The validation engine behind a map group (R67) and a step. It runs `validators` on their triggers —
 * mount, a change of a watched value, a blur of a watched field, a submit — and writes what they report
 * under `errorKey`: on each field's `errorMap` for an issue with a path, on the form's for its own.
 * TanStack's slots are not used, because a field's own validation rewrites them. The key is counted in
 * `meta.errors`, so the kit shows the message and the submit is blocked; `form.Submit` leaves it out
 * of `formErrors`.
 *
 * Passes of one cause supersede each other as TanStack's do: a new pass aborts the previous one's
 * async half, and a superseded pass settles with the pass that replaced it, so its caller reads that
 * pass's verdict, never a half-run one. A reset forgets every result and runs no change pass for the
 * values it restores.
 */
export function createValidatedScope({
	form,
	errorKey,
	validators,
	value,
	paths,
	watches,
	watched,
	dropUnknown = false,
}: ValidatedScopeOptions): ValidatedScope {
	const activeValidators = (): GroupValidators<unknown> =>
		typeof validators === 'function' ? validators() : validators
	const slots = new Map<SyncSlot, Outcome>()
	const passes = new Map<ScopeCause, Pass>()
	let written: ReadonlySet<string> = new Set()
	let snapshot: readonly unknown[] = []
	let resetting = false

	/** Make every slot this scope owns match `outcome`; a slot is only written when its messages changed. */
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
	const settleSuperseded = async (cause: ScopeCause, controller: AbortController): Promise<boolean> => {
		const latest = passes.get(cause)
		if (latest === undefined || latest.controller === controller) return false
		return latest.done
	}

	/** The async half of a pass, once its sync half reported nothing. */
	const runAsyncSlots = async (cause: ScopeCause, controller: AbortController): Promise<boolean> => {
		const pending = ASYNC_SLOTS[cause].flatMap((slot) => {
			const validator = activeValidators()[slot]
			return validator === undefined ? [] : [[slot, validator] as const]
		})
		if (pending.length === 0) return true
		const superseded = (): boolean => controller.signal.aborted
		await wait(debounceOf(activeValidators(), cause), controller.signal)
		if (superseded()) return settleSuperseded(cause, controller)
		const current = value()
		const results = await Promise.all(
			pending.map(async ([slot, validator]) => {
				return [slot, toOutcome(await runAsync(validator, current, controller.signal), paths, dropUnknown)] as const
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
	const runPass = async (cause: ScopeCause, controller: AbortController, allowAsync: boolean): Promise<boolean> => {
		const current = value()
		const results = SYNC_SLOTS[cause].map((slot) => {
			const validator = activeValidators()[slot]
			return [
				slot,
				validator === undefined ? EMPTY : toOutcome(runSync(validator, current), paths, dropUnknown),
			] as const
		})
		for (const [slot, outcome] of results) slots.set(slot, outcome)
		const passed = results.every(([, outcome]) => isEmpty(outcome))
		if (passed && cause !== ScopeCause.Submit) slots.delete(SUBMIT_SLOT)
		write()
		return passed && allowAsync ? runAsyncSlots(cause, controller) : true
	}

	/** Start a pass of `cause`, aborting the one in flight — before its sync half, as TanStack does. */
	const run = (cause: ScopeCause, options: PassOptions = {}): Promise<boolean> => {
		passes.get(cause)?.controller.abort()
		const controller = new AbortController()
		const pass: Pass = { controller, done: Promise.resolve(false) }
		passes.set(cause, pass)
		pass.done = runPass(cause, controller, options.async ?? true)
		return pass.done
	}

	const cancelPasses = (): void => {
		for (const pass of passes.values()) pass.controller.abort()
		passes.clear()
	}

	const clear = (): void => {
		cancelPasses()
		slots.clear()
		writeOutcome(EMPTY)
	}

	const listen = (): (() => void) => {
		snapshot = watched()
		const subscription = form.store.subscribe(() => {
			if (resetting) return
			const next = watched()
			if (next.length === snapshot.length && next.every((entry, index) => Object.is(entry, snapshot[index]))) return
			snapshot = next
			void run(ScopeCause.Change)
		})
		const offBlur = onBlurOf(form, (name) => {
			if (watches(name)) void run(ScopeCause.Blur)
		})
		const offReset = onResetOf(form, {
			before: () => {
				resetting = true
				cancelPasses()
			},
			after: () => {
				slots.clear()
				writeOutcome(EMPTY)
				snapshot = watched()
				resetting = false
			},
		})
		return () => {
			subscription.unsubscribe()
			offBlur()
			offReset()
		}
	}

	return {
		run,
		isClean: () => isEmpty(union(slots.values())),
		ownErrors: () => union(slots.values()).own,
		listen,
		clear,
	}
}
