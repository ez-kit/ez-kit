'use client'

import type { ReactNode } from 'react'

type NamedComponent = (props: { name: string }) => ReactNode

/** The members a group already carries under these names and that its fields replace on purpose. */
const REPLACED_MEMBERS = { Field: true, NativeField: true } as const

/**
 * `source`'s field members under `keys`, each re-bound so its `name` (and a `NativeField`'s
 * listen-to lists) is resolved by `toAbsolute` before it renders — the group's own path rule. Built
 * once per group, so a member's identity, and the input under it, survives every re-render.
 */
export function scopeGroupMembers(
	source: object,
	keys: readonly string[],
	toAbsolute: <TProps extends { name: string }>(props: TProps) => TProps,
): Record<string, NamedComponent> {
	const record = source as Record<string, NamedComponent | undefined>
	const members: Record<string, NamedComponent> = {}
	for (const key of keys) {
		const Inner = record[key]
		if (Inner === undefined) continue
		members[key] = function GroupMember(props) {
			return <Inner {...toAbsolute(props)} />
		}
	}
	return members
}

/**
 * A scope over `base`: an object whose prototype is TanStack's group, carrying `members` on top.
 * TanStack's object is not written to, so StrictMode's second memo run finds it as it was.
 */
export function withMembers<TBase extends object>(base: TBase, members: object): TBase {
	for (const key of Object.keys(members)) {
		if (key in base && !Object.hasOwn(REPLACED_MEMBERS, key)) {
			throw new Error(
				`The field "${key}" has the name of a member every group carries, so group.${key} cannot be both. Register it under another name.`,
			)
		}
	}
	return Object.assign(Object.create(base) as TBase, members)
}
