import { describe, expect, it } from 'vitest'

import type { BetweenOperatorConfig } from './operators'

describe('BetweenOperatorConfig', () => {
	it('accepts a number-only config', () => {
		const config: BetweenOperatorConfig = { slider: true, min: 0, max: 100 }
		expect(config.slider).toBe(true)
	})

	it('accepts a date-only config', () => {
		const config: BetweenOperatorConfig = { presets: true }
		expect(config.presets).toBe(true)
	})

	it('accepts the empty config', () => {
		const config: BetweenOperatorConfig = {}
		expect(config).toEqual({})
	})

	it('rejects mixing the two arms', () => {
		// @ts-expect-error `slider` is number-only and `presets` is date-only.
		const config: BetweenOperatorConfig = { slider: true, presets: true }
		expect(config).toBeDefined()
	})
})
