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
