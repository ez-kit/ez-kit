'use client'

import { useIsomorphicLayoutEffect, useSelector } from '@tanstack/react-form'
import { createContext, useContext, useInsertionEffect, useMemo, useRef, useState } from 'react'

import { useFormErrors } from '../fields/submit'
import { isPathWithin } from '../group-registry'
import { formatOwnErrors } from '../own-errors'
import { createValidatedScope, ScopeCause, scopeErrorKey, STEP_ERROR_KEY_PREFIX } from '../validated-scope'

import { createStepCheck, createStepClean } from './check'
import { createStepsController } from './controller'

import type { GroupValidators } from '../group-types'
import type { ScopeHost } from '../validated-scope'
import type { CheckHost } from './check'
import type { StepsController, StepsHost, StepsSettings, StepsState } from './controller'
import type { ReactNode } from 'react'

/** The members of the form a step flow reads and writes. */
export type StepsForm = StepsHost & CheckHost & ScopeHost & { getFieldValue: (name: string) => unknown }

/** What every part of `form.Steps` reads: its controller, and the form it belongs to. */
type StepsContextValue = { controller: StepsController; form: StepsForm }

const StepsContext = createContext<StepsContextValue | null>(null)

/** The step a field renders in, for its registration; `null` outside every `form.Step`. */
export type StepScope = { step: string; controller: StepsController }

export const StepContext = createContext<StepScope | null>(null)

/**
 * Register the field `name` in the step it renders in, if any. Every bound field calls it — `form.X`,
 * `group.X`, an array entry's fields and `form.Field` — through the binding seam.
 */
export function useStepField(name: string | undefined): void {
	const scope = useContext(StepContext)
	useIsomorphicLayoutEffect(() => {
		if (scope === null || name === undefined) return undefined
		return scope.controller.registerField(scope.step, name)
	}, [scope, name])
}

const NO_GROUP_OWNER =
	'form.Step: a group inside this step has no instance to register yet, so "Next" will not run its validators.'

/**
 * Register a group in the step it renders in, if any, by the owner the group passes go by. The owner is
 * read after every commit — TanStack builds a new group when its name changes — and re-registered when
 * it is a different one; the registration goes with the component.
 */
export function useStepGroup(owner: () => object | null): void {
	const scope = useContext(StepContext)
	const registered = useRef<{ owner: object; release: () => void } | null>(null)
	useIsomorphicLayoutEffect(() => {
		if (scope === null) return
		const found = owner()
		if (found === null) {
			if (process.env.NODE_ENV !== 'production') console.error(`${NO_GROUP_OWNER} Step: '${scope.step}'.`)
			return
		}
		if (registered.current?.owner === found) return
		registered.current?.release()
		registered.current = { owner: found, release: scope.controller.registerGroup(scope.step, found) }
	})
	useIsomorphicLayoutEffect(
		() => () => {
			registered.current?.release()
			registered.current = null
		},
		[scope],
	)
}

const NO_STEPS = 'form.Steps: this part reads the steps of a form, so render it inside <form.Steps>.'

function useStepsContext(): StepsContextValue {
	const value = useContext(StepsContext)
	if (value === null) throw new Error(NO_STEPS)
	return value
}

function useController(): StepsController {
	return useStepsContext().controller
}

type FormStoreState = {
	fieldMeta: Record<string, { errors: readonly unknown[] } | undefined>
	errorMap: Record<string, unknown>
}

/** A slice of the form's own state, for the parts that read errors. */
function useFormState<TSelected>(selector: (state: FormStoreState) => TSelected): TSelected {
	const { form } = useStepsContext()
	return useSelector((form as unknown as { store: Parameters<typeof useSelector>[0] }).store, (state) =>
		selector(state as FormStoreState),
	)
}

const NO_FIELDS: readonly string[] = []

/** One step's mark in `List`'s selection string: whether its fields have an error now. */
const FAILING = '1'
const CLEAN = '0'

/** Whether any of `fields` has an error now. */
function hasErrorsIn(state: FormStoreState, fields: readonly string[]): boolean {
	return fields.some((name) => (state.fieldMeta[name]?.errors.length ?? 0) > 0)
}

/** How two selections are compared; `Object.is` unless a caller passes its own. */
type Equality<T> = (a: T, b: T) => boolean

/** Any slice of the steps' state, re-rendering only when it changes by `equal` (`Object.is` by default). */
export function useSteps<TSelected>(
	selector: (state: StepsState) => TSelected,
	equal?: Equality<TSelected>,
): TSelected {
	return useSelector(useController().store, selector, equal === undefined ? undefined : { compare: equal })
}

