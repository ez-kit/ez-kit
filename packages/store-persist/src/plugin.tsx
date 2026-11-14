import { useSyncExternalStore } from 'react'

import { resolveFieldSpecs } from './accessor'
import { addressBinding, captureDefaults, createBinding } from './binding'
import { discoverPersistFields } from './decorators'
import { attachHandles } from './handle'
import { PERSIST_ENGINES } from './service'
import { groupBySource } from './spec'

import type { FieldsBuilder } from './accessor'
import type { SourceBinding } from './handle'
import type { PersistEngines } from './service'
import type { PersistOptions, PersistStatus } from './types'
import type { PluginContext, StorePlugin, StorePort } from '@ez-kit/store-core'

export type PersistPluginOptions<T extends object = object> = PersistOptions & { fields?: FieldsBuilder<T> }

const bindingsByStore = new WeakMap<object, SourceBinding[]>()
const registryByStore = new WeakMap<object, PersistEngines>()

export function bindPersist<TStore extends object, TState extends object>(
	store: TStore,
	port: StorePort<TStore>,
	options: PersistPluginOptions<TState>,
): SourceBinding[] {
	const existing = bindingsByStore.get(store)
	if (existing) return existing
	const state = port.getState(store) as TState
	const specs = options.fields ? resolveFieldSpecs(state, options.fields) : discoverPersistFields(state)
	const entries = [...groupBySource(specs)].map(([source, fields]) => ({
		source: source ?? '',
		binding: createBinding(store, port as StorePort, fields, options),
	}))
	bindingsByStore.set(store, entries)
	attachHandles(store, entries)
	return entries
}

function validateRegistry(store: object, context: PluginContext): PersistEngines {
	const registry = context.services.get(PERSIST_ENGINES)
	const birth = registryByStore.get(store)
	if (birth && birth !== registry)
		throw new Error('[ez-kit/store-persist] Registry changed; recreate this cache entry and its Provider')
	return registry
}

function resolveSources(entries: SourceBinding[], registry: PersistEngines, context: PluginContext) {
	const resolved = entries.map((entry) => {
		const source = entry.source || registry.defaultSource
		if (!source) throw new Error('[ez-kit/store-persist] Specify source or defaultSource')
		const engine = registry.safeGet(source)
		if (!engine)
			throw new Error(
				`[ez-kit/store-persist] Unknown source "${source}" at ${JSON.stringify(context.id)}; available: ${registry.sources().join(', ')}`,
			)
		return { entry, source, engine }
	})
	const merged = new Map<string, (typeof resolved)[number]>()
	for (const connection of resolved) {
		connection.entry.source = connection.source
		const existing = merged.get(connection.source)
		if (!existing) {
			merged.set(connection.source, connection)
			continue
		}
		const target = existing.entry.binding
		const other = connection.entry.binding
		target.fields.push(...other.fields)
		for (const [field, key] of other.keyOf) target.keyOf.set(field, key)
		for (const [field, value] of other.defaults) target.defaults.set(field, value)
		for (const [field, record] of other.records) target.records.set(field, record)
		// Preserve any subscriptions made before a hand-wired setup; their cleanup still owns its Set.
		target.listeners.add(() => {
			for (const listener of other.listeners) listener()
		})
	}
	const connections = [...merged.values()]
	entries.splice(0, entries.length, ...connections.map((connection) => connection.entry))
	return connections
}

