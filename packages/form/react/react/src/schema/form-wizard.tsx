import { compileCondition, resolveText } from '@ez-kit/form-core'
import { useFormGroup, useSelector } from '@tanstack/react-form'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { renderChildren } from './render-children'
import { useStepFieldNames } from './use-step-fields'

import type { LayoutComponents, RenderNodeContext } from './render-node'
import type { WizardStep } from '../contract'
import type { FormFieldComponents } from '../field-props'
import type { AnyFormSchema, StepNode } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/** How many flag characters `useStepFlags` packs per step — visible, disabled, has-errors. */
const FLAGS_PER_STEP = 3
const FLAG_ON = '1'
const FLAG_OFF = '0'

/** The `'submit'` validation cause `validateStep` runs under. */
const STEP_VALIDATION_CAUSE = 'submit'

/** `currentIndex` for a wizard whose every step is hidden — "no step", not "the first one". */
const NO_CURRENT_INDEX = -1

/** The slice of a field's meta the wizard reads — enough to ask "does this field error?". */
type FieldMetaLike = { errors: unknown[] }

/**
 * The slice of a field's *base* meta the wizard writes. `errors` is derived from `errorMap` by
 * `FormApi`, so clearing the map is what clears the errors.
 */
type FieldMetaBaseLike = { errorMap?: unknown }

/** The form-state snapshot the wizard subscribes to. */
type WizardFormState<TValues> = {
	values: TValues
	isSubmitting: boolean
	fieldMeta: Record<string, FieldMetaLike | undefined>
}

/**
 * What the wizard needs from a bound form instance, declared narrowly for the same reason
 * `ConditionSubscribableForm` is (see `use-condition.ts`): the real `FormApi` carries a dozen
 * inference-driven type parameters none of this code touches, so the caller narrows the very
 * same instance with `as unknown as` at the one boundary below.
 */
type WizardForm<TValues> = {
	store: {
		get: () => WizardFormState<TValues>
		subscribe: (listener: (value: WizardFormState<TValues>) => void) => { unsubscribe: () => void }
	}
	/**
	 * Runs the form-level validators. `filterFieldNames` is what keeps a wizard step's "next"
	 * from writing errors onto fields the user has not reached yet — it is the exact mechanism
	 * TanStack's own `FormGroupApi.validate` uses to scope a group's validation.
	 */
	validate: (cause: string, opts?: { filterFieldNames?: (fieldName: string) => boolean }) => unknown
	getFieldMeta: (name: string) => FieldMetaLike | undefined
	/**
	 * Used for exactly one thing: dropping the errors the form-level validator wrote onto a step
	 * the user had not reached yet, at the moment they first arrive on it.
	 */
	setFieldMeta: (name: string, updater: (meta: FieldMetaBaseLike) => FieldMetaBaseLike) => void
}

/**
 * `useFormGroup` narrowed to the two options the wizard supplies.
 *
 * The real signature threads ~24 generics off the parent form's own validator types, none of
 * which survive `FormFieldComponents<TValues>` — the deliberately narrow shape this module
 * receives. One cast here keeps every call site below honest instead of scattering `as never`
 * through the component.
 */
const useStepGroup = useFormGroup as unknown as (opts: { form: unknown; name: string }) => unknown

/**
 * Mounts one `useFormGroup` for a step that declares a `path`.
 *
 * A component, and one per path, rather than a loop inside `FormWizard`: which step is current
 * changes as the user navigates, so a hook call keyed off the *current* step's `path` would
 * appear and vanish between renders. The set of path-declaring steps, by contrast, is static
 * authored config, so mounting one binding per path gives a hook order that never moves — the
 * same reasoning that makes `renderChildren` mount one `RenderNode` per sibling.
 *
 * The binding is what gives `path` its meaning in v1, and it is where group-level validators
 * will attach once the schema can declare them. It deliberately exposes **nothing**:
 * `validateStep` must never call `FormGroupApi.validate` — see the note at that call site.
 */
