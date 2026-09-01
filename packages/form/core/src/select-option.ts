import { resolveText } from './localized-text'

import type { LocalizedText, Translate } from './localized-text'

/**
 * The scalars a select-like option may carry as its `value`.
 *
 * A number is first class because the format's headline use case is a backend-authored
 * document whose entity ids are integers — a select over `countryId: number` must be
 * expressible without stringifying the id into form state. Booleans are deliberately absent:
 * a two-state choice is a `checkbox` / `switch`, not a one-option-per-state list.
 */
export type OptionValue = string | number

/**
 * A single choice offered by a select-like field, with its label already resolved to
 * finished copy — the shape a UI kit renders.
 *
 * `value` is the value written into form state; `label` is what the kit renders.
 * Kept framework-agnostic so both UI kits consume the identical option list.
 */
export type SelectOption<TValue = string> = {
	label: string
	value: TValue
	disabled?: boolean
}

/**
 * A choice as it is *authored* in a `FormSchema`: its label is `LocalizedText`, so a
 * document delivered by a backend can name a translation key instead of shipping finished
 * copy in one language — the same freedom every other label in the format already has.
 *
 * Separate from `SelectOption` on purpose. The kit contract stays a resolved-strings
 * contract (a kit never learns what a translation key is, exactly as with `WizardStep`'s
 * title), and the JSX API — which has no `translate` — keeps taking plain strings. The
 * renderer bridges the two with `resolveSelectOptions`.
 */
export type LocalizedSelectOption<TValue = string> = {
	label: LocalizedText
	value: TValue
	disabled?: boolean
}

/**
 * Resolve every option's `LocalizedText` label through `translate`, yielding the
 * kit-facing `SelectOption` list. Throws — via `resolveText` — on a key with no translator,
 * so a missing translation is a loud failure rather than a blank row in a dropdown.
 */
export function resolveSelectOptions<TValue>(
	options: readonly LocalizedSelectOption<TValue>[],
	translate?: Translate,
): SelectOption<TValue>[] {
	return options.map((option) => ({ ...option, label: resolveText(option.label, translate) }))
}
