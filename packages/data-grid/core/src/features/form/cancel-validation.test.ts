import { tableFeatures } from '@tanstack/table-core'
import { expect, it, vi } from 'vitest'

import { createTable } from '../../create-table'
import { creatingFeature } from '../creating/creating'
import { editingFeature } from '../editing/editing'

import type { ValidateContext, ValidationResult } from '../validation'

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
for (const mode of ['editing', 'creating'] as const) {
	it.each(['valid', 'invalid', 'throws'] as const)(
		`${mode}: cancelled validation ignores late %s results and preserves a new attempt`,
		async (outcome) => {
			const old = deferred<ValidationResult>()
			const next = deferred<ValidationResult>()
			const signals: AbortSignal[] = []
			const validate = vi.fn((_values: unknown, context: ValidateContext) => {
				signals.push(context.signal)
				return signals.length === 1 ? old.promise : next.promise
			})
			const onSave = vi.fn()
			const table = createTable({
				features,
				data: [{ name: 'Ada' }],
				columns: [{ accessorKey: 'name' }],
				editing: { validate, onSave },
				creating: { validate, onSave },
			})
			if (mode === 'editing') table.editing.start('0')
			else table.creating.start()
			const form = table[mode]
			const first = form.commit({ values: { name: 'Old' } })
			form.cancelValidation()
			expect(signals[0]?.aborted).toBe(true)
			await expect(first).resolves.toEqual({ ok: false, reason: 'cancelled' })
			expect(form.getState()).toMatchObject({
				values: { name: 'Old' },
				commitStatus: 'idle',
				errors: {},
				formError: null,
			})
			const second = form.commit({ values: { name: 'New' } })
			if (outcome === 'throws') old.reject(new Error('stale'))
			else old.resolve(outcome === 'valid' ? null : { errors: { name: ['stale'] } })
			await Promise.resolve()
			expect(form.getState()).toMatchObject({
				values: { name: 'New' },
				commitStatus: 'validating',
				errors: {},
				formError: null,
			})
			expect(onSave).not.toHaveBeenCalled()
			next.resolve(null)
			await expect(second).resolves.toEqual({ ok: true })
			expect(onSave).toHaveBeenCalledTimes(1)
		},
	)
	it.each(['validate', 'validateField', 'validateValues'] as const)(
		`${mode}: cancels a standalone %s check`,
		async (method) => {
			const pending = deferred<ValidationResult>()
			let signal: AbortSignal | undefined
			const validate = (_values: unknown, context: ValidateContext) => {
				signal = context.signal
				return pending.promise
			}
			const table = createTable({
				features,
				data: [{ name: 'Ada' }],
				columns: [{ accessorKey: 'name' }],
				editing: { validate, onSave: vi.fn() },
				creating: { validate, onSave: vi.fn() },
			})
			if (mode === 'editing') table.editing.start('0')
			else table.creating.start()
			const form = table[mode]
			const check =
				method === 'validateField'
					? form.validateField('name')
					: method === 'validateValues'
						? form.validateValues({ name: 'Old' })
						: form.validate()
			form.cancelValidation()
			expect(signal?.aborted).toBe(true)
			pending.resolve({ errors: { name: ['stale'] } })
			await check
			expect(form.getState()).toMatchObject({ commitStatus: 'idle', errors: {}, formError: null })
		},
	)

	it(`${mode}: cancelling validation leaves an already dispatched save running`, async () => {
		const pending = deferred<undefined>()
		let signal: AbortSignal | undefined
		const onSave = vi.fn((context: { signal: AbortSignal }) => {
			signal = context.signal
			return pending.promise
		})
		const table = createTable({
			features,
			data: [{ name: 'Ada' }],
			columns: [{ accessorKey: 'name' }],
			editing: { onSave },
			creating: { onSave },
		})
		if (mode === 'editing') table.editing.start('0')
		else table.creating.start()
		const form = table[mode]
		const completion = form.commit()
		form.cancelValidation()
		expect(signal?.aborted).toBe(false)
		expect(form.getState().commitStatus).toBe('saving')
		pending.resolve(undefined)
		await expect(completion).resolves.toEqual({ ok: true })
	})
}
