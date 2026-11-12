export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly payload: unknown,
	) {
		super(`Request failed (${String(status)})`)
	}
}
export async function apiFetch<T>(url: string, options: RequestInit): Promise<T> {
	const response = await fetch(url, options)
	const text = response.status === 204 ? '' : await response.text()
	let payload: unknown = text
	if (text) {
		try {
			payload = JSON.parse(text)
		} catch {
			/* Preserve non-JSON error responses. */
		}
	}
	if (!response.ok) throw new ApiError(response.status, payload)
	// OpenAPI types describe the server contract; they do not validate responses.
	return (response.status === 204 ? undefined : payload) as T
}
