import { describe, expect, it } from 'vitest'

import { setIfDefined } from './set-if-defined'

describe('setIfDefined', () => {
	it('assigns the value when it is defined', () => {
		const target: { id?: string } = {}
		setIfDefined(target, 'id', 'abc')
		expect(target.id).toBe('abc')
	})

	it('does not assign when the value is undefined', () => {
		const target: { id?: string } = {}
		setIfDefined(target, 'id', undefined)
		expect('id' in target).toBe(false)
	})

	it('assigns null (null is not undefined)', () => {
		const target: { value?: string | null } = {}
		setIfDefined(target, 'value', null)
		expect(target.value).toBeNull()
		expect('value' in target).toBe(true)
	})

	it('assigns false (falsy but defined)', () => {
		const target: { enabled?: boolean } = {}
		setIfDefined(target, 'enabled', false)
		expect(target.enabled).toBe(false)
	})

	it('assigns 0 (falsy but defined)', () => {
		const target: { count?: number } = {}
		setIfDefined(target, 'count', 0)
		expect(target.count).toBe(0)
	})

	it('assigns empty string (falsy but defined)', () => {
		const target: { label?: string } = {}
		setIfDefined(target, 'label', '')
		expect(target.label).toBe('')
	})

	it('does not modify unrelated keys on the target', () => {
		const target: { id?: string; name?: string } = { name: 'unchanged' }
		setIfDefined(target, 'id', 'abc')
		expect(target.name).toBe('unchanged')
	})

	it('overwrites an existing value when the new value is defined', () => {
		const target: { id?: string } = { id: 'old' }
		setIfDefined(target, 'id', 'new')
		expect(target.id).toBe('new')
	})

	it('does not overwrite an existing value when the new value is undefined', () => {
		const target: { id?: string } = { id: 'old' }
		setIfDefined(target, 'id', undefined)
		expect(target.id).toBe('old')
	})
})
