import type { ValidationCause } from '@tanstack/form-core'

/**
 * TanStack's core `FormApi`, at the members this package wraps.
 *
 * The instance `useForm` returns is a spread copy of the core, but TanStack hands the **core** to
 * `onSubmit`, listeners, validators and every field (`field.form`), so a wrapper on the copy is
 * invisible there. Every path reaches these three own properties of the core: the copy's
 * `handleSubmit` calls `core._handleSubmit` at call time, the core's own `handleSubmit` calls
 * `this._handleSubmit`, and `_handleSubmit` calls `this.validateAllFields`.
 */
export type CoreFormApi = {
	_handleSubmit: (...args: never[]) => Promise<void>
	reset: (...args: never[]) => void
	validateAllFields: (cause: ValidationCause) => Promise<unknown[]>
}

/** What runs around the core's members — see {@link hookCore}. */
export type CoreHooks = {
	/** Before every submit, whoever starts it. */
	beforeSubmit: () => void
	/** Before every reset of the core. */
	beforeReset: () => void
}

const hookedCores = new WeakSet()

/**
 * Wrap the core's submit and reset, once per core.
 *
 * Called from `listeners.onMount`, which TanStack runs in its own mount layout effect — the first
 * moment the core is reachable, and before anyone can submit. StrictMode runs it twice with the same
 * core, hence the `WeakSet`.
 */
export function hookCore(core: CoreFormApi, hooks: CoreHooks): void {
	if (hookedCores.has(core)) return
	hookedCores.add(core)
	const { _handleSubmit: submit, reset } = core
	Object.assign(core, {
		_handleSubmit: (...args: Parameters<typeof submit>) => {
			hooks.beforeSubmit()
			return submit(...args)
		},
		reset: (...args: Parameters<typeof reset>) => {
			hooks.beforeReset()
			reset(...args)
		},
	})
}
