import { extendServiceRegistry } from '@ez-kit/store-core'
import { ServicesProvider, useServices } from '@ez-kit/store-core/react'
import { createContext, type ReactElement, type ReactNode, useContext, useEffect, useMemo, useRef } from 'react'

import { createPersistEngine, type CreateEngineOptions, type PersistEngine } from './engine'
import { createPersistEngines, PERSIST_ENGINES } from './service'

import type { MetaMerge, SourcePort, SyncSourcePort } from './types'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * Separator joining the per-adapter change keys into one effect dependency. NUL, because a space
 * can occur inside a key and would alias two different substrate states onto the same joined key,
 * suppressing the `pull` that navigation is supposed to trigger.
 */
const CHANGE_KEY_SEPARATOR = '\0'

/**
 * A render-scoped source adapter (URL/router). It encapsulates its own router hooks and ref handling,
 * exposing a stable {@link SyncSourcePort} and a `changeKey` that changes when the substrate changes
 * externally (e.g. navigation), which the provider uses to drive a `pull`. Its state lives only in
 * render, so its port is produced from a hook.
 */
export type RenderScopedAdapter = {
	/** Source id this adapter serves (e.g. `'url'`). */
	source: string
	/** Meta merge for coalesced commits (e.g. URL push-precedence). */
	mergeMeta?: MetaMerge
	/** Default per-commit meta. */
	defaultMeta?: unknown
	/** Hook: returns this render's stable port plus a key that changes on external substrate changes. */
	usePort(): { port: SyncSourcePort; changeKey: string }
}

/**
 * An ambient source adapter (storage/IndexedDB). Its state is reachable anywhere, so it ships a ready
 * {@link SourcePort} (no React) and an optional `subscribe` for external-change events (cross-tab),
 * which the provider wires to `pull`.
 */
export type AmbientAdapter = {
	/** Source id this adapter serves (e.g. `'localStorage'`). */
	source: string
	/** Ready-made port — no render context required. */
	port: SourcePort
	/** Meta merge for coalesced commits. */
	mergeMeta?: MetaMerge
	/** Default per-commit meta. */
	defaultMeta?: unknown
}

/** A source adapter the provider can mount: render-scoped (URL) or ambient (storage). */
export type PersistAdapter = RenderScopedAdapter | AmbientAdapter

function isRenderScoped(adapter: PersistAdapter): adapter is RenderScopedAdapter {
	return typeof (adapter as RenderScopedAdapter).usePort === 'function'
}

/**
 * A mounted source: its engine plus whether request-scoped stores may seed from it synchronously
 * during render. Render-scoped (URL) sources are SSR-safe to seed in render; ambient (storage) sources
 * are not (server has no storage), so they hydrate only after mount.
 */
export type PersistMount = {
	engine: PersistEngine
	seedSync: boolean
}

/** Map of source id → mounted engine, provided to request-scoped store factories so they connect. */
export type EngineMap = ReadonlyMap<string, PersistMount>

const EnginesContext = createContext<EngineMap | null>(null)

/** Access the engines provided by the nearest {@link PersistProvider} (null when none is mounted). */
export function usePersistEngines(): EngineMap | null {
	return useContext(EnginesContext)
}

export type PersistProviderProps = {
	/**
	 * The source adapters to mount (e.g. `[reactRouterAdapter, localStorageAdapter()]`). One engine is
	 * created per adapter's `source`. Render-scoped adapters call hooks, so this array MUST be stable in
	 * length and order across renders (declare it at module scope or memoize it).
	 */
	adapters: PersistAdapter[]
	children: ReactNode
}

type ResolvedAdapter = {
	source: string
	port: SourcePort
	/** Latest external-change key for render-scoped sources; `null` for ambient sources. */
	changeKey: string | null
	ambient: boolean
	mergeMeta: MetaMerge | undefined
	defaultMeta: unknown
}

function engineOptionsOf(resolved: ResolvedAdapter): CreateEngineOptions {
	const options: CreateEngineOptions = {}
	if (resolved.mergeMeta !== undefined) {
		options.mergeMeta = resolved.mergeMeta
	}
	if (resolved.defaultMeta !== undefined) {
		options.defaultMeta = resolved.defaultMeta
	}
	return options
}

/**
 * App-level coordinator: creates one engine per adapter source, exposes them via context for
 * request-scoped stores to connect their bindings, drives `pull` when a render-scoped substrate changes
 * (navigation), and wires ambient `subscribe → pull` (cross-tab). Engines are created once per provider
 * instance so they survive re-renders.
 */
