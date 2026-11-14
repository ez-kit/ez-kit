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

type ConfiguredReads<Enabled> = Enabled[Extract<keyof Enabled, 'getAll' | 'getInfinite'>]

/** Identity requirements do not contribute contextual types to read callbacks. */
export type SourceIdentity<Enabled> = ([Extract<ConfiguredReads<Enabled>, { fetcher: unknown }>] extends [never]
	? unknown
	: { key: QueryKey }) &
	([Extract<ConfiguredReads<Enabled>, { query: unknown }>] extends [never]
		? unknown
		: { invalidate: InvalidationPolicy })
