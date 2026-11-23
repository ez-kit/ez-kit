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

- **WHEN** a source accepts teamId and search
- **THEN** the hook accepts that criteria shape alongside controlled pagination and rejects incompatible criteria types

#### Scenario: Atomic filter change

- **WHEN** an application updates search and its page position together
- **THEN** the new request uses the complete snapshot with the new page position

### Requirement: Read capabilities and mode typing

A generated source SHALL describe reads in one `read` block. Infinite cursor settings SHALL enable the infinite mode in addition to ordinary reads. Requested modes SHALL be checked against source capabilities. Native sources MAY provide either or both modes.

#### Scenario: Native infinite-only source

- **WHEN** a native source defines only infinite reads
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

Fetcher sources SHALL derive distinct ordinary and infinite key families from the base key, mode and controlled criteria. Ordinary identity includes the page index. Infinite identity includes the page size and criteria. Preparation receives the cursor for each infinite fetch. Native sources SHALL preserve external keys and require explicit invalidation scope. Sources SHALL expose options for native consumers.

#### Scenario: Prefetch and tenant isolation

- **WHEN** a caller prefetches source options and mounts the same collection
- **THEN** both share a cache entry, while different tenant criteria select a different entry

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

### Requirement: Native option compatibility

Native descriptors SHALL preserve existing query keys, native selectors, cursor callbacks and mutation lifecycle options. Applications SHALL supply an invalidation policy for externally owned keys.

#### Scenario: Existing native query

- **WHEN** a source supplies a native query with a selected response
- **THEN** the native key is used and items are projected from selected data

### Requirement: Grid connection over collection execution

The connector SHALL adapt applied table parameters and action contexts to collection sources while preserving bundle typing, explicit feature enablement and handler overrides. Grid state SHALL remain the parameter owner, including atomic criteria resets and fresh-total bounds correction. Grid-specific error mapping SHALL not alter native mutation errors.

#### Scenario: Shared business source

- **WHEN** a DataGrid source is used by a connected grid and directly by an ordinary list with equivalent criteria and pagination
- **THEN** both use the same query keys and mutation contract

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

### Requirement: Shared collection factory

A factory SHALL reuse criteria preparation, projections and cursor settings for compatible resource fetchers. It SHALL accept per-resource operation configurations and preserve their input and result types.

#### Scenario: Shared offset convention

- **WHEN** a factory prepares offset-based requests for two resources
- **THEN** each resource supplies its own base key and fetcher while inheriting the preparation and cursor rules

### Requirement: Pending operations survive capability removal

Removing an optional operation SHALL omit it from the collection result while preserving the last connected operation's pending lifecycle, retries and invalidation scope, including native operations without an explicit mutation key.

#### Scenario: Operation removed during retry

- **WHEN** an update is pending and the source changes to one without update
- **THEN** a retry invokes the original operation and completion retains its callbacks and invalidation scope

### Requirement: Selection and grid row safety

Fetcher projections SHALL accept raw response data when no selector is configured. A potentially absent selector SHALL NOT promise a selected-only projection input. The connected grid SHALL reject primitive items in any configured read before checking list/infinite compatibility.

#### Scenario: Conditional shape-changing selector

- **WHEN** an operation supplies an optional selector that changes an envelope into an array
- **THEN** a projection accepting only the selected array is rejected by the type checker

#### Scenario: Primitive infinite items

- **WHEN** ordinary reads return object rows but infinite reads return strings
- **THEN** connecting the collection to a grid is rejected by the type checker

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

### Requirement: External form checks distinguish cancellation

Read-only editing and creating checks and the modal validation bridge SHALL return an explicit
valid, invalid, or cancelled outcome without writing form state. Cancellation SHALL settle
promptly without waiting for the validator. Schema validator contracts SHALL remain unchanged.

#### Scenario: Scope changes during an external form check

- **WHEN** pending validation is cancelled while the form stays open
- **THEN** the check resolves as cancelled and a late validator result cannot become success

#### Scenario: Closed form versus missing validator

- **WHEN** a check is requested for a closed form
- **THEN** it returns cancelled without invoking the validator
- **AND** an open form with no validator returns valid

### Requirement: Connected writes stay within their owner

A connected grid SHALL prevent an unsubmitted action from writing to a different effective
mutation owner. It SHALL cancel staged delete intents and protect the new selection from late
completion when ownership changes. It SHALL allow already dispatched mutations to complete their
native lifecycle.

#### Scenario: Reused row IDs across tenants

- **WHEN** a user opens an edit or delete confirmation in tenant A and switches to tenant B
- **THEN** the old draft cannot save into B, the delete intent is cancelled, and placeholder rows from A cannot drive B's writes

#### Scenario: Cancellation before publication

- **WHEN** an automatic deletion is cancelled before its observer dispatches the mutation
- **THEN** the deletion fetcher is not called

