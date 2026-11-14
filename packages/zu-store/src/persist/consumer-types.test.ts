import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createStore } from 'zustand/vanilla'

import { pipe } from '../index'

import { localStorageField } from './storage'

import { persistHandle, withPersist, paramJson } from './index'

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
			fields: (field) => [field((s) => s.layout, localStorageField({ source: 'browser', parser: json, schema }))],
		}),
	)
	void persistHandle(store, 'browser').reset({ fields: [['layout'], ['items', '0', 'width'], ['optional', 'width']] })
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
