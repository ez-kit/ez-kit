import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` that lags behind by `delay` ms.
 * - `delay <= 0` makes the hook a pass-through (no timer, returns `value` directly).
 * - The returned value is stable across renders until the timer fires.
 *
 * @example
 * const debouncedQuery = useDebouncedValue(query, 250)
 * useEffect(() => { fetchResults(debouncedQuery) }, [debouncedQuery])
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value)

	useEffect(() => {
		if (delay <= 0) return undefined
		const handle = setTimeout(() => {
			setDebouncedValue(value)
		}, delay)
		return () => {
			clearTimeout(handle)
		}
	}, [value, delay])

	// When the user disables debouncing, return the live value directly so callers
	// don't see a stale debounced snapshot from a previous delay.
	return delay <= 0 ? value : debouncedValue
}
