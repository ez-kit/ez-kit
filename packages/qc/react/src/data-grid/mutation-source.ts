import { useMutation, useQueryClient } from '@tanstack/react-query'

import { resolveInvalidation } from './invalidation'

import type { InvalidationPolicy } from './invalidation'
import type { DefaultError, InvalidateQueryFilters, UseMutationOptions } from '@tanstack/react-query'

export type GridMutationSource<TInput, TVariables, TResult, TError = DefaultError, TOptimistic = unknown> = {
	mutation: UseMutationOptions<TResult, TError, TVariables, TOptimistic>
	prepareArgs: (input: TInput) => NoInfer<TVariables>
	invalidate?: InvalidationPolicy
	transformError?: (error: unknown) => unknown
}

/** Native mutation callbacks outlive the form observer; per-call callbacks would not. */
export function useGridMutation<TInput, TVariables, TResult, TError = DefaultError, TOptimistic = unknown>(
	source: GridMutationSource<TInput, TVariables, TResult, TError, TOptimistic>,
	inheritedInvalidation: readonly InvalidateQueryFilters[],
	transformError?: (error: unknown) => unknown,
) {
	const client = useQueryClient()
	const filters = resolveInvalidation(inheritedInvalidation, source.invalidate)
	const mutation = useMutation({
		...source.mutation,
		onSuccess: async (...args) => {
			try {
				await source.mutation.onSuccess?.(...args)
			} finally {
				// Query's own state reports refetch errors. A failed refresh cannot undo persistence.
				for (const filter of filters) {
					try {
						void client.invalidateQueries(filter).catch(() => undefined)
					} catch {
						// A user predicate can throw before Query returns a promise. Keep
						// persistence successful and let the remaining cache families refresh.
					}
				}
			}
		},
	})
	return {
		mutation,
		execute: async (input: TInput): Promise<void> => {
			try {
				await mutation.mutateAsync(source.prepareArgs(input))
			} catch (error) {
				throw (source.transformError ?? transformError)?.(error) ?? error
			}
		},
	}
}
