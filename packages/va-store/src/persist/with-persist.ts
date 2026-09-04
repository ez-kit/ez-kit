import { attachCapability } from '@ez-kit/store-core'

import { persist, type PersistPluginOptions } from './plugin'

/**
 * Factory-position front for the persist plugin: registers it on the proxy so `createContextStore`'s
 * Provider (or the instance cache) connects it at mount. The plugin itself is unchanged — this only
 * moves *where* it is declared, so persist sits in the same `with*` chain as every other capability.
 *
 * The `$url` / `$persist` control handles are still attached by the plugin's `setup`, so keep reading
 * them through `urlHandle()` / `persistHandle()` rather than off the returned type.
 */
export function withPersist<T extends object>(target: T, options: PersistPluginOptions<T> = {}): T {
	attachCapability(target, persist<T>(options))
	return target
}
