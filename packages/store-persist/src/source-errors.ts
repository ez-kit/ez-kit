/** Internal signal: an explicit source cancellation requires reconciliation after its failed ACK settles. */
export class SourceMutationCancelledError extends Error {
	constructor(message = '[ez-kit/store-persist] Source mutation was cancelled before acknowledgement') {
		super(message)
		this.name = 'SourceMutationCancelledError'
	}
}
