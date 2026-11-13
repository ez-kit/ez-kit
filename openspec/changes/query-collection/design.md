# Design

## Context

See proposal.md for motivation. `qc/react/src/data-grid/with-query.tsx` currently owns both Query observers and table publication, applied criteria, pagination correction and event wiring. `mutation-source.ts` prepares inputs before calling a native mutation and returns `Promise<void>` from execute. List/infinite sources and factory types depend on grid parameter types.

The existing query-react package provides thin native-result gates and has a 550 B root bundle budget. ADRs 0022 and 0027 prohibit replacing native result vocabulary or introducing another data context. ADRs 0028–0030 require preserved grid typing, table-owned parameters, native lifecycle, non-blocking invalidation and independent modal/mutation lifetime. These constraints remain; only ownership of generic execution changes.

## Goals / Non-Goals

**Goals:** One collection execution implementation shared by ordinary lists and grids, arbitrary typed parameters and independent mutation types, preservation of existing grid behavior, and consumer examples that compile against real exports.

**Non-Goals:** A second cache or parameter store, UI rendering in query-react, automatic optimistic updates, mutation-only sources, useCollectionState, arbitrary dynamic mutation registries, alternative query engines, updateMany UI or a new code generator.

## Decisions

### D1 — Durable: Separate collection subpath and dependency direction

Expose collection helpers through `@ez-kit/query-react/collection`, with its own tsup entry, declaration output and measured size budget. Do not re-export them from the gate entry initially. qc-react consumes query-react as a workspace runtime dependency, externalized from its bundle; React and TanStack remain peers. No dependency points from query-react to qc-react or data-grid.

Alternative: putting generic execution in qc-react retains the accidental grid association; placing everything in the gate entry changes its size baseline. A new package is unnecessary.

### D2 — Durable: Source description and hook contract

`createCollectionSource` accepts a required base key for generated fetcher sources, one or both reads, optional fixed CRUD operations and invalidation policy. `createCollectionSourceFactory` supplies shared preparation, projection and native option defaults; explicit entity specialization is allowed when generic inference cannot retain the entity. Preserve per-operation override and whole-options replacement semantics from the existing factory.

Normalize fetcher descriptions to native query/mutation options. Also support native read descriptors (`query`, `getItems`, optional `getTotal`) and native mutation descriptors (`mutation`), preserving keys and variables. Native sources supply explicit invalidation scope rather than an invented prefix. Use disjoint native/fetcher descriptor branches; a native mutation has no additional collection-level prepareArgs. Its variables already define its public input.

`useCollectionQuery({ source, params, mode })` accepts mode 'pages' or 'infinite' explicitly. Each mode infers its own parameter type from its read descriptor. At least one read must exist. The result contains `mode`, `items`, `total` (number or undefined), the native active `query`, and only the configured mutation properties. Narrowing result.mode narrows query. Infinite total is undefined in the first scope; applications retain full native page data for custom metadata.

All params are opaque to the hook. It never decides that a field is a page, filter or tenant. Query identity comes from prepared business arguments; applications must include all response-affecting context there or in the base key. No unconditional invalidation on source object identity changes.

Alternative: fixing params to GridQueryParams excludes ordinary application conventions. Requiring one params type for both reads leaks pageIndex into infinite collections.

### D3 — Durable: Mutation input is the public variables type

For new fetcher sources, build mutationFn(input) as fetcher(prepareArgs(input)). Return the native useMutation result, including mutate, mutateAsync, variables, data, reset and callback types. Do not curate or rename these fields. Each operation independently infers TInput, TArgs, TResult, TError and optimistic context; TError defaults to TanStack DefaultError, including registered errors.

onMutate runs before preparation, and retry repeats preparation. Preparation must be synchronous and pure. Errors from preparation use normal onError/onSettled and native retry rules; this is not form prevalidation. An optimistic rollback must handle these errors too. Stable operation IDs must be part of input, not generated anew by prepareArgs. Fetcher factories default mutationKey to [...baseKey, operationName]; explicit mutation options can override it. Different source ownership scopes (such as tenants) must use different base keys. Native options preserve their supplied mutationKey and TanStack observer semantics; applications change that key when changing ownership scope. We do not freeze callbacks for arbitrary same-key source edits. MutateAsync returns the fetcher result instead of discarding it.

No generic transformError wraps the native result. Error conversion for a grid form happens after awaiting the native mutation at the connector boundary. User callbacks and mutation.error retain original errors.

Alternative: an execute wrapper adds another public vocabulary and leaves preparation failures outside the mutation lifecycle. That remains only an internal compatibility boundary for existing grid sources.

### D4 — Durable: Shared invalidation, native lifecycle

Move invalidation policy resolution and success composition into the generic layer. Generated keys retain base/list/prepared-args and base/infinite/collection-args families. Preserve false/additional/replace precedence and isolate synchronous filter failures and rejected background refreshes.

