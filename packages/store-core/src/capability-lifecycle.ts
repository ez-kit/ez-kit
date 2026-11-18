import type { PluginCleanup, PluginContext, StorePlugin } from './plugin'

/** Release every capability in reverse setup order, preserving every failure for the owner. */
export function collectCapabilityCleanupErrors(cleanups: readonly PluginCleanup[]): unknown[] {
	const errors: unknown[] = []
	for (let index = cleanups.length - 1; index >= 0; index -= 1) {
		try {
			cleanups[index]?.()
		} catch (error) {
			errors.push(error)
		}
	}
	return errors
}

export function throwCapabilityCleanupErrors(errors: readonly unknown[]): void {
	if (errors.length > 0) throw new AggregateError(errors, 'Store capability cleanup failed')
}

/** Setup is transactional: a later failure releases already acquired capabilities. */
export function setupCapabilities<T extends object>(
	instance: T,
	plugins: readonly StorePlugin<T>[],
	context: PluginContext,
): PluginCleanup[] {
	const cleanups: PluginCleanup[] = []
	try {
		for (const plugin of plugins) cleanups.push(plugin.setup(instance, context))
	} catch (error) {
		const cleanupErrors = collectCapabilityCleanupErrors(cleanups)
		if (cleanupErrors.length > 0)
			throw new AggregateError([error, ...cleanupErrors], 'Store capability setup and rollback failed')
		throw error
	}
	return cleanups
}
