import type { StorePlugin } from './plugin'

/**
 * Key under which an instance carries the capabilities attached to it by `with*` factory wrappers.
 * `Symbol.for` so two copies of the package in one process still see one registry.
 */
const CAPABILITIES = Symbol.for('ez-kit/capabilities')

type CapabilityHost = Record<symbol, unknown>

/** `'history'` → `'History'`, so the wrapper name quoted in an error reads `withHistory`, not `withhistory`. */
function capitalize(name: string): string {
	return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Register a plugin on the instance itself. Called by a `with*` wrapper at construction time — before
 * the instance is subscribed to — so the mount-time seam (`createContextStore`'s Provider, the instance
 * cache) can discover it without a parallel config channel.
 *
 * The list is non-enumerable and own-only: it never reaches snapshots, spreads or `JSON.stringify`.
 */
export function attachCapability<T extends object>(target: T, plugin: StorePlugin<T>): void {
	const host = target as T & CapabilityHost
	const own = Object.prototype.hasOwnProperty.call(target, CAPABILITIES)

	if (!own) {
		Object.defineProperty(target, CAPABILITIES, {
			value: [] as StorePlugin<T>[],
			enumerable: false,
			configurable: true,
			writable: false,
		})
	}

	const list = host[CAPABILITIES] as StorePlugin<T>[]

	if (list.some((existing) => existing.name === plugin.name)) {
		throw new Error(
			`[store-core] capability "${plugin.name}" is already attached to this store. ` +
				`Wrap the store in with${capitalize(plugin.name)} only once.`,
		)
	}

	list.push(plugin)
}

/** Plugins attached to `target`, in attachment order (innermost wrapper first). */
export function capabilitiesOf<T extends object>(target: T): readonly StorePlugin<T>[] {
	if (!Object.prototype.hasOwnProperty.call(target, CAPABILITIES)) return []
	return (target as T & CapabilityHost)[CAPABILITIES] as readonly StorePlugin<T>[]
}
