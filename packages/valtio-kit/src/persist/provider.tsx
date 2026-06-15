import { createContext, type ReactElement, type ReactNode, useContext, useEffect, useRef } from 'react'

import { createPersistEngine, type CreateEngineOptions, type PersistEngine } from './engine'

import type { MetaMerge, SyncSourcePort } from './types'

/**
 * A render-scoped source adapter (URL/router). It encapsulates its own router hooks and ref handling,
 * exposing a stable {@link SyncSourcePort} and a `changeKey` that changes when the substrate changes
 * externally (e.g. navigation), which the provider uses to drive a `pull`. Storage (ambient) adapters
 * are added in a later phase; the provider currently mounts a single render-scoped adapter.
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

/** Map of source id → engine, provided to request-scoped store factories so they connect their bindings. */
export type EngineMap = ReadonlyMap<string, PersistEngine>

const EnginesContext = createContext<EngineMap | null>(null)

/** Access the engines provided by the nearest {@link PersistProvider} (null when none is mounted). */
export function usePersistEngines(): EngineMap | null {
	return useContext(EnginesContext)
}

export type PersistProviderProps = {
	/** The render-scoped source adapter to mount (e.g. `reactRouterAdapter`, `nextAdapter`). */
	adapter: RenderScopedAdapter
	children: ReactNode
}

/**
 * App-level coordinator: creates one engine for the adapter's source, exposes it via context for
 * request-scoped stores to connect their bindings, and drives `pull` when the adapter reports an
 * external change. The engine is created once (per provider instance) so it survives re-renders.
 */
export function PersistProvider({ adapter, children }: PersistProviderProps): ReactElement {
	const { port, changeKey } = adapter.usePort()

	const portRef = useRef(port)
	portRef.current = port

	const engineOptions: CreateEngineOptions = {}
	if (adapter.mergeMeta !== undefined) {
		engineOptions.mergeMeta = adapter.mergeMeta
	}
	if (adapter.defaultMeta !== undefined) {
		engineOptions.defaultMeta = adapter.defaultMeta
	}

	const engineRef = useRef<PersistEngine | null>(null)
	engineRef.current ??= createPersistEngine(
		// Read through the latest port ref so the engine always sees current router state.
		{
			get: () => portRef.current.get(),
			// Render-scoped ports (URL) are synchronous, so `set` returns void; the engine's `settle`
			// only acts on a Promise, so discarding the void result here is correct.
			set: (desired, ctx) => {
				portRef.current.set(desired, ctx)
			},
		},
		engineOptions,
	)
	const engine = engineRef.current

	const enginesRef = useRef<Map<string, PersistEngine> | null>(null)
	enginesRef.current ??= new Map([[adapter.source, engine]])

	// Pull external substrate changes (navigation, back/forward) into all connected proxies.
	useEffect(() => {
		const snapshot = engine.snapshot()
		if (!(snapshot instanceof Promise)) {
			engine.pull(snapshot)
		}
	}, [engine, changeKey])

	useEffect(
		() => () => {
			engine.dispose()
		},
		[engine],
	)

	return <EnginesContext.Provider value={enginesRef.current}>{children}</EnginesContext.Provider>
}