function StepGroupBinding({ form, path }: { form: unknown; path: string }): null {
	useStepGroup({ form, name: path })

	return null
}

/** A step paired with its position in the *authored* list — its identity across re-filtering. */
type KeyedStep<TValues> = { node: StepNode<TValues, string>; key: number }

/** The three per-step booleans derived from live form state. */
type StepFlags = { visible: boolean; disabledByCondition: boolean; hasErrors: boolean }

export function isStepNode<TValues>(node: { type: string }): node is StepNode<TValues, string> {
	return node.type === 'step'
}

/**
 * Where the wizard actually sits, given the step the user asked for.
 *
 * The requested step can disappear between renders — a condition flipped by a field on that
 * very step is enough. Falling back to position 0 would throw the user to the *start* of the
 * wizard; the nearest surviving step *before* the one that vanished is where they were heading
 * from, so that is where they land. `visibleSteps` is ascending by authored key, so the last
 * entry below `requestedKey` is the greatest one.
 */
function resolveCurrentPosition<TValues>(
	visibleSteps: readonly KeyedStep<TValues>[],
	requestedKey: number | undefined,
): number {
	if (requestedKey === undefined) return 0
	const found = visibleSteps.findIndex(({ key }) => key === requestedKey)
	if (found !== -1) return found

	let fallback = 0
	visibleSteps.forEach(({ key }, position) => {
		if (key < requestedKey) fallback = position
	})
	return fallback
}

/**
 * Every per-step flag that depends on live form state, in one subscription.
 *
 * Packed into a string rather than returned as an array of objects on purpose: `useSelector`
 * compares the selected value, and a fresh array would never compare equal, so every keystroke
 * anywhere in the form would re-render the whole wizard. A string of `'1'`/`'0'` compares by
 * value, so the wizard re-renders only when one of these booleans actually flips — the same
 * trick, for the same reason, as the single derived boolean in `useConditionValue`.
 */
function useStepFlags<TValues>(
	form: WizardForm<TValues>,
	steps: readonly StepNode<TValues, string>[],
	stepFieldNames: readonly string[][],
): StepFlags[] {
	const conditions = useMemo(
		() =>
			steps.map((step) => ({
				when: step.when === undefined ? undefined : compileCondition(step.when),
				disabledWhen: step.disabledWhen === undefined ? undefined : compileCondition(step.disabledWhen),
			})),
		[steps],
	)

	const selector = useCallback(
		(state: WizardFormState<TValues>): string =>
			conditions
				.map(({ when, disabledWhen }, index) => {
					const visible = when === undefined || when(state.values)
					const disabled = disabledWhen?.(state.values) === true
					const hasErrors = (stepFieldNames[index] ?? []).some(
						(name) => (state.fieldMeta[name]?.errors.length ?? 0) > 0,
					)
					return [visible, disabled, hasErrors].map((flag) => (flag ? FLAG_ON : FLAG_OFF)).join('')
				})
				.join(''),
		[conditions, stepFieldNames],
	)

	const packed = useSelector(form.store, selector)

	return useMemo(
		() =>
			steps.map((_step, index) => ({
				visible: packed[index * FLAGS_PER_STEP] === FLAG_ON,
				disabledByCondition: packed[index * FLAGS_PER_STEP + 1] === FLAG_ON,
				hasErrors: packed[index * FLAGS_PER_STEP + 2] === FLAG_ON,
			})),
		[steps, packed],
	)
}

export type FormWizardProps<TValues> = {
	/** The whole document — the step list is derived here so its identity stays memo-stable. */
	schema: AnyFormSchema<TValues>
	/** The bound field components already attached to the form instance — see `createForm`. */
	form: FormFieldComponents<TValues>
	layout: LayoutComponents
	context: RenderNodeContext
}

