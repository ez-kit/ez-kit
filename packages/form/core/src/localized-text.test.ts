import { expect, test } from 'vitest'

import { resolveText } from './localized-text'

test('a plain string is finished copy', () => {
	expect(resolveText('Email')).toBe('Email')
})

test('undefined stays undefined', () => {
	expect(resolveText(undefined)).toBeUndefined()
})

test('an i18n object goes through translate', () => {
	expect(resolveText({ i18n: 'form.email' }, (key) => `t:${key}`)).toBe('t:form.email')
})

test('params reach translate', () => {
	const translate = (key: string, params?: Record<string, string | number>): string => `${key}:${String(params?.count)}`
	expect(resolveText({ i18n: 'form.items', params: { count: 3 } }, translate)).toBe('form.items:3')
})

test('an i18n object without translate throws rather than rendering a blank label', () => {
	expect(() => resolveText({ i18n: 'form.email' })).toThrow(/translate/i)
})

test('the old key spelling is not a translation key', () => {
	expect(() => resolveText({ key: 'form.email' } as never, (key) => key)).toThrow(/i18n/)
})