### Requirement: Connected reads keep grid status coherent

The grid SHALL observe query status changes required by its UI and SHALL skip automatic and
manual infinite loading when its read is disabled.

#### Scenario: Disabled read with cached pages

- **WHEN** the active infinite observer is disabled and cached data has a next page
- **THEN** the grid does not request the next page

### Requirement: Query identity and connected action targets remain stable

Connected edit and delete actions SHALL use stable record identifiers across server pages.
A change of dataset scope SHALL prevent old placeholders from reaching the new read projection.
Generated query families SHALL support an explicit cache key part independent of request arguments.

#### Scenario: Transport arguments are not JSON objects

- **WHEN** a generated read uses URLSearchParams as its fetcher input
- **THEN** it can supply a key part with prepareKey and cache distinct criteria independently

#### Scenario: A controlled page reset is acknowledged later

- **WHEN** applied criteria change while the parent still holds the old page index
- **THEN** the connector keeps querying page zero until the parent acknowledges the reset

#### Scenario: Duplicate target while deletion is pending

- **WHEN** the same row is submitted for deletion again while its operation is pending
- **THEN** the grid does not dispatch another deletion for that target

### Requirement: Grid write actions use committed ownership

The connected grid SHALL resolve write handlers and targets from the committed view.
A change of scope SHALL block selection-derived deletion until controlled selection clears.
Dismissing a confirmation SHALL leave existing delete requests and their reservations intact.

#### Scenario: A suspended transition is discarded

- **WHEN** a render for scope B suspends while scope A is still shown
- **THEN** a save from the visible form uses A's committed row and mutation

#### Scenario: The selection reset is deferred

- **WHEN** scope B is shown while the parent has yet to clear scope A's controlled selection
- **THEN** selection-based bulk deletion does not execute in B

#### Scenario: Another delete is already running

- **WHEN** the user dismisses the confirmation for B while A is being deleted
- **THEN** A remains pending and a repeat request cannot dispatch a second delete

### Requirement: Applied criteria and read data remain distinct contracts

Paged grids SHALL compare each applied sorting, column-filter and global-filter value using
Object.is, independently of pagination and generated cache identity. Structural readers SHALL
check initialData against the raw query data and expose the raw branch when select is optional.

#### Scenario: The applied filter has a new object reference

- **WHEN** a paged grid receives a new applied filter object
- **THEN** it requests page zero while the reset is acknowledged
- **AND** changing only the page with stable criteria retains that page

#### Scenario: A selector may be absent

- **WHEN** a structural reader's select is optional
- **THEN** its query data type and projection account for both the raw and selected responses

### Requirement: Connected actions and reads respect their current inputs

Connected form actions SHALL resolve defaults, accessors and notifications from the committed grid.
Deletion SHALL resolve rows from the live visible model when the committed options are active.
Selection action bars SHALL hide stale controlled selection until the scope reset is acknowledged.

#### Scenario: A descendant suspends after a source change

- **WHEN** the visible grid starts a form while a render with different columns and callbacks is suspended
- **THEN** the form seeds values and sends state notifications using the visible grid's inputs

#### Scenario: A newly visible tree row is deleted

- **WHEN** expanding a branch reveals a child without rerendering the connector
- **THEN** deletion resolves the child from the visible row model

#### Scenario: A parent holds stale controlled selection

- **WHEN** a scope change reuses row IDs and the parent has yet to acknowledge the selection reset
- **THEN** the action bar does not expose those rows to selection actions

### Requirement: Connected read compatibility across source changes

The connector SHALL keep previous responses within the same read contract and SHALL allow a new
read to supply its own placeholder. Structural option unions SHALL be valid in every branch.
An explicit pagination mode SHALL require a corresponding read in every source variant.

#### Scenario: A read-only grid switches response shape

- **WHEN** a new read changes its query factory or projection while keepPreviousData is enabled
- **THEN** the previous response cannot reach the new selector or projection, and the new read can
  supply its own placeholder

#### Scenario: The configured mode and read vary

- **WHEN** an explicit mode is supplied and a corresponding read can be absent
- **THEN** the type checker rejects that source configuration

### Requirement: Unified fetcher inputs

Collection preparation SHALL receive controlled criteria, page size and a mode-specific position. A connected grid SHALL supply applied table criteria and row-action inputs to the shared collection layer. The grid SHALL accept a typed source directly.

#### Scenario: One offset fetcher serves both modes

- **WHEN** a page view requests page two and an infinite view requests its next offset
- **THEN** both requests run the same preparation and fetcher, and their responses use separate mode caches

#### Scenario: The cursor has an API-specific type

- **WHEN** an infinite configuration supplies a string initial cursor
- **THEN** preparation receives a string pageParam, and the next-page callback is checked against that cursor type
