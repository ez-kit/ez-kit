'use client'

import { useCallback, useState } from 'react'

export interface Employee {
	id: number
	name: string
	department: string
	role: string
	salary: number
	startDate: string
	active: boolean
}

const INITIAL_EMPLOYEES: Employee[] = [
	{ id: 1,  name: 'Alice Johnson',  department: 'Engineering', role: 'Senior Engineer',   salary: 120000, startDate: '2019-03-15', active: true },
	{ id: 2,  name: 'Bob Smith',      department: 'Marketing',   role: 'Marketing Manager', salary: 95000,  startDate: '2020-07-01', active: true },
	{ id: 3,  name: 'Carol White',    department: 'Engineering', role: 'Tech Lead',         salary: 145000, startDate: '2018-11-20', active: true },
	{ id: 4,  name: 'Dave Brown',     department: 'Sales',       role: 'Sales Rep',         salary: 72000,  startDate: '2022-01-10', active: true },
	{ id: 5,  name: 'Eve Davis',      department: 'Engineering', role: 'Engineer',          salary: 105000, startDate: '2021-08-05', active: true },
	{ id: 6,  name: 'Frank Lee',      department: 'Marketing',   role: 'Content Writer',    salary: 68000,  startDate: '2023-04-18', active: false },
	{ id: 7,  name: 'Grace Kim',      department: 'Sales',       role: 'Account Executive', salary: 88000,  startDate: '2020-12-30', active: true },
	{ id: 8,  name: 'Hank Patel',     department: 'Engineering', role: 'Principal Engineer',salary: 165000, startDate: '2017-06-25', active: true },
	{ id: 9,  name: 'Iris Chen',      department: 'HR',          role: 'HR Specialist',     salary: 78000,  startDate: '2021-02-14', active: true },
	{ id: 10, name: 'Jake Wilson',    department: 'Finance',     role: 'Financial Analyst', salary: 92000,  startDate: '2019-09-03', active: false },
	{ id: 11, name: 'Karen Martinez', department: 'Engineering', role: 'QA Engineer',       salary: 85000,  startDate: '2022-06-20', active: true },
	{ id: 12, name: 'Leo Thompson',   department: 'Sales',       role: 'Sales Manager',     salary: 110000, startDate: '2018-04-11', active: true },
	{ id: 13, name: 'Mia Anderson',   department: 'Design',      role: 'UI Designer',       salary: 95000,  startDate: '2021-10-07', active: true },
	{ id: 14, name: 'Noah Garcia',    department: 'Finance',     role: 'CFO',               salary: 190000, startDate: '2016-01-15', active: true },
	{ id: 15, name: 'Olivia Taylor',  department: 'Design',      role: 'Design Lead',       salary: 125000, startDate: '2020-03-22', active: false },
]

let nextId = INITIAL_EMPLOYEES.length + 1

export function useEmployeeStore() {
	const [data, setData] = useState<Employee[]>(INITIAL_EMPLOYEES)

	const add = useCallback((values: Partial<Employee>): boolean => {
		const employee: Employee = {
			id: nextId++,
			name: values.name ?? '',
			department: values.department ?? 'Engineering',
			role: values.role ?? '',
			salary: values.salary ?? 0,
			startDate: values.startDate ?? new Date().toISOString().slice(0, 10),
			active: values.active ?? true,
		}
		setData((prev) => [...prev, employee])
		return true
	}, [])

	const update = useCallback((id: number, values: Partial<Employee>): boolean => {
		setData((prev) =>
			prev.map((emp) => (emp.id === id ? { ...emp, ...values } : emp)),
		)
		return true
	}, [])

	const remove = useCallback((id: number) => {
		setData((prev) => prev.filter((emp) => emp.id !== id))
	}, [])

	const removeMany = useCallback((ids: number[]) => {
		const idSet = new Set(ids)
		setData((prev) => prev.filter((emp) => !idSet.has(emp.id)))
	}, [])

	return { data, add, update, remove, removeMany }
}
