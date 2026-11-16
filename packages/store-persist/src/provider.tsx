import { extendServiceRegistry, serviceKey } from '@ez-kit/store-core'
import { ServicesProvider, useServices } from '@ez-kit/store-core/react'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactElement, type ReactNode } from 'react'

import { createPersistEngine } from './engine'
import { createPersistEngines, PERSIST_ENGINES } from './service'

import type { PersistEngine } from './engine'
import type { PersistEngines } from './service'
import type { MetaMerge, PersistErrorContext, SourcePort, SyncSourcePort } from './types'

type AdapterOptions = { mergeMeta?: MetaMerge; defaultMeta?: unknown }
export type RenderScopedAdapter = AdapterOptions & {
	source: string
	usePort(): { port: SyncSourcePort; changeKey: string }
}
export type AmbientAdapter = AdapterOptions & { source: string; port: SourcePort }
export type PersistAdapter = RenderScopedAdapter | AmbientAdapter
export type NamedPersistAdapter =
	(Omit<AmbientAdapter, 'source'> & { source?: string }) | (Omit<RenderScopedAdapter, 'source'> & { source?: string })
export type PersistAdapters = readonly PersistAdapter[] | Readonly<Record<string, NamedPersistAdapter>>
export type PersistMount = { engine: PersistEngine; seedSync: boolean; identity?: string }
export type EngineMap = ReadonlyMap<string, PersistMount>

const EnginesContext = createContext<EngineMap | null>(null)
// Pure navigation context for uncommitted cache candidates; engine lifetime stays unchanged.
const RENDER_SEED_CONTEXT = serviceKey<string>('store-persist.render-seed-context')
const physicalOwners = new Map<string, PersistMount>()
export function usePersistEngines(): EngineMap | null {
	return useContext(EnginesContext)
}
export function usePersistence(): PersistEngines {
	return useServices().get(PERSIST_ENGINES)
}

export type PersistProviderProps = {
	adapters: PersistAdapters
	defaultSource?: string
	onError?: (error: unknown, context: PersistErrorContext) => void
	children: ReactNode
}

type Registration = { name: string; adapter: NamedPersistAdapter }
type ChainProps = {
	entries: readonly Registration[]
	index: number
	mounts: EngineMap
	defaultSource: string | null
	seedContext: string
	report: (error: unknown, context: PersistErrorContext) => void
	children: ReactNode
}

function registrations(adapters: PersistAdapters): Registration[] {
	const entries = Array.isArray(adapters)
		? (adapters as readonly PersistAdapter[]).map((adapter) => ({ name: adapter.source, adapter }))
		: Object.entries(adapters).map(([name, adapter]) => ({ name, adapter: adapter }))
	const seen = new Set<string>()
	for (const { name } of entries) {
		if (!name || seen.has(name)) throw new Error(`[ez-kit/store-persist] Invalid or duplicate source "${name}"`)
		seen.add(name)
	}
	return entries.sort((a, b) => a.name.localeCompare(b.name))
}

function isRenderScoped(
	adapter: NamedPersistAdapter,
): adapter is Omit<RenderScopedAdapter, 'source'> & { source?: string } {
	return 'usePort' in adapter
}

function Publish({
	mounts,
	defaultSource,
	seedContext,
	children,
}: Pick<ChainProps, 'mounts' | 'defaultSource' | 'seedContext' | 'children'>): ReactElement {
	const inherited = useServices()
	const persistence = useMemo(() => {
		const engines = new Map([...mounts].map(([name, mount]) => [name, mount.engine]))
		if (defaultSource !== null && !engines.has(defaultSource))
			throw new Error(`[ez-kit/store-persist] Unknown defaultSource "${defaultSource}"`)
		return createPersistEngines(engines, defaultSource)
	}, [mounts, defaultSource])
	const registry = useMemo(() => {
		return extendServiceRegistry(inherited, [
			[PERSIST_ENGINES, persistence],
			[RENDER_SEED_CONTEXT, seedContext],
		])
	}, [inherited, persistence, seedContext])
	return (
		<EnginesContext.Provider value={mounts}>
			<ServicesProvider registry={registry}>{children}</ServicesProvider>
		</EnginesContext.Provider>
	)
}

// Each adapter gets its own component. No router hooks run inside a changing map/loop.
function Chain(props: ChainProps): ReactElement {
	const entry = props.entries[props.index]
	if (!entry)
		return (
			<Publish
				mounts={props.mounts}
				defaultSource={props.defaultSource}
				seedContext={props.seedContext}
			>
				{props.children}
			</Publish>
		)
	return isRenderScoped(entry.adapter) ? (
		<RenderMount
			{...props}
			entry={entry}
			adapter={entry.adapter}
		/>
	) : (
		<Mount
			{...props}
			entry={entry}
			port={entry.adapter.port}
			ambient
		/>
	)
}

