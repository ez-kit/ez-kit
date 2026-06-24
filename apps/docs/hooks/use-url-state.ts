'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'

/** Namespace for the `localStorage` mirror keys so docs state never collides with app state. */
const STORAGE_KEY_PREFIX = 'ez-docs:url-state:'

type UseUrlStateOptions<T extends string> = {
	/**
	 * Closed set of valid values. Reads outside this set (tampered URL, stale
	 * storage) fall back to `defaultValue`. Pass a stable reference (module-level
	 * constant) — it is memoised by identity.
	 */
	allowedValues: readonly T[]
	/** Value used when neither the URL nor storage hold a valid entry. */
	defaultValue: T
	/**
	 * Mirror the value to `localStorage` so it survives client-side navigations
	 * that drop the query string (e.g. doc-to-doc nav links). Defaults to `true`.
	 */
	persistAcrossNavigation?: boolean
}

function readStorage(key: string, allowed: ReadonlySet<string>): string | null {
	if (typeof window === 'undefined') return null
	try {
		const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`)
		return raw !== null && allowed.has(raw) ? raw : null
	} catch {
		return null
	}
}

function writeStorage(key: string, value: string): void {
	if (typeof window === 'undefined') return
	try {
		window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, value)
	} catch {
		// Ignore quota / private-mode errors — the URL stays the source of truth.
	}
}

/**
 * Two-way bind a string-union value to a URL search param, mirrored to
 * `localStorage`.
 *
 * The URL is the source of truth: SSR-safe (no hydration mismatch), shareable,
 * and survives a reload. The storage mirror re-applies the last choice to the
 * URL after a client-side navigation strips the query string, so every consumer
 * of the same `key` across pages agrees on one value.
 *
 * @returns a `[value, setValue]` tuple, like `useState`.
 */
export function useUrlState<T extends string>(
	key: string,
	{ allowedValues, defaultValue, persistAcrossNavigation = true }: UseUrlStateOptions<T>,
): readonly [T, (next: T) => void] {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	const allowed = useMemo(() => new Set<string>(allowedValues), [allowedValues])
	// Depend on the serialized form, not the object identity, to avoid effect churn.
	const search = searchParams.toString()
	const fromUrl = searchParams.get(key)
	const value: T = fromUrl !== null && allowed.has(fromUrl) ? (fromUrl as T) : defaultValue

	const setValue = useCallback(
		(next: T) => {
			const params = new URLSearchParams(search)
			params.set(key, next)
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
			if (persistAcrossNavigation) writeStorage(key, next)
		},
		[key, pathname, persistAcrossNavigation, router, search],
	)

	// After a client-side navigation the query string is gone. Re-apply the last
	// stored choice to the URL so the new page renders in the same value.
	useEffect(() => {
		if (!persistAcrossNavigation) return

		if (fromUrl !== null && allowed.has(fromUrl)) {
			writeStorage(key, fromUrl) // keep storage aligned with manual URL edits
			return
		}

		const stored = readStorage(key, allowed)
		if (stored !== null && stored !== defaultValue) {
			const params = new URLSearchParams(search)
			params.set(key, stored)
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
		}
	}, [allowed, defaultValue, fromUrl, key, pathname, persistAcrossNavigation, router, search])

	return [value, setValue] as const
}
