/** Finished copy, or a translation key the app resolves. */
export type LocalizedText = string | { key: string; params?: Record<string, string | number> }

export type Translate = (key: string, params?: Record<string, string | number>) => string

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
