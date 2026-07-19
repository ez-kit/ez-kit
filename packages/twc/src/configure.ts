import type { TwcConfigureOptions, TwcRuntimeConfig } from './types'

/** Attribute the component name is rendered into unless overridden. */
const DEFAULT_ATTRIBUTE = 'data-component'
const PRODUCTION = 'production'

/**
 * Derived from `NODE_ENV` so server and client agree — provided the bundler
 * inlines `process.env.NODE_ENV` for the client build, as every mainstream one
 * does. Where `process` is absent and not replaced (raw ESM in the browser, some
 * edge runtimes) this reports development, which in a production build would
 * render the name attribute on the client but not on the server. Call
 * `configure({ enabled })` explicitly before the first render to pin it there.
 */
function isDevelopmentEnvironment(): boolean {
	return typeof process === 'undefined' || process.env.NODE_ENV !== PRODUCTION
}

let runtimeConfig: TwcRuntimeConfig = {
	attribute: DEFAULT_ATTRIBUTE,
	enabled: isDevelopmentEnvironment(),
	twMerge: true,
}

/**
 * Set global `twc` options. Repeated calls merge over the previous state, and
 * the result is read lazily at render time — call it before the first render.
 *
 * ```ts
 * configure({ attribute: 'data-twc', enabled: true, twMerge: false })
 * ```
 */
export function configure(options: TwcConfigureOptions): void {
	runtimeConfig = {
		attribute: options.attribute ?? runtimeConfig.attribute,
		enabled: options.enabled ?? runtimeConfig.enabled,
		twMerge: options.twMerge ?? runtimeConfig.twMerge,
	}
}

/** Current global config. Internal — components read it on every render. */
export function getRuntimeConfig(): TwcRuntimeConfig {
	return runtimeConfig
}

/** Restore the built-in defaults. Internal — used by the test suite. */
export function resetRuntimeConfig(): void {
	runtimeConfig = {
		attribute: DEFAULT_ATTRIBUTE,
		enabled: isDevelopmentEnvironment(),
		twMerge: true,
	}
}
