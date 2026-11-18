# Spec Delta

## Purpose

Defines persistence and reset under concurrent I/O so the latest user action is retained, errors do not stop the UI and reset covers the entire scope.

## ADDED Requirements

### Requirement: Writes acknowledge actions in order

Mutations of one source MUST execute serially. Pending writes for one address may coalesce to the latest value, but MUST NOT lose other addresses or cross a reset barrier. Memory MUST update without waiting for I/O.

#### Scenario: Three rapid edits

- **WHEN** A has been sent, B is pending, and the user sets C at the same address
- **THEN** C is saved after A; B may be skipped, but A cannot finish over C

#### Scenario: Edits to different records

- **WHEN** the user changes B and C during write A
- **THEN** the final persisted state contains the current values of all three addresses

### Requirement: Write errors retain dirty state

An unacknowledged edit MUST remain dirty after write failure. The error MUST NOT permanently stop later operations. Flush MUST allow retrying current dirty values without restoring superseded values.

#### Scenario: Retrying the current value

- **WHEN** writing A failed, memory already contains B, and flush is called
- **THEN** B is retried and the UI does not roll back to A or default

### Requirement: Flush waits for acknowledgement

Handle.flush MUST return a Promise acknowledging all applicable changes up to its call, or an error/block. A superseding write MUST satisfy the old value wait only after the newer value is acknowledged. Future actions MUST NOT make the wait unbounded.

#### Scenario: Waiting for durability

- **WHEN** flush is called with a write in progress
- **THEN** its Promise does not succeed before the corresponding persistence acknowledgement

#### Scenario: Continuous new edits

- **WHEN** the user keeps changing other values after flush
- **THEN** flush may finish after its captured revision is acknowledged without waiting for all future actions

### Requirement: Reset restores the original default

Record reset MUST immediately restore the persisted field original value and delete its saved override while retaining active store identity. Defaults MUST be captured before restoration and independent of later object mutations. Other fields MUST remain unchanged.

#### Scenario: Resetting one field

- **WHEN** layout is reset while view in the same store has a user value
- **THEN** layout returns to its initial default, its override is deleted, and view is retained

#### Scenario: Default was a mutable object

- **WHEN** nested layout properties changed after initialization and reset is requested
- **THEN** the original nested values restore rather than the mutated reference

### Requirement: Scope reset is complete and capability-aware

ResetScope MUST reset active and retained stores and delete all saved descendant records in the selected scope, including evicted and never-mounted components. It MUST explicitly report unsupported full deletion rather than claiming mounted-only reset succeeded.

#### Scenario: Panel is currently closed

- **WHEN** a scope contains active A, retained B and saved evicted C
- **THEN** memory A/B returns to defaults and overrides A/B/C are deleted

#### Scenario: Adapter cannot delete a full scope

- **WHEN** resetScope targets a source lacking the required capability
- **THEN** the operation reports unsupported before partially resetting selected sources

### Requirement: Reset is isolated by source

ResetScope MUST accept explicit sources or default to all visible sources. Scope and addresses MUST resolve through the current registry. Multiple-source results MUST report each success/error and MUST NOT promise distributed atomicity.

#### Scenario: Resetting browser only

- **WHEN** resetScope selects browser while server also holds settings for that scope
- **THEN** server remains unchanged

#### Scenario: One of two sources fails

- **WHEN** browser deletion succeeds while server rejects deletion
- **THEN** the result reports both outcomes without claiming complete success or browser rollback

### Requirement: Reset excludes old reads and writes

After reset, old read responses and migration rewrites MUST NOT restore the record. Pending old writes for selected addresses MUST be cancelled; an already-sent mutation MUST precede deletion. New edits MUST persist after deletion.

#### Scenario: Reset during a read

- **WHEN** a read starts before reset and completes after it
- **THEN** the response neither changes memory nor initiates a rewrite

#### Scenario: Reset during a write

- **WHEN** A is sent, B is pending, then reset and a new edit C occur
- **THEN** B is not sent; deletion follows A, then C is saved

#### Scenario: Mount during resetScope

- **WHEN** a new store within the scope connects before deletion is acknowledged
- **THEN** it does not restore data being deleted by resetScope

#### Scenario: Repeated reset

- **WHEN** a second reset follows a new edit waiting behind the first reset
- **THEN** the second reset cancels that pending edit and leaves deletion as the final action

### Requirement: Reset errors retain pending deletion

