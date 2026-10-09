'use client'

import { useState } from 'react'

import { Form, TextInputType } from 'shared/form/FormKit'

const ROLES = [
	{ label: 'Owner', value: 'owner' },
	{ label: 'Editor', value: 'editor' },
	{ label: 'Viewer', value: 'viewer' },
]

type Member = { name: string; email: string; role: string }
type Team = { teamName: string; members: Member[] }

/** What a freshly added entry starts from — every key of `Member`, so no control is uncontrolled. */
const NEW_MEMBER: Member = { name: '', email: '', role: 'viewer' }

const DEFAULTS: Team = {
	teamName: 'Platform',
	members: [{ name: 'Ada', email: 'ada@example.com', role: 'owner' }],
}

const MAX_MEMBERS = 4

/**
 * A repeatable group in JSX — the twin of `arrays-schema`.
 *
 * Two things the shape is worth reading for. `key={item.key}` is the entry's own stable id, not
 * its index: removing an entry from the middle renumbers the rest, and a keyed-by-index list
 * would carry one row's local state onto its neighbour while the submitted values still looked
 * right. And `name='email'` inside the entry is **relative to the entry** — the `members[1].`
 * prefix is joined on at render, so nothing at the call site composes a path.
 */
export function ArraysExample() {
	const [saved, setSaved] = useState<Team | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Form
				defaultValues={DEFAULTS}
				onSubmit={({ value }) => {
					setSaved(value)
				}}
			>
				{(form) => (
					<>
						<form.TextField
							name='teamName'
							label='Team'
						/>

						<form.ArrayField
							name='members'
							label='Members'
							description='At least one, at most four.'
							newItem={NEW_MEMBER}
							validate={{ minLength: 1, maxLength: MAX_MEMBERS }}
							reorderable
							addLabel='Add member'
							removeLabel='Remove'
							itemLabel={(index) => `Member ${String(index + 1)}`}
						>
							{({ items }) =>
								items.map((item) => (
									<item.Item key={item.key}>
										<item.TextField
											name='name'
											label='Name'
											validate={{ required: true }}
										/>
										<item.TextField
											name='email'
											label='Email'
											type={TextInputType.Email}
											validate={{ required: true, format: 'email' }}
										/>
										<item.SelectField
											name='role'
											label='Role'
											options={ROLES}
										/>
									</item.Item>
								))
							}
						</form.ArrayField>

						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>

			{saved ? (
				<pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{JSON.stringify(saved, null, 2)}</pre>
			) : null}
		</div>
	)
}
