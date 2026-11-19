# Spec Delta

## Purpose

Defines the observable restoration lifecycle so consumers can open a workspace after reading or timeout without a late response unexpectedly replacing its state.

## ADDED Requirements

### Requirement: Restoration starts automatically

A new client instance MUST start restoration on connection without a consumer useEffect. One initial operation MUST NOT duplicate reads for snapshot and connect. Consumers MUST be able to configure timeout and explicitly retry restore.

#### Scenario: Ordinary backend connection

- **WHEN** a new store connects to an async source
- **THEN** restoration starts automatically and one source binding starts one initial read

#### Scenario: Synchronous storage

- **WHEN** a new store connects to available localStorage
- **THEN** saved state restores without a manual restore call

### Requirement: Status reflects the actual operation

Handles and subscriptions MUST expose restore idle/pending/ready/error/timeout and a separate write status. A new participating instance MUST be pending on its first client render. Ready MUST mean reading and processing completed, not that a migration write was acknowledged.

#### Scenario: First frame before the read

- **WHEN** a dashboard first reads status before async restoration completes
- **THEN** status immediately supports a loader without an intermediate ready state

#### Scenario: Awaiting restoration

- **WHEN** a consumer awaits the current restore operation
- **THEN** its Promise settles with a typed result after read processing, timeout or error

#### Scenario: A write succeeds after a restore failure

- **WHEN** a restore reports an error and an independent write succeeds
- **THEN** status retains the reason for the restore failure until a new restore or full reset

### Requirement: Timeout ends apply authority

At timeout the system MUST finish restoration with timeout status and retain defaults for still-clean records. A later read result MUST NOT change memory, dirty state, baseline or errors of a newer operation, or initiate rewrite/delete. This guarantee MUST NOT depend on successful request cancellation.

#### Scenario: Backend responds too late

- **WHEN** timeout occurs at 2000 ms and the read completes at 3000 ms
- **THEN** the workspace keeps its default and the late response applies nothing

#### Scenario: Late rejection after retry

- **WHEN** an old operation timed out, a retry started, then the old request rejects
- **THEN** the old request error does not replace retry status or its result

### Requirement: Waiting alone never persists defaults

Connection, pending, timeout and read errors MUST NOT write/delete defaults. Editing another record of the same source MUST NOT persist a record whose read is still pending. A real user edit MUST remain a valid reason to persist.

#### Scenario: Timeout without user action

- **WHEN** a read times out without any user edit
- **THEN** the source receives no write or delete for that record

#### Scenario: Neighboring record changes

- **WHEN** A awaits a read while the user changes B in the same source
- **THEN** B is saved without replacing the server value of A with a default

#### Scenario: Edit after timeout

- **WHEN** the user changes the default after timeout
- **THEN** the new value persists and a late read cannot replace it

### Requirement: User edits take precedence

Restoration MUST NOT replace a record edited by the user since instance creation or before applying the current response. The check MUST track the edit itself rather than only current equality with default. Explicit restore retries MUST preserve this priority.

#### Scenario: Edit and return to default

- **WHEN** the user changes width and returns it to default before the backend responds
- **THEN** the server width is not applied

#### Scenario: Independent fields

- **WHEN** the user changed A but not B, and a read returns both
- **THEN** A retains the user value while B may restore

### Requirement: Lifecycle belongs to the instance

A cache hit MUST retain terminal status and state without another initial read. After eviction a new instance MUST start a new restoration. Disconnect, dispose and reset MUST prevent applying responses from the previous lifecycle; resubscription MUST be idempotent.

#### Scenario: Remount after timeout

- **WHEN** a retained store with timeout status mounts again
- **THEN** status remains timeout and the automatic read is not repeated

#### Scenario: New instance after GC

- **WHEN** cache removes a store and later creates another at the same address
- **THEN** the new store starts its own restoration and ignores responses of the removed instance

#### Scenario: StrictMode repeats connection

- **WHEN** React performs setup, cleanup and setup for one instance
- **THEN** there is no duplicate application, capture of hydrated defaults or pair of current initial operations

### Requirement: Explicit restore has defined repeat behavior

Restore while pending MUST return the current operation. After terminal status, explicit restore MUST start a new operation with a new deadline without rolling back user edits. Read failure and timeout MUST return as results without unhandled rejection.

#### Scenario: Awaiting restoration already in progress

- **WHEN** a consumer calls restore during automatic pending
- **THEN** it joins the current operation without a second read

#### Scenario: Retry after error

- **WHEN** a consumer calls restore again after error
- **THEN** a new read starts and prior responses are invalid

