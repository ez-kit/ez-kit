import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createStore } from 'zustand/vanilla'

import { pipe } from '../index'

import { localStorageField } from './storage'

import { persistHandle, withPersist, paramJson } from './index'

import type { PersistOptions, PersistWriteOptions, RestoreCallOptions } from './index'

const json = paramJson<unknown>()
const schema = { validate: (value: unknown) => z.object({ width: z.coerce.number() }).parse(value) }

function consumerTypes() {
	const store = pipe(
		createStore(() => ({
			layout: { width: 320 },
			items: [{ width: 320 }],
			optional: undefined as { width: number } | undefined,
		})),
		withPersist({
			throttleMs: 100,
			clearOnDefault: true,
			write: { sources: { browser: { throttleMs: 0, clearOnDefault: false } } },
			restore: { timeoutMs: 20, sources: { browser: { timeoutMs: null, externalChanges: 'apply' } } },
			fields: (field) => [field((s) => s.layout, localStorageField({ source: 'browser', parser: json, schema }))],
		}),
	)
	void persistHandle(store, 'browser').reset({ fields: [['layout'], ['items', '0', 'width'], ['optional', 'width']] })
	void persistHandle(store, 'browser').restore({ timeoutMs: null })
	void store.$persist.restore({ timeoutMs: 30 })
	// @ts-expect-error External changes are a lifecycle policy, not an option for one restore call.
	void store.$persist.restore({ externalChanges: 'apply' })
	void store.$persist.reset({ fields: [['layout', 'width']] })
	// @ts-expect-error Unknown state fields cannot be requested through inferred source handles.
	void persistHandle(store).reset({ fields: [['layuot']] })
	// @ts-expect-error Attached shorthand handles retain the actual Zustand state type.
	void store.$persist.reset({ fields: [['layout', 'height']] })
}
void consumerTypes

describe('public Zustand persistence types', () => {
	it('composes unknown JSON and validated output through source aliases', () => {
		expect(localStorageField({ source: 'browser', parser: json, schema }).schema.validate({ width: '500' })).toEqual({
			width: 500,
		})
	})
})

// Public policy types remain available through each binding's own import path.
function policyTypes(write: PersistWriteOptions, restore: RestoreCallOptions) {
	const options: PersistOptions = { write: { sources: { browser: write } }, restore }
	return options
}
void policyTypes
