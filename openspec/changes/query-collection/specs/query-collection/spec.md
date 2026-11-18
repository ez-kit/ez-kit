## Purpose

Enable UI-independent, typed server collections with reusable request conventions, native query and mutation behavior, and integration with externally owned list state.

## ADDED Requirements

### Requirement: Independent collection entry

The collection API SHALL be available from query-react without any grid or visual-kit dependency. Existing query gates SHALL retain their public behavior.

#### Scenario: Ordinary list consumer

- **WHEN** an application imports the collection entry without installing a grid kit
- **THEN** it can read and mutate a collection using the existing Query provider

### Requirement: External arbitrary parameters

Read parameters SHALL be inferred from the source and SHALL allow arbitrary application shapes. Collection execution SHALL NOT own, mutate or reset parameter state.

#### Scenario: Custom transport convention

- **WHEN** a source accepts teamId, offset, limit and search
- **THEN** the hook accepts that shape without requiring table filter or pagination types and rejects incompatible parameter types

#### Scenario: Atomic filter change

- **WHEN** an application updates search and offset together
- **THEN** the new request uses that complete parameter snapshot without an intermediate old-offset request

### Requirement: Read capabilities and mode typing

A source SHALL provide ordinary reads, infinite reads, or both. Requested modes and their parameter types SHALL be checked against source capabilities. Mode-specific native result types SHALL remain accessible.

#### Scenario: Infinite-only source

- **WHEN** a source defines only infinite reads
- **THEN** infinite execution is valid and ordinary execution is a type error

#### Scenario: Missing reads

- **WHEN** a source defines mutations but no read operation
- **THEN** collection source construction fails type checking

### Requirement: Typed source conventions

Sources SHALL support reusable API preparation and projection defaults with per-operation overrides. Preparation output SHALL match the fetcher argument; projections SHALL infer item types from selected observer data. No fixed HTTP envelope or entity-shaped mutation input SHALL be required.

#### Scenario: Shared API convention

- **WHEN** several entities use the same response envelope and pagination convention
- **THEN** a shared factory applies those defaults while preserving each entity and operation type

#### Scenario: Independent mutation DTO

- **WHEN** an update fetcher requires a version field absent from preparation output
- **THEN** the source definition fails type checking

### Requirement: Native cache and read projections

Collection reads SHALL expose projected items and optional total alongside the native active query result. Cached responses SHALL retain their native shape. Infinite items SHALL derive from loaded pages without a separate append store. Read abort signals SHALL reach fetchers separately from business arguments.

#### Scenario: Selected data

- **WHEN** native select transforms the observer response
- **THEN** projections receive the selected type while cached data retains the original response

#### Scenario: Failed next page

- **WHEN** next-page loading fails after pages have loaded
- **THEN** existing items remain available and native next-page error and retry controls remain accessible

### Requirement: Stable mode transitions

Changing between supported read modes SHALL preserve valid React hook ordering and suppress automatic requests in the inactive mode. Absent modes SHALL not require dummy user operations.

#### Scenario: Switch modes in place

- **WHEN** a mounted collection changes from pages to infinite and back
- **THEN** execution uses each mode's cache without mixing collections or violating hook order

### Requirement: Key identity and reusable options

Fetcher sources SHALL derive distinct ordinary and infinite key families from the base key and prepared collection arguments. Cursor and transport signal SHALL not enter infinite collection identity. Native sources SHALL preserve external keys and require explicit invalidation scope. Sources SHALL expose options for native consumers.

#### Scenario: Prefetch and tenant isolation

- **WHEN** a caller prefetches source options and mounts the same collection
- **THEN** both share a cache entry, while different prepared tenant arguments select a different entry

### Requirement: Native typed mutation results

Each configured create, update, delete and deleteMany SHALL expose native mutation methods and state with independently inferred input and result types. Unconfigured operations SHALL not appear as callable operations. The collection API SHALL not add an execute method or infer bulk behavior from single deletion.

#### Scenario: Typed create result

- **WHEN** mutateAsync receives the declared create input
- **THEN** its promise resolves to the fetcher's result type and malformed input fails type checking

#### Scenario: Explicit bulk deletion

- **WHEN** deleteMany is absent but delete exists
- **THEN** no bulk method or automatic loop is provided

### Requirement: Preparation within mutation execution

Fetcher mutation preparation SHALL run inside mutation execution. Lifecycle callbacks SHALL receive the original input. Preparation failures SHALL follow native mutation error and retry behavior; retry SHALL repeat preparation. User lifecycle promises and optimistic context SHALL retain native semantics.

#### Scenario: Preparation failure after optimistic setup

- **WHEN** onMutate returns context and prepareArgs throws
- **THEN** no fetcher is called and native error callbacks receive the failure, original input and optimistic context

#### Scenario: Retried mutation

- **WHEN** retry is enabled and the first attempt fails
- **THEN** preparation is repeated for the same input before the next fetcher attempt

