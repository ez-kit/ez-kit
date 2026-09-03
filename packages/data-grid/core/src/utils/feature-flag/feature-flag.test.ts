import { describe, expect, it } from 'vitest'

import { featureConfig, isFeatureEnabled } from './feature-flag'

import type { FeatureToggle } from './feature-flag'

/** Stand-in for a real feature config: the shared toggle plus a setting of its own. */
type TestConfig = FeatureToggle & { manual?: boolean }

describe('isFeatureEnabled', () => {
	it('treats an omitted option as off', () => {
		expect(isFeatureEnabled(undefined)).toBe(false)
	})

	it('treats false as off', () => {
		expect(isFeatureEnabled(false)).toBe(false)
	})

	it('treats true as on', () => {
		expect(isFeatureEnabled(true)).toBe(true)
	})

	it('treats a bare config object as on', () => {
		expect(isFeatureEnabled<TestConfig>({ manual: true })).toBe(true)
	})

	it('treats an empty config object as on', () => {
		expect(isFeatureEnabled({})).toBe(true)
	})

	it('honours an explicit enabled: false on a config object', () => {
		expect(isFeatureEnabled<TestConfig>({ enabled: false, manual: true })).toBe(false)
	})

	it('honours an explicit enabled: true on a config object', () => {
		expect(isFeatureEnabled({ enabled: true })).toBe(true)
	})
})

describe('featureConfig', () => {
	it('returns undefined for a boolean option', () => {
		expect(featureConfig(true)).toBeUndefined()
		expect(featureConfig(false)).toBeUndefined()
	})

	it('returns the object for an enabled feature', () => {
		const cfg: TestConfig = { manual: true }
		expect(featureConfig(cfg)).toBe(cfg)
	})

	it('withholds the object of a disabled feature so its settings cannot leak', () => {
		expect(featureConfig<TestConfig>({ enabled: false, manual: true })).toBeUndefined()
	})
})
