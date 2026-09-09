import type { Parser } from '../types'

/**
 * A {@link Parser} that always provides `stringify`. Every built-in `param*` codec implements it,
 * so codecs that compose other codecs (e.g. `paramArray`) can call `stringify` without a guard.
 * Assignable to `Parser<T>` (whose `stringify` is optional, defaulting to `String`).
 */
export type Codec<T> = Parser<T> & { stringify(value: T): string | null }

/** Type-erased codec. */
export type AnyCodec = Codec<unknown>
