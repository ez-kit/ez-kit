import { tableFeatures } from '@tanstack/table-core'
import { expect, expectTypeOf, it, vi } from 'vitest'

import { createTable } from '../../create-table'
import { creatingFeature } from '../creating/creating'
import { editingFeature } from '../editing/editing'

import type { ValidationCheckResult } from '../../index'
import type { ValidationResult } from '../validation'

const features = tableFeatures({ creatingFeature, editingFeature })
function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
for (const mode of ['creating', 'editing'] as const) {
	function setup(validate?: () => ValidationResult | Promise<ValidationResult>) {
		const onSave = vi.fn()
		const config = { onSave, ...(validate ? { validate } : {}) }
		const table = createTable({
			features,
			data: [{ name: 'Ada' }],
			columns: [{ accessorKey: 'name' }],
			editing: config,
			creating: config,
		})
		const start = () => {
			if (mode === 'editing') table.editing.start('0')
			else table.creating.start()
		}
		return { form: table[mode], start, onSave }
	}
	it.each([
		[null, { status: 'valid' }],
		[{ errors: { name: ['Required'] } }, { status: 'invalid', errors: { name: ['Required'] }, formError: null }],
		[{ formError: 'Invalid combination' }, { status: 'invalid', errors: {}, formError: 'Invalid combination' }],
	] satisfies [ValidationResult, ValidationCheckResult][])(
		`${mode}: returns an explicit check outcome for %j`,
		async (result, expected) => {
			const { form, start, onSave } = setup(() => result)
			start()
			const before = form.getState()
			const outcome = await form.validateValues({ name: 'External' })
			expectTypeOf(outcome).toEqualTypeOf<ValidationCheckResult>()
			expect(outcome).toEqual(expected)
			expect(form.getState()).toBe(before)
			expect(onSave).not.toHaveBeenCalled()
		},
	)
	it(`${mode}: distinguishes a closed form from an open form without a validator`, async () => {
		const { form, start } = setup()
		await expect(form.validateValues({})).resolves.toEqual({ status: 'cancelled' })
		start()
		await expect(form.validateValues({})).resolves.toEqual({ status: 'valid' })
	})
	it(`${mode}: does not invoke the validator for a closed form`, async () => {
		const validate = vi.fn(() => null)
		const { form } = setup(validate)
		await expect(form.validateValues({})).resolves.toEqual({ status: 'cancelled' })
		expect(validate).not.toHaveBeenCalled()
	})
	for (const action of ['cancelValidation', 'cancel', 'restart'] as const) {
		it.each(['resolve', 'reject'] as const)(
			`${mode}: ${action} settles promptly and ignores a late %s`,
			async (late) => {
				const old = deferred<ValidationResult>()
				const validate = vi
					.fn()
					.mockImplementationOnce(() => old.promise)
					.mockReturnValue(null)
				const { form, start, onSave } = setup(validate)
				start()
				const before = form.getState()
				const check = form.validateValues({ name: 'Old' })
				if (action === 'restart') start()
				else form[action]()
				// No resolution of old.promise: cancellation must not wait for an uncooperative validator.
				await expect(check).resolves.toEqual({ status: 'cancelled' })
				if (action === 'cancelValidation') expect(form.getState()).toBe(before)
				if (action === 'cancel') start()
				await expect(form.validateValues({ name: 'New' })).resolves.toEqual({ status: 'valid' })
				const current = form.getState()
				if (late === 'resolve') old.resolve({ errors: { name: ['Stale error'] } })
				else old.reject(new Error('Stale failure'))
				await Promise.resolve()
				expect(form.getState()).toBe(current)
				expect(onSave).not.toHaveBeenCalled()
			},
		)
	}
	it(`${mode}: preserves an active validator's unexpected error`, async () => {
		const error = new Error('Validator unavailable')
		const { form, start } = setup(() => Promise.reject(error))
		start()
		await expect(form.validateValues({})).rejects.toBe(error)
	})
}
