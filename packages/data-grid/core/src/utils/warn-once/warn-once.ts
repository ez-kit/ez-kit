const warnedMessages = new Set<string>()

/**
 * `console.warn`, at most once per distinct message for the lifetime of the module.
 *
 * For development warnings raised from code that re-runs on every render — `createTableOptions`
 * and the column mapper both do, because `useTable` rebuilds the options each time — where the
 * same misconfiguration would otherwise be reported again on every keystroke.
 */
export function warnOnce(message: string): void {
	if (warnedMessages.has(message)) return
	warnedMessages.add(message)
	console.warn(message)
}