export function PersistProvider({ adapters, children }: PersistProviderProps): ReactElement {
	// Dev-only guard: render-scoped adapters call hooks inside the map below, so a change in `adapters`
	// length or source order between renders is a rules-of-hooks violation that would otherwise surface as
	// a cryptic React error far from its cause. Catch it here with a named, actionable message instead.
	const signatureRef = useRef<string | null>(null)
	if (IS_DEV) {
		const signature = adapters.map((adapter) => adapter.source).join(',')
		if (signatureRef.current === null) {
			signatureRef.current = signature
		} else if (signatureRef.current !== signature) {
			console.error(
				`[store-persist] PersistProvider: the \`adapters\` array changed between renders ` +
					`("${signatureRef.current}" → "${signature}"). It MUST be stable in length and order across renders ` +
					`(render-scoped adapters call hooks). Declare it at module scope or wrap it in useMemo.`,
			)
			signatureRef.current = signature
		}
	}

	// Resolve each adapter's port. Render-scoped adapters call a hook, so `adapters` must be stable.
	const resolved: ResolvedAdapter[] = adapters.map((adapter) => {
		const shared = { source: adapter.source, mergeMeta: adapter.mergeMeta, defaultMeta: adapter.defaultMeta }
		if (!isRenderScoped(adapter)) {
			return { ...shared, port: adapter.port, changeKey: null, ambient: true }
		}
		const { port, changeKey } = adapter.usePort()
		return { ...shared, port, changeKey, ambient: false }
	})

	// Create engines + remember ports once. Ports are stable (each adapter owns its own ref handling).
	const enginesRef = useRef<Map<string, PersistMount> | null>(null)
	const portsRef = useRef<Map<string, SourcePort>>(new Map())
	if (enginesRef.current === null) {
		const engines = new Map<string, PersistMount>()
		for (const entry of resolved) {
			engines.set(entry.source, {
				engine: createPersistEngine(entry.port, engineOptionsOf(entry)),
				seedSync: !entry.ambient,
			})
			portsRef.current.set(entry.source, entry.port)
		}
		enginesRef.current = engines
	}
	const engines = enginesRef.current

	// Pull external substrate changes (navigation, back/forward) from render-scoped sources into proxies.
	const changeKey = resolved.map((entry) => entry.changeKey ?? '').join(CHANGE_KEY_SEPARATOR)
	useEffect(() => {
		for (const [, mount] of engines) {
			// Ambient (storage) sources hydrate via `connect` under first-present-wins; pulling them here
			// (last-arrival-wins) would clobber an earlier-connecting source on a shared cold-start field
			// (a stale stored value overwriting a fresh URL one). Only render-scoped (URL) sources pull here.
			if (!mount.seedSync) continue
			const snapshot = mount.engine.snapshot()
			if (!(snapshot instanceof Promise)) {
				mount.engine.pull(snapshot)
			}
		}
		// `changeKey` is the real trigger; `engines` is stable. (resolved is recomputed each render.)
	}, [changeKey, engines])

	// Wire ambient external-change subscriptions (cross-tab `storage` events) to `pull`.
	useEffect(() => {
		const cleanups: (() => void)[] = []
		for (const [source, mount] of engines) {
			const port = portsRef.current.get(source)
			if (!port?.subscribe) {
				continue
			}
			cleanups.push(
				port.subscribe(() => {
					const snapshot = mount.engine.snapshot()
					if (snapshot instanceof Promise) {
						snapshot
							.then((keyed) => {
								mount.engine.pull(keyed)
							})
							.catch(() => {
								// External pull failed (async source); the proxy stays the source of truth.
							})
					} else {
						mount.engine.pull(snapshot)
					}
				}),
			)
		}
		return () => {
			for (const cleanup of cleanups) {
				cleanup()
			}
		}
	}, [engines])

	useEffect(
		() => () => {
			for (const [, mount] of engines) {
				mount.engine.dispose()
			}
		},
		[engines],
	)

	// Publish the per-source engines as a store-core service so descendant `persist()` plugins can
	// resolve and connect to them. We extend the inherited registry (rather than replace it) so a
	// `StoreProvider` can layer the cache service alongside, and nested providers keep ancestor services.
	const inheritedServices = useServices()
	const registry = useMemo(() => {
		const view = createPersistEngines(new Map([...engines].map(([source, mount]) => [source, mount.engine])))
		return extendServiceRegistry(inheritedServices, [[PERSIST_ENGINES, view]])
	}, [engines, inheritedServices])

	return (
		<EnginesContext.Provider value={engines}>
			<ServicesProvider registry={registry}>{children}</ServicesProvider>
		</EnginesContext.Provider>
	)
}
