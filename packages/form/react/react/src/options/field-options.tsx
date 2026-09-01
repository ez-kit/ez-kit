'use client'

import { resolveSelectOptions } from '@ez-kit/form-core'
import { useEffect, useMemo, useRef } from 'react'

import { paramsKey } from './params-key'
import { useOptionSourceRegistry, useSchemaTranslate } from './source-context'

import type { OptionSource } from './source-types'
import type { BindableForm, FieldValue } from '../bindable-form'
import type { OptionValue, SelectOption } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * The two ways an option-bearing field can be told what to offer, as the field components
 * receive them. Exactly one of `options` and `optionsFrom` must be present; the field
 * components enforce that at runtime (see {@link FieldOptions}), because expressing it as a
 * union in `field-props.ts` would collide with the string/number correlation the select-like
 * props already are a union over — the two would multiply into four arms whose `name` could
 * no longer be checked against `options` on a per-arm basis.
 *
 * On the schema path `parseFormSchema` and `OptionsProvision` in `@ez-kit/form-core` both
 * reject the two-together and the neither case outright, so a document never gets this far.
 */
export type FieldOptionsBinding = {
	options?: readonly SelectOption<OptionValue>[] | undefined
	loading?: boolean | undefined
	optionsFrom?: string | undefined
	optionsParams?: Record<string, unknown> | undefined
}

/** What the field renders with, whichever way its options arrived. */
export type ResolvedFieldOptions = {
	options: readonly SelectOption<OptionValue>[]
	loading: boolean
}

const NO_PARAMS: Record<string, unknown> = {}

/**
 * The value a dependent field is reset to when its source's parameters change: nothing.
 *
 * `undefined` rather than `''` because the field may be bound to a numeric path — see
 * `OptionValue`. Every kit renders it as the placeholder either way (`asText(undefined)` is
 * `''`), and `JSON.stringify` drops it from the submitted payload rather than shipping an
 * empty string a backend would have to special-case.
 */
export const CLEARED_VALUE: FieldValue = undefined

/** The same, for the fields whose value is a list — those always hold one, never `undefined`. */
export const CLEARED_LIST: FieldValue = []

export type FieldOptionsProps = {
	binding: FieldOptionsBinding
	form: BindableForm
	/** The field's path — both for the error messages and for the clear-on-change reset. */
	name: string
	clearedValue: FieldValue
	children: (resolved: ResolvedFieldOptions) => ReactNode
}

/**
 * Resolves one field's options, from a static list or from a named source, and hands the
 * result to `children`.
 *
 * A **component** wrapping the field body, rather than a hook inside it, because the two
 * branches call different numbers of hooks: a static list calls none, a source calls the
 * source hook plus the plumbing around it. Splitting them into sibling components is what
 * keeps each branch's hook order fixed. Which branch a call site takes is a property of the
 * call site (`options=` vs `optionsFrom=`), so in practice nothing ever switches between them.
 */
export function FieldOptions({ binding, form, name, clearedValue, children }: FieldOptionsProps): ReactNode {
	const { options, loading, optionsFrom, optionsParams } = binding

	if (optionsFrom === undefined) {
		if (options === undefined) {
			throw new Error(`Field "${name}" needs either an \`options\` list or an \`optionsFrom\` source name.`)
		}
		return children({ options, loading: loading ?? false })
	}
	if (options !== undefined) {
		throw new Error(`Field "${name}" was given both \`options\` and \`optionsFrom\`; they are mutually exclusive.`)
	}

	return (
		<SourcedFieldOptions
			source={optionsFrom}
			params={optionsParams}
			form={form}
			name={name}
			clearedValue={clearedValue}
		>
			{children}
		</SourcedFieldOptions>
	)
}

type SourcedFieldOptionsProps = {
	source: string
	params: Record<string, unknown> | undefined
	form: BindableForm
	name: string
	clearedValue: FieldValue
	children: (resolved: ResolvedFieldOptions) => ReactNode
}

/**
 * Looks the source up, then hands the *hook itself* to {@link SourcedOptions}.
 *
 * Split in two so the "no such source" throw happens before any hook that depends on the
 * lookup — a hook called only when the lookup succeeded would change the hook count between
 * renders if a registry ever gained the key late.
 */
function SourcedFieldOptions({ source, ...rest }: SourcedFieldOptionsProps): ReactNode {
	const registry = useOptionSourceRegistry()
	const optionSource = registry[source]
	if (optionSource === undefined) {
		throw new Error(
			`No option source is registered under "${source}". ` +
				'Register it on `<FormOptionSources value={…}>` above this form.',
		)
	}

	return (
		<SourcedOptions
			useOptionSource={optionSource}
			{...rest}
		/>
	)
}

/**
 * Calls one source and clears the field when its parameters change.
 *
 * The clearing is unconditional and immediate: it does **not** wait for the new list and does
 * **not** check whether the old value happens to appear on it — while the new list is loading
 * that cannot be checked at all. Without it the user picks a country, the stale city stays in
 * form state behind an empty-looking trigger, and `{ country: 'de', city: 'msk' }` is
 * submitted. There is deliberately no opt-out.
 *
 * Two details make it behave: the parameters are compared **by value** (an inline
 * `optionsParams={{ country }}` literal is a fresh object every render and must clear
 * nothing), and the very first computation is skipped — a loaded draft or a schema
 * `defaultValue` must survive mount.
 */
function SourcedOptions({
	useOptionSource,
	params,
	form,
	name,
	clearedValue,
	children,
}: Omit<SourcedFieldOptionsProps, 'source'> & { useOptionSource: OptionSource }): ReactNode {
	const translate = useSchemaTranslate()
	const key = paramsKey(params)

	// Keyed by the by-value identity, so the object a source receives — and therefore any
	// query key built from it — only changes when the parameters really did.
	// eslint-disable-next-line react-hooks/exhaustive-deps -- `key` *is* `params`, by value.
	const stableParams = useMemo(() => params ?? NO_PARAMS, [key])

	const result = useOptionSource({ params: stableParams })

	// Initialised to the first key, so the first effect run is a no-op — see the doc comment.
	const previousKey = useRef(key)
	useEffect(() => {
		if (previousKey.current === key) return
		previousKey.current = key
		form.setFieldValue(name, clearedValue)
	}, [key, form, name, clearedValue])

	const options = useMemo(
		() => resolveSelectOptions(result.options, translate),
		// The source owns its own list identity; re-resolving on every render would build a
		// new array each time and remount nothing but cost work on every keystroke elsewhere.
		[result.options, translate],
	)

	return children({ options, loading: result.loading })
}
