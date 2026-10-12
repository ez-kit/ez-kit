import { describe, expectTypeOf, it } from 'vitest'

import type { OptionSourceInput, OptionSourceRef, OptionSourceResult } from './index'
import type { JsonValue } from './options-source'

describe('option source types', () => {
	it('names the document reference OptionSourceRef', () => {
		expectTypeOf<OptionSourceRef>().toEqualTypeOf<{
			source: string
			dependsOn?: Record<string, string>
			params?: Record<string, JsonValue>
		}>()
	})

	it('owns the framework-agnostic input and result shapes', () => {
		expectTypeOf<OptionSourceInput>().toHaveProperty('params')
		expectTypeOf<OptionSourceInput['query']>().toEqualTypeOf<string | undefined>()
		expectTypeOf<OptionSourceResult['loading']>().toEqualTypeOf<boolean>()
	})
})
