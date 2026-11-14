import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { pipe } from '../index'

import { localStorageField, persistLocalStorage } from './storage'

import { paramJson, persistHandle, urlHandle, withPersist } from './index'

const json = paramJson<unknown>()
const schema = { validate: (value: unknown) => z.object({ width: z.coerce.number() }).parse(value) }

function consumerTypes() {
	const store = pipe(
		proxy({
			layout: { width: 320 },
			items: [{ width: 320 }],
			optional: undefined as { width: number } | undefined,
			getState: () => 'active',
		}),
		withPersist({
			fields: (field) => [field((s) => s.layout, localStorageField({ source: 'browser', parser: json, schema }))],
		}),
	)
	void persistHandle(store, 'browser').reset({ fields: [['layout'], ['items', '0', 'width'], ['optional', 'width']] })
	void store.$persist.reset({ fields: [['layout', 'width']] })
	void urlHandle(store).reset({ fields: [['layout']] })
	// @ts-expect-error A business method named getState is not persisted state.
	void persistHandle(store).reset({ fields: [['getState']] })
	// @ts-expect-error Unknown state fields cannot be requested through inferred source handles.
	void persistHandle(store).reset({ fields: [['layuot']] })
	// @ts-expect-error Attached shorthand handles retain the actual Valtio state type.
	void store.$persist.reset({ fields: [['layout', 'height']] })
	class Layout {
		@persistLocalStorage({ source: 'browser', parser: json, schema }) layout = { width: 320 }
	}
	void Layout
}
void consumerTypes

describe('public Valtio persistence types', () => {
	it('composes unknown JSON and validated output through source aliases', () => {
		expect(localStorageField({ source: 'browser', parser: json, schema }).schema.validate({ width: '500' })).toEqual({
			width: 500,
		})
	})
})
