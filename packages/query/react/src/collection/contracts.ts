import type { InvalidationPolicy } from './invalidation'
import type { QueryKey } from '@tanstack/react-query'

/** Preserve optional capabilities instead of turning conditional operations into promises. */
export type ConfiguredOperations<Enabled, Operations> = {
	[K in keyof Enabled as K extends keyof Operations ? K : never]: K extends keyof Operations ? Operations[K] : never
}
export type ConfiguredQueries<Enabled, Operations> = {
	[
		K in keyof Enabled as K extends 'getAll' ? 'list' : K extends 'getInfinite' ? 'infinite' : never
	]: K extends keyof Operations ? (Operations[K] extends { query: infer Q } ? Q : never) : never
}

type ConfiguredOperationsInput<Enabled> = Enabled[Extract<
	keyof Enabled,
	'getAll' | 'getInfinite' | 'create' | 'update' | 'delete' | 'deleteMany'
>]

type ConfiguredReads<Enabled> = Enabled[Extract<keyof Enabled, 'getAll' | 'getInfinite'>]

/** Identity requirements do not contribute contextual types to read callbacks. */
export type SourceIdentity<Enabled> = ([Extract<ConfiguredOperationsInput<Enabled>, { fetcher: unknown }>] extends [
	never,
]
	? unknown
	: { key: QueryKey }) &
	([Extract<ConfiguredReads<Enabled>, { query: unknown }>] extends [never]
		? unknown
		: { invalidate: InvalidationPolicy })

/** A selected shape that cannot accept raw data requires a guaranteed selector. */
export type RequiredSelection<Enabled, K extends PropertyKey, D, S> = [D] extends [S]
	? unknown
	: {
			[Key in keyof Enabled as Key extends K ? Key : never]: NonNullable<Enabled[Key]> extends { query: unknown }
				? unknown
				: { options: { select: (data: never) => unknown } }
		}
