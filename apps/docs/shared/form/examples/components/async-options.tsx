'use client'

import { useEffect, useState } from 'react'

import { Form } from 'shared/form/FormKit'

const ROLES = [
	{ label: 'Viewer', value: 'viewer' },
	{ label: 'Editor', value: 'editor' },
	{ label: 'Admin', value: 'admin' },
]

const TEAMS = [
	{ label: 'Design', value: 'design' },
	{ label: 'Engineering', value: 'engineering' },
	{ label: 'Research', value: 'research' },
]

/** Long enough to actually see the skeleton, short enough not to feel broken. */
const FETCH_DELAY_MS = 1500

type Options = readonly { label: string; value: string }[]

/**
 * Stands in for a real query (TanStack Query, SWR, a bare `fetch`) without adding a network
 * dependency to the docs. The shape is what matters: nothing while it is in flight, the list
 * once it lands.
 */
function useDelayedOptions(options: Options): { data: Options | undefined; isPending: boolean } {
	const [data, setData] = useState<Options | undefined>(undefined)

	useEffect(() => {
		const timer = setTimeout(() => {
			setData(options)
		}, FETCH_DELAY_MS)

		return () => {
			clearTimeout(timer)
		}
	}, [options])

	return { data, isPending: data === undefined }
}

/**
 * Options that arrive after the form does.
 *
 * `loading` is what lets the kit tell "still fetching" from "the backend really has nothing
 * to offer" — both of which look like `options={[]}`. While it is true the control is
 * disabled and its trigger shows a skeleton, so a value restored from the server (here
 * `role: 'admin'`) never renders as a blank trigger just because its option has not landed
 * yet.
 */
export function AsyncOptionsExample() {
	const roles = useDelayedOptions(ROLES)
	const teams = useDelayedOptions(TEAMS)

	return (
		// The values an edit form would have loaded from the server, before its options exist.
		<Form defaultValues={{ role: 'admin', teamIds: ['engineering'] }}>
			{(form) => (
				<>
					<form.SelectField
						name='role'
						label='Role'
						description='Disabled, with a skeleton, until the list arrives.'
						placeholder='Pick a role'
						options={roles.data ?? []}
						loading={roles.isPending}
					/>
					<form.MultiSelectField
						name='teamIds'
						label='Teams'
						placeholder='Choose teams'
						options={teams.data ?? []}
						loading={teams.isPending}
					/>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}