export function persist<TStore extends object, TState extends object = object>(
	port: StorePort<TStore>,
	options: PersistPluginOptions<TState> = {},
): StorePlugin<TStore> {
	const plugin: StorePlugin<TStore> = {
		name: 'persist',
		validateContext(store, context) {
			validateRegistry(store, context)
		},
		setup(store, context) {
			const registry = validateRegistry(store, context)
			const entries = bindPersist(store, port, options)
			const disconnects: (() => void)[] = []
			// Resolve everything before connecting anything: bad config cannot produce partial I/O.
			const connections = resolveSources(entries, registry, context)
			registryByStore.set(store, registry)
			for (const { entry, source, engine } of connections) {
				entry.source = source
				captureDefaults(entry.binding)
				addressBinding(entry.binding, context.id)
				if (context.isServer) engine.seed(entry.binding)
				else disconnects.push(engine.connect(entry.binding))
			}
			if (entries.length === 0) for (const aggregate of aggregates.get(store)?.values() ?? []) aggregate.notify()
			return () => {
				for (const disconnect of disconnects.reverse()) disconnect()
			}
		},
	}
	plugin.seedRender = (store, context) => {
		const registry = validateRegistry(store, context)
		for (const { entry, engine } of resolveSources(bindPersist(store, port, options), registry, context)) {
			captureDefaults(entry.binding)
			addressBinding(entry.binding, context.id)
			engine.seed(entry.binding)
		}
	}
	return plugin
}

type Aggregate = {
	getSnapshot: () => PersistStatus
	subscribe: (listener: () => void) => () => void
	notify: () => void
}
const aggregates = new WeakMap<object, Map<string, Aggregate>>()
const SERVER_STATUS: PersistStatus = {
	restore: 'pending',
	write: 'idle',
	dirty: false,
	writeBlocked: null,
	error: null,
}

function aggregateFor(store: object, source?: string): Aggregate {
	let bySource = aggregates.get(store)
	if (!bySource) {
		bySource = new Map()
		aggregates.set(store, bySource)
	}
	const key = source ?? ''
	const existing = bySource.get(key)
	if (existing) return existing
	const listeners = new Set<() => void>()
	let snapshot: PersistStatus = SERVER_STATUS
	const selected = (): SourceBinding[] =>
		(bindingsByStore.get(store) ?? []).filter((entry) => !source || entry.source === source || entry.source === '')
	const compute = (): PersistStatus => {
		const statuses = selected().map((entry) => entry.binding.status)
		const restore = statuses.some((status) => status.restore === 'pending')
			? 'pending'
			: statuses.some((status) => status.restore === 'error')
				? 'error'
				: statuses.some((status) => status.restore === 'timeout')
					? 'timeout'
					: 'ready'
		const write = statuses.some((status) => status.write === 'error')
			? 'error'
			: statuses.some((status) => status.write === 'blocked')
				? 'blocked'
				: statuses.some((status) => status.write === 'pending')
					? 'pending'
					: 'idle'
		const records = statuses.flatMap((status) => status.records ?? [])
		const sameRecords =
			records.length === snapshot.records?.length &&
			records.every((record, index) => snapshot.records?.[index] === record)
		const next: PersistStatus = {
			restore,
			write,
			dirty: statuses.some((status) => status.dirty),
			writeBlocked: statuses.some((status) => status.writeBlocked) ? 'future-version' : null,
			error: statuses.find((status) => status.error !== null)?.error ?? null,
			records: sameRecords ? (snapshot.records ?? []) : records,
		}
		if (
			!Object.keys(next).every((name) =>
				Object.is(next[name as keyof PersistStatus], snapshot[name as keyof PersistStatus]),
			)
		)
			snapshot = next
		return snapshot
	}
	const notify = (): void => {
		compute()
		for (const listener of listeners) listener()
	}
	const aggregate: Aggregate = {
		getSnapshot: compute,
		notify,
		subscribe(listener) {
			listeners.add(listener)
			const bindings = selected()
			for (const entry of bindings) entry.binding.listeners.add(notify)
			return () => {
				listeners.delete(listener)
				if (listeners.size === 0) for (const entry of bindings) entry.binding.listeners.delete(notify)
			}
		},
	}
	bySource.set(key, aggregate)
	return aggregate
}

export function usePersistStatus(store: object, source?: string): PersistStatus {
	const aggregate = aggregateFor(store, source)
	return useSyncExternalStore(aggregate.subscribe, aggregate.getSnapshot, () => SERVER_STATUS)
}

export function useHydrated(store: object): boolean {
	const aggregate = aggregateFor(store)
	return useSyncExternalStore(
		aggregate.subscribe,
		() => !['pending', 'idle'].includes(aggregate.getSnapshot().restore),
		() => false,
	)
}