### Requirement: useHydrated means waiting has finished

UseHydrated MUST remain false on the server and while initial source operations are pending. It MUST become true after all participating sources reach terminal ready/error/timeout. The detailed reason for completion MUST remain available through status.

#### Scenario: Slow async source

- **WHEN** the sync source finished while the async source remains pending
- **THEN** useHydrated remains false

#### Scenario: Waiting ends with timeout

- **WHEN** the last pending source times out
- **THEN** useHydrated becomes true and status retains timeout

### Requirement: External changes cannot bypass guards

Consumers MUST be able to ignore external layout changes. This policy MUST cover subscribe/pull and late source snapshots. URL navigation MUST retain explicit Back/Forward synchronization separately from one initial restoration.

#### Scenario: Layout ignores backend events

- **WHEN** externalChanges ignore is configured and the source publishes a new value
- **THEN** the current layout does not change and the event does not restart restore

#### Scenario: Browser Back

- **WHEN** the user navigates back in URL history
- **THEN** URL fields match the restored location without an extra write-back

### Requirement: SSR does not read ambient storage

Server rendering MUST NOT read localStorage/backend or start their writes. Render-scoped URL sources MUST retain synchronous SSR seeding. Ambient restoration MUST begin on the client with a consistent initial render.

#### Scenario: Server-rendered layout

- **WHEN** a persisted store renders on the server with an ambient backend
- **THEN** the server uses defaults, useHydrated is false, and no ambient I/O occurs

### Requirement: Uncommitted renders do not own retained cache lifetimes

Cached React instances created by an abandoned render MUST NOT establish committed defaults, birth services or retained cache lifetime. Commit activation MUST use the committed owner context; legitimate duplicate observers MUST converge on the canonical committed instance. Render MUST perform no ambient I/O.

#### Scenario: Suspended render is replaced before garbage collection

- **WHEN** one render with old defaults/services suspends without committing and another owner commits the same address with new initialization
- **THEN** the committed owner does not inherit the abandoned render's defaults or setup context

#### Scenario: Abandoned render never mounts

- **WHEN** a render creates an instance but React never commits its Provider
- **THEN** it leaves no indefinitely retained cache entry or active persistence subscription

### Requirement: Pending URL patches survive router acknowledgement delay

Multiple URL patches MUST preserve previous unacknowledged edits while the router still exposes an older location snapshot. Location acknowledgement and actual external navigation MUST reconcile pending intent without suppressing Back/Forward or discarding foreign query parameters.

#### Scenario: Search and page change before the router renders

- **WHEN** q becomes boots then page becomes 2 before the first navigation reaches the rendered router snapshot
- **THEN** the final URL retains both q=boots and page=2 with foreign parameters preserved

### Requirement: Source defaults precede every restore or seed

All participating source bindings MUST capture original defaults before any source seeds or restores
the store. An earlier URL seed MUST NOT become a later source's default or change first-present-wins.

#### Scenario: URL and browser storage declare one shared field

- **WHEN** URL seeds boots, the original default is empty, and browser storage contains coat
- **THEN** URL boots retains precedence and browser-source reset restores the original empty default

### Requirement: External read authority is record-specific

Async external reads MUST capture connection/generation and record revision validity at read start.
A local edit to one record MUST NOT discard another clean record's update. Reset/disconnect/disposal
and newer external reads MUST still invalidate obsolete responses or error reports.

#### Scenario: A changes while an external B value loads

- **WHEN** A is edited during an async external snapshot containing a new value for untouched B
- **THEN** A remains locally edited while B accepts its still-current external update

### Requirement: Unlimited waiting is an explicit override

TimeoutMs MUST accept null to disable an inherited deadline. Undefined MUST inherit, numeric values
MUST remain finite and nonnegative, and joining a pending restore MUST preserve its original deadline.
Per-call RestoreCallOptions MUST contain timeoutMs only; externalChanges remains a lifecycle policy.

#### Scenario: Draft loading disables the shared two-second deadline

- **WHEN** shared timeoutMs is 2000 and draftsApi overrides timeoutMs to null
- **THEN** draftsApi remains pending beyond two seconds and can apply its current eventual response

#### Scenario: An explicit retry disables its source deadline

- **WHEN** a terminal source operation is retried with timeoutMs null
- **THEN** that new operation has no finite timeout while pending joins remain unchanged

#### Scenario: Retry options attempt to change external policy

- **WHEN** consumer code passes externalChanges to handle.restore
- **THEN** public types reject the unsupported per-call option instead of silently ignoring it

### Requirement: Concurrent cached owners preserve mount-time identity

