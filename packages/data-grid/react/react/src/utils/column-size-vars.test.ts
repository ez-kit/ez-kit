import { describe, expect, it } from 'vitest'

import { getColumnSizeVars } from './column-size-vars'

import type { DataTable } from '@ez-kit/data-grid-core'

function makeHeader(id: string, headerSize: number, colSize: number) {
	return {
		column: { id, getSize: () => colSize },
		getSize: () => headerSize,
	}
}

function mockTable(headers: ReturnType<typeof makeHeader>[]): DataTable<object> {
	return {
		getFlatHeaders: () => headers,
	} as unknown as DataTable<object>
}

describe('getColumnSizeVars', () => {
	it('returns CSS variables for each column', () => {
		const table = mockTable([makeHeader('name', 200, 200), makeHeader('age', 80, 80)])
		const vars = getColumnSizeVars(table)
		expect(vars).toMatchObject({
			'--header-name-size': '200',
			'--col-name-size': '200',
			'--header-age-size': '80',
			'--col-age-size': '80',
		})
	})

	it('returns empty object for table with no headers', () => {
		const table = mockTable([])
		const vars = getColumnSizeVars(table)
		expect(vars).toEqual({})
	})

	it('uses header.getSize() for --header-* and column.getSize() for --col-*', () => {
		const table = mockTable([makeHeader('email', 300, 250)])
		const vars = getColumnSizeVars(table)
		expect(vars['--header-email-size' as keyof typeof vars]).toBe('300')
		expect(vars['--col-email-size' as keyof typeof vars]).toBe('250')
	})
})
