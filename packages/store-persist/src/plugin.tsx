import { useSyncExternalStore } from 'react'

import { resolveFieldSpecs, type FieldsBuilder } from './accessor'
import { applyKeyed, ApplyMode, captureDefaults, createBinding, type PersistBinding } from './binding'
import { discoverPersistFields } from './decorators'
import { attachHandles, type SourceBinding } from './handle'
import { PACKAGE_TAG } from './package-tag'
import { PERSIST_ENGINES } from './service'
import { groupBySource, type PersistSpec } from './spec'

import type { PersistEngine } from './engine'
import type { PersistOptions } from './types'
import type { PluginCleanup, PluginContext, StorePlugin, StorePort } from '@ez-kit/store-core'

const IS_DEV = process.env.NODE_ENV !== 'production'

/** Tracks when every connected source's first read has been applied (per instance). */
type Hydration = { done: boolean; listeners: Set<() => void> }

/**
 * Per-store hydration tracker, keyed off-band so we never mutate the store itself (a `defineProperty`
 * during render would interact with a Valtio proxy's subscriptions). Both `persist().setup` and
 * {@link useHydrated} resolve the SAME tracker object for a store, so `markHydrated` notifies the
 * hook's subscriber.
 */
const hydrationByStore = new WeakMap<object, Hydration>()

/**
 * Bindings created ONCE per store, memoized so a re-`setup` (React StrictMode's double-invoke, or a
 * cache-reuse re-bind) reuses the original bindings instead of recreating them. Recreating would capture
 * the now-seeded values as a binding's "default", breaking first-present-wins and clearOnDefault. This is
 * what "binding occurs once at instance creation" means for the dual-source + cached cases.
 */
const bindingsByStore = new WeakMap<object, SourceBinding[]>()

/** Stores whose first `setup` has run — gates the one synchronous seed, which {@link bindPersist} cannot. */
const seededStores = new WeakSet()

/**
 * Options for the {@link persist} plugin.
 *
 * `T` is the store's STATE type (not its handle). Under a binding package's `withPersist` it is
 * inferred from the store being wrapped — via the manager's own state extraction, which is exactly why
 * that wrapper lives in the binding package. Either way the {@link FieldsBuilder} selectors are typed
 * end-to-end with no cast at the call site.
 */
export type PersistPluginOptions<T extends object = object> = PersistOptions & {
	/**
	 * Declare persisted fields via the accessor builder, typed against the store's **state** (`T`), not
	 * its handle. Omit to discover decorator metadata (`persistUrl`/`persistLocalStorage`/…) on the
	 * state object instead — a Valtio idiom, since it needs a class inside `proxy()`.
	 */
	fields?: FieldsBuilder<T>
}

function persistOptionsOf(options: PersistOptions): PersistOptions {
	const persist: PersistOptions = {}
	if (options.throttleMs !== undefined) persist.throttleMs = options.throttleMs
	if (options.clearOnDefault !== undefined) persist.clearOnDefault = options.clearOnDefault
	return persist
}

/** Resolve the persisted specs from a store's state: accessor `fields` if given, else decorator metadata. */
function resolveSpecs<TState extends object>(state: TState, options: PersistPluginOptions<TState>): PersistSpec[] {
	if (options.fields) return resolveFieldSpecs(state, options.fields)
	return discoverPersistFields(state)
}

function trackerFor(store: object): Hydration {
	const existing = hydrationByStore.get(store)
	if (existing) return existing
	const hydration: Hydration = { done: false, listeners: new Set() }
	hydrationByStore.set(store, hydration)
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
			console.warn(`${PACKAGE_TAG} no engine mounted for source "${source}"; binding is inert (no-op).`)
		}
		return () => undefined
	}
	return engine.connect(binding)
}

/**
 * Construct — but do NOT connect — the per-source bindings for `store`, and attach its `$url` /
 * `$persist` control handles. This is the half of binding that needs nothing but the store, its port
 * and the field specs, so a binding package's `withPersist` runs it in the factory phase; connecting
 * those bindings to the engines needs services and stays in the plugin's `setup`.
 *
 * Memoized per store and therefore idempotent: a StrictMode double-invoke, a cache-reuse re-bind, or
 * a hand-written `persist()` capability all reuse the original bindings. Recreating them would
 * capture the now-seeded values as a binding's "default", breaking first-present-wins and
 * clearOnDefault.
 *
 * What does NOT happen here is the capture of each binding's pristine defaults: that belongs with
 * connection, in `setup`, which explains why at the call site.
 */
