/** Input invalidation is an imperative command, including when the stored value is unchanged. */
export type FilterInputScope = { axis: 'columnFilters'; id?: string } | { axis: 'globalFilter' }

type Listener = (phase: 'before' | 'after', origin: object | undefined) => void
type ScopeListener = { scope: FilterInputScope; notify: Listener }
type CommandTable = {
	store: object
	setOptions: (update: (prev: Record<string, unknown>) => Record<string, unknown>) => void
	reset: () => void
	getAllFlatColumns: () => { id: string; setFilterValue?: (value: unknown) => void }[]
}

function matches(scope: FilterInputScope | undefined, input: FilterInputScope): boolean {
	return (
		scope === undefined ||
		(scope.axis === input.axis &&
			(scope.axis !== 'columnFilters' ||
				scope.id === undefined ||
				(input.axis === 'columnFilters' && scope.id === input.id)))
	)
}

function createCommands() {
	const listeners = new Set<ScopeListener>()
	const columns = new WeakSet()
	let context: { scope: FilterInputScope; origin: object | undefined } | undefined
	let wired = false
	let reset: (() => void) | undefined
	return {
		subscribe(scope: FilterInputScope, notify: Listener) {
			const listener = { scope, notify }
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		run<T>(scope: FilterInputScope, origin: object | undefined, action: () => T): T {
			const previous = context
			context = { scope, origin: origin ?? previous?.origin }
			try {
				return action()
			} finally {
				context = previous
			}
		},
		replace<T>(scope: FilterInputScope | undefined, action: () => T): T {
			const effective = scope && context?.scope.axis === scope.axis ? context.scope : scope
			const origin = scope === undefined ? undefined : context?.origin
			const affected = [...listeners].filter((listener) => matches(effective, listener.scope))
			for (const listener of affected) listener.notify('before', origin)
			// A consumer callback may issue another command; it must not inherit this input's scope.
			const previous = context
			context = undefined
			try {
				return action()
			} finally {
				context = previous
				for (const listener of affected) listener.notify('after', origin)
			}
		},
		wire(table: CommandTable) {
			if (!wired) {
				table.setOptions((prev) => {
					const next = { ...prev }
					for (const [key, axis] of [
						['onColumnFiltersChange', 'columnFilters'],
						['onGlobalFilterChange', 'globalFilter'],
					] as const) {
						const writer = prev[key] as ((value: unknown) => void) | undefined
						if (writer)
							next[key] = (value: unknown) => {
								this.replace({ axis }, () => {
									writer(value)
								})
							}
					}
					return next
				})
				const original = table.reset
				reset = () => {
					this.replace(undefined, () => {
						original.call(table)
					})
				}
				wired = true
			}
			// useTable returns a new view on each render; retain the same forwarding function.
			if (reset) table.reset = reset
			for (const column of table.getAllFlatColumns()) {
				if (columns.has(column) || !column.setFilterValue) continue
				columns.add(column)
				const original = column.setFilterValue
				column.setFilterValue = (value) => {
					this.run({ axis: 'columnFilters', id: column.id }, undefined, () => {
						original.call(column, value)
					})
				}
			}
		},
	}
}

const sources = new WeakMap<object, ReturnType<typeof createCommands>>()

/** Keyed by the stable store, not useTable's per-render object. Never part of table state. */
export function filterInputCommands(table: { store: object }) {
	let source = sources.get(table.store)
	if (!source) {
		source = createCommands()
		sources.set(table.store, source)
	}
	return source
}

export function wireFilterInputCommands(table: object): void {
	const target = table as CommandTable
	filterInputCommands(target).wire(target)
}
