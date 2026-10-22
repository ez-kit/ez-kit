/**
 * The Standard Schema v1 interface (https://standardschema.dev), copied rather than imported.
 *
 * The specification asks libraries that accept a schema to do exactly this: the interface is a
 * stable, versioned contract, and copying it keeps `@standard-schema/spec` out of the dependency
 * tree and out of the published `index.d.ts`. zod, valibot, arktype and every other implementer
 * satisfy it by structure, so `validate: { schema }` type-checks against any of them with no
 * import of any of them.
 *
 * Written as flat `type` aliases instead of the upstream `interface` + `namespace` pair, which
 * this repo's lint config rejects; the shapes are member-for-member the same.
 */
export type StandardSchemaV1<Input = unknown, Output = Input> = {
	readonly '~standard': StandardSchemaV1Props<Input, Output>
}

/** The `~standard` property every Standard Schema carries. */
export type StandardSchemaV1Props<Input = unknown, Output = Input> = {
	/** Version of the Standard Schema specification. */
	readonly version: 1
	/** The library that created the schema. */
	readonly vendor: string
	/** Validates an unknown input. May answer synchronously or with a promise. */
	readonly validate: (value: unknown) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>
	/** Inferred types of the schema. Type-level only — never read at runtime. */
	readonly types?: StandardSchemaV1Types<Input, Output> | undefined
}

/** What `validate` answers: the parsed value, or the issues that stopped it. */
export type StandardSchemaV1Result<Output> = StandardSchemaV1SuccessResult<Output> | StandardSchemaV1FailureResult

export type StandardSchemaV1SuccessResult<Output> = {
	readonly value: Output
	readonly issues?: undefined
}

export type StandardSchemaV1FailureResult = {
	readonly issues: readonly StandardSchemaV1Issue[]
}

/** One problem a schema reported. An issue with no `path` concerns the value as a whole. */
export type StandardSchemaV1Issue = {
	readonly message: string
	readonly path?: readonly (PropertyKey | StandardSchemaV1PathSegment)[] | undefined
}

/** A path segment in its object form — some libraries report `{ key }` rather than the bare key. */
export type StandardSchemaV1PathSegment = {
	readonly key: PropertyKey
}

export type StandardSchemaV1Types<Input = unknown, Output = Input> = {
	readonly input: Input
	readonly output: Output
}
