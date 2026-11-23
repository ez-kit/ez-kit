import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { resolveFieldSpecs } from './accessor'
import { paramJson, paramNumber } from './codecs'

describe('schema validation is independent from decoding', () => {
	it('accepts a Zod validator over unknown JSON and preserves the field output type', () => {
		const schema = z.object({ width: z.coerce.number().min(0) })
		const fields = resolveFieldSpecs({ layout: { width: 320 } }, (field) => {
			// @ts-expect-error The field is an object, not the number returned by this validator.
			field((state) => state.layout, { schema: { validate: () => 42 } })
			return [
				field((state) => state.layout, {
					parser: paramJson(),
					schema: { version: 2, validate: (value) => schema.parse(value) },
				}),
			]
		})
		const descriptor = fields[0]?.descriptor
		expect(descriptor?.schema?.validate?.(descriptor.parser.parse('{"width":"500"}'))).toEqual({ width: 500 })
	})

	it('uses a scalar codec with Zod instead of assuming every URL value is JSON', () => {
		const fields = resolveFieldSpecs({ rating: 1 }, (field) => [
			field((state) => state.rating, {
				parser: paramNumber(),
				schema: { validate: (value) => z.number().int().min(1).max(5).parse(value) },
			}),
		])
		const descriptor = fields[0]?.descriptor
		expect(descriptor?.schema?.validate?.(descriptor.parser.parse('4'))).toBe(4)
		expect(() => descriptor?.schema?.validate?.(descriptor.parser.parse('9'))).toThrow()
	})
})
