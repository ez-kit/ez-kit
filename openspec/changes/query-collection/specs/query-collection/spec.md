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
