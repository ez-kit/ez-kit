import { useCollectionMutation } from '@ez-kit/query-react/collection'

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
	const mutation = useCollectionMutation(source, inheritedInvalidation)
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
