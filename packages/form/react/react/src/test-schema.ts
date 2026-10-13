import type { StandardSchemaV1 } from '@tanstack/form-core'

/** One issue a {@link testSchema} reports; `path` is relative to the value it was handed. */
export type TestIssue = { message: string; path?: readonly (string | number)[] }

/**
 * A Standard Schema built from a plain check — what a zod or valibot schema is to TanStack, without
 * a dependency this package does not have.
 */
export function testSchema<TValue>(check: (value: TValue) => readonly TestIssue[]): StandardSchemaV1<TValue> {
	return {
		'~standard': {
			version: 1,
			vendor: 'ez-kit-test',
			validate: (value: unknown) => {
				const issues = check(value as TValue)
				return issues.length > 0 ? { issues } : { value: value as TValue }
			},
		},
	}
}