On deletion failure memory MUST remain at default and the operation MUST report an error. Unfinished reset MUST remain observable and retryable through flush/reset; stale data MUST NOT reapply to the current instance while deletion awaits retry.

#### Scenario: Backend rejects deletion

- **WHEN** reset restored memory defaults but server deletion failed
- **THEN** the handle reports the error, retains deletion intent and allows retry

### Requirement: Errors carry context

Common onError MUST receive source, operation and one address, batch addresses or scope. Sync throws and async rejections MUST be handled identically. I/O/schema failure MUST NOT destroy available memory state; status and subscriptions MUST expose failure without unhandled rejection.

#### Scenario: Synchronous quota error

- **WHEN** localStorage.setItem throws
- **THEN** the callback receives write, source and affected addresses while state stays usable

#### Scenario: Async read rejection

- **WHEN** the backend rejects a read
- **THEN** restore reaches error, the callback includes read and addresses, and memory stays default

#### Scenario: Scope deletion error

- **WHEN** the adapter rejects removeScope
- **THEN** the callback includes removeScope and the scope path

### Requirement: Adapter reliability boundaries are explicit

Adapters MUST settle mutation Promises after actual acknowledgement. An uncertain network outcome MUST NOT be treated as proven cancellation. When a server may commit after a client error, adapters MUST use server revisions/conditional operations for reset guarantees; documentation MUST distinguish these from local queue ordering.

#### Scenario: Lost server response

- **WHEN** a request may have committed but the client receives a network error
- **THEN** documentation and status do not claim proven absence of the server write

### Requirement: Controlled components may omit built-in persistence

Consumer components MUST be able to omit built-in persistence in controlled mode and keep state at application level. The engine MUST NOT contain resize/loader UI logic or dashboard-specific props.

#### Scenario: Controlled panel

- **WHEN** a dashboard receives controlled layout from the application without attaching internal persistence
- **THEN** the engine creates no hidden read/write for that panel

### Requirement: Every mutation has acknowledgement ownership

All queued mutation kinds MUST retain their identity and acknowledgement state, including container rewrites and scope deletions without live records. Applicable mutations MUST participate in flush fences and diagnostics. Superseding a reset MUST NOT resolve it successfully before actual deletion acknowledgement.

#### Scenario: A repeated reset still awaits deletion

- **WHEN** a write is in flight and two resets are queued before it completes
- **THEN** neither reset reports durable deletion merely because an earlier queued job lost its entries

#### Scenario: Container rewrite is still pending

- **WHEN** restore stages a container migration whose write remains unacknowledged and flush is called
- **THEN** flush waits for that applicable rewrite and exposes its failure as a write failure

#### Scenario: Scope contains only closed records

- **WHEN** a full scope deletion has no live record entries and source flush is requested
- **THEN** source flush still waits for the captured deletion operation

### Requirement: Scheduling and failed barriers are isolated

A binding's throttle MUST NOT delay unrelated ready bindings. A failed scope deletion MUST block its own records while allowing independent source jobs to proceed serially. Binding flush MUST NOT retry unrelated failed scopes.

#### Scenario: An idle slow panel shares a source with a fast form

- **WHEN** an idle panel has a 5000 ms throttle and another binding with no throttle changes
- **THEN** the fast binding does not wait for the slow panel's window

#### Scenario: Scope A fails while scope B remains writable

- **WHEN** scope A deletion fails, A has a blocked edit, and independent scope B changes
- **THEN** B can persist without completing or retrying A's deletion

### Requirement: Observed edits survive view disconnection

Disconnect MUST preserve already-observed dirty write intent before removing a binding from scheduled collection. This MUST NOT authorize applying a disconnected restore response or saving untouched defaults.

#### Scenario: Edit immediately before closing a panel

- **WHEN** a user changes a persisted value then the context disconnects before its throttle expires
- **THEN** the edit remains queued for persistence rather than disappearing with the binding

### Requirement: User metadata cannot authorize container replacement

Opaque application commit metadata MUST NOT change a patch into whole-container replacement or bypass version guards. Staged container migrations MUST use a distinct source operation.

#### Scenario: Application metadata has a containerRewrite property

- **WHEN** runWithMeta supplies containerRewrite true during a normal field edit
- **THEN** untouched records remain and ordinary future-version guards still apply

### Requirement: Detached flush retains durability semantics

