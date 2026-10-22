import { ItemsOwner } from './types'

import type { ListSnapshot, ListItem, ListSource } from './types'
import type { ItemsSourceResult } from '@ez-kit/data-grid-core'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * Joins a column id and an owner into one store key. A control character: an id that contains it
 * is possible but not something a column is ever named, and the owner after it is a closed set.
 */
const KEY_SEPARATOR = '\u001f'

const NO_ITEMS: readonly ListItem[] = Object.freeze([])

/** How many times a hook that threw is run again on its own before it waits for a new reader. */
export const MAX_THROWN_RETRIES = 3
/** The first retry's delay; each next one doubles it. */
export const THROWN_RETRY_BASE_MS = 1_000

/**
 * What a source reads before its hook has answered once: no items, loading. A subscriber registers
 * in an effect, so the first frame of a fresh source is always this — see design §Risks.
 */
export const PENDING_SNAPSHOT: ListSnapshot = Object.freeze({
	items: NO_ITEMS,
	isLoading: true,
	error: undefined,
})

/** One source the host has to run — what a `SourceRunner` is mounted from. */
export type ActiveSource = {
	key: string
	columnId: string
	owner: ItemsOwner
	hook: ListSource
	/** The hook's identity version, so a new function remounts its runner instead of reusing it. */
	version: number
	/** Bumped to run a hook that threw once more — part of the runner's key, so it remounts. */
	attempt: number
}

type Entry = {
	columnId: string
	owner: ItemsOwner
	/** `undefined` while only a subscription exists — see `subscribe`. */
	hook: ListSource | undefined
	version: number
	refCount: number
	snapshot: ListSnapshot
	listeners: Set<() => void>
	/** Whether the "new hook on every render" warning was already said for this source. */
	warnedUnstable: boolean
	/** See {@link ActiveSource.attempt}. */
	attempt: number
	/** Whether the current runner threw, and how many automatic retries that has cost so far. */
	thrown: boolean
	retries: number
	retryTimer: ReturnType<typeof setTimeout> | undefined
}

/** A request to keep one source running: which list, and the hook that supplies it. */
export type SourceRequest = { columnId: string; owner: ItemsOwner; hook: ListSource }

/**
 * The per-grid store behind every `useItems` list: one entry per column and owner, the hook that
 * fills it, how many mounted components read it, and its last result.
 *
 * It holds a snapshot, not a cache. The snapshot outlives its readers so a cell scrolled back into
 * view is labelled at once, but when to refetch, and whether, is the hook's business.
 */
export type ItemsSourceStore = {
	/** The store key of a column's list. */
	keyOf: (columnId: string, owner: ItemsOwner) => string
	/** The identity version of a hook — stable per function, new for a new one. */
	versionOf: (hook: ListSource) => number
	/** Keeps the source running until the returned release is called. */
	acquire: (request: SourceRequest) => () => void
	getSnapshot: (key: string) => ListSnapshot
	subscribe: (key: string, listener: () => void) => () => void
	/** The sources with at least one reader, as a stable array. */
	getActive: () => readonly ActiveSource[]
	subscribeActive: (listener: () => void) => () => void
	/** Stores a runner's result. Ignored from a runner of a hook the source no longer uses. */
	publish: (key: string, version: number, result: ItemsSourceResult<ListItem>) => void
	/**
	 * Records that a runner's hook **threw** — stored as the list's `error`, like a returned one —
	 * and schedules it to run again: up to {@link MAX_THROWN_RETRIES} times with a doubling delay,
	 * and once more whenever a control starts reading the list.
	 *
	 * A remount cannot clear an error the hook keeps itself: a TanStack Query query with
	 * `throwOnError` or suspense rethrows its cached error until a `QueryErrorResetBoundary` resets
	 * it. Returning `error` is the supported path; this one keeps the grid up.
	 */
	fail: (key: string, version: number, error: unknown) => void
}

/**
 * The same list by element, not only by array: `query.data ?? []` is a new empty array on every
 * render while loading, and comparing arrays alone would re-render every reader each time.
 */
function sameItems(a: readonly ListItem[], b: readonly ListItem[]): boolean {
	return a === b || (a.length === b.length && a.every((item, i) => item === b[i]))
}

function sameSnapshot(a: ListSnapshot, b: ListSnapshot): boolean {
	return sameItems(a.items, b.items) && a.isLoading === b.isLoading && Object.is(a.error, b.error)
}

function sameActive(a: readonly ActiveSource[], b: readonly ActiveSource[]): boolean {
	return (
		a.length === b.length &&
		a.every((source, i) => {
			const other = b[i]
			return source.key === other?.key && source.version === other.version && source.attempt === other.attempt
		})
	)
}

/** A hook's result as the store keeps it: `isLoading` a boolean, a `null` error no error. */
function toSnapshot(result: ItemsSourceResult<ListItem>): ListSnapshot {
	return { items: result.items, isLoading: result.isLoading === true, error: result.error ?? undefined }
}

function warnUnstableHook(columnId: string): void {
	console.warn(
		`[data-grid] The \`useItems\` hook of column "${columnId}" is a new function on this render, so the grid ` +
			'has to remount the component that calls it — and the hook starts over. Declare the columns outside ' +
			'the component, or memoize them, so the hook keeps one identity.',
	)
}