/**
 * Drives a step-per-screen schema through the kit's `Wizard` (spec §4.5, §10).
 *
 * This package draws none of the chrome: it computes the flat `WizardRenderProps` the kit
 * assembles a stepper from, and hands the current step's fields over as `children`. Two rules
 * from spec §10.2 live here so no kit has to think about them:
 *
 * - a step hidden by `when` is **removed** from `steps` and the remaining indices are
 *   recomputed, so a stepper never claims "3 of 5" for a form with four reachable steps. That
 *   is the one place a `when`-hidden node is dropped rather than rendered as `null` in place:
 *   inside a step's children `RenderNode` still returns `null` from its own position, keeping
 *   sibling keys and hook order stable;
 * - `invalid` is gated on a `visited` set, so a step never opens red on arrival — the
 *   form-level `onChange` validator sees every value in the document, including fields on steps
 *   the user has not reached, so their meta carries errors long before the user gets there. A
 *   step becomes visited when the user tries to *leave* it, never by being shown.
 *
 * Step composition is **layout**, so which fields a step owns is always decided by the names
 * collected from its subtree (invariant I1): `goNext` runs the form-level validators scoped to
 * exactly those names. A step's optional `path` never replaces or extends that — it only mounts
 * a `FormGroupApi` (see `StepGroupBinding`), which is what a group-level validator will attach
 * to once the schema can declare one.
 *
 * `title` and `description` are resolved here (`resolveText`) exactly as a field's `label` is
 * in `RenderNode`: `WizardStep` types them as `ReactNode`, so a kit must never be handed a
 * `LocalizedText` to resolve itself.
 *
 * The final submit is **not** wizard chrome — it comes from a `submit` node placed in the last
 * step (spec §10.3), which renders through `renderChildren` like any other node.
 */