A control handle MUST NOT report successful flush merely because its binding disconnected while
unacknowledged writes remain. It MUST wait/retry applicable retained work or reject unavailable access.
Disposed reset/resetScope calls MUST reject promptly without changing memory or leaving pending jobs.

#### Scenario: An offline save outlives the view

- **WHEN** a view edits a field, disconnects, and its retained write fails before handle.flush
- **THEN** flush does not report success without an acknowledgement of the applicable edit

#### Scenario: Scope reset is called from a stale callback

- **WHEN** a retained persistence service is used after its engine was disposed
- **THEN** resetScope reports rejection rather than a Promise that never settles

### Requirement: Source write overrides inherit shared defaults

Write.sources MUST override throttleMs/clearOnDefault per effective source alias within one
withPersist declaration. Root options remain shared defaults. Resolution MUST precede source I/O,
reject unknown aliases and preserve caller configuration. Registered unused aliases remain valid.

#### Scenario: URL is immediate while remote draft writes are throttled

- **WHEN** one store uses root throttleMs zero and its remote source overrides throttleMs to 500
- **THEN** URL changes are not held for the remote window and remote edits coalesce independently

#### Scenario: One source keeps explicit default values

- **WHEN** root clearOnDefault is true and a source overrides it to false
- **THEN** that source persists an edited default value while other sources retain ordinary removal

#### Scenario: A write override alias is unknown

- **WHEN** write.sources names a source absent from the effective registry
- **THEN** setup fails before reading any source or partially applying state

### Requirement: Detached retries respect address ownership generations

A detached old instance's unsent writes MUST NOT overwrite a newer owner's acknowledged intent at
the same address. Superseded durability waiters MUST settle explicitly without false acknowledgement
or indefinite waiting. Already-sent writes and destructive reset barriers MUST retain source ordering;
unrelated old records MUST remain retryable.

#### Scenario: An old offline value follows a newer acknowledged owner

- **WHEN** old width 500 failed before commit, the instance disconnected, and a new owner saved 700
- **THEN** source flush cannot replay 500 over 700

#### Scenario: Two generations have dirty intent for one address

- **WHEN** source flush sees old detached and new active revisions at the same logical key
- **THEN** the new intent remains authoritative and every captured waiter settles with acknowledgement or explicit supersession

### Requirement: Cached teardown releases all resources before reporting errors

Cached plugin cleanup MUST run in reverse setup order. One failure MUST NOT skip other cleanups,
retain membership/metadata or prevent clear from releasing other matching entries. Errors MUST remain
observable after release; reentrant replacement MUST NOT be removed by an older cleanup.

#### Scenario: A dependent subscription outlives its transport setup

- **WHEN** transport then subscription capabilities are set up and the cache entry is released
- **THEN** subscription cleanup runs before transport cleanup

#### Scenario: A cleanup throws during prefix clear or garbage collection

- **WHEN** one cleanup fails while multiple callbacks or matching entries remain
- **THEN** all release steps finish and the failure is reported only after eviction

### Requirement: Capability lifecycle guarantees match across store ownership paths

Cached and noncached stores MUST use consistent transactional setup, reverse rollback and
failure-isolated teardown. A later setup failure MUST release earlier acquired capabilities.
Cleanup failures MUST NOT skip other resources; original and rollback errors MUST remain observable.

#### Scenario: A later ordinary context-store plugin fails setup

- **WHEN** one plugin subscribed successfully and a later plugin throws
- **THEN** earlier setup is unwound rather than leaking a subscription from the failed mount

#### Scenario: Ordinary context-store cleanup fails

- **WHEN** one returned cleanup throws during unmount
- **THEN** every remaining cleanup still runs in reverse order before aggregate failure is reported

### Requirement: Proven cancellation removes unnecessary external correction only

Corrective intent created to protect an external value from an in-flight command MUST be distinct
from newer user edits. If cancellation proves the old command did not commit, its now-unnecessary
correction MUST NOT cause an echo write. Real newer user revisions, metadata, resets and fences MUST
retain their own outcomes; generic failures and accepted old writes MUST preserve needed corrections.

#### Scenario: Back cancels an unfinished URL write

- **WHEN** Back commits an older location while an own URL write is awaiting its loader
- **THEN** cancellation does not issue an extra replace, rerun the loader or alter the Back entry

#### Scenario: The user edits again after external navigation

- **WHEN** a newer user revision exists when cancellation settles
- **THEN** only the obsolete external correction is released and the newer edit can still save