export function bindPersist<TStore extends object, TState extends object>(
	store: TStore,
	port: StorePort<TStore>,
	options: PersistPluginOptions<TState>,
): SourceBinding[] {
	const existing = bindingsByStore.get(store)
	if (existing) return existing

	const persistOptions = persistOptionsOf(options)
	const state = port.getState(store) as TState
	const bySource = groupBySource(resolveSpecs(state, options))
	const bindings: SourceBinding[] = [...bySource].map(([source, descriptors]) => ({
		source,
		binding: createBinding(store, port as StorePort, descriptors, persistOptions),
	}))
	bindingsByStore.set(store, bindings)
	attachHandles(store, bindings)
	return bindings
}

/**
 * The persist store plugin. `setup(store, ctx)` resolves the app-level {@link PERSIST_ENGINES} service,
 * determines the field descriptors (accessor `fields` or discovered decorators), groups them by source,
 * creates one binding per source over the store, connects each binding to its source engine, and attaches
 * the per-source control handles (`$url`/`$persist`) plus a hydration tracker. Its {@link PluginCleanup}
 * disconnects every binding it connected. The plugin NEVER creates or owns an engine — it only connects
 * to engines published as a service by a `PersistProvider`/`StoreProvider`.
 *
 * Resolution rule (spec "Plugin owns no engine" vs design risk #1): `ctx.services.get(PERSIST_ENGINES)`
 * throws a named "service not mounted" error when no `PersistProvider` is above (truly-unmounted service);
 * when the service IS mounted but a specific source's engine is absent, `safeGet` degrades that one source
 * to a no-op binding with a dev-warning so a re-bind on a cached instance can't crash the render.
 */
export function persist<TStore extends object, TState extends object = object>(
	port: StorePort<TStore>,
	options: PersistPluginOptions<TState> = {},
): StorePlugin<TStore> {
	return {
		name: 'persist',
		setup(store: TStore, ctx: PluginContext): PluginCleanup {
			const engines = ctx.services.get(PERSIST_ENGINES)
			const hydration = trackerFor(store)
			const disconnects: (() => void)[] = []

			// A binding package's `withPersist` has already constructed these in the factory phase; the
			// call is the idempotent fallback for `attachCapability(store, persist(port, …))` by hand.
			const bindings = bindPersist(store, port, options)

			const firstSetup = !seededStores.has(store)
			seededStores.add(store)

			// Capture the pristine defaults HERE, on first connect — NOT alongside construction in
			// `bindPersist`. It reads like an obvious simplification to fold this into `createBinding` now
			// that construction happens in the factory phase; it is not, and it was only found by
			// instrumenting. `createContextStore`'s Provider applies a controlled `value` synchronously
			// during the first render, i.e. after the factory and before this effect, so a factory-phase
			// capture would record the value the AUTHOR declared while the store already holds the value
			// the PARENT pushed. `ApplyMode.Pull` resets a field absent from the substrate back to its
			// default and `PersistProvider` pulls every URL source once on mount, so that mismatch does not
			// stay theoretical: a field that is both controlled and persisted would be reset to its factory
			// default on mount and the reset echoed up through `onValueChange`. `pristine-timing.test.tsx`
			// pins it.
			if (firstSetup) {
				for (const { binding } of bindings) captureDefaults(binding)
			}

			// Synchronous seed only on the first setup. Ambient (storage) sources also snapshot synchronously
			// here; first-present-wins means an earlier source (adapter/spec order) holds a shared field, so a
			// later source skips it. On a re-bind the store already carries its hydrated state — don't re-seed.
			if (firstSetup && !ctx.isServer) {
				for (const { source, binding } of bindings) {
					const engine = engines.safeGet(source)
					if (!engine) continue
					const seed = engine.snapshot()
					if (!(seed instanceof Promise)) {
						applyKeyed(binding, seed, ApplyMode.Hydrate)
					}
				}
			}

			// On the server we never subscribe (no client lifecycle); leave the seeded store as-is.
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
 * `useHydrated(store)`: `false` on the server and the first client render, flipping to `true` once every
 * connected source's first read has been applied for `store`. For URL-only (synchronous) stores it flips
 * on mount; gate a skeleton on it while async sources (storage) fill in to avoid a flash/CLS. Reads the
 * hydration tracker the {@link persist} plugin keeps for the store. The tracker is created on demand
 * (idempotent) so this hook works even when called before the plugin's `setup` effect runs — they share
 * one tracker object identity, so `markHydrated` notifies this subscriber.
 */
export function useHydrated(store: object): boolean {
	const hydration = trackerFor(store)
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