Compatible committed owners of the same cached address MUST receive the canonical store before
mount effects can retain or mutate a discarded candidate. This MUST NOT allow abandoned renders to
establish retained defaults, service context or ambient I/O.

#### Scenario: Two cold owners initialize the same cached store

- **WHEN** same-address owners apply increments one and ten from their initial child mount effects
- **THEN** both effects target the canonical store and its final count is eleven

### Requirement: URL navigation ownership includes external writes

Routing adapters MUST distinguish external PUSH/REPLACE navigation from their own pending commits
where their public router APIs expose ownership. External navigation to an older pending target MUST
cancel newer optimistic intent rather than resurrect it. Query-only writes MUST preserve fragments.

#### Scenario: Application navigation selects an older pending query

- **WHEN** React Router has pending older/newer commits and application navigation selects older
- **THEN** reads and subsequent unrelated patches reflect the external older location

#### Scenario: Query changes while an anchor exists

- **WHEN** a persisted query field changes on a URL ending in hash details
- **THEN** the existing fragment remains in both Next and React Router query-only commits

#### Scenario: A Next.js query write follows native Back under a base path

- **WHEN** a query is written after popstate and before Next publishes the committed route
- **THEN** it updates the restored page without duplicating its base path

### Requirement: Edits after default capture precede connection restoration

Application changes between pure default capture and connection MUST become tracked dirty intent
before restoration changes observed baselines. Source seed/system writes MUST NOT be misclassified
as user edits in another source, and failed preparation MUST leave no orphan writer.

#### Scenario: A child mount effect initializes persisted state

- **WHEN** render captured width 320 and a child layout or passive effect sets 500 before plugin connection
- **THEN** restoration cannot overwrite 500 and flush saves it through either manager binding

### Requirement: Operational URL locations belong to committed renders

Pure render snapshots MUST remain available for synchronous SSR/client seeding separately from live
operational port state. A suspended or abandoned router render MUST NOT change existing port reads
or the destination of commits on the still-active screen.

#### Scenario: Navigation suspends before a new route commits

- **WHEN** the committed location is old and a transition renders new but suspends
- **THEN** existing port reads/writes still use old while new render candidates can seed from their own pure snapshot

### Requirement: Cancelled routing commits release optimistic intent

Where router cancellation is observable, a blocked/cancelled commit MUST remove its affected pending
journal entry/token and reconcile authoritative location. Async routing acknowledgement MUST reflect
completion or rejection rather than the mere return of a navigation function.

#### Scenario: A data-router blocker cancels a persisted query change

- **WHEN** a query write is blocked and the application resets the blocker
- **THEN** port reads reflect the unchanged URL and later unrelated edits cannot resurrect the cancelled query

### Requirement: The owning cache container bounds retained entry lifetimes

A genuine outer cache Provider termination MUST release all owned entries and plugin connections,
including infinite-gcTime entries. Individual store Provider keepalive and StrictMode synthetic
cleanup/reconnect MUST retain their existing behavior. Independent containers MUST remain isolated.

#### Scenario: A cache container is recreated beneath an unchanged source registry

- **WHEN** the outer cache Provider disappears and a fresh one later mounts the same store address
- **THEN** the unreachable old cache cannot retain a conflicting source owner and the new store restores normally

#### Scenario: StrictMode replays effects without ending the cache container

- **WHEN** React performs synthetic effect cleanup and setup on a committed cache Provider
- **THEN** retained store identity and once-only plugin activation remain intact

#### Scenario: One of several containers ends

- **WHEN** one independent cache Provider unmounts while another remains committed
- **THEN** only entries belonging to the terminated container are released

### Requirement: Router query updates preserve arbitrary application location state

React Router adapters MUST preserve the value and shape of application location.state during
query-only writes. Own navigation identity MUST use a separate observation channel and MUST retain
cancellation, blocker and committed-render guards without patching router or history methods.
Unsupported identity observation MUST fail explicitly rather than silently treating a foreign
navigation with an identical query as an own acknowledgement.

#### Scenario: Application history state is a primitive or array

- **WHEN** a query field is saved while location.state is a string, null or array
- **THEN** the application still observes the same value and shape after acknowledgement

#### Scenario: A foreign navigation targets the same query

- **WHEN** an external navigation independently targets the outstanding own query
- **THEN** its distinct navigation identity is retained rather than inferred from query equality alone

#### Scenario: Own navigation is blocked or its screen suspends

- **WHEN** navigation has not been accepted or its operational render has not committed
- **THEN** the write cannot be acknowledged just because the requested query matches
