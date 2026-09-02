'use client'

import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

type Employee = {
	id: number
	name: string
	role: string
	department: string
	email: string
	bio: string
	location: string
	startDate: string
}

const EMPLOYEES: Employee[] = [
	{
		id: 1,
		name: 'Alice Johnson',
		role: 'Senior Engineer',
		department: 'Engineering',
		email: 'alice@example.com',
		bio: 'Full-stack engineer with 8 years of experience in React and Node.js.',
		location: 'San Francisco, CA',
		startDate: '2018-03-12',
	},
	{
		id: 2,
		name: 'Bob Smith',
		role: 'Product Manager',
		department: 'Product',
		email: 'bob@example.com',
		bio: 'Product leader focused on developer tools and platform products.',
		location: 'New York, NY',
		startDate: '2020-07-01',
	},
	{
		id: 3,
		name: 'Carol White',
		role: 'Designer',
		department: 'Design',
		email: 'carol@example.com',
		bio: 'UX designer specialising in data-dense interfaces and design systems.',
		location: 'Austin, TX',
		startDate: '2021-01-15',
	},
	{
		id: 4,
		name: 'Dave Brown',
		role: 'Data Analyst',
		department: 'Analytics',
		email: 'dave@example.com',
		bio: 'Transforms raw data into actionable insights using SQL and Python.',
		location: 'Seattle, WA',
		startDate: '2019-11-05',
	},
	{
		id: 5,
		name: 'Eve Davis',
		role: 'DevOps Engineer',
		department: 'Infrastructure',
		email: 'eve@example.com',
		bio: 'Kubernetes enthusiast maintaining cloud infrastructure at scale.',
		location: 'Chicago, IL',
		startDate: '2022-04-20',
	},
]

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
	{ accessorKey: 'department', header: 'Department' },
])

export function ExpandingSubContentExample() {
	return (
		<DataGrid
			data={EMPLOYEES}
			columns={columns}
			expanding={{
				component: ({ row }) => {
					const emp = row.original
					return (
						<div className='gap-8 flex-wrap flex'>
							<div>
								<div className='mb-1 font-semibold'>Contact</div>
								<div>{emp.email}</div>
								<div>{emp.location}</div>
							</div>
							<div>
								<div className='mb-1 font-semibold'>Start Date</div>
								<div>{emp.startDate}</div>
							</div>
							<div className='flex-1'>
								<div className='mb-1 font-semibold'>Bio</div>
								<div className='text-muted-foreground'>{emp.bio}</div>
							</div>
						</div>
					)
				},
			}}
		/>
	)
}
