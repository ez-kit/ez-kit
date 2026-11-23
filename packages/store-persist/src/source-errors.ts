/** Report only a mutation proven not to have committed. Other failures retain retryable intent. */
export class SourceMutationCancelledError extends Error {
	constructor(message = '[ez-kit/store-persist] Source mutation was cancelled before commit') {
		super(message)
		this.name = 'SourceMutationCancelledError'
	}
}
