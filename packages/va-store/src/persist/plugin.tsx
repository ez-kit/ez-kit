import { useSyncExternalStore } from 'react'

import { resolveFieldSpecs, type FieldsBuilder } from './accessor'
import { applyKeyed, ApplyMode, createBinding, type PersistBinding } from './binding'
import { discoverPersistFields } from './decorators'
import { attachHandles, type SourceBinding } from './handle'
import { PERSIST_ENGINES } from './service'
import { groupBySource, type PersistSpec } from './spec'

import type { PersistEngine } from './engine'
import type { PersistOptions } from './types'
import type { PluginCleanup, PluginContext, StorePlugin } from '@ez-kit/store-core'

const IS_DEV = process.env.NODE_ENV !== 'production'

/** Tracks when every connected source's first read has been applied (per instance). */
type Hydration = { done: boolean; listeners: Set<() => void> }

/**
 * Per-proxy hydration tracker, keyed off-band so we never mutate the Valtio proxy (a `defineProperty`
 * during render would interact with valtio's subscriptions). Both `persist().setup` and {@link useHydrated}
 * resolve the SAME tracker object for a proxy, so `markHydrated` notifies the hook's subscriber.
 */
const hydrationByProxy = new WeakMap<object, Hydration>()

/**
 * Bindings created ONCE per proxy, memoized so a re-`setup` (React StrictMode's double-invoke, or a
 * cache-reuse re-bind) reuses the original bindings instead of recreating them. Recreating would capture
 * the now-seeded values as a binding's "default", breaking first-present-wins and clearOnDefault. This is
 * what "binding occurs once at instance creation" means for the dual-source + cached cases.
 */
const bindingsByProxy = new WeakMap<object, SourceBinding[]>()

/**
 * Options for the {@link persist} plugin.
 *
 * `T` is the store's state type. It is inferred from the surrounding `createStore<T>(…, { plugins })`
 * call (the contextual `StorePlugin<T>` return type drives it), so the {@link FieldsBuilder} selectors
 * are typed end-to-end with no cast at the call site.
 */
export type PersistPluginOptions<T extends object = object> = PersistOptions & {
	/**
	 * Declare persisted fields via the accessor builder for **plain** proxies (no decorator transpilation).
	 * Omit to discover decorator metadata (`persistUrl`/`persistLocalStorage`/…) on the proxy instead.
	 */
	fields?: FieldsBuilder<T>
}

function persistOptionsOf(options: PersistOptions): PersistOptions {
	const persist: PersistOptions = {}
	if (options.throttleMs !== undefined) persist.throttleMs = options.throttleMs
	if (options.clearOnDefault !== undefined) persist.clearOnDefault = options.clearOnDefault
	return persist
}

/** Resolve the persisted specs from a created proxy: accessor `fields` if given, else decorator metadata. */
function resolveSpecs<T extends object>(proxy: T, options: PersistPluginOptions<T>): PersistSpec[] {
	if (options.fields) return resolveFieldSpecs(proxy, options.fields)
	return discoverPersistFields(proxy)
}

function trackerFor(proxy: object): Hydration {
	const existing = hydrationByProxy.get(proxy)
	if (existing) return existing
	const hydration: Hydration = { done: false, listeners: new Set() }
	hydrationByProxy.set(proxy, hydration)
	return hydration
}

function markHydrated(hydration: Hydration): void {
	if (hydration.done) return
	hydration.done = true
	for (const listener of hydration.listeners) listener()
}

/**
 * Connect one source's binding to its engine. On the server we never subscribe; for render-scoped (URL)
 * sources we seed synchronously from the engine snapshot so the proxy reflects the substrate during the
 * server render. Returns the engine's `disconnect`, or a no-op when the engine is absent.
 *
 * Instance-outlives-engine guard (design risk #1): the engine is re-resolved from `ctx.services` at
 * setup time via `safeGet`. A cached, persisted instance can survive a `PersistProvider` remount; when
 * the plugin re-runs (or runs with no provider above), a missing engine yields a no-op binding plus a
 * dev-only warning instead of throwing during the re-bind. A truly-unmounted-service case still surfaces
 * via `engines.get` (per the spec) — see {@link persist}.
 */
