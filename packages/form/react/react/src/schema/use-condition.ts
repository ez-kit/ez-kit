import { compileCondition } from '@ez-kit/form-core'
import { useSelector } from '@tanstack/react-form'
import { useCallback, useMemo } from 'react'

import type { Condition } from '@ez-kit/form-core'

/**
 * The slice of a bound form instance `useConditionValue` needs: a TanStack Store exposing
 * the live values object through the same `get`/`subscribe` shape `useSelector` expects.
 *
 * Declared narrowly — mirrors `BindableForm` in `../bindable-form.ts` — rather than importing
 * the real, deeply-generic `FormApi`/`FormState` types, which carry a dozen inference-driven
 * type parameters this hook never touches. The real instance's `.store` structurally has far
 * more than `values` on its snapshot (`errors`, `isSubmitting`, …), so the caller casts it in
 * with `as unknown as ConditionSubscribableForm<TValues>` at the render-node boundary — the
 * same pattern `buildFieldComponents` uses to narrow the same instance to `BindableForm`.
 */
export type ConditionSubscribableForm<TValues> = {
	store: {
		get: () => { values: TValues }
		subscribe: (listener: (value: { values: TValues }) => void) => { unsubscribe: () => void }
	}
}

/**
 * Whether `condition` currently holds against the form's live values.
 *
 * Subscribes through TanStack's `useSelector` (the same store `form.Subscribe` reads from —
 * see `createSubmitButton`'s `selectSubmitState` for the sibling pattern) rather than
 * re-rendering on every form-state change: the selector derives a single boolean, so a
 * keystroke in an unrelated field only re-renders this node when that boolean actually flips.
 *
 * `compileCondition`'s compiled function always accepts the full `TValues` shape — it has no
 * narrower signature for a rule that only reads one or two fields — so `useSelector` here
 * always subscribes to the whole values object and relies on its own equality check (not a
 * narrower subscription) to skip re-renders when the derived boolean does not change.
 *
 * Called unconditionally: a hidden node (`when` false) still must have called this hook, for
 * `disabledWhen`'s companion call and every other node's hooks to land in the same order on
 * every render — see `RenderNode`, which calls this once for `when` and once for
 * `disabledWhen` before deciding whether to return `null`.
 */
export function useConditionValue<TValues>(
	form: ConditionSubscribableForm<TValues>,
	condition: Condition<TValues> | undefined,
	fallback: boolean,
): boolean {
	const evaluate = useMemo(() => (condition === undefined ? undefined : compileCondition(condition)), [condition])

	const selector = useCallback(
		(state: { values: TValues }): boolean => (evaluate === undefined ? fallback : evaluate(state.values)),
		[evaluate, fallback],
	)

	return useSelector(form.store, selector)
}
