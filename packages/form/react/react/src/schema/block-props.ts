import { resolveText } from '@ez-kit/form-core'

import type { LocalizedText, Translate } from '@ez-kit/form-core'

const I18N_KEY = 'i18n'

/** A translation key in `LocalizedText`'s object form — the only object a block's props translate. */
type TranslationKey = Exclude<LocalizedText, string>

function isTranslationKey(value: unknown): value is TranslationKey {
	return typeof value === 'object' && value !== null && !Array.isArray(value) && I18N_KEY in value
}

/**
 * A block's `props` as its component receives them: flat, under the names JSX uses, with every
 * top-level `{ i18n }` value translated and everything else — strings included, which are finished
 * copy — passed through as written.
 *
 * Only the top level is read. A nested object is the component's own data, and walking into it
 * would translate a value the component never meant as text.
 */
export function resolveBlockProps(
	props: Record<string, unknown> | undefined,
	translate: Translate | undefined,
): Record<string, unknown> {
	if (props === undefined) return {}
	return Object.fromEntries(
		Object.entries(props).map(([key, value]) => [key, isTranslationKey(value) ? resolveText(value, translate) : value]),
	)
}