export function createItemsSourceStore(): ItemsSourceStore {
	const entries = new Map<string, Entry>()
	const activeListeners = new Set<() => void>()
	const versions = new WeakMap<ListSource, number>()
	let nextVersion = 1
	let active: readonly ActiveSource[] = []

	const keyOf = (columnId: string, owner: ItemsOwner): string => `${columnId}${KEY_SEPARATOR}${owner}`

	const versionOf = (hook: ListSource): number => {
		const known = versions.get(hook)
		if (known !== undefined) return known
		const version = nextVersion++
		versions.set(hook, version)
		return version
	}

	const refreshActive = (): void => {
		const next: ActiveSource[] = []
		for (const [key, entry] of entries) {
			const { columnId, owner, hook, version, refCount, attempt } = entry
			if (refCount === 0 || hook === undefined) continue
			next.push({ key, columnId, owner, hook, version, attempt })
		}
		if (sameActive(active, next)) return
		active = next
		for (const listener of activeListeners) listener()
	}

	/**
	 * The entry under `key`, created empty on first use. A reader subscribes during render and
	 * acquires in an effect, so either may come first.
	 */
	const entryAt = (key: string): Entry => {
		const existing = entries.get(key)
		if (existing) return existing
		const entry: Entry = {
			columnId: '',
			owner: ItemsOwner.Base,
			hook: undefined,
			version: 0,
			refCount: 0,
			snapshot: PENDING_SNAPSHOT,
			listeners: new Set(),
			warnedUnstable: false,
			attempt: 0,
			thrown: false,
			retries: 0,
			retryTimer: undefined,
		}
		entries.set(key, entry)
		return entry
	}

	/**
	 * Forgets an entry nobody reads or holds, so a grid whose column ids come and go does not keep
	 * one per id it ever had. Its snapshot goes with it: a column read again later starts pending.
	 *
	 * Deferred to a microtask: a re-render runs every reader's cleanup before any of their setups,
	 * so the count touches zero in the middle of one commit — dropping there would lose the
	 * snapshot and the hook identity the next setup is compared against.
	 */
	const dropIfUnused = (key: string): void => {
		queueMicrotask(() => {
			const entry = entries.get(key)
			if (entry?.refCount !== 0 || entry.listeners.size !== 0) return
			clearTimeout(entry.retryTimer)
			entries.delete(key)
		})
	}

	const notify = (entry: Entry): void => {
		for (const listener of entry.listeners) listener()
	}

	/** Runs a hook that threw once more, by remounting its runner under a new key. */
	const retry = (entry: Entry): void => {
		clearTimeout(entry.retryTimer)
		entry.retryTimer = undefined
		if (!entry.thrown) return
		entry.thrown = false
		entry.attempt += 1
		refreshActive()
	}

	const acquire = (request: SourceRequest): (() => void) => {
		const key = keyOf(request.columnId, request.owner)
		const entry = entryAt(key)
		entry.columnId = request.columnId
		entry.owner = request.owner
		if (entry.hook !== request.hook) {
			// A source that already had a hook getting another one is the inline-columns case,
			// whether or not a reader is mounted at this instant: a re-render runs every reader's
			// cleanup before any of their setups, so the count is often zero right here. Said once
			// per source — the remount it causes is the cost, not the message.
			if (IS_DEV && entry.hook !== undefined && !entry.warnedUnstable) {
				entry.warnedUnstable = true
				warnUnstableHook(request.columnId)
			}
			// A different hook is a different list: what the old one returned must not label values
			// until the new one answers — and the readers have to hear it, not find out on the next
			// render they happen to get.
			const hadHook = entry.hook !== undefined
			entry.hook = request.hook
			entry.version = versionOf(request.hook)
			entry.thrown = false
			entry.retries = 0
			if (hadHook && entry.snapshot !== PENDING_SNAPSHOT) {
				entry.snapshot = PENDING_SNAPSHOT
				notify(entry)
			}
		} else if (entry.thrown) {
			// A control starting to read a failed list is the user asking for it again.
			entry.retries = 0
			retry(entry)
		}
		entry.refCount += 1
		refreshActive()

		let released = false
		return () => {
			if (released) return
			released = true
			entry.refCount -= 1
			refreshActive()
			dropIfUnused(key)
		}
	}

	const publish = (key: string, version: number, result: ItemsSourceResult<ListItem>): void => {
		const entry = entries.get(key)
		if (entry?.version !== version) return
		const next = toSnapshot(result)
		if (!next.isLoading && next.error === undefined) entry.retries = 0
		if (sameSnapshot(entry.snapshot, next)) return
		entry.snapshot = next
		notify(entry)
	}

	const fail = (key: string, version: number, error: unknown): void => {
		const entry = entries.get(key)
		if (entry?.version !== version) return
		entry.thrown = true
		publish(key, version, { items: [], isLoading: false, error })
		if (entry.retries >= MAX_THROWN_RETRIES) return
		const delay = THROWN_RETRY_BASE_MS * 2 ** entry.retries
		entry.retries += 1
		clearTimeout(entry.retryTimer)
		entry.retryTimer = setTimeout(() => {
			retry(entry)
		}, delay)
	}

	return {
		keyOf,
		versionOf,
		acquire,
		getSnapshot: (key) => entries.get(key)?.snapshot ?? PENDING_SNAPSHOT,
		subscribe: (key, listener) => {
			const { listeners } = entryAt(key)
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
				dropIfUnused(key)
			}
		},
		getActive: () => active,
		subscribeActive: (listener) => {
			activeListeners.add(listener)
			return () => {
				activeListeners.delete(listener)
			}
		},
		publish,
		fail,
	}
}
