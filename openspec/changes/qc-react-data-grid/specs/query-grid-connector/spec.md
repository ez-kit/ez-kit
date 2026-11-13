## Purpose

Connects existing data-grid bundles to cached server data and mutations through reusable typed sources, preserving grid composition and native query behavior.

## ADDED Requirements

### Requirement: Independent connector package

The system SHALL expose the React grid connector through `@ez-kit/qc-react/data-grid`. The base grid SHALL remain usable without a query-library dependency. The connector SHALL work with both supported visual kits without authoring visual styles.

#### Scenario: Unconnected grid
- **WHEN** an application uses only the base grid with local data
- **THEN** it does not need the connector or its query-library peer

#### Scenario: Both visual kits
- **WHEN** equivalent supported bundles from shadcn and heroui are connected
- **THEN** both support the same source operations and retain their own presentation

### Requirement: Equivalent component and hook entry points

A connected bundle SHALL accept `dataSource` on its DataGrid and useDataGrid. The hook SHALL return a table accepted by that bundle's DataGrid. A supplied table SHALL NOT be connected a second time. Bundle helpers, compound components and existing typing guarantees SHALL be preserved.

#### Scenario: Explicit table
- **WHEN** a consumer creates a table through connected useDataGrid and renders DataGrid with that table
- **THEN** it observes the same data and actions as inline dataSource usage without a second binding

#### Scenario: Typed bundle preserved
- **WHEN** the connected bundle declares custom cell types, context and column-config layers
- **THEN** valid uses compile and invalid cell types, context fields and column-config values remain compile errors

### Requirement: Reusable API conventions and typed arguments

Sources SHALL support shared API conventions and per-operation overrides. `prepareArgs` SHALL receive grid query parameters or action context and return the fetcher's business argument. Its result SHALL be checked against the fetcher input type without requiring a fixed HTTP envelope.

#### Scenario: Explicit entity specialization
- **WHEN** an application specializes a shared API convention with `createApiGridSource<User>()` and then supplies fetchers
- **THEN** row projections and action contexts retain User, while operation arguments, results, errors and optimistic contexts remain independently inferred from the fetchers and native options

#### Scenario: Generated client arguments
- **WHEN** a fetcher expects `{ userId, data }` and prepareArgs returns that shape
- **THEN** it receives those arguments without conversion into a mandatory path/query/body shape

#### Scenario: Incompatible mutation argument
- **WHEN** prepareArgs returns a string ID to a fetcher requiring a numeric ID
- **THEN** the source definition fails type checking

#### Scenario: Constrained shared defaults
- **WHEN** shared mutation preparation reads row.id but the entity row type has no id
- **THEN** the configuration fails type checking unless the operation supplies a compatible override

### Requirement: Native options and response projection

Sources SHALL accept existing native query, infinite-query and mutation options. Response projections SHALL infer rows and totals from the observer result, including supported select output, without replacing the underlying cached response. Fetcher factories SHALL expose reusable generated query options.

#### Scenario: Reuse outside the grid
- **WHEN** a consumer prefetches factory-provided list options and then mounts a grid with the same source and parameters
- **THEN** both use the same cache entry and native freshness rules

#### Scenario: Inferred row type
- **WHEN** getRows extracts User records
- **THEN** grid columns and operation contexts are typed as User, and incompatible columns fail compilation

### Requirement: Table-owned applied request parameters

The connector SHALL derive query parameters from existing table state, using applied sorting, column filters and search when draft is enabled. It SHALL preserve input debounce, avoid a duplicate parameter store and avoid requests caused solely by unrelated table state.

#### Scenario: Unapplied filter
- **WHEN** a user changes a draft filter without applying it
- **THEN** the active query remains on the previously applied parameters

#### Scenario: Apply filters from a later page
- **WHEN** the user applies changed criteria while on page three
- **THEN** the query uses the new criteria and page zero without an intermediate request for new criteria on page three

#### Scenario: Selection only
- **WHEN** row selection changes without query parameters changing
- **THEN** no new query is initiated solely because of that change

### Requirement: Server paging and bounds

Connected server lists SHALL avoid reapplying server pagination, filtering or sorting to the returned page. Changed applied criteria SHALL reset the page index. Fresh successful totals SHALL correct an out-of-range index to the last existing page, or zero for an empty collection.

#### Scenario: Delete final row of final page
- **WHEN** deletion succeeds and fresh totals show that the current page no longer exists
- **THEN** the table selects the last existing page and requests its data

#### Scenario: Placeholder totals
- **WHEN** totals belong to placeholder data for previous parameters
- **THEN** they do not clamp the current page as if they were authoritative

### Requirement: Infinite collection ownership

The connector SHALL display the accumulated pages of one infinite-query collection and wire forward loading, availability and retry. Page parameters SHALL be separate from collection identity. Changing criteria or paging mode SHALL preserve valid hook behavior and the table instance.

