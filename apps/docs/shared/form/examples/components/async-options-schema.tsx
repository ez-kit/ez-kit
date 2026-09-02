'use client'

import { FormOptionSources } from '@ez-kit/form-react'
import { useEffect, useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

import type { OptionSourceRegistry } from '@ez-kit/form-react'

type Assignment = {
	role: string
	teamIds: string[]
}

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
 * Stands in for a real query, exactly as `components/async-options.tsx` does. The list is
 * baked into the source itself rather than passed in as a parameter — a document cannot hold
 * a list of options as an argument to a source the way a JSX example can close over a prop.
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

function useRolesSource(): { options: Options; loading: boolean } {
	const { data, isPending } = useDelayedOptions(ROLES)
	return { options: data ?? [], loading: isPending }
}

function useTeamsSource(): { options: Options; loading: boolean } {
	const { data, isPending } = useDelayedOptions(TEAMS)
	return { options: data ?? [], loading: isPending }
}

/** Hoisted to a module constant: a registry rebuilt each render would swap hook identities. */
const optionSources: OptionSourceRegistry = { roles: useRolesSource, teams: useTeamsSource }

const schema = defineFormSchema<Assignment>()({
	version: 1,
	children: [
		{
			type: FormFieldType.Select,
			name: 'role',
			label: 'Role',
			description: 'Disabled, with a skeleton, until the list arrives.',
			placeholder: 'Pick a role',
			optionsFrom: 'roles',
			defaultValue: 'admin',
		},
		{
			type: FormFieldType.MultiSelect,
			name: 'teamIds',
			label: 'Teams',
			placeholder: 'Choose teams',
			optionsFrom: 'teams',
			defaultValue: ['engineering'],
		},
		{ type: 'submit', label: 'Save' },
	],
})

/**
 * The document twin of `components/async-options.tsx` — same delay, same "disabled with a
 * skeleton until the list lands" behaviour, same values restored before their options exist.
 *
 * It is not the same *mechanism*, though: the JSX example passes a `loading` prop straight to
 * `form.SelectField`, but `loading` is not a key `SelectMember` accepts in
 * `packages/form/core/src/schema.ts` — a document has no field-level "this is fetching" flag
 * to set by hand. Here the pending state comes from `optionsFrom` instead: `useRolesSource`
 * and `useTeamsSource` are ordinary sources that happen to report `loading: true` while their
 * delayed data has not arrived, and the renderer forwards that straight through — the same
 * mechanism `components/option-sources.tsx` uses for its cascade, just with no `dependsOn`
 * because neither list needs one.
 */
export function AsyncOptionsSchemaExample() {
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<FormOptionSources value={optionSources}>
			<div className='flex flex-col gap-4'>
				<FormRenderer
					schema={schema}
					onSubmit={({ value }) => {
						setSaved(JSON.stringify(value, null, 2))
					}}
				/>

				{saved === null ? null : <pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{saved}</pre>}
			</div>
		</FormOptionSources>
	)
}
