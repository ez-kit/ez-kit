'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	creatingFeature,
	editingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useGridComponents, ValidationError } from '@ez-kit/data-grid-react'
import { useState } from 'react'
import { z } from 'zod'

import { DataGrid } from 'shared/DataGrid'
import { Dialog } from 'shared/form/Dialog'
import { Form } from 'shared/form/FormKit'

import { columns, INITIAL_DATA, type User } from '../_data'

import type { CommitResult, FormModalProps } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	creatingFeature,
	editingFeature,
})

const userSchema = z.object({
	name: z.string().min(2, 'must be at least 2 chars'),
	email: z.email('must be a valid email'),
})

const TAKEN_EMAIL = 'taken@example.com'

function useUsers() {
	const [data, setData] = useState<User[]>(INITIAL_DATA)

	const rejectTakenEmail = (values: Partial<User>) => {
		if (values.email === TAKEN_EMAIL) {
			throw new ValidationError({ errors: { email: ['already in use'] } })
		}
	}

	return {
		data,
		creating: {
			mode: 'modal' as const,
			validate: { schema: userSchema },
			onSave: ({ values }: { values: Partial<User> }) => {
				rejectTakenEmail(values)
				setData((prev) => [...prev, { id: Date.now(), age: 18, active: true, ...values } as User])
			},
		},
		editing: {
			mode: 'modal' as const,
			validate: { schema: userSchema },
			onSave: ({ rowId, values }: { rowId: string; values: Partial<User> }) => {
				rejectTakenEmail(values)
				setData((prev) => prev.map((row) => (String(row.id) === rowId ? { ...row, ...values } : row)))
			},
		},
	}
}

function toFormErrors(result: CommitResult) {
	if (result.ok || result.reason !== 'rejected') return undefined
	const fields = Object.fromEntries(Object.entries(result.errors).map(([key, messages]) => [key, messages.join(', ')]))
	return result.formError === null ? { fields } : { form: result.formError, fields }
}

function OwnFormModal({ title, initialValues, submit, onCancel }: FormModalProps) {
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onCancel()
			}}
		>
			<Dialog.Content title={title}>
				<Form
					defaultValues={{
						name: typeof initialValues.name === 'string' ? initialValues.name : '',
						email: typeof initialValues.email === 'string' ? initialValues.email : '',
					}}
					validators={{ onSubmitAsync: async ({ value }) => toFormErrors(await submit(value)) }}
				>
					{(form) => (
						<>
							<Dialog.Body>
								<form.TextField
									name='name'
									label='Name'
								/>
								<form.TextField
									name='email'
									label='Email'
									description={`Try ${TAKEN_EMAIL} to see the server reject it.`}
								/>
							</Dialog.Body>
							<Dialog.Footer>
								<Dialog.Close>Cancel</Dialog.Close>
								<form.SubmitButton>Save</form.SubmitButton>
							</Dialog.Footer>
						</>
					)}
				</Form>
			</Dialog.Content>
		</Dialog>
	)
}

export function OwnFormModalExample() {
	const { data, creating, editing } = useUsers()

	return (
		<DataGrid<typeof features, User>
			features={features}
			data={data}
			columns={columns}
			creating={creating}
			editing={editing}
			components={{ editing: { FormModal: OwnFormModal } }}
		/>
	)
}

function FieldsLayoutModal({ title, fields, formError, isPending, onSave, onCancel }: FormModalProps) {
	const { Button } = useGridComponents().core

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onCancel()
			}}
		>
			<Dialog.Content title={title}>
				<Dialog.Body>
					{formError ? <p role='alert'>{formError}</p> : null}
					<div className='grid grid-cols-2 gap-4'>
						<div className='col-span-2'>{fields.name}</div>
						{fields.email}
						{fields.age}
						<div className='col-span-2'>{fields.active}</div>
					</div>
				</Dialog.Body>
				<Dialog.Footer>
					<Dialog.Close>Cancel</Dialog.Close>
					<Button
						type='button'
						disabled={isPending}
						onClick={() => void onSave()}
					>
						Save
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

export function FieldsLayoutModalExample() {
	const { data, creating, editing } = useUsers()

	return (
		<DataGrid<typeof features, User>
			features={features}
			data={data}
			columns={columns}
			creating={creating}
			editing={editing}
			components={{ editing: { FormModal: FieldsLayoutModal } }}
		/>
	)
}