function connectBinding(engine: PersistEngine | undefined, source: string, binding: PersistBinding): () => void {
	if (!engine) {
		if (IS_DEV) {
			console.warn(`[va-store] persist: no engine mounted for source "${source}"; binding is inert (no-op).`)
		}
		return () => undefined
	}
	return engine.connect(binding)
}

/**
 * The persist store plugin. `setup(proxy, ctx)` resolves the app-level {@link PERSIST_ENGINES} service,
 * determines the field descriptors (accessor `fields` or discovered decorators), groups them by source,
 * creates one binding per source over the proxy, connects each binding to its source engine, and attaches
 * the per-source control handles (`$url`/`$persist`) plus a hydration tracker. Its {@link PluginCleanup}
 * disconnects every binding it connected. The plugin NEVER creates or owns an engine — it only connects
 * to engines published as a service by a `PersistProvider`/`StoreProvider`.
 *
 * Resolution rule (spec "Plugin owns no engine" vs design risk #1): `ctx.services.get(PERSIST_ENGINES)`
 * throws a named "service not mounted" error when no `PersistProvider` is above (truly-unmounted service);
 * when the service IS mounted but a specific source's engine is absent, `safeGet` degrades that one source
 * to a no-op binding with a dev-warning so a re-bind on a cached instance can't crash the render.
 */
export function persist<T extends object = object>(options: PersistPluginOptions<T> = {}): StorePlugin<T> {
	const persistOptions = persistOptionsOf(options)

	return {
		name: 'persist',
		setup(proxy: T, ctx: PluginContext): PluginCleanup {
			const engines = ctx.services.get(PERSIST_ENGINES)
			const hydration = trackerFor(proxy)
			const disconnects: (() => void)[] = []

			// Create every binding FIRST so each captures the proxy's PRISTINE field defaults before any
			// source seeds — and only once per proxy (memoized). A field shared by two sources (`url` +
			// `localStorage`) must capture the same pristine default for both, or first-present-wins breaks;
			// reusing the memoized bindings also makes a StrictMode/cache re-bind idempotent.
			const firstBind = !bindingsByProxy.has(proxy)
			let bindings = bindingsByProxy.get(proxy)
			if (!bindings) {
				const bySource = groupBySource(resolveSpecs(proxy, options))
				bindings = [...bySource].map(([source, descriptors]) => ({
					source,
					binding: createBinding(proxy, descriptors, persistOptions),
				}))
				bindingsByProxy.set(proxy, bindings)
			}

			// Synchronous seed only on the first bind. Ambient (storage) sources also snapshot synchronously
			// here; first-present-wins means an earlier source (adapter/spec order) holds a shared field, so a
			// later source skips it. On a re-bind the proxy already carries its hydrated state — don't re-seed.
			if (firstBind && !ctx.isServer) {
				for (const { source, binding } of bindings) {
					const engine = engines.safeGet(source)
					if (!engine) continue
					const seed = engine.snapshot()
					if (!(seed instanceof Promise)) {
						applyKeyed(binding, seed, ApplyMode.Hydrate)
					}
				}
			}

			attachHandles(proxy, bindings)

			// On the server we never subscribe (no client lifecycle); leave the seeded proxy as-is.
			if (!ctx.isServer) {
				for (const { source, binding } of bindings) {
					disconnects.push(connectBinding(engines.safeGet(source), source, binding))
				}
			}

			// Sync sources have hydrated synchronously inside `connect`; mark the instance hydrated.
			markHydrated(hydration)

			return () => {
				for (const disconnect of disconnects) disconnect()
			}
		},
	}
}

/**
 * `useHydrated(proxy)`: `false` on the server and the first client render, flipping to `true` once every
 * connected source's first read has been applied for `proxy`. For URL-only (synchronous) stores it flips
 * on mount; gate a skeleton on it while async sources (storage) fill in to avoid a flash/CLS. Reads the
 * hydration tracker the {@link persist} plugin attaches to the proxy. The tracker is attached on demand
 * (idempotent) so this hook works even when called before the plugin's `setup` effect runs — they share
 * one tracker object identity, so `markHydrated` notifies this subscriber.
 */
export function useHydrated(proxy: object): boolean {
	const hydration = trackerFor(proxy)
	return useSyncExternalStore(
		(onChange) => {
			hydration.listeners.add(onChange)
			return () => {
				hydration.listeners.delete(onChange)
			}
		},
		() => hydration.done,
		() => false,
	)
}