/** `form.Steps`' props: its settings ({@link StepsSettings}) and ordinary children. */
export type StepsProps = StepsSettings & { children?: ReactNode }

/** One step as the stepper sees it. */
export type StepSummary = {
	/** The step's `name`. */
	name: string
	/** The user has tried to leave it. */
	visited: boolean
	/** Visited, and one of its fields has an error now. */
	invalid: boolean
}

/** What `form.Steps.List` hands its render function. */
export type StepsListRenderProps = {
	/** Every step that applies, in order. */
	steps: readonly StepSummary[]
	/** The step on screen. */
	current: string | undefined
	/** Show a step — back freely, forward as `linear` allows. */
	goTo: (name: string) => void
}

/** What `form.Steps.Item` and `useStep(name)` hand back for one step. */
export type StepItemRenderProps = {
	/** The step is on screen. */
	isCurrent: boolean
	/** The user has tried to leave it. */
	visited: boolean
	/** Visited, and one of its fields has an error now. */
	invalid: boolean
	/** Show this step — back freely, forward as `linear` allows. */
	goTo: () => void
}

/** What `form.Steps.Controls` hands its render function. */
export type StepsControlsRenderProps = {
	/** A step that applies comes before the one on screen. */
	canGoBack: boolean
	/** No step that applies comes after the one on screen. */
	isLast: boolean
	/** A step check is in flight; another "Next" is ignored meanwhile. */
	isValidating: boolean
	/** The step on screen's own errors with no path to a field — not its groups', which they show. */
	stepErrors: string[]
	/** The form's errors with no path, as `form.Submit` hands them. */
	formErrors: string[]
	/** Show the previous step that applies, without a check. */
	goBack: () => void
	/** Check the step on screen, and show the next one if it passed. */
	goNext: () => void
}

export type StepProps<TFormData> = {
	/** The step's id for navigation, the stepper and `onStepChange`; never part of the values. */
	name: string
	/** The condition the step applies under; a step that does not apply is skipped, in place. */
	when?: ((values: TFormData) => boolean) | undefined
	/**
	 * The step's own rules, over the whole form's values and written from the root, as `form.X` is. They
	 * run on their triggers and on "Next"; a whole-form submit does not run them. An issue on a field of
	 * another step is dropped; one with no path is the step's own, in `stepErrors`.
	 */
	validators?: GroupValidators<TFormData> | undefined
	children?: ReactNode
}

function useStepSlice(name: string): Omit<StepItemRenderProps, 'goTo'> {
	const isCurrent = useSteps((state) => state.current === name)
	const visited = useSteps((state) => state.visited.has(name))
	const fields = useSteps((state) => state.fields[name] ?? NO_FIELDS)
	const hasErrors = useFormState((state) => hasErrorsIn(state, fields))
	return { isCurrent, visited, invalid: visited && hasErrors }
}

/** One step's slice: whether it is on screen, visited and invalid, and a move to it. */
export function useStep(name: string): StepItemRenderProps {
	const controller = useController()
	const slice = useStepSlice(name)
	return {
		...slice,
		goTo: () => {
			controller.goTo(name)
		},
	}
}

function List({ children }: { children: (props: StepsListRenderProps) => ReactNode }): ReactNode {
	const controller = useController()
	const names = useSteps((state) => state.names)
	const current = useSteps((state) => state.current)
	const visited = useSteps((state) => state.visited)
	const fields = useSteps((state) => state.fields)
	// One string, so the selection compares by value: a step's errors change, the list re-renders.
	const failing = useFormState((state) =>
		names.map((name) => (hasErrorsIn(state, fields[name] ?? NO_FIELDS) ? FAILING : CLEAN)).join(''),
	)
	const steps = names.map((name, index) => ({
		name,
		visited: visited.has(name),
		invalid: visited.has(name) && failing[index] === FAILING,
	}))
	return children({ steps, current, goTo: controller.goTo })
}

function Item({ name, children }: { name: string; children: (props: StepItemRenderProps) => ReactNode }): ReactNode {
	return children(useStep(name))
}

function Controls({ children }: { children: (props: StepsControlsRenderProps) => ReactNode }): ReactNode {
	const controller = useController()
	const canGoBack = useSteps((state) => state.current !== undefined && state.names.indexOf(state.current) > 0)
	const isLast = useSteps(
		(state) => state.current !== undefined && state.names.indexOf(state.current) === state.names.length - 1,
	)
	const isValidating = useSteps((state) => state.validating)
	const current = useSteps((state) => state.current)
	const own = useFormState((state) =>
		current === undefined ? undefined : state.errorMap[scopeErrorKey(STEP_ERROR_KEY_PREFIX, current)],
	)
	const stepErrors = useMemo(() => formatOwnErrors([own]), [own])
	const formErrors = useFormErrors(useStepsContext().form)
	return children({
		canGoBack,
		isLast,
		isValidating,
		stepErrors,
		formErrors,
		goBack: controller.goBack,
		goNext: controller.goNext,
	})
}

