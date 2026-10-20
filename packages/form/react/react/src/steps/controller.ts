import { createStore } from '@tanstack/react-store'

import { onResetOf } from '../validated-scope'

import type { ValidatedScope } from '../validated-scope'
import type { Store } from '@tanstack/react-store'

/** Everything `form.Steps` keeps outside the form's values. */
export type StepsState = {
	/** Every registered step, in JSX order. */
	order: readonly string[]
	/** The steps that apply now, in order; a new array only when the set changes. */
	names: readonly string[]
	/** The step on screen, by name. `undefined` before the first step registers, without `initial`. */
	current: string | undefined
	/** The steps the user has tried to leave. */
	visited: ReadonlySet<string>
	/** The steps whose last check passed. */
	passed: ReadonlySet<string>
	/** Each step's fields, by full path: the ones it registered while it was last on screen. */
	fields: Readonly<Record<string, readonly string[]>>
	/** Whether a step check is in flight. */
	validating: boolean
}

/** What `form.Steps` is configured with; read at call time, so a re-render's props take effect. */
export type StepsSettings = {
	/** The step shown first, by name — rendered on the server too. Without it, the first that applies. */
	initial?: string | undefined
	/** The step on screen, controlled: a move then only asks for it through `onStepChange`. */
	step?: string | undefined
	/** Called with the step to show on every move; in a controlled flow, on every request for one. */
	onStepChange?: ((name: string) => void) | undefined
	/** `true` by default: a forward `goTo` passes only steps that passed and are valid now. */
	linear?: boolean | undefined
}

/** The members of the form a steps controller reads. */
export type StepsHost = {
	state: { values: unknown }
	store: { subscribe: (listener: () => void) => { unsubscribe: () => void } }
}

/** What a registered step tells the controller: the condition it applies under, read at call time. */
export type StepRecord = {
	when: () => ((values: never) => boolean) | undefined
}

export type StepsController = {
	store: Store<StepsState>
	settings: () => StepsSettings
	configure: (settings: StepsSettings) => void
	/** Register a step; returns the unregister. */
	registerStep: (name: string, record: StepRecord) => () => void
	/** Register a field of `step`; the returned cleanup keeps the field while `step` is off screen. */
	registerField: (step: string, field: string) => () => void
	/** Register a group of `step` by its owner; kept while `step` is off screen, as a field is. */
	registerGroup: (step: string, owner: object) => () => void
	/** The groups `step` registered. */
	groupsOf: (step: string) => ReadonlySet<object>
	/** Register the validation scope of `step`'s own validators, while the step applies. */
	registerScope: (step: string, scope: ValidatedScope) => () => void
	/** The validation scope of `step`, if it has validators and applies. */
	scopeOf: (step: string) => ValidatedScope | undefined
	/** Recompute which steps apply — after a value or a step's condition changed. */
	refresh: () => void
	/** Make `name` the step on screen — or, controlled, ask the parent to. */
	moveTo: (name: string) => void
	/** Put the controlled `step` prop into the store. */
	syncStep: (name: string) => void
	/** Follow the form's values; returns the disconnect. */
	connect: () => () => void
	/**
	 * Set what checks a step before it is left, and what says whether a step has errors now; until
	 * set, every step passes and is clean.
	 */
	setCheck: (check: StepCheck, isClean: (step: string) => boolean) => void
	/** Check the step on screen and, if it passes, show the next step that applies. */
	goNext: () => void
	/** Show the previous step that applies, without a check. */
	goBack: () => void
	/** Show `name`: back freely; forward as `linear` allows. */
	goTo: (name: string) => void
}

/** Checks a step before it is left; resolves whether it may be left. */
export type StepCheck = (step: string) => Promise<boolean>

const PASS: StepCheck = () => Promise.resolve(true)

/**
 * `name` as the step on screen. Its field list starts over: the fields that mount now register again,
 * so a field that stopped rendering while the step was off screen does not linger in it.
 */
function enter(state: StepsState, name: string): StepsState {
	return { ...state, current: name, fields: { ...state.fields, [name]: [] } }
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((entry, index) => entry === b[index])
}

/**
 * The step to show once `names` changed: the current one while it applies, else the nearest one
 * before it that does, else the first one that does. While steps are still registering, a current
 * step not registered yet is kept — `initial` names a step that registers after the ones before it.
 */
