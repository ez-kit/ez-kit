'use client'

import { getValueAtPath, resolveSelectOptions, resolveText } from '@ez-kit/form-core'
import { useSelector } from '@tanstack/react-form'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { paramsKey } from './params-key'
import { useOptionSourceRegistry, useSchemaTranslate } from './source-context'
import { isSearchableSource } from './source-types'

import type { SearchableOptionSource, SimpleOptionSource } from './source-types'
import type { BindableForm, FieldValue } from '../bindable-form'
import type { ConditionSubscribableForm } from '../schema/use-condition'
import type { LocalizedText, OptionValue, SelectOption, Translate } from '@ez-kit/form-core'
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

/**
 * The query state a searchable select is driven by, as the kit receives it.
 *
 * The **renderer** owns the query — it has to, since it is what feeds the source — so the
 * kit is fully controlled here exactly like it is for every value in this contract.
 */
export type SearchBinding = {
	query: string
	onQueryChange: (query: string) => void
}

/** What the field renders with, whichever way its options arrived. */
export type ResolvedFieldOptions = {
	options: readonly SelectOption<OptionValue>[]
	loading: boolean
	/** Present only for a searchable field; `undefined` for every other one. */
	search: SearchBinding | undefined
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
	/**
	 * Render as a search over the source rather than a plain list. `select` and `multiselect`
	 * pass it; `parseFormSchema` rejects it on the two inline kinds.
	 */
	searchable?: boolean | undefined
	/**
	 * Offer the typed text as an extra option when it matches nothing. Requires `searchable`;
	 * `parseFormSchema` rejects the pair in a document and {@link FieldOptions} throws for the
	 * JSX path, which has no parser in front of it.
	 */
	creatable?: boolean | undefined
	/** Caption for that extra option. Defaults to `Add "<query>"`; see {@link createRowLabel}. */
	createLabel?: LocalizedText | undefined
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
export function FieldOptions({
	binding,
	form,
	name,
	clearedValue,
	searchable,
	creatable,
	createLabel,
	children,
}: FieldOptionsProps): ReactNode {
	const { options, loading, optionsFrom, optionsParams } = binding

	// Checked before either branch, and before any hook, because it is true of both: a value is
	// created by typing it, and only a searchable field has an input to type into. A document
	// is stopped earlier still, by `parseFormSchema`; this covers the JSX path.
	if (creatable === true && searchable !== true) {
		throw new Error(
			`Field "${name}" is \`creatable\`, which requires \`searchable\`: a value is created by typing it, ` +
				'and only a searchable field has somewhere to type.',
		)
	}

	if (optionsFrom === undefined) {
		if (options === undefined) {
			throw new Error(`Field "${name}" needs either an \`options\` list or an \`optionsFrom\` source name.`)
		}
		if (searchable === true) {
			return (
				<StaticSearchableOptions
					options={options}
					loading={loading ?? false}
					form={form}
					name={name}
					creatable={creatable === true}
					createLabel={createLabel}
				>
					{children}
				</StaticSearchableOptions>
			)
		}
		return children({ options, loading: loading ?? false, search: undefined })
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
			searchable={searchable === true}
			creatable={creatable === true}
			createLabel={createLabel}
		>
			{children}
		</SourcedFieldOptions>
	)
}

/**
 * A searchable field whose options are a list already in memory.
 *
 * This is the branch that used to throw. It filters client-side, by **one fixed rule** — a
 * case-insensitive substring of the label — and takes no configuration at all. That cap is
 * deliberate: "just filter it" is where `createFilterOptions({ ignoreAccents, ignoreCase,
 * matchFrom, limit, stringify, trim })` comes from, and an author who needs any of those
 * writes an option source, where the filter is theirs and this package still owns none of it.
 *
 * No parameters means nothing to clear on, so unlike the sourced branches there is no
 * `useClearOnParamsChange` here — the list cannot change out from under the value.
 */
function StaticSearchableOptions({
	options,
	loading,
	form,
	name,
	creatable,
	createLabel,
	children,
}: {
	options: readonly SelectOption<OptionValue>[]
	loading: boolean
	form: BindableForm
	name: string
	creatable: boolean
	createLabel: LocalizedText | undefined
	children: (resolved: ResolvedFieldOptions) => ReactNode
}): ReactNode {
	const translate = useSchemaTranslate()
	const [query, setQuery] = useState('')
	const values = useSelectedValues(form, name)

	// The filter must not hide what is already selected. A selected option dropped from the
	// list loses its label — a multiselect's chip would read as a raw id and a combobox's input
	// would go blank — so it is merged back in exactly as the sourced branch merges in what
	// `useSelectedOptions` answered. Without this, `withCreated` would then mistake a real
	// option for a value it had to label itself.
	const visible = useMemo(() => {
		const shown = mergeOptions(filterByLabel(options, query), selectedFrom(options, values))
		return withCreated(shown, { query, values, creatable, createLabel, translate })
	}, [options, query, values, creatable, createLabel, translate])
	const search = useMemo(() => ({ query, onQueryChange: setQuery }), [query])

	return children({ options: visible, loading, search })
}

type SourcedFieldOptionsProps = {
	source: string
	params: Record<string, unknown> | undefined
	form: BindableForm
	name: string
	clearedValue: FieldValue
	searchable: boolean
	creatable: boolean
	createLabel: LocalizedText | undefined
	children: (resolved: ResolvedFieldOptions) => ReactNode
}

/**
 * Looks the source up, then hands the *hook itself* to {@link SourcedOptions}.
 *
 * Split in two so the "no such source" throw happens before any hook that depends on the
 * lookup — a hook called only when the lookup succeeded would change the hook count between
 * renders if a registry ever gained the key late.
 */
function SourcedFieldOptions({
	source,
	searchable,
	creatable,
	createLabel,
	...rest
}: SourcedFieldOptionsProps): ReactNode {
	const registry = useOptionSourceRegistry()
	const optionSource = registry[source]
	if (optionSource === undefined) {
		throw new Error(
			`No option source is registered under "${source}". ` +
				'Register it on `<FormOptionSources value={…}>` above this form.',
		)
	}

	if (searchable) {
		// A searchable field's selected value is usually *not* on the current page of results,
		// so without `useSelectedOptions` its label can never be resolved and the control would
		// render permanently blank. Better a named throw than a form that looks broken.
		if (!isSearchableSource(optionSource)) {
			throw new Error(
				`Field "${rest.name}" is \`searchable\`, but the option source "${source}" is a plain function. ` +
					'A searchable field needs a source with both `useOptions` and `useSelectedOptions`, ' +
					'so the option for the value already in form state can be resolved for its label.',
			)
		}
		return (
			<SearchableSourcedOptions
				source={optionSource}
				creatable={creatable}
				createLabel={createLabel}
				{...rest}
			/>
		)
	}

	return (
		<SourcedOptions
			useOptionSource={isSearchableSource(optionSource) ? optionSource.useOptions : optionSource}
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
}: SourcedBodyProps & { useOptionSource: SimpleOptionSource }): ReactNode {
	const translate = useSchemaTranslate()
	const key = paramsKey(params)
	const stableParams = useStableParams(params, key)

	const result = useOptionSource({ params: stableParams })

	useClearOnParamsChange(key, form, name, clearedValue)

	const options = useMemo(
		() => resolveSelectOptions(result.options, translate),
		// The source owns its own list identity; re-resolving on every render would build a
		// new array each time and remount nothing but cost work on every keystroke elsewhere.
		[result.options, translate],
	)

	return children({ options, loading: result.loading, search: undefined })
}

/**
 * The searchable branch: two hooks from one source, merged into the single list the kit sees.
 *
 * `useOptions` answers "what matches what the user just typed" and `useSelectedOptions`
 * answers "what are the options behind the values already in form state". Only the second can
 * label a selection the current page of results does not contain, which — with server-side
 * search — is the normal case, not an edge one. It is what puts a real label on a
 * multi-select's chips, where the whole selection is usually off the current page.
 *
 * Single- and multi-value fields share this one path: the difference between them is entirely
 * in {@link useSelectedValues}, which reports one value or many through the same array.
 *
 * A separate component from {@link SourcedOptions} rather than a branch inside it: the two
 * call different numbers of hooks, and which one a field takes is fixed by its own
 * `searchable` prop, so nothing ever switches between them at runtime.
 */
function SearchableSourcedOptions({
	source,
	params,
	form,
	name,
	clearedValue,
	creatable,
	createLabel,
	children,
}: SourcedBodyProps & {
	source: SearchableOptionSource
	creatable: boolean
	createLabel: LocalizedText | undefined
}): ReactNode {
	const translate = useSchemaTranslate()
	const key = paramsKey(params)
	const stableParams = useStableParams(params, key)
	const [query, setQuery] = useState('')

	const listed = source.useOptions({ params: stableParams, query })
	const values = useSelectedValues(form, name)
	const selected = source.useSelectedOptions({ params: stableParams, query, values })

	// The typed text belongs to the parameters it was typed under: a new country makes
	// "berl" a search of the wrong catalogue, so it goes when the dependent value does.
	const resetQuery = useCallback(() => {
		setQuery('')
	}, [])
	useClearOnParamsChange(key, form, name, clearedValue, resetQuery)

	const options = useMemo(
		() =>
			withCreated(
				mergeOptions(
					resolveSelectOptions(listed.options, translate),
					resolveSelectOptions(selected.options, translate),
				),
				{ query, values, creatable, createLabel, translate },
			),
		[listed.options, selected.options, translate, query, values, creatable, createLabel],
	)

	const search = useMemo(() => ({ query, onQueryChange: setQuery }), [query])

	return children({ options, loading: listed.loading || selected.loading, search })
}

/** Everything both sourced bodies take, minus the parts the dispatcher above consumed. */
type SourcedBodyProps = Omit<SourcedFieldOptionsProps, 'source' | 'searchable' | 'creatable' | 'createLabel'>

/**
 * The parameter object handed to a source, kept referentially stable across renders.
 *
 * Keyed by the **by-value** identity, so the object — and therefore any query key built from
 * it — only changes when the parameters really did; an inline `optionsParams={{ country }}`
 * literal is a fresh object every render and must mean nothing by itself.
 */
function useStableParams(params: Record<string, unknown> | undefined, key: string): Record<string, unknown> {
	// eslint-disable-next-line react-hooks/exhaustive-deps -- `key` *is* `params`, by value.
	return useMemo(() => params ?? NO_PARAMS, [key])
}

/** Clears the dependent field — and anything else passed — when the parameters change. */
function useClearOnParamsChange(
	key: string,
	form: BindableForm,
	name: string,
	clearedValue: FieldValue,
	alsoReset?: () => void,
): void {
	// Initialised to the first key, so the first effect run is a no-op — see `FieldOptions`.
	const previousKey = useRef(key)
	useEffect(() => {
		if (previousKey.current === key) return
		previousKey.current = key
		form.setFieldValue(name, clearedValue)
		alsoReset?.()
	}, [key, form, name, clearedValue, alsoReset])
}

/**
 * The options behind the values currently in form state — the static list's answer to the
 * question `useSelectedOptions` answers for a source.
 */
function selectedFrom(
	options: readonly SelectOption<OptionValue>[],
	values: readonly OptionValue[],
): readonly SelectOption<OptionValue>[] {
	if (values.length === 0) return []
	const wanted = new Set(values.map((value) => String(value)))
	return options.filter((option) => wanted.has(String(option.value)))
}

/** The default caption of the creation row, when no `createLabel` was given. */
function defaultCreateLabel(query: string): string {
	return `Add "${query}"`
}

/**
 * The creation row's caption.
 *
 * A plain-string `createLabel` is used verbatim — a static "Add a new tag" reads fine and
 * needs nothing interpolated. The `{ key, params }` form gets the typed text merged in under
 * `query`, so a translation may place it wherever its language wants it.
 */
function createRowLabel(query: string, label: LocalizedText | undefined, translate: Translate | undefined): string {
	if (label === undefined) return defaultCreateLabel(query)
	if (typeof label === 'string') return label
	return resolveText({ key: label.key, params: { ...label.params, query } }, translate)
}

/**
 * The one filter this package owns: a case-insensitive substring of the label.
 *
 * Only the static branch calls it. A sourced list arrives already narrowed — by the source,
 * server-side — and filtering it again here would hide rows the search deliberately returned,
 * which is the same mistake the kit contract tells kits not to make.
 */
function filterByLabel(
	options: readonly SelectOption<OptionValue>[],
	query: string,
): readonly SelectOption<OptionValue>[] {
	const needle = query.trim().toLowerCase()
	if (needle === '') return options
	return options.filter((option) => option.label.toLowerCase().includes(needle))
}

type CreatedOptionsInput = {
	query: string
	values: readonly OptionValue[]
	creatable: boolean
	createLabel: LocalizedText | undefined
	translate: Translate | undefined
}

/**
 * The two extra rows a `creatable` field needs, appended to the list the kit will see.
 *
 * **Already-created values first.** A value this field created earlier is on no list — not the
 * static one, not a page of search results, not `useSelectedOptions`, which asks a server about
 * an id the server never issued. Left unlabelled it would break differently in each kit: the
 * heroui combobox leaves `inputValue` to React Aria, which draws nothing for a selected key
 * outside the collection, and a multiselect's chips would read blank. So every current value
 * the list cannot label is re-added as an option labelling itself — which, the value being the
 * text the user typed, is exactly right.
 *
 * **Then the creation row**, last, where react-select and react-admin both put it. It appears
 * only while the query matches nothing: an existing value or label makes it a duplicate, and
 * picking the real option is what the user meant anyway. The comparison is case-insensitive on
 * the label and exact on the value, mirroring react-select's `isValidNewOption` default.
 *
 * Selecting the row hands the kit a value the list contains, so `fromKitValue` resolves it
 * like any other and no kit learns the mode exists.
 */
function withCreated(
	options: readonly SelectOption<OptionValue>[],
	{ query, values, creatable, createLabel, translate }: CreatedOptionsInput,
): readonly SelectOption<OptionValue>[] {
	if (!creatable) return options

	const seen = new Set(options.map((option) => String(option.value)))
	const created: SelectOption<OptionValue>[] = []
	for (const value of values) {
		if (typeof value !== 'string' || seen.has(value)) continue
		seen.add(value)
		created.push({ value, label: value })
	}

	const trimmed = query.trim()
	const isNew =
		trimmed !== '' &&
		!seen.has(trimmed) &&
		!options.some((option) => option.label.toLowerCase() === trimmed.toLowerCase())
	const offer: SelectOption<OptionValue>[] = isNew
		? [{ value: trimmed, label: createRowLabel(trimmed, createLabel, translate) }]
		: []

	if (created.length === 0 && offer.length === 0) return options
	return [...options, ...created, ...offer]
}

/** Nothing selected. A module constant so the array's identity is stable across renders. */
const NO_VALUES: readonly OptionValue[] = []

/**
 * The field's current value, as the `values` array `useSelectedOptions` takes.
 *
 * Always an array — for a single-value select too, which is what let searchable multiselect
 * land without touching the source contract: a source written for one arm serves the other
 * unchanged, it simply receives more than one value. Read through a **narrow** `useSelector`
 * subscription, exactly as `useOptionSourceParams` reads its dependencies: this component
 * sits above `AppField` and would otherwise have to re-render on every change anywhere in
 * the form.
 *
 * A list value is filtered rather than passed through, so one bad entry cannot make a source
 * ask for `undefined`; the identity of the result only changes when the values do, because
 * the array is rebuilt from the same `value` reference the form holds.
 */
function useSelectedValues(form: BindableForm, name: string): readonly OptionValue[] {
	const store = (form as unknown as ConditionSubscribableForm<unknown>).store
	const value = useSelector(store, (state: { values: unknown }) => getValueAtPath(state.values, name))

	return useMemo(() => {
		if (Array.isArray(value)) {
			const values = (value as unknown[]).filter(isOptionValue)
			return values.length === 0 ? NO_VALUES : values
		}
		if (typeof value === 'string') return value === '' ? NO_VALUES : [value]
		if (typeof value === 'number') return [value]
		// `undefined` (the cleared value), and anything a mis-bound field might hold.
		return NO_VALUES
	}, [value])
}

/** The scalar an option's value may be — the runtime face of `OptionValue`. */
function isOptionValue(value: unknown): value is OptionValue {
	return typeof value === 'string' ? value !== '' : typeof value === 'number'
}

/**
 * The searched page plus any selected option missing from it, deduped by value.
 *
 * Results first, so the list reads as "what you searched for"; a selection the search did not
 * return is appended rather than hidden, which is the whole reason the second hook exists.
 * Compared as strings because that is what a kit will key items by anyway — a list is all one
 * scalar type, so this can never conflate `1` with `'1'` across the two halves.
 */
function mergeOptions(
	listed: readonly SelectOption<OptionValue>[],
	selected: readonly SelectOption<OptionValue>[],
): readonly SelectOption<OptionValue>[] {
	if (selected.length === 0) return listed

	const seen = new Set(listed.map((option) => String(option.value)))
	const extra = selected.filter((option) => !seen.has(String(option.value)))
	return extra.length === 0 ? listed : [...listed, ...extra]
}