### Requirement: Successful mutation invalidation

Factory mutations SHALL invalidate generated list families by default with source and operation false, additional and replace policies. Automatic refresh SHALL not delay persistence completion. Invalidation SHALL survive observer unmount and user success-callback failures while retaining native callback error behavior.

#### Scenario: Unmounted list

- **WHEN** a dispatched mutation succeeds after the list unmounts
- **THEN** configured lifecycle and automatic invalidation still execute

#### Scenario: Failed background refresh

- **WHEN** persistence succeeds but an automatic refetch rejects
- **THEN** persistence remains successful and the read exposes the refresh error

### Requirement: Existing source compatibility

Existing grid sources and supplied native options SHALL retain callback variable types, original errors, key identity and preparation behavior through explicit adapters. New collection-factory input semantics SHALL not silently replace existing prepared-variable semantics.

#### Scenario: Existing native mutation

- **WHEN** a grid source prepares a string ID for a supplied native mutation
- **THEN** its existing lifecycle callbacks still receive the string ID

### Requirement: Grid connection over collection execution

The connector SHALL adapt applied table parameters and action contexts to collection sources while preserving bundle typing, explicit feature enablement and handler overrides. Grid state SHALL remain the parameter owner, including atomic criteria resets and fresh-total bounds correction. Grid-specific error mapping SHALL not alter native mutation errors.

#### Scenario: Shared business source

- **WHEN** a collection source is adapted to a grid and used directly by an ordinary list with equivalent request arguments
- **THEN** both use the same query keys and mutation contract without requiring grid contexts in the business source

#### Scenario: Explicit save and safe page correction

- **WHEN** editing has an explicit onSave
- **THEN** that handler replaces automatic execution; subsequent page correction uses only fresh authoritative totals, never placeholder totals

#### Scenario: Modal dismissal

- **WHEN** a connected save is dispatched and its modal is dismissed
- **THEN** persistence and invalidation continue without changing a newly opened form session

### Requirement: Mutation ownership keys

Fetcher sources SHALL default mutation keys to the base key plus the operation name. Explicit mutation keys and native descriptors SHALL retain their supplied keys and native observer behavior. Applications SHALL use distinct ownership keys when switching tenant-scoped sources.

#### Scenario: Tenant switch during persistence

- **WHEN** a factory mutation starts under tenant A and the mounted hook switches to a source with tenant B's distinct base key
- **THEN** completion invalidates tenant A's collection scope rather than tenant B's

#### Scenario: Explicit mutation key

- **WHEN** an operation supplies its own mutationKey
- **THEN** the collection preserves it rather than replacing it with a generated key

### Requirement: Consumer query behavior

The collection hook SHALL accept typed per-consumer loading and refetch options for either read mode. Supplied options SHALL override source defaults only on the active read. Cache keys, query functions, selection and infinite cursor configuration SHALL remain source-owned, including for untyped runtime callers.

#### Scenario: Conditional loading

- **WHEN** a consumer changes queryOptions.enabled from false to true
- **THEN** the active read fetches using the source's identity and projections without enabling the inactive mode

### Requirement: Shared factory selection

Entity overrides in a shared factory SHALL infer selected list data and selected infinite pages independently of raw API responses. An operation supplying select SHALL supply getItems explicitly. Its inherited getTotal SHALL be discarded unless the operation supplies a compatible replacement. Infinite pagination SHALL continue to use raw response pages.

#### Scenario: Selecting names

- **WHEN** an entity selects string arrays from object response envelopes
- **THEN** getItems receives string arrays, cached responses remain envelopes and an inherited envelope total projection is not invoked

#### Scenario: Selected infinite pages

- **WHEN** select transforms pages within the InfiniteData envelope
- **THEN** getItems projects each selected page while getNextPageParam receives raw pages

### Requirement: Pending operations survive capability removal

Removing an optional operation SHALL omit it from the collection result while preserving the last connected operation's pending lifecycle, retries and invalidation scope, including native operations without an explicit mutation key.

#### Scenario: Operation removed during retry

- **WHEN** an update is pending and the source changes to one without update
- **THEN** a retry invokes the original operation and completion retains its callbacks and invalidation scope

### Requirement: Selection and grid row safety

Fetcher projections SHALL accept raw response data when no selector is configured. A potentially absent selector SHALL NOT promise a selected-only projection input. The grid adapter SHALL reject primitive items in any configured read before checking list/infinite compatibility.

#### Scenario: Conditional shape-changing selector

- **WHEN** an operation supplies an optional selector that changes an envelope into an array
- **THEN** a projection accepting only the selected array is rejected by the type checker

#### Scenario: Primitive infinite items

- **WHEN** ordinary reads return object rows but infinite reads return strings
- **THEN** adapting the collection to a grid is rejected by the type checker

#### Scenario: Native read and generated write

