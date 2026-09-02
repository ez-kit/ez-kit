'use client'

import { useState } from 'react'

import { Dialog } from 'shared/form/Dialog'
import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

type Profile = {
	name: string
	title: string
}

const schema = defineFormSchema<Profile>()({
	version: 1,
	children: [
		{
			type: FormFieldType.Text,
			name: 'name',
			label: 'Name',
			placeholder: 'Ada Lovelace',
			defaultValue: '',
		},
		{
			type: FormFieldType.Text,
			name: 'title',
			label: 'Title',
			placeholder: 'Mathematician',
			defaultValue: '',
		},
		{ type: 'submit', label: 'Save' },
	],
})

/**
 * The dialog form from the JSX side, written as a document.
 *
 * The lifetime argument is identical: `<FormRenderer>` calls `useForm` itself, so the form
 * lives exactly as long as this element and the dialog's unmount-while-closed is what
 * resets it. The one arrangement that does not carry over is the split body/footer — the
 * `submit` node is part of the document, so it renders where the document puts it rather
 * than in the dialog's own footer. Put the renderer in the body and keep only `Cancel`
 * below it, or drop the `submit` node and drive `form.handleSubmit()` from a footer button
 * in the controlled mode.
 */
export function DialogSchemaExample() {
	const [open, setOpen] = useState(false)
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Dialog
				open={open}
				onOpenChange={setOpen}
			>
				<Dialog.Trigger>Edit profile</Dialog.Trigger>

				<Dialog.Content title='Edit profile'>
					<Dialog.Body>
						<FormRenderer
							schema={schema}
							onSubmit={({ value }) => {
								setSaved(JSON.stringify(value, null, 2))
								setOpen(false)
							}}
						/>
					</Dialog.Body>

					<Dialog.Footer>
						<Dialog.Close>Cancel</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>

			{saved === null ? null : <pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{saved}</pre>}
		</div>
	)
}
