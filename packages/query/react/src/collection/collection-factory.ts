import { normalizeCollectionSource, mutationNames } from './collection-source'

import type {
	CollectionFetcherConfig,
	CollectionReadInput,
	CollectionOperation,
	GeneratedCollectionSource,
	MutationCapabilities,
} from './collection-source'
import type { InvalidationPolicy } from './invalidation'
import type { DefaultError, QueryKey } from '@tanstack/react-query'

type ReadCapabilities = { infinite?: unknown }

type Defaults<P, A, D, I, C, E> = Omit<
	CollectionFetcherConfig<P, A, D, I, C, E>,
	'fetcher' | 'getItems' | 'getTotal' | 'prepareArgs'
> & {
	prepareArgs: (input: CollectionReadInput<P, NoInfer<C>>) => A
	getItems: (data: D) => readonly I[]
	getTotal?: (data: D) => number | undefined
}
type OperationDefaults<V, A> = {
	prepareArgs: (input: V) => A
	invalidate?: InvalidationPolicy
	transformError?: (error: unknown) => unknown
}
type OperationOverride<V, A, D, E, O, DefaultArgs> =
	| CollectionOperation<V, A, D, E, O>
	| ([DefaultArgs] extends [never]
			? never
			: [DefaultArgs] extends [A]
				? Partial<Extract<CollectionOperation<V, A, D, E, O>, { fetcher: unknown }>> & {
						fetcher: (args: A) => Promise<D>
					}
				: never)

function mergeOperation(defaults: object | undefined, value: object | undefined) {
	if (!value) return undefined
	return { ...defaults, ...value }
}

/** Reuse collection preparation and projection with resource-specific fetchers. */
export function createCollectionSourceFactory<
	R extends ReadCapabilities,
	A,
	D,
	I,
	P = void,
	C = never,
	E = DefaultError,
	CV = void,
	CA = never,
	UV = void,
	UA = never,
	DV = void,
	DA = never,
	BV = void,
	BA = never,
>(defaults: {
	collection: R & Defaults<P, A, D, I, C, E>
	create?: OperationDefaults<CV, CA>
	update?: OperationDefaults<UV, UA>
	delete?: OperationDefaults<DV, DA>
	deleteMany?: OperationDefaults<BV, BA>
}) {
	return function makeSource<
		M extends MutationCapabilities,
		Overrides extends ReadCapabilities,
		NCV = CV,
		NCA = CA,
		CD = unknown,
		CE = DefaultError,
		CO = unknown,
		NUV = UV,
		NUA = UA,
		UD = unknown,
		UE = DefaultError,
		UO = unknown,
		NDV = DV,
		NDA = DA,
		DD = unknown,
		DE = DefaultError,
		DO = unknown,
		NBV = BV,
		NBA = BA,
		BD = unknown,
		BE = DefaultError,
		BO = unknown,
	>(
		config: M & {
			key: QueryKey
			collection: Overrides & { fetcher: CollectionFetcherConfig<P, A, D, I, C, E>['fetcher'] } & Partial<
					Defaults<P, A, D, I, C, E>
				>
			create?: OperationOverride<NCV, NCA, CD, CE, CO, CA>
			update?: OperationOverride<NUV, NUA, UD, UE, UO, UA>
			delete?: OperationOverride<NDV, NDA, DD, DE, DO, DA>
			deleteMany?: OperationOverride<NBV, NBA, BD, BE, BO, BA>
			invalidate?: InvalidationPolicy
			transformError?: (error: unknown) => unknown
		},
	): GeneratedCollectionSource<
		M,
		R & Overrides,
		P,
		D,
		I,
		C,
		E,
		NCV,
		CD,
		CE,
		CO,
		NUV,
		UD,
		UE,
		UO,
		NDV,
		DD,
		DE,
		DO,
		NBV,
		BD,
		BE,
		BO
	> {
		const operations = Object.fromEntries(
			mutationNames.flatMap((name) => {
				const value = mergeOperation(defaults[name], config[name])
				return value ? [[name, value]] : []
			}),
		)
		const source = normalizeCollectionSource({
			...config,
			...operations,
			collection: { ...defaults.collection, ...config.collection },
		} as unknown as Parameters<typeof normalizeCollectionSource>[0])
		return source as GeneratedCollectionSource<
			M,
			R & Overrides,
			P,
			D,
			I,
			C,
			E,
			NCV,
			CD,
			CE,
			CO,
			NUV,
			UD,
			UE,
			UO,
			NDV,
			DD,
			DE,
			DO,
			NBV,
			BD,
			BE,
			BO
		>
	}
}
