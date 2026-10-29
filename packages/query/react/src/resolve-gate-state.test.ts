import { describe, expect, it } from 'vitest'

import { resolveGateState } from './resolve-gate-state'

import type { GateInput, GateState } from './resolve-gate-state'

const cases: readonly (readonly [string, GateInput, GateState])[] = [
	['success with data', { data: [1], status: 'success', fetchStatus: 'idle' }, 'data'],
	['background refetch', { data: [1], status: 'success', fetchStatus: 'fetching' }, 'data'],
	['placeholder data', { data: [1], status: 'pending', fetchStatus: 'fetching' }, 'data'],
	['background refetch error', { data: [1], status: 'error', fetchStatus: 'idle' }, 'data'],
	['null data', { data: null, status: 'success', fetchStatus: 'idle' }, 'data'],
	['first load', { data: undefined, status: 'pending', fetchStatus: 'fetching' }, 'loading'],
	['offline before first load', { data: undefined, status: 'pending', fetchStatus: 'paused' }, 'loading'],
	['disabled query', { data: undefined, status: 'pending', fetchStatus: 'idle' }, 'idle'],
	['error without data', { data: undefined, status: 'error', fetchStatus: 'idle' }, 'error'],
]

describe('resolveGateState', () => {
	it.each(cases)('%s → %s', (_name, input, expected) => {
		expect(resolveGateState(input)).toBe(expected)
	})
})
