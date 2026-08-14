/**
 * One file shown in an example's source panel. Deliberately free of Node imports:
 * the panel is a client component and must be able to import this type.
 */
export type ExampleFile = {
	/** Basename — the tab label. */
	name: string
	/** Path relative to the example root — disambiguates colliding basenames. */
	path: string
	/** Display-ready source. */
	source: string
	/** Syntax-highlighting language, derived from the extension. */
	language: string
}

export const DEFAULT_EXAMPLE_LANGUAGE = 'tsx'