export function FormWizard<TValues>({ schema, form, layout, context }: FormWizardProps<TValues>): ReactNode {
	// The real bound instance carries far more than `FormFieldComponents`; this narrows it to
	// the store and the two methods used below, the same `as unknown` pattern `RenderNode` uses
	// for `ConditionSubscribableForm`.
	const wizardForm = form as unknown as WizardForm<TValues>

	const steps = useMemo(() => schema.children.filter((node) => isStepNode<TValues>(node)), [schema])
	const stepFieldNames = useStepFieldNames(steps)
	const flags = useStepFlags(wizardForm, steps, stepFieldNames)

	const visibleSteps = useMemo<KeyedStep<TValues>[]>(
		() => steps.map((node, key) => ({ node, key })).filter(({ key }) => flags[key]?.visible === true),
		[steps, flags],
	)

	// Navigation state is the *authored* index of the step the user asked for, not its position
	// in `visibleSteps`: a condition flipping elsewhere in the form re-filters that list, and a
	// stored position would silently point at a different step. `undefined` means "wherever the
	// wizard starts", which resolves to the first visible step below.
	const [requestedKey, setRequestedKey] = useState<number | undefined>(undefined)
	const currentPosition = useMemo(
		() => resolveCurrentPosition(visibleSteps, requestedKey),
		[visibleSteps, requestedKey],
	)
	const currentStep = visibleSteps[currentPosition]
	const currentKey = currentStep?.key

	// The requested step just vanished and the wizard fell back to an earlier one. Reconcile the
	// stored request to where the user actually is, or re-showing the hidden step would yank them
	// back to it. Adjusting state during render (rather than in an effect) is React's own
	// documented pattern for deriving state from props/state that changed: the component
	// re-renders immediately, before anything is committed, and `react-hooks` bans the effect
	// form outright.
	if (currentKey !== undefined && requestedKey !== undefined && currentKey !== requestedKey) {
		setRequestedKey(currentKey)
	}

	/**
	 * Which steps the user has actually tried to leave, by authored index — the gate on `invalid`
	 * (spec §10.2). Recorded by the navigation handlers rather than by an effect watching the
	 * current step: merely *arriving* on a step must not mark it visited, or it would open red
	 * the moment the form-level validator has written errors onto its untouched fields.
	 *
	 * Only `goNext` writes here, and only for the step it validates. That keeps the invariant the
	 * arrival clear below depends on — **visited ⇒ validated at least once** — so a step can never
	 * be both "visited" and carrying errors nobody has computed. `goBack`/`goTo` deliberately mark
	 * nothing: a step the user merely looked at and backed out of was never validated, and marking
	 * it would make it report `invalid: false` for errors that will still block submission.
	 */
	const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set<number>())
	const markVisited = useCallback((key: number) => {
		setVisited((previous) => {
			if (previous.has(key)) return previous
			// A new Set rather than mutating the stored one.
			const next = new Set(previous)
			next.add(key)
			return next
		})
	}, [])

	const paths = useMemo(() => {
		const seen: string[] = []
		for (const step of steps) {
			if (step.path !== undefined && !seen.includes(step.path)) seen.push(step.path)
		}
		return seen
	}, [steps])

	/**
	 * Validate one step's fields and report whether they all pass.
	 *
	 * The names collected from the step's subtree always decide the scope: a step is layout, and
	 * layout may never be governed by a data path (invariant I1).
	 *
	 * **Do not add a `FormGroupApi.validate` call here.** `useStepGroup` supplies no validators, so
	 * `FormGroupApi.validate` only re-runs the *form's* validators scoped by data path with
	 * `dontUpdateFormErrorMap` — it cannot change the verdict below, which is read off the
	 * collected names. Its one observable effect is harmful: it writes errors onto fields under
	 * `path` that live on *later* steps, reddening them before the user arrives. The group binding
	 * stays (that is what makes `path` meaningful); the call does not.
	 */
	const validateStep = useCallback(
		async (step: KeyedStep<TValues>): Promise<boolean> => {
			const names = stepFieldNames[step.key] ?? []
			await wizardForm.validate(STEP_VALIDATION_CAUSE, { filterFieldNames: (name) => names.includes(name) })

			return names.every((name) => (wizardForm.getFieldMeta(name)?.errors.length ?? 0) === 0)
		},
		[stepFieldNames, wizardForm],
	)

	/**
	 * Drop the errors a step's fields are carrying before the user has ever seen the step.
	 *
	 * The schema's constraints compile into a **form-level** `onChange` validator, so one
	 * keystroke on step one writes "this field is required" onto every empty required field in
	 * the document — including fields on steps further along. Gating the step's `invalid` flag on
	 * `visited` keeps the *stepper* from opening red (spec §10.2), but the fields themselves
	 * render whatever meta they carry, so the step body would still open red on arrival. Clearing
	 * the map here is the field-level half of the same rule; a later validation run repopulates it
	 * the moment the values genuinely fail again.
	 */
	const clearStepErrors = useCallback(
		(key: number) => {
			for (const name of stepFieldNames[key] ?? []) {
				// A new meta object rather than a mutation of the stored one.
				wizardForm.setFieldMeta(name, (meta) => ({ ...meta, errorMap: {} }))
			}
		},
		[stepFieldNames, wizardForm],
	)

	/**
	 * Arrival at a step the user has never left clears that step's stale errors — whatever brought
	 * them here.
	 *
	 * Bound to *arrival*, not to `goNext`, because `goNext` is not the only way onto a step: when
	 * the current step hides itself the wizard falls back to the nearest earlier one
	 * (`resolveCurrentPosition`), which can be a step that was never visited, and that step would
	 * otherwise open red — the exact defect this clear exists to prevent. `goBack` and `goTo` can
	 * land on an unvisited step for the same reason.
	 *
	 * `currentKey` is a number, so this re-runs only when the user actually moves; errors the user
	 * produces *while standing on* an unvisited step therefore survive. `visited` is in the deps
	 * only so a failed `goNext` (which marks the current step) re-evaluates the guard rather than
	 * clearing what it just computed.
	 */
	useEffect(() => {
		if (currentKey === undefined || visited.has(currentKey)) return
		clearStepErrors(currentKey)
	}, [currentKey, visited, clearStepErrors])

	/** Guards `goNext` against a second click landing while the first validation is in flight. */
	const validatingRef = useRef(false)

	const goNext = useCallback(() => {
		const next = visibleSteps[currentPosition + 1]
		if (currentStep === undefined || next === undefined || validatingRef.current) return

		// The user is trying to leave this step — that, and not being shown it, is what makes a
		// step "visited" and lets it report `invalid` (spec §10.2). Marked before validation so a
		// step the user failed to leave still turns red.
		markVisited(currentStep.key)

		// Fire-and-forget: `goNext` is a `() => void` in the contract, because a kit renders a
		// plain button and has no promise to await.
		validatingRef.current = true
		void validateStep(currentStep)
			.then((valid) => {
				validatingRef.current = false
				if (!valid) return
				setRequestedKey(next.key)
			})
			.catch((error: unknown) => {
				validatingRef.current = false
				// A rejecting async validator is a bug in the app's schema, and the contract gives
				// this callback nowhere to return it. Re-throwing on a fresh task surfaces it to
				// the app's global error handling rather than swallowing it.
				setTimeout(() => {
					throw error
				})
			})
	}, [currentStep, currentPosition, visibleSteps, validateStep, markVisited])

	const goBack = useCallback(() => {
		const previous = visibleSteps[currentPosition - 1]
		if (previous === undefined) return
		// Marks nothing: backing out of a step is not trying to leave it forwards, and neither step
		// has been validated by this move. See the `visited` declaration.
		setRequestedKey(previous.key)
	}, [currentPosition, visibleSteps])

	const submitting = useSelector(
		wizardForm.store,
		useCallback((state: WizardFormState<TValues>) => state.isSubmitting, []),
	)

	/**
	 * A step the user may jump to: one they have already tried to leave, or the one on screen.
	 *
	 * Deliberately *not* the gate on `invalid` — the step on screen is navigable but not yet
	 * visited, and conflating the two is what makes a wizard open red on arrival.
	 */
	const isReachable = useCallback(
		(key: number, position: number) => visited.has(key) || position === currentPosition,
		[visited, currentPosition],
	)

	const wizardSteps: WizardStep[] = visibleSteps.map(({ node, key }, index) => ({
		index,
		title: resolveText(node.title, context.translate),
		description: resolveText(node.description, context.translate),
		status: index < currentPosition ? 'complete' : index === currentPosition ? 'current' : 'upcoming',
		// Spec §10.2: never true for a step the user has not tried to leave.
		invalid: visited.has(key) && flags[key]?.hasErrors === true,
		disabled: flags[key]?.disabledByCondition === true || !isReachable(key, index),
		goTo: () => {
			if (flags[key]?.disabledByCondition === true || !isReachable(key, index)) return
			// Marks nothing, for the same reason `goBack` does not.
			setRequestedKey(key)
		},
	}))

	const lastPosition = visibleSteps.length - 1

	return (
		<>
			{paths.map((path) => (
				<StepGroupBinding
					key={path}
					form={form}
					path={path}
				/>
			))}
			<layout.Wizard
				steps={wizardSteps}
				// Every step hidden: there is no current step, and reporting 0 would tell the kit
				// "step 1 of nothing".
				currentIndex={currentStep === undefined ? NO_CURRENT_INDEX : currentPosition}
				canGoBack={currentPosition > 0}
				canGoNext={currentPosition < lastPosition}
				isLastStep={currentPosition === lastPosition}
				goNext={goNext}
				goBack={goBack}
				submitting={submitting}
			>
				{currentStep === undefined ? null : (
					// Keyed on the step: every step's children render into the same position inside
					// `layout.Wizard`, and non-field nodes are keyed by position, so without this a
					// step change would reuse the previous step's component instances — leaking
					// kit-internal state (a collapsed section, an uncontrolled input) across steps.
					<Fragment key={currentStep.key}>
						{renderChildren(currentStep.node.children, { form, layout, context, parentColumns: undefined })}
					</Fragment>
				)}
			</layout.Wizard>
		</>
	)
}
