import { createCollectionSource } from '@ez-kit/query-react/collection'

import type {
	GridCreateContext,
	GridDeleteContext,
	GridDeleteManyContext,
	GridQueryParams,
	GridUpdateContext,
} from './types'
import type {
	CollectionFetcherConfig,
	CollectionOperation,
	GeneratedCollectionSource,
	InvalidationPolicy,
	MutationCapabilities,
} from '@ez-kit/query-react/collection'
import type { DefaultError, QueryKey } from '@tanstack/react-query'

export type GridCollectionParams = Omit<GridQueryParams, 'pagination'>

type CreateDataGridSource = <
	M extends MutationCapabilities,
	R extends { infinite?: unknown },
	A,
	D,
	Row extends object,
	C = never,
	E = DefaultError,
	CA = unknown,
	CD = unknown,
	CE = DefaultError,
	CO = unknown,
	UA = unknown,
	UD = unknown,
	UE = DefaultError,
	UO = unknown,
	DA = unknown,
	DD = unknown,
	DE = DefaultError,
	DO = unknown,
	BA = unknown,
	BD = unknown,
	BE = DefaultError,
	BO = unknown,
>(
	config: M & {
		key: QueryKey
		collection: R & CollectionFetcherConfig<GridCollectionParams, A, D, Row, C, E>
		create?: CollectionOperation<GridCreateContext<NoInfer<Row>>, CA, CD, CE, CO>
		update?: CollectionOperation<GridUpdateContext<NoInfer<Row>>, UA, UD, UE, UO>
		delete?: CollectionOperation<GridDeleteContext<NoInfer<Row>>, DA, DD, DE, DO>
		deleteMany?: CollectionOperation<GridDeleteManyContext<NoInfer<Row>>, BA, BD, BE, BO>
		invalidate?: InvalidationPolicy
		transformError?: (error: unknown) => unknown
	},
) => GeneratedCollectionSource<
	M,
	R,
	GridCollectionParams,
	D,
	Row,
	C,
	E,
	GridCreateContext<Row>,
	CD,
	CE,
	CO,
	GridUpdateContext<Row>,
	UD,
	UE,
	UO,
	GridDeleteContext<Row>,
	DD,
	DE,
	DO,
	GridDeleteManyContext<Row>,
	BD,
	BE,
	BO
>

/** Construct the same collection source with DataGrid's criteria and action inputs. */
export const createDataGridSource: CreateDataGridSource = createCollectionSource
