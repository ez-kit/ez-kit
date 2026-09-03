import { describe, expect, it } from 'vitest'

import { ColumnFormMode, resolveColumnFormConfig } from './resolve-form-config'

import type { ColumnMeta } from '@tanstack/table-core'

const Editing = () => null
const Creating = () => null

function meta(fields: Partial<ColumnMeta<unknown, unknown>>): ColumnMeta<unknown, unknown> {
	return fields
}

/**
 * `creating.component` has been documented as falling back to `editing.component` in three
 * places — the option's own JSDoc, `creating.validateOn`'s, and the validation docs page — and
 * fell back nowhere: the create form read `meta.creating` alone. The two timing fields did
 * fall back, but per **object**, so a column that set only `creating.description` lost its
 * `editing.validateOn` on the way.
 */
describe('resolveColumnFormConfig', () => {
	it('gives the create form the column editing component when it declares none of its own', () => {
		const resolved = resolveColumnFormConfig(meta({ editing: { component: Editing } }), ColumnFormMode.Creating)

		expect(resolved !== false && resolved?.component).toBe(Editing)
	})

	it('lets the create form override just one field and keep the rest from editing', () => {
		const resolved = resolveColumnFormConfig(
			meta({
				editing: { component: Editing, validateOn: 'blur', description: 'edit help' },
				creating: { description: 'create help' },
			}),
			ColumnFormMode.Creating,
		)

		expect(resolved !== false && resolved?.description).toBe('create help')
		// Both survive the override — the fallback is per field, not per object.
		expect(resolved !== false && resolved?.component).toBe(Editing)
		expect(resolved !== false && resolved?.validateOn).toBe('blur')
	})

	it('prefers the creating component when the column declares both', () => {
		const resolved = resolveColumnFormConfig(
			meta({ editing: { component: Editing }, creating: { component: Creating } }),
			ColumnFormMode.Creating,
		)

		expect(resolved !== false && resolved?.component).toBe(Creating)
	})

	it('excludes the column from the create form on `creating: false`', () => {
		expect(
			resolveColumnFormConfig(meta({ editing: { component: Editing }, creating: false }), ColumnFormMode.Creating),
		).toBe(false)
	})

	it('keeps a create-only column in the create form under `editing: false`', () => {
		// "Not editable" is not "not creatable" — an initial password is exactly a field you
		// fill in once and never edit.
		const resolved = resolveColumnFormConfig(
			meta({ editing: false, creating: { component: Creating } }),
			ColumnFormMode.Creating,
		)

		expect(resolved !== false && resolved?.component).toBe(Creating)
	})

	it('never lets an editing config leak into the edit form from creating', () => {
		const resolved = resolveColumnFormConfig(
			meta({ editing: { component: Editing }, creating: { component: Creating } }),
			ColumnFormMode.Editing,
		)

		expect(resolved !== false && resolved?.component).toBe(Editing)
	})
})