function resolveCurrent(
	order: readonly string[],
	names: readonly string[],
	current: string | undefined,
	registering: boolean,
): string | undefined {
	if (names.length === 0) return current
	if (current === undefined || names.includes(current)) return current ?? names[0]
	if (registering && !order.includes(current)) return current
	const at = order.indexOf(current)
	for (let index = at - 1; index >= 0; index -= 1) {
		const candidate = order[index]
		if (candidate !== undefined && names.includes(candidate)) return candidate
	}
	return names[0]
}

const isDevelopment = (): boolean => process.env.NODE_ENV !== 'production'

/** What `indexOf` returns for a name that is not in the list. */
const NOT_FOUND = -1

/** The offsets `neighbour` takes: one step back, one step forward. */
const PREVIOUS = -1
const NEXT = 1

export function createStepsController(form: StepsHost, initial: StepsSettings): StepsController {
	let settings = initial
	const records = new Map<string, StepRecord>()
	const initialState: StepsState = {
		order: [],
		names: [],
		current: initial.step ?? initial.initial,
		visited: new Set(),
		passed: new Set(),
		fields: {},
		validating: false,
	}
	const store = createStore(initialState)
	/** The step a controlled flow last asked its parent for on its own — see `refresh`. */
	let requested: string | undefined
	/** Bumped by every move and reset: a check that settles in a later generation moves nothing. */
	let generation = 0
	const groups = new Map<string, Set<object>>()
	/** How many mounted bindings each field of each step has — two components may bind one name. */
	const bindings = new Map<string, Map<string, number>>()
	const scopes = new Map<string, ValidatedScope>()
	let check: StepCheck = PASS
	let isClean = (_step: string): boolean => true
	/** True until `form.Steps` itself has mounted — its layout effect runs after every step's. */
	let registering = true

	const isControlled = (): boolean => settings.step !== undefined

	const visible = (order: readonly string[]): readonly string[] =>
		order.filter((name) => {
			const when = records.get(name)?.when()
			return when === undefined || when(form.state.values as never)
		})

	/** Show `name`, starting its field and group lists over. */
	const enterStep = (name: string): void => {
		generation += 1
		groups.delete(name)
		store.setState((prev) => enter(prev, name))
	}

	/** Move to `name` — or, controlled, ask the parent to; every request is passed on. */
	const moveTo = (name: string): void => {
		if (isControlled()) {
			settings.onStepChange?.(name)
			return
		}
		if (store.get().current === name) return
		enterStep(name)
		settings.onStepChange?.(name)
	}

	const refresh = (): void => {
		const prev = store.get()
		const fresh = visible(prev.order)
		const names = sameList(fresh, prev.names) ? prev.names : fresh
		const target = resolveCurrent(prev.order, names, prev.current, registering)
		if (names !== prev.names) store.setState((state) => ({ ...state, names }))
		if (target === undefined || target === prev.current) return
		if (prev.current === undefined && !isControlled()) {
			enterStep(target)
			return
		}
		// A controlled flow asks once per target: `refresh` runs on every store change, and the parent
		// has not answered yet. A move the user asked for always goes through `moveTo` directly.
		if (isControlled()) {
			if (requested === target) return
			requested = target
		}
		moveTo(target)
	}

	const neighbour = (offset: number): string | undefined => {
		const { names, current } = store.get()
		if (current === undefined) return undefined
		return names[names.indexOf(current) + offset]
	}

	/**
	 * Check the step on screen, mark it visited, and record whether it passed. Resolves `true` only when
	 * it passed and nothing moved meanwhile — a move or a reset during the check makes its verdict stale.
	 * A check that throws counts as failed, and is reported with the step's name.
	 */
	const checkCurrent = async (): Promise<boolean> => {
		const { current, validating } = store.get()
		if (current === undefined || validating) return false
		const started = generation
		store.setState((prev) => ({ ...prev, validating: true, visited: new Set([...prev.visited, current]) }))
		let passed = false
		try {
			passed = await check(current)
		} catch (error) {
			console.error(`form.Steps: the check of step '${current}' failed, so it stays on screen.`, error)
		}
		const fresh = started === generation
		store.setState((prev) => {
			if (!fresh) return { ...prev, validating: false }
			const next = new Set(prev.passed)
			if (passed) next.add(current)
			else next.delete(current)
			return { ...prev, validating: false, passed: next }
		})
		return passed && fresh
	}

	/** The step after the one on screen, read when it is needed — after a check, not before it. */
	const goNext = (): void => {
		void checkCurrent().then((passed) => {
			const target = neighbour(NEXT)
			if (passed && target !== undefined) moveTo(target)
		})
	}

	const goBack = (): void => {
		const target = neighbour(PREVIOUS)
		if (target !== undefined) moveTo(target)
	}

	const goTo = (name: string): void => {
		const { names, current } = store.get()
		const at = names.indexOf(name)
		const from = current === undefined ? NOT_FOUND : names.indexOf(current)
		if (at === NOT_FOUND || at === from) return
		if (at < from || settings.linear === false) {
			moveTo(name)
			return
		}
		void checkCurrent().then((passed) => {
			if (passed && store.get().names.includes(name) && reachable(name)) moveTo(name)
		})
	}

	/** Every step between the one on screen and `name` passed its last check and has no error now. */
	const reachable = (name: string): boolean => {
		const { names, current, passed } = store.get()
		const from = current === undefined ? 0 : names.indexOf(current) + 1
		return names.slice(from, names.indexOf(name)).every((step) => passed.has(step) && isClean(step))
	}

	return {
		store,
		settings: () => settings,
		configure: (next) => {
			settings = next
		},
		registerStep: (name, record) => {
			if (isDevelopment()) {
				if (records.has(name)) {
					console.error(`form.Steps: two steps named '${name}'. Give each step a name of its own.`)
				} else if (!registering) {
					console.error(
						`form.Steps: step '${name}' mounted after the flow did, so it is listed last. Keep every step mounted and give it \`when\` instead.`,
					)
				}
			}
			records.set(name, record)
			store.setState((prev) => (prev.order.includes(name) ? prev : { ...prev, order: [...prev.order, name] }))
			refresh()
			// Unregistering moves nothing: StrictMode unmounts every step and mounts it again in one
			// commit, and resolving the step on screen in between would lose an `initial` further on.
			return () => {
				records.delete(name)
				store.setState((prev) => ({
					...prev,
					order: prev.order.filter((entry) => entry !== name),
					names: prev.names.filter((entry) => entry !== name),
				}))
			}
		},
		registerField: (step, field) => {
			const counts = bindings.get(step) ?? new Map<string, number>()
			bindings.set(step, counts)
			counts.set(field, (counts.get(field) ?? 0) + 1)
			store.setState((prev) => {
				const list = prev.fields[step] ?? []
				return list.includes(field) ? prev : { ...prev, fields: { ...prev.fields, [step]: [...list, field] } }
			})
			return () => {
				const left = (counts.get(field) ?? 1) - 1
				if (left > 0) counts.set(field, left)
				else counts.delete(field)
				if (left > 0 || store.get().current !== step) return
				store.setState((prev) => ({
					...prev,
					fields: { ...prev.fields, [step]: (prev.fields[step] ?? []).filter((entry) => entry !== field) },
				}))
			}
		},
		registerGroup: (step, owner) => {
			const set = groups.get(step) ?? new Set<object>()
			groups.set(step, set)
			set.add(owner)
			return () => {
				if (store.get().current === step) set.delete(owner)
			}
		},
		groupsOf: (step) => groups.get(step) ?? new Set(),
		registerScope: (step, scope) => {
			scopes.set(step, scope)
			return () => {
				if (scopes.get(step) === scope) scopes.delete(step)
			}
		},
		scopeOf: (step) => scopes.get(step),
		refresh,
		moveTo,
		syncStep: (name) => {
			requested = undefined
			if (store.get().current !== name) enterStep(name)
		},
		setCheck: (nextCheck, nextIsClean) => {
			check = nextCheck
			isClean = nextIsClean
		},
		goNext,
		goBack,
		goTo,
		connect: () => {
			registering = false
			refresh()
			const subscription = form.store.subscribe(refresh)
			const offReset = onResetOf(form, {
				before: () => undefined,
				after: () => {
					generation += 1
					store.setState((prev) => ({ ...prev, visited: new Set(), passed: new Set() }))
					const start = settings.initial ?? store.get().names[0]
					if (start !== undefined) moveTo(start)
				},
			})
			return () => {
				registering = true
				subscription.unsubscribe()
				offReset()
			}
		},
	}
}
