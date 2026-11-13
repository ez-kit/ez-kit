export default {
	users: {
		input: './openapi.json',
		output: {
			target: './generated/users.ts',
			client: 'fetch',
			mode: 'single',
			clean: true,
			override: {
				fetch: { includeHttpResponseReturnType: false },
				mutator: { path: './transport.ts', name: 'apiFetch' },
			},
		},
	},
}
