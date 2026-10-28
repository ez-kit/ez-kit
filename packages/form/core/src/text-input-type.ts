/**
 * The `type` attribute a text input may carry — a closed set, never a bare string.
 *
 * A const object plus a union of the same name rather than an `enum`: an enum member is a
 * nominal type, so a document writing `inputType: 'email'` would not compile without importing
 * this — and a schema is exactly the place that should not need one. `TextInputType.Email` and
 * `'email'` are the same value under both spellings.
 */
export const TextInputType = {
	Text: 'text',
	Email: 'email',
	Password: 'password',
	Tel: 'tel',
	Url: 'url',
	Search: 'search',
} as const

export type TextInputType = (typeof TextInputType)[keyof typeof TextInputType]