- **WHEN** a source combines native query options with a generated fetcher mutation
- **THEN** its base key is required for mutation ownership, and native read invalidation remains explicitly configured

### Requirement: Pre-dispatch grid ownership

If an automatic grid action reaches dispatch with a captured effective mutation key different from the currently connected operation, it SHALL reject before preparing or executing the request. Ownership changes during validation SHALL instead cancel the validation quietly. Ownership checks SHALL run before preparing or executing the request. Explicit cancellation SHALL retain existing form-session behavior; same-key changes SHALL retain native observer semantics.

#### Scenario: Source changes during validation

- **WHEN** an edit begins validating under source A and the grid switches to a different ownership key B
- **THEN** the commit resolves as cancelled, calls neither A's nor B's fetcher, and ignores late validation results while preserving the open form and values

### Requirement: Query-scoped infinite deduplication

Concurrent next-page work SHALL be deduplicated by effective query hash. A pending request for a previous selection SHALL NOT block the current selection, even if the previous query remains in flight without cancellation.

#### Scenario: Old page remains pending

- **WHEN** A's next page is pending and a filter change loads B's first page
- **THEN** B can load its next page before A settles

### Requirement: Internal observers preserve application defaults safely

Inactive internal observers SHALL use neutral defaults without changing their application QueryClient ownership. Active reads SHALL retain application defaults and native cache identity across mode changes.

#### Scenario: Ordinary global initial data

- **WHEN** a page-only collection runs with array initialData configured globally
- **THEN** its active read uses that data and the inactive infinite observer does not interpret it as InfiniteData

### Requirement: Public projection and peer compatibility

Native projections SHALL infer input from returned query options. Inherited total getters SHALL NOT advertise broader inputs than they support. Published declarations SHALL interoperate with native hooks at the declared minimum TanStack Query version.

#### Scenario: Native raw envelope

- **WHEN** plain native options return an envelope without selection
- **THEN** an array-only projection is rejected by the type checker

#### Scenario: Conditionally inherited raw total

- **WHEN** conditional selection broadens selected data beyond an inherited total getter's accepted input
- **THEN** a compatible total override is required unless selection is guaranteed to discard the inherited getter

#### Scenario: Minimum peer consumer

- **WHEN** a consumer uses the exact declared minimum TanStack Query version
- **THEN** built collection and grid declarations compile and interoperate with native ordinary/infinite hooks with library checking enabled

### Requirement: Connected grid observer policy

Connected DataGrid and useDataGrid SHALL accept queryOptions with the same restricted observer-policy contract as useCollectionQuery. Consumer options SHALL override source options for ordinary and infinite reads without replacing identity, fetchers, projections or cursor configuration.

#### Scenario: Enable a consumer after selecting a team

- **GIVEN** a source whose read is disabled
- **WHEN** the connected grid sets queryOptions.enabled to true
- **THEN** the source's fetcher executes with its original query key and projection

### Requirement: Validation-only cancellation

Creating and editing SHALL support cancelValidation without closing the form or interrupting an already dispatched save. Ownership changes in a connected grid SHALL invoke this cancellation for the corresponding form. Cancelled validation SHALL never publish late errors or dispatch a mutation.

#### Scenario: New attempt after an ownership change

- **WHEN** a validation is cancelled and a new attempt starts before the old validator settles
- **THEN** the old result cannot alter the new attempt's state, errors or save

### Requirement: Infinite loader ownership

Connected infinite grids SHALL isolate loader pending/error state by effective query identity as well as deduplicate transport requests by identity. Old promise settlements SHALL NOT change the current collection's loader state.

#### Scenario: Slow prior collection

- **WHEN** A's next-page request remains pending and collection B becomes active
- **THEN** the real loader can request B's next page and a late A error cannot appear for B

### Requirement: Authoritative page totals

Stale initial cache totals SHALL NOT trigger connector page correction or the base grid's shrink clamp. Successful current-observer responses SHALL remain usable for correction with staleTime zero.

#### Scenario: Restored page with refetch disabled

- **GIVEN** a restored page and stale cached total zero
- **WHEN** refetchOnMount is false
- **THEN** the restored page remains selected until an authoritative response supports correction

### Requirement: Early imperative actions

Automatic grid actions invoked from layout or child effects SHALL wait for observer publication before dispatching and SHALL retain ownership and pre-dispatch cancellation checks.

#### Scenario: Child effect starts creation

- **WHEN** a child effect commits creation before the connector's passive publication
- **THEN** the configured mutation executes after publication without a missing-executor error

### Requirement: Public read contract parity

Direct grid helpers SHALL reject projection inputs incompatible with raw responses unless selection guarantees the projected shape. Structural collection sources SHALL expose the full allowed native observer policy independent of omitted or literal source option fields.

#### Scenario: Literal disabled source

- **WHEN** a structural native source returns enabled false as a literal
- **THEN** a consumer may override enabled with true, while invalid enabled values and source-owned options are rejected by types
