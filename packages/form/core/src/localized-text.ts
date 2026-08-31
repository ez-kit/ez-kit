/** Finished copy, or a translation key the app resolves. */
export type LocalizedText = string | { key: string; params?: Record<string, string | number> }

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
	if (translate === undefined) {
		throw new Error(
			`FormSchema uses the translation key "${text.key}" but no \`translate\` function was supplied to the renderer.`,
		)
	}
	return text.params === undefined ? translate(text.key) : translate(text.key, text.params)
}
