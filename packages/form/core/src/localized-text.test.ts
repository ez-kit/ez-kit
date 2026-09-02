import { expect, test } from 'vitest'

import { resolveText } from './localized-text'

test('a plain string is finished copy', () => {
	expect(resolveText('Email')).toBe('Email')
})

test('undefined stays undefined', () => {
	expect(resolveText(undefined)).toBeUndefined()
})

test('a key object goes through translate', () => {
	expect(resolveText({ key: 'form.email' }, (key) => `t:${key}`)).toBe('t:form.email')
})

test('params reach translate', () => {
	const translate = (key: string, params?: Record<string, string | number>): string => `${key}:${String(params?.count)}`
	expect(resolveText({ key: 'form.items', params: { count: 3 } }, translate)).toBe('form.items:3')
})

test('a key object without translate throws rather than rendering a blank label', () => {
	expect(() => resolveText({ key: 'form.email' })).toThrow(/translate/i)
})
