import { createColumns } from '@ez-kit/data-grid-react'

import { COUNTRY_ITEMS, ROLE_ITEMS, STATUS_ITEMS, type Member } from './data'

const USER_CELL_STYLE = {
	display: 'flex',
	alignItems: 'center',
	gap: '0.625rem',
	minWidth: 0,
}

const AVATAR_STYLE = {
	display: 'grid',
	placeItems: 'center',
	width: '2rem',
	height: '2rem',
	flexShrink: 0,
	borderRadius: '9999px',
	background: 'color-mix(in oklab, currentColor 10%, transparent)',
	fontSize: '0.6875rem',
	fontWeight: 600,
}

const USER_TEXT_STYLE = {
	minWidth: 0,
	lineHeight: 1.3,
}

const USER_EMAIL_STYLE = {
	fontSize: '0.8125rem',
	opacity: 0.6,
	overflow: 'hidden',
	textOverflow: 'ellipsis',
	whiteSpace: 'nowrap' as const,
}

function initials(name: string): string {
	return name
		.split(' ')
		.map((part) => part[0] ?? '')
		.join('')
		.slice(0, 2)
}

export const columns = createColumns<Member>([
	{
		accessorKey: 'name',
		header: 'User',
		width: 260,
		// Avatar beside a two-line label: one column's editorial decision, which is what
		// `cell.component` is for. The edit and create forms still get a plain text field for
		// `name`, because the slot replaces the *view*, not the editor.
		cell: {
			component: ({ row }) => (
				<div style={USER_CELL_STYLE}>
					<span
						style={AVATAR_STYLE}
						aria-hidden='true'
					>
						{initials(row.name)}
					</span>
					<span style={USER_TEXT_STYLE}>
						<div>{row.name}</div>
						<div style={USER_EMAIL_STYLE}>{row.email}</div>
					</span>
				</div>
			),
		},
		filtering: false,
	},
	{
		accessorKey: 'email',
		header: 'Email',
		width: 220,
		// Carried for the create / edit form and the search index, hidden in the table because
		// the User cell already prints it.
		visibility: { initialHidden: true },
		filtering: false,
	},
	{
		accessorKey: 'country',
		header: 'Location',
		width: 180,
		cell: { type: 'select', config: { items: COUNTRY_ITEMS } },
		filtering: { operators: { items: ['in'] } },
	},
	{
		accessorKey: 'role',
		header: 'Role',
		width: 170,
		cell: { type: 'select', config: { items: ROLE_ITEMS } },
		filtering: { operators: { items: ['in'] } },
	},
	{
		accessorKey: 'joined',
		header: 'Joined',
		width: 140,
		cell: { type: 'date', config: { format: { month: 'short', year: 'numeric' } } },
		filtering: { operators: { items: ['between'] }, defaultOperator: 'between' },
	},
	{
		accessorKey: 'status',
		header: 'Status',
		width: 140,
		cell: { type: 'badge', config: { items: STATUS_ITEMS } },
		filtering: { operators: { items: ['in'] } },
	},
])