Automatic invalidation runs in the hook-level successful-persistence callback's finally path after the configured user onSuccess. Do not await refetch; do await native user lifecycle promises. A throwing user callback still has native error behavior. Per-call callbacks retain TanStack's observer lifetime behavior and are not used to implement automatic invalidation.

### D5 — Stable hooks and projections

Call read observers and the four fixed mutation slots in a stable order. Absent slots have internal inactive descriptors but are omitted from the public capability type/result. Do not call hooks by iterating a variable operation map. Mode switches disable inactive automatic fetches; absent read branches never call user factories. React 18 and current React tests exercise rerenders with changing modes/capabilities.

Derive items from selected ordinary data or selected infinite pages, keeping native responses in Query's cache. Keep projection references stable where input data is unchanged. Return the actual active native result. Preserve disabled/placeholder/background/next-page states without collapsing them into one loading flag.

### D6 — Durable: Grid adapters own UI state and event conversion

withQuery(bundle) remains source-independent and keeps both DataGrid and useDataGrid entry points. Extract generic observers from useConnectedGrid, retaining table selector subscription, render-time projection publication, manual flags and the stable table instance. The existing load-more deduplication belongs to the grid scroll bridge; ordinary consumers receive native fetchNextPage semantics.

Proposed adapter helper `adaptCollectionToGrid(source, mapping)` creates a grid-compatible dataSource. `mapping.params` maps applied GridQueryParams to ordinary params; `mapping.infiniteParams` maps GridInfiniteParams when supported. Optional create/update/delete/deleteMany mappings convert existing grid contexts into source inputs. Require mappings for configured operations whose inputs are not directly compatible; do not infer API identity from a table row ID. The helper preserves collection keys and invalidation rather than building a new source family. It does not call hooks.

The grid still atomically resets criteria to page zero before requesting, corrects bounds only from fresh successful non-placeholder totals, requires explicit editing/creating/deleting enablement and honors explicit handler overrides. It catches original mutation errors and applies grid transformError only for the form caller. Modal session protection remains in existing grid/form machinery.

Alternative: adding grid context to collection mutations prevents reusing the same source in an ItemGroup.

### D7 — Durable: Preserve existing source semantics through adapters

Keep existing grid exports and source signatures. Their preparation remains before dispatching the normalized native mutation so existing callbacks still observe prepared DTOs and preparation errors remain outside that mutation. Route the resulting native options through the same generic mutation execution/invalidation implementation; do not prepare a second time. New fetcher collection sources use D3 semantics; native collection descriptors use their own variables unchanged.

Keep compatibility code in qc-react. Existing createGridSourceFactory and createGridDataSource are wrappers around generic descriptors plus grid-specific mappings, not independent Query runtimes. Document old versus new callback variables explicitly. Do not silently migrate native callbacks or reinterpret optimistic contexts.

## Consumer examples

These are proposed API fixtures to turn into executable documentation/type tests during implementation. Fetchers use representative Orval-style signatures; generated clients continue to decide URL/query/body placement.

### One source for any list UI

```tsx
import { createCollectionSource, useCollectionQuery } from '@ez-kit/query-react/collection'

type User = { id: string; name: string }
type UsersParams = { teamId: string; search: string; offset: number; limit: number }
type UpdateInput = { id: string; values: { name: string } }

const usersSource = createCollectionSource({
	key: ['users'],
	getAll: {
		prepareArgs: (p: UsersParams) => ({
			path: { teamId: p.teamId },
			query: { search: p.search, offset: p.offset, limit: p.limit },
		}),
		fetcher: fetchUsers,
		getItems: (response) => response.items,
		getTotal: (response) => response.total,
	},
	create: {
		prepareArgs: (input: { name: string }) => ({ body: input }),
		fetcher: createUser,
	},
	update: {
		prepareArgs: ({ id, values }: UpdateInput) => ({ path: { id }, body: values }),
		fetcher: updateUser,
		options: {
			onSuccess: (saved, input) => console.log(saved.id, input.id),
		},
	},
	delete: {
		prepareArgs: (input: { id: string }) => ({ path: { id: input.id } }),
		fetcher: deleteUser,
	},
	deleteMany: {
		prepareArgs: (input: { ids: string[] }) => ({ body: { ids: input.ids } }),
		fetcher: deleteUsers,
	},
})

function UsersList({ teamId }: { teamId: string }) {
	const [criteria, setCriteria] = useState({ search: '', offset: 0, limit: 20 })
	const users = useCollectionQuery({
		source: usersSource,
		mode: 'pages',
		params: { ...criteria, teamId },
	})
	const changeSearch = (search: string) => setCriteria((previous) => ({ ...previous, search, offset: 0 }))

	return (
		<>
			<input
				value={criteria.search}
				onChange={(e) => changeSearch(e.target.value)}
			/>
			<ItemGroup>
				{users.items.map((user) => (
					<UserItem
						key={user.id}
						user={user}
						onSave={(values) => users.update.mutateAsync({ id: user.id, values })}
						onDelete={() => users.delete.mutateAsync({ id: user.id })}
					/>
				))}
			</ItemGroup>
		</>
	)
}
```