#### Scenario: Criteria change
- **WHEN** infinite-list filters change
- **THEN** the connector uses the new collection's cache or first-page request without appending pages from the old collection

#### Scenario: Next-page failure
- **WHEN** loading another page fails after rows were loaded
- **THEN** existing rows remain visible and the load-more error can be retried without concurrent duplicate loads

#### Scenario: Live mode switch
- **WHEN** a source supports both modes and pagination switches between pages and infinite
- **THEN** the table is not remounted, inactive modes do not fetch and no hook-order violation occurs

### Requirement: Generated keys and preserved external keys

Fetcher sources SHALL derive distinct list and infinite key families from one base key and request-affecting business arguments. Existing options SHALL retain their supplied keys; their invalidation scope SHALL be explicit rather than inferred from an arbitrary prefix.

#### Scenario: One base key
- **WHEN** a source declares key `['users']`
- **THEN** ordinary keys use the users/list family and infinite keys use users/infinite, with the relevant request arguments

#### Scenario: Tenant separation
- **WHEN** otherwise equal requests differ by tenant in their prepared business arguments
- **THEN** they do not share the same generated cache entry

### Requirement: Explicit action enablement and overrides

Source mutations SHALL NOT enable grid actions automatically. Enabled actions SHALL require a corresponding executor or explicit handler. Explicit onSave/onDelete handlers SHALL replace automatic execution for that action, including connector-owned invalidation.

#### Scenario: Mutation without enablement
- **WHEN** a source has update but editing is omitted or false
- **THEN** editing remains disabled

#### Scenario: Explicit save
- **WHEN** editing supplies its own onSave alongside a source update
- **THEN** only the explicit handler executes and it owns cache maintenance

#### Scenario: Missing executor
- **WHEN** an action is enabled without a source operation or explicit handler
- **THEN** statically knowable mismatches fail type checks and dynamic mismatches produce an actionable configuration error

### Requirement: Automatic invalidation and overrides

Successful built-in mutations SHALL invalidate both generated list families by default. Policy SHALL support false, additional filter rules or replacement filter rules at source and operation levels. Operation overrides SHALL take precedence; additional rules augment the resolved inherited rules.

#### Scenario: Default mutation success
- **WHEN** a built-in update succeeds with the default policy
- **THEN** active ordinary and infinite lists refetch and inactive matching lists become stale under native defaults

#### Scenario: Additional queries
- **WHEN** policy adds separate users-count and dashboard query filters
- **THEN** both additional families and the source lists are invalidated

#### Scenario: Replace or disable
- **WHEN** an operation specifies replacement rules or false
- **THEN** only replacement rules execute, or no connector invalidation executes, respectively

### Requirement: Background refetch does not delay persistence completion

Automatic invalidation SHALL NOT delay successful form completion. Its errors SHALL NOT turn successful persistence into a failed save. Native user lifecycle callbacks and their asynchronous semantics SHALL be preserved; internal invalidation SHALL remain protected from failures in user success callbacks.

#### Scenario: Slow list reload
- **WHEN** persistence succeeds while the automatic list refetch remains pending
- **THEN** the form can finish and the grid displays fetching state over its existing rows

#### Scenario: User success callback throws
- **WHEN** the server succeeded but user onSuccess throws
- **THEN** connector success invalidation still launches and the callback error is not silently swallowed

### Requirement: Error transformation at the grid boundary

An inherited or operation-specific transformError SHALL adapt mutation failures for the grid. Native mutation callbacks SHALL receive the original failure. Untransformed errors SHALL retain existing grid handling and validation errors SHALL populate the active form.

#### Scenario: Server field validation
- **WHEN** an API failure is transformed into ValidationError for the active form
- **THEN** its field messages appear in the form while mutation onError received the original API failure

### Requirement: Dismissed forms do not cancel connected mutations

A dispatched connector mutation SHALL continue after its form is dismissed. Its success invalidation and configured mutation lifecycle SHALL still execute. Completion SHALL NOT reopen or modify a closed or newer form session. Read cancellation SHALL retain the query library's signal behavior.

#### Scenario: Open another form while saving
- **WHEN** form A is dismissed during a save and form B opens before A completes
- **THEN** A's result maintains the cache but does not close B or write A's errors into B

#### Scenario: Grid unmounts
- **WHEN** the grid unmounts while a dispatched mutation is pending
- **THEN** completion still executes configured mutation lifecycle and successful cache invalidation without updating unmounted form state

### Requirement: Separate collection and page preparation

Infinite fetcher sources SHALL use prepareArgs to produce collection arguments and preparePageArgs({ args, pageParam }) to produce the fetcher argument for a page. Collection arguments SHALL determine cache identity; page-specific arguments SHALL NOT change that identity. Both callbacks SHALL support API-factory defaults and operation overrides.

#### Scenario: Cursor in an arbitrary DTO
- **WHEN** preparePageArgs inserts a cursor into a nested body field or an encoded URL
- **THEN** each page receives that prepared request while all pages retain the same collection key
