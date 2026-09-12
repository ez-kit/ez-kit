'use client'

import { INITIAL_EMPLOYEES, type Employee } from './use-employee-store'

const LATENCY_MS = 600

/** The server's own copy of the table — the thing the grid is *not* allowed to assume. */
let table: Employee[] = [...INITIAL_EMPLOYEES]
let nextId = INITIAL_EMPLOYEES.length + 1

/** Flipped by the example's checkbox so every write can be made to fail on demand. */
let shouldFailWrites = false

export function setShouldFailWrites(value: boolean): void {
	shouldFailWrites = value
}

export function resetServer(): void {
	table = [...INITIAL_EMPLOYEES]
	nextId = INITIAL_EMPLOYEES.length + 1
}

function latency(signal?: AbortSignal): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const timer = setTimeout(resolve, LATENCY_MS)
		signal?.addEventListener('abort', () => {
			clearTimeout(timer)
			reject(new Error('Request aborted'))
		})
	})
}

async function write<T>(signal: AbortSignal | undefined, run: () => T): Promise<T> {
	await latency(signal)
	if (shouldFailWrites) throw new Error('500 Internal Server Error')
	return run()
}

export const api = {
	list: async (): Promise<Employee[]> => {
		await latency()
		return [...table]
	},

	create: (values: Partial<Employee>, signal?: AbortSignal): Promise<Employee> =>
		write(signal, () => {
			// The id is the server's to hand out — the optimistic row carries a placeholder.
			const created: Employee = {
				id: nextId++,
				name: values.name ?? '',
				department: values.department ?? 'Engineering',
				role: values.role ?? '',
				salary: values.salary ?? 0,
				startDate: values.startDate ?? new Date().toISOString().slice(0, 10),
				active: values.active ?? true,
			}
			table = [...table, created]
			return created
		}),

	update: (id: number, patch: Partial<Employee>, signal?: AbortSignal): Promise<Employee> =>
		write(signal, () => {
			const current = table.find((employee) => employee.id === id)
			if (!current) throw new Error(`404 Not Found: employee ${String(id)}`)
			const updated: Employee = { ...current, ...patch, id }
			table = table.map((employee) => (employee.id === id ? updated : employee))
			return updated
		}),

	delete: (ids: number[], signal?: AbortSignal): Promise<void> =>
		write(signal, () => {
			const removed = new Set(ids)
			table = table.filter((employee) => !removed.has(employee.id))
		}),
}
