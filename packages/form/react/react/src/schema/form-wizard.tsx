import { compileCondition, resolveText } from '@ez-kit/form-core'
import { useFormGroup, useSelector } from '@tanstack/react-form'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

/** The `'submit'` validation cause both branches of `validateStep` run under. */
const STEP_VALIDATION_CAUSE = 'submit'

/** The slice of a field's meta the wizard reads — enough to ask "does this field error?". */
type FieldMetaLike = { errors: unknown[] }

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
}

/** The one member of `FormGroupApi` the wizard calls. */
type StepGroupApi = { validate: (cause: string) => unknown }

/**
 * `useFormGroup` narrowed to the two options the wizard supplies and the one method it calls.
 *
 * The real signature threads ~24 generics off the parent form's own validator types, none of
 * which survive `FormFieldComponents<TValues>` — the deliberately narrow shape this module
 * receives. One cast here keeps every call site below honest instead of scattering `as never`
 * through the component.
 */
const useStepGroup = useFormGroup as unknown as (opts: { form: unknown; name: string }) => StepGroupApi

/** Live `FormGroupApi` instances, keyed by the `path` of the step that declared them. */
type StepGroupRegistry = Map<string, StepGroupApi>

/**
 * Mounts one `useFormGroup` for a step that declares a `path` and publishes it to `registry`.
 *
 * A component, and one per path, rather than a loop inside `FormWizard`: which step is current
 * changes as the user navigates, so a hook call keyed off the *current* step's `path` would
 * appear and vanish between renders. The set of path-declaring steps, by contrast, is static
 * authored config, so mounting one binding per path gives a hook order that never moves — the
 * same reasoning that makes `renderChildren` mount one `RenderNode` per sibling.
 */
function StepGroupBinding({
	form,
	path,
	registry,
}: {
	form: unknown
	path: string
	registry: StepGroupRegistry
}): null {
	const group = useStepGroup({ form, name: path })

	useEffect(() => {
		registry.set(path, group)
		return () => {
			registry.delete(path)
		}
	}, [registry, path, group])

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
 * - `invalid` is gated on a `visited` set, so an untouched wizard never opens red — the
 *   form-level `onChange` validator sees every value, including steps the user has not reached.
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
	const currentPosition = useMemo(() => {
		const found = visibleSteps.findIndex(({ key }) => key === requestedKey)
		return found === -1 ? 0 : found
	}, [visibleSteps, requestedKey])
	const currentStep = visibleSteps[currentPosition]
	const currentKey = currentStep?.key

	/**
	 * Which steps the user has actually reached, by authored index — the gate on `invalid`
	 * (spec §10.2). Recorded by the navigation handlers rather than by an effect watching the
	 * current step: the step being *shown* counts as visited without being stored (see
	 * `isVisited`), so the only thing left to remember is the trail behind it.
	 */
	const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set<number>())
	const markVisited = useCallback((...keys: (number | undefined)[]) => {
		setVisited((previous) => {
			const missing = keys.filter((key): key is number => key !== undefined && !previous.has(key))
			if (missing.length === 0) return previous
			// A new Set rather than mutating the stored one.
			const next = new Set(previous)
			for (const key of missing) next.add(key)
			return next
		})
	}, [])

	const groupsRef = useRef<StepGroupRegistry | null>(null)
	groupsRef.current ??= new Map<string, StepGroupApi>()
	const groups = groupsRef.current

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
	 * Both branches scope validation to the step and then read the verdict off the same field
	 * meta, so a step that opts into `path` and one that does not behave identically. The
	 * collected-names branch is the default because `useFormGroup` binds to a **data** path,
	 * and requiring step-shaped data would put layout in charge of the payload (invariant I1).
	 */
	const validateStep = useCallback(
		async (step: KeyedStep<TValues>): Promise<boolean> => {
			const names = stepFieldNames[step.key] ?? []
			const group = step.node.path === undefined ? undefined : groups.get(step.node.path)

			if (group === undefined) {
				await wizardForm.validate(STEP_VALIDATION_CAUSE, { filterFieldNames: (name) => names.includes(name) })
			} else {
				await group.validate(STEP_VALIDATION_CAUSE)
			}

			return names.every((name) => (wizardForm.getFieldMeta(name)?.errors.length ?? 0) === 0)
		},
		[groups, stepFieldNames, wizardForm],
	)

	const goNext = useCallback(() => {
		const next = visibleSteps[currentPosition + 1]
		if (currentStep === undefined || next === undefined) return
		// Fire-and-forget: `goNext` is a `() => void` in the contract, because a kit renders a
		// plain button and has no promise to await.
		void validateStep(currentStep).then((valid) => {
			if (!valid) return
			markVisited(currentStep.key, next.key)
			setRequestedKey(next.key)
		})
	}, [currentStep, currentPosition, visibleSteps, validateStep, markVisited])

	const goBack = useCallback(() => {
		const previous = visibleSteps[currentPosition - 1]
		if (previous === undefined) return
		markVisited(currentStep?.key, previous.key)
		setRequestedKey(previous.key)
	}, [currentStep, currentPosition, visibleSteps, markVisited])

	const submitting = useSelector(
		wizardForm.store,
		useCallback((state: WizardFormState<TValues>) => state.isSubmitting, []),
	)

	const isVisited = useCallback(
		(key: number, position: number) => visited.has(key) || position === currentPosition,
		[visited, currentPosition],
	)

	const wizardSteps: WizardStep[] = visibleSteps.map(({ node, key }, index) => ({
		index,
		title: resolveText(node.title, context.translate),
		description: resolveText(node.description, context.translate),
		status: index < currentPosition ? 'complete' : index === currentPosition ? 'current' : 'upcoming',
		// Spec §10.2: never true for a step the user has not reached.
		invalid: isVisited(key, index) && flags[key]?.hasErrors === true,
		disabled: flags[key]?.disabledByCondition === true || !isVisited(key, index),
		goTo: () => {
			if (flags[key]?.disabledByCondition === true || !isVisited(key, index)) return
			markVisited(currentKey, key)
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
					registry={groups}
				/>
			))}
			<layout.Wizard
				steps={wizardSteps}
				currentIndex={currentPosition}
				canGoBack={currentPosition > 0}
				canGoNext={currentPosition < lastPosition}
				isLastStep={currentPosition === lastPosition}
				goNext={goNext}
				goBack={goBack}
				submitting={submitting}
			>
				{currentStep === undefined
					? null
					: renderChildren(currentStep.node.children, { form, layout, context, parentColumns: undefined })}
			</layout.Wizard>
		</>
	)
}
