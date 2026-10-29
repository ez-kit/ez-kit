import type { UseQueryResult } from '@tanstack/react-query'

/** Which branch a `<Query>` gate renders. */
export type GateState = 'data' | 'loading' | 'idle' | 'error'

/** The fields of a query result the gate decides on. */
export type GateInput = Pick<UseQueryResult<unknown, unknown>, 'data' | 'status' | 'fetchStatus'>

/**
 * Picks the gate's branch from a query result.
 *
 * Data is checked first, so a background refetch, placeholder data and a failed background
 * refetch all keep rendering the data. The `undefined` check is sound because in v5 a `queryFn`
 * cannot resolve to `undefined`: `undefined` always means "no data", while `null` is data.
 */
export function resolveGateState({ data, status, fetchStatus }: GateInput): GateState {
	if (data !== undefined) return 'data'
	if (status === 'error') return 'error'
	if (fetchStatus === 'idle') return 'idle'
	return 'loading'
}