The full runnable example must also show create, explicit multi-delete, pending/error display and page navigation/bounds correction; the short wiring above is not its replacement. Parameters remain external. A team change must reset offset in the owning application state as appropriate.

### Shared conventions

```tsx
const makeUsersSource = createCollectionSourceFactory({
	list: {
		prepareArgs: (p: UsersParams) => ({
			path: { teamId: p.teamId },
			query: { search: p.search, offset: p.offset, limit: p.limit },
		}),
		getItems: (page: { items: User[]; total: number }) => page.items,
		getTotal: (page: { items: User[]; total: number }) => page.total,
	},
	mutations: {
		update: {
			prepareArgs: ({ id, values }: UpdateInput) => ({ path: { id }, body: values }),
		},
	},
})
const source = makeUsersSource({ key: ['users'], getAll: fetchUsers, update: updateUser })
```

Generalize this convention across entities with a typed application factory when needed, retaining the previously accepted explicit entity specialization.

### Infinite-only source

```tsx
const feedSource = createCollectionSource({
	key: ['feed'],
	getInfinite: {
		prepareArgs: (p: { topic: string; limit: number }) => p,
		preparePageArgs: ({ args, pageParam }) => ({ query: { ...args, cursor: pageParam } }),
		initialPageParam: null as string | null,
		getNextPageParam: (page) => page.nextCursor ?? undefined,
		fetcher: fetchFeed,
		getItems: (page) => page.items,
	},
})
const feed = useCollectionQuery({
	source: feedSource,
	mode: 'infinite',
	params: { topic: 'news', limit: 20 },
})
// Native controls and flags, no automatic scroll policy:
feed.query.fetchNextPage()
feed.query.hasNextPage
feed.query.isFetchNextPageError
```

### Adapt the same source to DataGrid

```tsx
const dataSource = adaptCollectionToGrid(usersSource, {
  params: ({ pagination, globalFilter }) => ({
    teamId,
    search: typeof globalFilter === 'string' ? globalFilter : '',
    offset: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
  }),
  update: ({ row, values }) => {
    // Application validation can live in a shared convention or schema.
    if (!row) throw new Error('User is no longer available')
    return { id: row.id, values: updateValuesSchema.parse(values) }
  },
  delete: ({ row }) => ({ id: row.id }),
  deleteMany: ({ rows }) => ({ ids: rows.map((row) => row.id) }),
  create: ({ values }) => createValuesSchema.parse(values),
})
const { DataGrid } = withQuery(gridBundle)
// In render:
<DataGrid dataSource={dataSource} columns={columns} editing deleting creating />
```

Adapter contexts preserve missing-row typing; no unsafe non-null assertion is introduced. In the runnable example bind teamId reactively and configure only the query axes that the source maps. All request-affecting mapped values participate in collection keys.

## Risks / Trade-offs

- Generic inference can erase capability or result types → begin with positive/negative consumer type fixtures, including registered errors, selected pages, distinct read params and absent operations; never paper over public mismatches with any.
- Moving preparation changes callback variables and retries → new factory semantics are explicit; existing sources use D7 compatibility and regression tests.
- Re-render loops in grid result publication → preserve supported config-transform/publication channels and existing stable-table tests.
- Observer options changing while a mutation is pending can mix sources → generated mutation keys separate different base-key scopes; test a tenant switch with distinct base keys. Native and explicitly overridden keys remain application-owned; document their native semantics instead of promising arbitrary same-key callback isolation.
- Universal total cannot imply a pagination shape → expose total without changing params; grid alone uses its known page model. Unknown or placeholder totals never trigger automatic corrections.
- Additional package linkage and client boundaries → isolated import/build/tree-shaking checks, separate size budget, native Query peers and React 18 validation.

## Migration Plan

1. Add collection entry and contract tests while existing grid code stays operational.
2. Extract generic source/options/invalidation logic and implement native-result collection execution.
3. Adapt existing sources and replace grid observers with shared execution without changing existing source callback semantics.
4. Add direct ordinary-list, infinite-only, shared-factory and grid-adapter examples; retain the reproducible Orval example.
5. Run targeted/type/browser checks and repository gates; add changesets for query-react and qc-react dependency/API additions.
6. Record D1–D4 and D6–D7 in durable ADRs. Explicitly supersede only generic ownership claims in ADRs 0028/0029; preserve table/cache/modal contracts and ADRs 0022/0027/0030. Reconcile the unarchived qc-react-data-grid capability at archive time without overwriting its preserved requirements.

Rollback before release can restore the old grid runtime while removing the new collection entry and its dependency. After publication, follow normal versioned release policy rather than silently removing public exports.