function Subscribe<TSelected>({
	selector,
	equal,
	children,
}: {
	selector: (state: StepsState) => TSelected
	equal?: Equality<TSelected>
	children: (selected: TSelected) => ReactNode
}): ReactNode {
	return children(useSteps(selector, equal))
}

/** `form.Steps`: the provider, with the parts a step flow is drawn from. */
export type StepsComponent = ((props: StepsProps) => ReactNode) & {
	List: typeof List
	Item: typeof Item
	Controls: typeof Controls
	Subscribe: typeof Subscribe
}

/** The members a form instance gets for a step flow. */
export type StepMembers<TFormData> = {
	/** A headless step flow: a provider plus `List`, `Item`, `Controls` and `Subscribe`. */
	Steps: StepsComponent
	/** One step: rendered while it is on screen, registered always. */
	Step: (props: StepProps<TFormData>) => ReactNode
}

/** `form.Steps` and `form.Step` for one form instance. */
export function createStepMembers<TFormData>(form: StepsForm): StepMembers<TFormData> {
	function StepsRoot({ initial, step, onStepChange, linear, children }: StepsProps): ReactNode {
		const settings: StepsSettings = { initial, step, onStepChange, linear }
		const [controller] = useState(() => {
			const created = createStepsController(form, settings)
			created.setCheck(createStepCheck(form, created), createStepClean(form, created))
			return created
		})
		// Before any layout effect: a step's `refresh` in its own effect reads this render's callbacks.
		useInsertionEffect(() => {
			controller.configure(settings)
		})
		useIsomorphicLayoutEffect(() => {
			if (step !== undefined) controller.syncStep(step)
		}, [controller, step])
		useIsomorphicLayoutEffect(() => controller.connect(), [controller])
		const value = useMemo(() => ({ controller, form }), [controller])
		return <StepsContext.Provider value={value}>{children}</StepsContext.Provider>
	}

	const Steps = /* @__PURE__ */ Object.assign(StepsRoot, { List, Item, Controls, Subscribe })

	function Step({ name, when, validators, children }: StepProps<TFormData>): ReactNode {
		const controller = useController()
		const latestWhen = useRef(when)
		const latestValidators = useRef(validators)
		useIsomorphicLayoutEffect(() => {
			latestWhen.current = when
			latestValidators.current = validators
			controller.refresh()
		})
		const applies = useSteps((state) => state.names.includes(name))
		const hasValidators = validators !== undefined
		// A scope only while the step applies and has rules. Its validators see the whole form, so any
		// value change re-runs its change pass, not only a change of the step's own fields.
		useIsomorphicLayoutEffect(() => {
			if (!applies || !hasValidators) return undefined
			const fields = (): readonly string[] => controller.store.get().fields[name] ?? []
			const scope = createValidatedScope({
				form,
				errorKey: scopeErrorKey(STEP_ERROR_KEY_PREFIX, name),
				validators: () => (latestValidators.current ?? {}) as GroupValidators<unknown>,
				value: () => form.state.values,
				paths: { knows: (path) => fields().some((field) => isPathWithin(field, path)), toAbsolute: (path) => path },
				watches: (field) => fields().includes(field),
				watched: () => [form.state.values],
				dropUnknown: true,
			})
			const unlisten = scope.listen()
			const unregister = controller.registerScope(name, scope)
			return () => {
				unlisten()
				unregister()
				scope.clear()
			}
		}, [applies, hasValidators, controller, name])
		useIsomorphicLayoutEffect(
			() => controller.registerStep(name, { when: () => latestWhen.current }),
			[controller, name],
		)
		const isCurrent = useSteps((state) => state.current === name)
		// `onMount` runs each time the step comes on screen, as a TanStack group's does when a wizard
		// mounts it: after the children's effects, so the step's fields are registered by then.
		useIsomorphicLayoutEffect(() => {
			if (isCurrent) void controller.scopeOf(name)?.run(ScopeCause.Mount)
		}, [isCurrent, controller, name])
		const scope = useMemo(() => ({ step: name, controller }), [name, controller])
		return isCurrent ? <StepContext.Provider value={scope}>{children}</StepContext.Provider> : null
	}

	return { Steps, Step }
}
