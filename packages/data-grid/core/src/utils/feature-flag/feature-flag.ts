/**
 * Shape every feature option shares: `false` / omitted turns the feature off, `true` turns it
 * on with defaults, and an object turns it on **and** configures it — unless the object says
 * otherwise via {@link FeatureToggle.enabled}.
 */
export type FeatureToggle = {
	/**
	 * Explicit off-switch for a feature that is otherwise implied by its own config object.
	 *
	 * Passing an object means "on with these settings", which is what a call site almost
	 * always wants. `enabled: false` is the escape hatch for the case where the settings must
	 * survive while the feature does not — typically a shared defaults layer
	 * (`DataGridOptionsProvider`, `createDataGrid({ defaults })`) that describes how a
	 * feature should look for the whole app, switched off for one grid without restating it.
	 *
	 * Default: `true`.
	 */
	enabled?: boolean
}

/** Any feature option: absent, a plain boolean, or a config object that may carry `enabled`. */
export type FeatureOption<TConfig extends FeatureToggle> = boolean | TConfig | undefined

/**
 * Whether a feature option resolves to "on".
 *
 * - `undefined` / `false` → off
 * - `true` → on
 * - object → on, unless it carries `enabled: false`
 */
export function isFeatureEnabled<TConfig extends FeatureToggle>(option: FeatureOption<TConfig>): boolean {
	if (option === undefined || option === false) return false
	if (option === true) return true
	return option.enabled !== false
}

/**
 * The config object of a feature that is actually **on**, or `undefined`.
 *
 * Reading settings through this rather than `typeof option === 'object'` keeps a disabled
 * feature from contributing its `onChange`, `manual` or `fn` to the built table — the whole
 * point of `enabled: false` being a real off-switch and not a UI-only hint.
 */
export function featureConfig<TConfig extends FeatureToggle>(option: FeatureOption<TConfig>): TConfig | undefined {
	if (typeof option !== 'object') return undefined
	return option.enabled !== false ? option : undefined
}
