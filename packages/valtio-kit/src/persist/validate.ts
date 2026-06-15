import { findPropertyDescriptor } from './path'

import type { FieldDescriptor } from './types'

function isPlainData(value: unknown): boolean {
	if (value === null || typeof value !== 'object') {
		return true
	}
	if (Array.isArray(value) || value instanceof Date) {
		return true
	}
	const proto = Object.getPrototypeOf(value) as object | null
	return proto === Object.prototype || proto === null
}

/**
 * Validate field descriptors against the proxy before connecting (fail fast). Throws when a
 * path is unreachable, a leaf is a getter without a setter, or a parser targets a class instance
 * (a navigable node that should be synced field-by-field instead).
 */
export function validateBinding(root: object, fields: FieldDescriptor[]): void {
	for (const field of fields) {
		const { path } = field
		const label = path.join('.')

		let parent: unknown = root
		for (const segment of path.slice(0, -1)) {
			if (parent === null || typeof parent !== 'object' || !(segment in parent)) {
				throw new Error(
					`[valtio-kit] persist: path "${label}" is unreachable — "${segment}" is missing at bind time.`,
				)
			}
			parent = (parent as Record<string, unknown>)[segment]
		}

		if (parent === null || typeof parent !== 'object') {
			throw new Error(`[valtio-kit] persist: path "${label}" has no object parent at bind time.`)
		}

		const leaf = path.at(-1)
		if (leaf === undefined) {
			continue
		}
		const descriptor = findPropertyDescriptor(parent, leaf)
		if (descriptor?.get && !descriptor.set) {
			throw new Error(
				`[valtio-kit] persist: "${label}" is a getter-only property and cannot be written from the substrate.`,
			)
		}

		const leafValue = (parent as Record<string, unknown>)[leaf]
		if (!isPlainData(leafValue)) {
			throw new Error(
				`[valtio-kit] persist: "${label}" resolves to a class instance — sync its fields individually ` +
					`instead of attaching a parser to the whole node.`,
			)
		}
	}
}
