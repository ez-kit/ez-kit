import { useCallback, useEffect, useRef, useState } from 'react'

import { useSafeLayoutEffect } from '../utils/use-safe-layout-effect'

import { filterInputCommands } from './filter-input-commands'

import type { FilterInputScope } from './filter-input-commands'

type Options<T> = {
	value: T
	onCommit: (value: T) => void
	debounce: number
	context?: unknown
	table?: { store: object } | undefined
	scope?: FilterInputScope | undefined
	read?: (() => T) | undefined
}

/** A trailing commit scheduled only by an edit. Commands can cancel even a same-value reset. */
export function useFilterInput<T>({ value, onCommit, debounce, context, table, scope, read }: Options<T>) {
	const [draft, setDraft] = useState(value)
	const [version, setVersion] = useState(0)
	const current = useRef({ value, onCommit, debounce, context, table, scope, read })
	current.current = { value, onCommit, debounce, context, table, scope, read }
	const owner = useRef({})
	const pending = useRef<{ value: T; timer: ReturnType<typeof setTimeout> } | undefined>(undefined)
	const echoes = useRef<T[]>([])
	const previous = useRef({ value, debounce, context })
	const cancel = useCallback(() => {
		if (pending.current) clearTimeout(pending.current.timer)
		pending.current = undefined
	}, [])
	const commit = useCallback((next: T) => {
		const options = current.current
		echoes.current.push(next)
		const write = () => {
			options.onCommit(next)
		}
		if (options.table && options.scope) filterInputCommands(options.table).run(options.scope, owner.current, write)
		else write()
	}, [])
	const onChange = useCallback(
		(next: T) => {
			cancel()
			setDraft(next)
			if (current.current.debounce <= 0) {
				commit(next)
				return
			}
			const edit = {
				value: next,
				timer: setTimeout(() => {
					if (pending.current !== edit) return
					pending.current = undefined
					commit(edit.value)
				}, current.current.debounce),
			}
			pending.current = edit
		},
		[cancel, commit],
	)

	useSafeLayoutEffect(() => {
		const old = previous.current
		previous.current = { value, debounce, context }
		const echo = echoes.current.findIndex((entry) => Object.is(entry, value))
		if (old.context !== context || (!Object.is(old.value, value) && echo === -1)) {
			cancel()
			echoes.current = []
			setDraft(value)
		} else if (echo !== -1) echoes.current.splice(0, echo + 1)
		if (old.debounce !== debounce && pending.current) {
			const next = pending.current.value
			cancel()
			if (debounce <= 0) commit(next)
			else onChange(next)
		}
	}, [value, debounce, context, cancel, commit, onChange])

	const axis = scope?.axis
	const id = scope?.axis === 'columnFilters' ? scope.id : undefined
	const source = table ? filterInputCommands(table) : undefined
	useSafeLayoutEffect(() => {
		if (!source || !axis) return undefined
		const subscribed: FilterInputScope =
			axis === 'columnFilters' ? { axis, ...(id !== undefined ? { id } : {}) } : { axis }
		return source.subscribe(subscribed, (phase, origin) => {
			if (origin === owner.current) return
			cancel()
			echoes.current = []
			if (phase === 'after') {
				setDraft(current.current.read ? current.current.read() : current.current.value)
				setVersion((previous) => previous + 1)
			}
		})
	}, [source, axis, id, cancel])
	useEffect(() => cancel, [cancel])
	return { value: draft, onChange, version }
}
