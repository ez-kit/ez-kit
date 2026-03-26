type ClassValue = string | number | false | null | undefined | ClassValue[] | Record<string, boolean>

function appendToken(tokens: string[], value: ClassValue): void {
	if (!value) {
		return
	}

	if (typeof value === 'string' || typeof value === 'number') {
		tokens.push(String(value))
		return
	}

	if (Array.isArray(value)) {
		for (const nested of value) {
			appendToken(tokens, nested)
		}
		return
	}

	for (const [token, isEnabled] of Object.entries(value)) {
		if (isEnabled) {
			tokens.push(token)
		}
	}
}

export function cx(...values: ClassValue[]): string {
	const tokens: string[] = []

	for (const value of values) {
		appendToken(tokens, value)
	}

	return tokens.join(' ')
}

export function cssVar(name: string, value: string): Record<string, string> {
	const normalizedName = name.startsWith('--') ? name : `--${name}`
	return { [normalizedName]: value }
}
