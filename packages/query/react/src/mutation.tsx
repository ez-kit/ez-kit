'use client'

import { useMutation } from '@tanstack/react-query'

import type { DefaultError, UseMutationOptions, UseMutationResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export type MutationProps<TData = unknown, TError = DefaultError, TVariables = void, TOnMutateResult = unknown> = {
	/** Native useMutation options, including callbacks and throwOnError. */
	mutation: UseMutationOptions<TData, TError, TVariables, TOnMutateResult>
	/** Receives the unchanged useMutation result in every state. Types come from mutation. */
	children: (
		m: UseMutationResult<NoInfer<TData>, NoInfer<TError>, NoInfer<TVariables>, NoInfer<TOnMutateResult>>,
	) => ReactNode
}

/** Keeps the mutation subscription local while leaving its UI mounted in every state. */
export function Mutation<TData = unknown, TError = DefaultError, TVariables = void, TOnMutateResult = unknown>({
	mutation,
	children,
}: MutationProps<TData, TError, TVariables, TOnMutateResult>): ReactNode {
	const m = useMutation(mutation)
	return children(m)
}
