/** The example's rows and the option lists its select / badge columns are built from. */

export type Member = {
	id: number
	name: string
	email: string
	country: string
	role: string
	joined: string
	status: 'approved' | 'pending' | 'inactive' | 'blocked'
}

export const INITIAL_MEMBERS: Member[] = [
	{
		id: 1,
		name: 'Alex Johnson',
		email: 'alex@apple.com',
		country: 'United States',
		role: 'CEO',
		joined: '2024-01-12',
		status: 'approved',
	},
	{
		id: 2,
		name: 'Sarah Chen',
		email: 'sarah@openai.com',
		country: 'United Kingdom',
		role: 'CTO',
		joined: '2023-03-08',
		status: 'inactive',
	},
	{
		id: 3,
		name: 'Nick Johnson',
		email: 'nick@ivmh.fr',
		country: 'France',
		role: 'Data Scientist',
		joined: '2022-04-19',
		status: 'pending',
	},
	{
		id: 4,
		name: 'Michael Rodriguez',
		email: 'michael@meta.com',
		country: 'Canada',
		role: 'Designer',
		joined: '2022-06-02',
		status: 'blocked',
	},
	{
		id: 5,
		name: 'Maria Garcia',
		email: 'maria@sony.jp',
		country: 'Japan',
		role: 'Marketing Lead',
		joined: '2023-12-11',
		status: 'blocked',
	},
	{
		id: 6,
		name: 'Emma Wilson',
		email: 'emma@tesla.com',
		country: 'Australia',
		role: 'Developer',
		joined: '2024-09-05',
		status: 'inactive',
	},
	{
		id: 7,
		name: 'David Kim',
		email: 'david@sap.com',
		country: 'Germany',
		role: 'Lawyer',
		joined: '2023-11-27',
		status: 'approved',
	},
	{
		id: 8,
		name: 'Aron Thompson',
		email: 'aron@keenthemes.com',
		country: 'Malaysia',
		role: 'Director',
		joined: '2022-02-16',
		status: 'pending',
	},
	{
		id: 9,
		name: 'James Brown',
		email: 'james@bbva.es',
		country: 'Spain',
		role: 'Product Manager',
		joined: '2024-08-23',
		status: 'inactive',
	},
	{
		id: 10,
		name: 'Lena Novak',
		email: 'lena@spotify.com',
		country: 'Sweden',
		role: 'Data Scientist',
		joined: '2023-05-30',
		status: 'approved',
	},
	{
		id: 11,
		name: 'Marco Rossi',
		email: 'marco@ferrari.it',
		country: 'Italy',
		role: 'Designer',
		joined: '2021-10-04',
		status: 'approved',
	},
	{
		id: 12,
		name: 'Priya Nair',
		email: 'priya@tata.in',
		country: 'India',
		role: 'Sales Manager',
		joined: '2024-04-15',
		status: 'pending',
	},
]

/** Emoji rather than flag images, so the example renders the same offline as it does in CI. */
const FLAGS: Record<string, string> = {
	Australia: '🇦🇺',
	Canada: '🇨🇦',
	France: '🇫🇷',
	Germany: '🇩🇪',
	India: '🇮🇳',
	Italy: '🇮🇹',
	Japan: '🇯🇵',
	Malaysia: '🇲🇾',
	Spain: '🇪🇸',
	Sweden: '🇸🇪',
	'United Kingdom': '🇬🇧',
	'United States': '🇺🇸',
}

export const COUNTRY_ITEMS = Object.keys(FLAGS).map((country) => ({
	value: country,
	// Two non-breaking spaces: a flag emoji is drawn edge to edge in its cell, so one space —
	// which the select cell's own text node would also collapse — leaves the pair glued.
	label: `${FLAGS[country] ?? ''}\u00a0\u00a0${country}`,
}))

export const ROLE_ITEMS = [
	'CEO',
	'CTO',
	'Data Scientist',
	'Designer',
	'Developer',
	'Director',
	'Lawyer',
	'Marketing Lead',
	'Product Manager',
	'Sales Manager',
].map((role) => ({ value: role, label: role }))

export const STATUS_ITEMS = [
	{ value: 'approved', label: 'Approved', variant: 'outline' as const },
	{ value: 'pending', label: 'Pending', variant: 'outline' as const },
	{ value: 'inactive', label: 'Inactive', variant: 'outline' as const },
	{ value: 'blocked', label: 'Blocked', variant: 'outline' as const },
]
