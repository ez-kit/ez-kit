/**
 * Finished copy, or a translation key the app resolves through `translate`.
 *
 * The key sits under `i18n` rather than `key` so a document reads as translated at a glance, and
 * so a block's `props` — where any `{ i18n }` value is translated — cannot mistake an ordinary
 * `{ key }` object for one.
 */
export type LocalizedText = string | { i18n: string; params?: Record<string, string | number> }

export type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * Overloaded so a *required* `LocalizedText` resolves to a plain `string` rather than
 * `string | undefined` — the caller would otherwise have to invent a fallback for a case
 * that cannot happen (`resolveSelectOptions`, whose labels are required, is the reason).
 */
export function resolveText(text: LocalizedText, translate?: Translate): string
export function resolveText(text: LocalizedText | undefined, translate?: Translate): string | undefined
export function resolveText(text: LocalizedText | undefined, translate?: Translate): string | undefined {
	if (text === undefined) return undefined
	if (typeof text === 'string') return text
	// A TS-authored schema never goes through the parser, so the old `{ key }` spelling reaches
	// here typed away rather than rejected; naming the field is the whole migration hint.
	if (typeof (text as { i18n?: unknown }).i18n !== 'string') {
		throw new Error('A translation key is written `{ i18n: "…" }`; this LocalizedText has no string "i18n".')
	}
	if (translate === undefined) {
		throw new Error(
			`FormSchema uses the translation key "${text.i18n}" but no \`translate\` function was supplied to the renderer.`,
		)
	}
	return text.params === undefined ? translate(text.i18n) : translate(text.i18n, text.params)
}