function RenderMount({
	adapter,
	...props
}: ChainProps & {
	entry: Registration
	adapter: Omit<RenderScopedAdapter, 'source'> & { source?: string }
}): ReactElement {
	const { port, changeKey } = adapter.usePort()
	return (
		<Mount
			{...props}
			port={port}
			ambient={false}
			changeKey={changeKey}
		/>
	)
}

function Mount({
	entry,
	port,
	ambient,
	changeKey,
	...props
}: ChainProps & { entry: Registration; port: SourcePort; ambient: boolean; changeKey?: string }): ReactElement {
	const initialPort = useRef(port)
	if (initialPort.current !== port)
		throw new Error('[ez-kit/store-persist] Registration changed; remount PersistProvider and its cache')
	const owned = useRef<PersistMount | null>(null)
	owned.current ??= {
		seedSync: !ambient,
		...(port.identity ? { identity: port.identity } : {}),
		engine: createPersistEngine(port, {
			source: entry.name,
			ssrSafe: !ambient,
			externalChanges: ambient ? 'ignore' : 'apply',
			onError: props.report,
			...(entry.adapter.mergeMeta ? { mergeMeta: entry.adapter.mergeMeta } : {}),
			...(entry.adapter.defaultMeta !== undefined ? { defaultMeta: entry.adapter.defaultMeta } : {}),
		}),
	}
	const mount = owned.current
	if (port.identity && [...props.mounts.values()].some((other) => other !== mount && other.identity === port.identity))
		throw new Error(`[ez-kit/store-persist] Duplicate writer for ${port.identity}`)
	const mounts = useMemo(() => new Map([...props.mounts, [entry.name, mount]]), [props.mounts, entry.name, mount])
	const previousKey = useRef(changeKey)
	useEffect(() => {
		if (previousKey.current !== changeKey) {
			previousKey.current = changeKey
			mount.engine.pullSource()
		}
	}, [changeKey, mount])
	useEffect(
		() =>
			port.subscribe?.(() => {
				mount.engine.pullSource()
			}),
		[port, mount],
	)
	const lifecycle = useRef(0)
	useEffect(() => {
		const cell = lifecycle
		const token = ++cell.current
		if (port.identity) {
			const existing = physicalOwners.get(port.identity)
			if (existing && existing !== mount)
				throw new Error(`[ez-kit/store-persist] Duplicate writer for ${port.identity}`)
			physicalOwners.set(port.identity, mount)
		}
		return () => {
			if (port.identity && physicalOwners.get(port.identity) === mount) physicalOwners.delete(port.identity)
			queueMicrotask(() => {
				if (cell.current !== token) return
				mount.engine.dispose()
			})
		}
	}, [mount, port.identity])
	return (
		<Chain
			{...props}
			mounts={mounts}
			seedContext={ambient ? props.seedContext : JSON.stringify([props.seedContext, entry.name, changeKey])}
			index={props.index + 1}
		/>
	)
}

const EMPTY_MOUNTS: EngineMap = new Map()

export function PersistProvider({ adapters, defaultSource, onError, children }: PersistProviderProps): ReactElement {
	const inheritedMounts = usePersistEngines() ?? EMPTY_MOUNTS
	const services = useServices()
	const inheritedDefault = services.safeGet(PERSIST_ENGINES)?.defaultSource ?? null
	const latest = useRef(onError)
	latest.current = onError
	const entries = registrations(adapters)
	const initial = useRef(entries)
	const defaultRef = useRef(defaultSource)
	if (
		entries.length !== initial.current.length ||
		defaultRef.current !== defaultSource ||
		entries.some((entry, index) => {
			const before = initial.current[index]
			if (!before) return true
			return (
				entry.name !== before.name ||
				isRenderScoped(entry.adapter) !== isRenderScoped(before.adapter) ||
				(isRenderScoped(entry.adapter) && isRenderScoped(before.adapter)
					? entry.adapter.usePort !== before.adapter.usePort
					: !isRenderScoped(entry.adapter) &&
						!isRenderScoped(before.adapter) &&
						entry.adapter.port !== before.adapter.port)
			)
		})
	)
		throw new Error('[ez-kit/store-persist] Registration changed; remount PersistProvider and its cache')
	const report = useMemo(
		() =>
			(error: unknown, context: PersistErrorContext): void => {
				latest.current?.(error, context)
			},
		[],
	)
	return (
		<Chain
			entries={initial.current}
			index={0}
			mounts={inheritedMounts}
			defaultSource={defaultSource ?? inheritedDefault}
			seedContext=''
			report={report}
		>
			{children}
		</Chain>
	)
}
