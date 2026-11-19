import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { resolveFieldSpecs } from './accessor'
import { paramJson, paramNumber } from './codecs'
import { discoverPersistFields } from './decorators'
import {
	indexedDbField,
	localStorageField,
	persistIndexedDb,
	persistLocalStorage,
	persistSessionStorage,
	sessionStorageField,
} from './storage/decorator'
import { persistUrl, urlField } from './url/decorator'

const layoutSchema = z.object({ width: z.coerce.number().min(0) })
const json = paramJson<unknown>()
const schema = { validate: (value: unknown) => layoutSchema.parse(value) }

describe('typed schema helpers and source aliases', () => {
	it('preserves validation output from an unknown decoder through every accessor helper', () => {
		const fields = resolveFieldSpecs({ layout: { width: 320 } }, (field) => [
			field((s) => s.layout, localStorageField({ source: 'browser', parser: json, schema })),
			field((s) => s.layout, sessionStorageField({ source: 'session', parser: json, schema })),
			field((s) => s.layout, indexedDbField({ source: 'database', parser: json, schema })),
			field((s) => s.layout, urlField({ source: 'router', parser: json, schema })),
		])
		expect(fields.map((field) => field.source)).toEqual(['browser', 'session', 'database', 'router'])
		for (const { descriptor } of fields) {
			expect(descriptor.schema?.validate?.(descriptor.parser.parse('{"width":"500"}'))).toEqual({ width: 500 })
		}
	})

	it('keeps default sources and scalar codec inference without validation', () => {
		const fields = resolveFieldSpecs({ width: 320 }, (field) => [
			field((s) => s.width, localStorageField()),
			field((s) => s.width, sessionStorageField({ parser: paramNumber() })),
			field((s) => s.width, indexedDbField()),
			field((s) => s.width, urlField()),
		])
		expect(fields.map((field) => field.source)).toEqual(['localStorage', 'sessionStorage', 'indexedDB', 'url'])
	})

	it('forwards aliases and unknown decoders through every decorator', () => {
		class Layouts {
			@persistLocalStorage({ source: 'browser', parser: json, schema }) local = { width: 320 }
			@persistSessionStorage({ source: 'session', parser: json, schema }) session = { width: 320 }
			@persistIndexedDb({ source: 'database', parser: json, schema }) database = { width: 320 }
			@persistUrl({ source: 'router', parser: json, schema }) linked = { width: 320 }
		}
		const fields = discoverPersistFields(new Layouts())
		expect(fields.map((field) => field.source)).toEqual(['browser', 'session', 'database', 'router'])
		for (const { descriptor } of fields) expect(descriptor.schema).toBe(schema)
	})
})

// Compile-only consumer regressions: decoder input must not widen the validated output.
function invalidValidatorOutputs() {
	resolveFieldSpecs({ layout: { width: 320 } }, (field) => {
		// @ts-expect-error The validator returns number, not the layout field type.
		field((s) => s.layout, localStorageField({ parser: json, schema: { validate: () => 42 } }))
		// @ts-expect-error The validator returns number, not the layout field type.
		field((s) => s.layout, sessionStorageField({ parser: json, schema: { validate: () => 42 } }))
		// @ts-expect-error The validator returns number, not the layout field type.
		field((s) => s.layout, indexedDbField({ parser: json, schema: { validate: () => 42 } }))
		// @ts-expect-error The validator returns number, not the layout field type.
		field((s) => s.layout, urlField({ parser: json, schema: { validate: () => 42 } }))
		return []
	})
	class InvalidLayout {
		// @ts-expect-error A decorator cannot validate the layout into a number.
		@persistLocalStorage({ parser: json, schema: { validate: () => 42 } }) layout = { width: 320 }
		// @ts-expect-error A decorator cannot validate the layout into a number.
		@persistUrl({ parser: json, schema: { validate: () => 42 } }) linked = { width: 320 }
	}
	void InvalidLayout
}
void invalidValidatorOutputs
