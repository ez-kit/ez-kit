import { parentOf } from '@ez-kit/store-core'

import type { StorePort } from '@ez-kit/store-core'

/**
 * The manager stand-in this package's own tests bind to: {@link observable} makes a plain object
 * that notifies on assignment, and {@link objectPort} is its {@link StorePort}.
 *
 * It exists so the persist core is exercised through the port and nothing else. If a test could
 * only be written with Valtio's `proxy()`, the code under test would carry a Valtio assumption —
 * exactly the property this package must not have any more.
 */

type Node = { listeners: Set<() => void>; notifications: number }

/** Per-root bookkeeping, reachable from both the raw object and its wrapper. */
const nodes = new WeakMap<object, Node>()
/** Wrapper cache, so a nested node keeps ONE identity across reads (bindings compare by identity). */
const wrappers = new WeakMap<object, object>()

/** Plain objects and arrays are navigated into; Dates, class instances and functions are leaf values. */
function isNavigable(value: object): boolean {
	if (Array.isArray(value)) return true
	const proto = Object.getPrototypeOf(value) as object | null
	return proto === Object.prototype || proto === null
}

function notify(root: object): void {
	const node = nodes.get(root)
	if (!node) return
	node.notifications += 1
	for (const listener of [...node.listeners]) listener()
}

function wrap<V extends object>(target: V, root: object): V {
	const existing = wrappers.get(target)
	if (existing) return existing as V

	const proxied = new Proxy(target, {
		get(node, property, receiver): unknown {
			const value = Reflect.get(node, property, receiver) as unknown
			if (value !== null && typeof value === 'object' && isNavigable(value)) {
				return wrap(value, root)
			}
			return value
		},
		set(node, property, value: unknown): boolean {
			const previous = Reflect.get(node, property) as unknown
			const written = Reflect.set(node, property, value)
			if (written && !Object.is(previous, value)) notify(root)
			return written
		},
	})
	wrappers.set(target, proxied)
	return proxied
}

/** An observable plain-object store: assigning to it (`store.q = 'x'`) notifies its subscribers. */
export function observable<T extends object>(initial: T): T {
	const root: object = initial
	const node: Node = { listeners: new Set(), notifications: 0 }
	nodes.set(root, node)
	const store = wrap(initial, root)
	// Reachable from the wrapper too: callers hold the wrapper, `notify` resolves the raw root.
	nodes.set(store, node)
	return store
}

/** How many notifications `store`'s subscribers have seen, one per changed leaf. */
export function notificationsOf(store: object): number {
	return nodes.get(store)?.notifications ?? 0
}

/** The {@link StorePort} for every store made by {@link observable}. */
export const objectPort: StorePort = {
	getState: (store) => store,
	write: (store, writes) => {
		for (const { path, value } of writes) {
			const parent = parentOf(store, path)
			const leaf = path[path.length - 1]
			if (parent === undefined || leaf === undefined) continue
			parent[leaf] = value
		}
	},
	subscribe: (store, onChange) => {
		const node = nodes.get(store)
		if (!node) return () => undefined
		node.listeners.add(onChange)
		return () => {
			node.listeners.delete(onChange)
		}
	},
}
