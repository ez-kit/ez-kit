import { describe, expect, it } from 'vitest'

import { noop } from './index'

describe('@ez-kit/data-grid/core', () => {
	it('exports noop', () => {
		expect(noop).toBeTypeOf('function')
	})
})
