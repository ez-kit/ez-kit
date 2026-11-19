# Design

## Context

`proposal.md` describes motivation and scope. The investigation covered zu-store 1.2.0,
store-core 1.2.0, store-persist 1.0.0 and the shared Valtio binding.

- `store-core/src/store-id.ts` already encodes `[path, name, id]` without separator collisions.
  Cache passes this identity through plugin context, but persistence does not use it.
- `store-persist/src/key-naming.ts` derives keys from fields and prefixes only. `bindPersist`
  groups fields by source before accessing the Provider, preventing omitted source declarations.
- `plugin.tsx` reads a snapshot, then connect repeats get; the hydration tracker completes
  immediately after connect even for a Promise. Defaults are recaptured at first setup after
  initial Provider initialization; that ordering must remain intact.
- `engine.ts` lacks async-apply validity checks, treats writes as committed before acknowledgement
  and does not serialize arbitrary async ports. Dispose does not invalidate all scheduled callbacks.
- Storage set replaces the blob with connected bindings. IndexedDB has its own queue; get hides
  errors, and container migrations may write from a read operation.
- Handles expose only source/runWithMeta. Cache hits do not rerun plugin setup; retained instances
  remain connected until cache cleanup.
- `zodParam` combines decoding with validation of the current shape, obstructing older shapes.
- URL set already preserves foreign parameters and push/replace. Its own projection does not
  justify putting storage envelopes into query strings.

The investigation ran 426 existing tests successfully across three target packages. Isolated checks
reproduced late application after disconnect, loss of foreign records through whole-blob writes,
and reversed completion order of custom async writes. These findings require regression tests;
they are not evidence that the implementation was already fixed.

ADR 0015 (grid state extraction) and ADR 0017 (release from develop) were reviewed. Neither changes:
the engine gains no forced-column rules, and the release pipeline remains intact.

## Goals / Non-Goals

**Goals:**

- Extend the existing engine and StorePort bindings without a separate dashboard storage system.
- Model every storage mutation as an acknowledged command with defined ordering.
- Expose lifecycle before the first client frame and bind it to the instance.
- Provide the same guarantees through the existing Zustand and Valtio package fronts.

**Non-Goals:**

- Implementing a dashboard, its loader/resize props or a concrete server backend.
- Local-first/backend fallback, record fan-out, device synchronization or distributed locks.
- Automatically transferring unaddressed legacy data without application-owned mapping.
- Replacing container migration rules or automatically persisting all store fields.

## Decisions

### 1. One contract without mode (Durable)

The new guarantees become the standard behavior of declared persistence. There is no
`mode: 'records'`, parallel legacy engine or separate record option. Adapter arrays remain
supported because they do not require the old execution model. This reduces lifecycle and
error-state combinations.

A separate dashboard backend and an opt-in record mode were rejected: both duplicate engine
responsibilities. The user explicitly approved proceeding without mode and with a breaking minor.

Consumer composition (`serverPort` implements the updated SourcePort):

```tsx
const adapters = {
  localStorage: localStorageAdapter({ storageKey: 'dashboard-layouts-v2' }),
  server: { port: serverPort },
}

<PersistProvider adapters={adapters} defaultSource="localStorage">
  <cache.Provider>
    <cache.Scope path={['devices']}>
      <panel.Provider id="workspace" defaultValue={{ width: 320 }}>
        <WorkspaceGate />
      </panel.Provider>
    </cache.Scope>
  </cache.Provider>
</PersistProvider>
```

A field without source uses localStorage; a field with `source: 'server'` uses only the backend.

### 2. Resolve the registry on connection (Durable)

The Provider accepts maps or arrays. Normalization yields an immutable registry and defaultSource.
Map keys are authoritative; an adapter's internal source is optional and is not an alias.
Duplicate array sources are rejected. Map property order is not configuration.

`withPersist` still attaches capabilities/handles and retains typed field declarations. Final
sources, StoreId and logical keys resolve from plugin context at setup before reading.
Nested Providers merge parent registries with their sources/defaultSource; EnginesContext and
PERSIST_ENGINES expose the same effective registry. A parent owns its engines; a child disposes
only engines it created.

Each render-scoped adapter gets its own keyed internal component invoking usePort. Children must
not see a partially ready registry and mistakenly diagnose sources as missing during internal mounts.

A fresh map with the same registrations is valid on rerender. Changing names, ports or adapter kinds
requires remount. Bindings retain their birth registry identity. Cache reuse with another registry
is diagnosed and requires recreating the entry rather than hidden rebinding. Account changes must
recreate the account-scoped Provider and cache together.

Live replacement was rejected because transferring dirty writes and defaults between backends
would require additional semantics outside this request.

### 3. StoreId remains the shared identity (Durable)

The logical address is `{ store: StoreId, field: readonly string[] }`. A whole field is the unit
of versioning/reset; a consistent layout is best held in one `layout` object. Canonical storage
keys use a recognizable format prefix and a JSON tuple containing `serializeStoreId(store)` and
field path. Scope membership compares store.path segments.

Cached stores receive their existing context address without extra props. Ordinary context
Providers accept optional `address: StoreId`; otherwise the existing stable named singleton
address applies. Distinct live stores sharing an address in one engine cause a collision error.
Changing address recreates the instance.

Public encoding/matching helpers belong to store-core. I/O, schema and persistence trackers do not.
Existing cache scopes do not become one global namespace shared by independent cache instances.

Storage keys cannot escape StoreId through absolute/prefix. Those old storage options are rejected
with a migration hint; key can name a stable field inside its store address. URL uses
key/absolute/prefix only for physical projection and checks collisions. The engine owns one
logical address; the adapter selects its representation, not a second state model.

### 4. Extend Keyed and SourcePort rather than replace them (Durable)

Transport remains `Keyed`, a map of string logical keys to strings. StorePort remains manager-agnostic.
SourcePort receives read context with fields/addresses and an optional signal; CommitCtx receives
structural addresses for its diff. URL needs read context to project physical query keys to
canonical logical keys; storage may read a whole namespace.

Custom SourcePort implementations apply only diff.set/diff.removed. Absence from desired cannot
justify deleting an untouched record. Adapters declare version metadata support and provide
removeScope for complete subtree deletion, including unmounted records. Unsupported schema
versions or full reset produce explicit capability errors before their operations. These
capabilities describe source facilities, not a choice between old/new modes. Sync ports may
still complete synchronously.

Backends must wait for actual mutation acknowledgement. Subscribe reports external changes,
not echoes of their own commits. For version-capable sources the engine handles tagged envelopes;
other sources carry raw payloads at version 0. schema.validate works in both cases. Public get
accepts ReadCtx and set accepts the updated CommitCtx; contract type tests pin the new context
fields before adapting bindings.

Web Storage reads/modifies/writes the latest blob; IndexedDB uses transactions. Both preserve
foreign/legacy keys and implement removeScope over the complete canonical key set. Built-in
physical namespace identities diagnose independent writers to one storageKey. Custom adapters
document their own physical ownership.

URL preserves readable parameters and navigation. It supports unversioned parse/validate and
removal of known fields, but advertises neither persistent version metadata nor full deletion of
unmounted scoped fields. Such requests fail explicitly; consumers select storage sources when
resetScope is used alongside URL. A URL version manifest was rejected because it enlarges deep
links for a storage use case.

### 5. Record versions are separate from packaging (Durable)

A storage record string contains a tagged envelope with version and serialized parser payload,
for example `{ kind: 'ez-kit.persist.record', version: 2, value: '<encoded payload>' }`.
The tag and canonical key distinguish this format from arbitrary old JSON. Explicitly imported
unversioned payloads mean version 0. The physical `{ v, s }` blob can remain: v versions the
container, while s contains individual record strings.

Omitted schema.version means 0. Versions are finite nonnegative integers, and minVersion defaults
to 0. Metadata and future/minVersion checks precede decoding the payload. The pipeline is
metadata -> decode -> migrate a supported old version -> validate -> apply.

```ts
field((s) => s.layout, {
	parser: paramJson(),
	schema: {
		version: 2,
		minVersion: 1,
		migrate: migrateLayout,
		validate: (value) => layoutSchema.parse(value),
	},
})
```

`migrate(value: unknown, fromVersion: number): unknown` and `validate(value: unknown): TCurrent`
are synchronous and perform no I/O. Validation may normalize; its return value is applied.
Successful migration or normalization that changes serialization queues an ordinary rewrite only
while the operation token and dirty revision remain valid. Field builder types accept unknown
decoded input and check validate output against the field type. Without validate, the parser
must provide the field value itself.

Old records without migrate, below-minimum versions and damaged individual records produce
addressed delete commands. Future versions block automatic writes/deletes, including clearOnDefault,
while memory stays editable. Explicit reset clears the block after deletion is acknowledged.

Protection also applies to edits after timeout before the initial read exposed metadata. CommitCtx
carries each address's maximum supported version. Version-capable adapters check existing metadata
before writes/clearOnDefault and reject overwriting future formats. Web Storage checks during
read-modify-write, IndexedDB within its transaction. Concurrent backends need conditional writes:
a preceding GET alone is not atomic across clients. Explicit reset is a separately authorized
destructive command.

Remove zodParam, validator files, build entries, package subpaths and their budgets from
store-persist and both bindings. Zod examples use schema.validate; the engine gains no required
runtime Zod dependency. Remove its peer declaration only when no other use remains.

Container migrate keeps its previous result semantics: old containers without migrate pass through,
and throws retain the previous container fallback. Separate computation from rewrite; acknowledge
rewrites through the generation-aware source queue rather than writing inside get after timeout.
Document the observable timing change. Per-record minVersion does not apply to containers.
ReadCtx stages rewrite data without direct I/O. The engine accepts it only from a current read,
binds it to the source revision and drops it before sending if obsolete, preserving neighboring edits.

### 6. Automatic restoration belongs to the instance (Durable)

The main API requires no consumer useEffect:

```tsx
withPersist({ restore: { timeoutMs: 2000 }, fields })

function WorkspaceGate() {
	const status = usePersistStatus(panel.useStore())
	return status.restore === 'pending' ? <Loader /> : <Workspace />
}
```

Prepare the tracker before the first client status read, pending for a new participating instance.
Actual reading starts from connection lifecycle, not consumer code. SSR performs no ambient I/O;
URL stays synchronously seedable. Optional pure synchronous `StorePlugin.seedRender` runs during
server/client render; observers and ambient reads stay in setup after commit. React cache defers
setup until addObserver, while imperative cache retains immediate setup by default.
The library imposes no timeoutMs default; a dashboard chooses roughly 2000 ms. A numeric timeout must be
finite and nonnegative; 0 ends async waiting immediately. Explicit null disables a shared deadline.

One initial source-binding operation uses one read. The instance retains its Promise/results.
StrictMode reconnect may join the same still-current instance operation, but disconnected
callbacks apply nothing. Full release/GC, engine disposal or reset permanently closes its old generation.

Restore states are pending -> ready/error/timeout. Idle is reserved for disconnected/inert handles;
a normal new store does not show idle/ready before actual waiting. Ready includes per-record
outcomes such as invalidated/future-version: reading completed with addressed diagnostics.
Error means read/whole-operation failure. useHydrated reports terminal initial waiting across
all sources, not successful I/O.

Operations track connection tokens, instance/scope generations and record revisions. Any user
mutation increments revision and marks editedSinceBirth even if the value returns to default.
Apply uses distinct restore/reset origins rather than marking user-dirty. Restore never replaces
an editedSinceBirth field.

Timeout closes the token and best-effort aborts. Late resolve/reject cannot alter baseline,
status or dirty, or trigger invalidation/migration. Timeout/read error is not a mutation and
cannot schedule saving defaults. Dirty-only flush excludes untouched pending fields. User writes
after timeout persist independently of the unresolved get.

Restore during pending joins the current Promise without changing its deadline. Explicit calls
after terminal status retry, using a supplied timeout for the new operation. Cache hits do not
restore automatically. Retry respects editedSinceBirth; deliberately replacing edits with a
loaded preset is a separate application command.

Ambient externalChanges defaults to ignore; URL navigation defaults to apply. Explicit ambient
apply uses fresh external generations and rejects old read results. Ignore covers subscribe/pull,
not only initial restore. Document this observable cross-tab behavior change in the migration guide.

### 7. The queue separates intent from acknowledgement (Durable)

The engine owns one source mutation queue: patches, addressed deletes, scope deletes and container
rewrites. Only one mutation runs at a time. Reads do not block new user writes; their results are
revision/generation-guarded. Scheduled microtasks/timers check lifecycle validity.

Each address has desired revision, acknowledged revision and latest payload. Reading a baseline
is not write acknowledgement. An old acknowledgement cannot clear newer dirty state. Queued
patches coalesce by address only up to the next reset barrier. Do not copy IndexedDB's old
whole-map last-write-wins queue literally: that would discard unrelated patches.

Flush captures a revision fence and returns a Promise confirming changes up to it. An acknowledged
superseding revision satisfies an older fence; newer edits do not expand the wait. I/O/serialization
errors retain dirty state and surface through rejected flush/status. Automatic operations always
handle rejection. Future versions produce an explicit blocked error rather than false flush success.

### 8. Reset is a barrier, not eviction (Durable)

```ts
await persistHandle(store, 'server').reset() // all fields of this source binding
await persistHandle(store, 'server').reset({ fields: [['layout']] })
const persistence = usePersistence()
await persistence.resetScope({
	path: ['devices'],
	sources: ['localStorage', 'server'],
})
```

Omitting sources selects all visible sources. Preflight capabilities of every selected source
before changing memory; unsupported cannot become a partial mounted-only reset. After preflight,
results contain one outcome per source without a distributed transaction.

Reset establishes a new generation, closes old reads and removes queued writes for selected
addresses. Memory resets immediately in one StorePort batch per store, without user-write origins.
Deletion follows any already-sent mutation; new edits follow deletion. Repeated reset creates the
next barrier.

The engine already knows retained cached bindings; no dashboard registry is needed. Adapter
removeScope covers the complete persistent namespace, including evicted records. Scope generation
and pending-deletion barriers cover new connections: they cannot read the old scope before delete
completion or restore it after deletion fails.

Capture defaults once after initial Provider initialization and before hydration. Snapshot supported
plain data/arrays/Date through either StorePort without retaining mutable proxy references; each
reset creates fresh values from that snapshot. Remount cannot adopt hydrated state as new defaults.
Controlled dashboards omit their own persistence; existing controlled/store initialization order
remains unchanged.

Delete failure keeps memory default, the generation closed and deletion pending for reset/flush
retry. After application reload, an unacknowledged deletion is not proven: the old saved value may
still exist until the backend confirms reset.

### 9. Observability is not store state (Durable)

Handle/status trackers live off-band and do not enter history, snapshots or serialization.
`persistHandle(store, source?)` retains the first non-URL shorthand and runWithMeta; new code with
multiple sources selects a source explicitly. Handle snapshots expose field detail.
`usePersistStatus(store, source?)` without source aggregates all participating bindings.

Snapshots contain restore, write idle/pending/error/blocked, dirty, writeBlocked and error.
Handles expose getStatus/subscribe/restore/flush/reset. Functions and snapshots are stable for
useSyncExternalStore; server snapshots perform no ambient reads.

Common onError receives operation read/write/remove/removeScope/decode/encode/migrate/validate,
source, and one address, batch addresses or scope. Sync throws and rejected Promises are handled
identically. Built-in storage no longer hides errors behind console.warn; IndexedDB reads no
longer disguise failures as absence. Stringify errors retain dirty in-memory state. Consumer error
callbacks must not break internal drain/cleanup.

Persist status inside store state was rejected because it triggers redundant persistence and mixes
UI models with I/O diagnostics.

## Risks / Trade-offs

- [Breaking minor API] -> explicit user exception dated 2026-11-13, limited to this change;
  release notes and migration guide list incompatibilities. Do not change general semver policy.
- [Valtio re-exports the shared engine] -> adapt both bindings and verify mixed-manager sources;
  do not leave va-store incompatible or link package versions through a fixed group.
- [Lost backend response does not prove cancellation] -> require mutation acknowledgement;
  uncertain outcomes need server generations/conditional writes for strict reset guarantees.
- [Several tabs write one blob] -> local ordering is not a distributed lock. Document limits;
  cross-device conflict resolution needs a separate backend protocol.
- [I/O hangs forever] -> the UI stays usable; restore supports timeout, but write timeout must
  not authorize unsafe parallel commits. Durability stays pending until an outcome/retry.
- [Reading whole backend namespaces is expensive] -> get accepts addressed read context for
  selective reads. The server deletes scopes without enumerating mounted stores.
- [Parser cannot decode old payloads] -> format owners need a decoder that understands old
  serialization; migrate cannot repair a string the decoder cannot read.
- [URL lacks some storage capabilities] -> explicit capability errors before those operations;
  promise neither full deletion of unmounted URL fields nor a technical manifest in deep links.
- [Old application damages a new blob] -> use a new storageKey on upgrade. New code protects
  future records but cannot fix a previously published old writer.
- [Published caret ranges accept an incompatible minor] -> new dependency floors protect new
  bindings from old engines, not old bindings from new engines. Existing applications need a
  retained lockfile/pinning or a coordinated binding upgrade. This accepted exception has an
  unavoidable compatibility cost that must be prominent in release notes.

## Migration Plan

1. Implement the contract/specs in the task stages, checking both bindings and URL adapters.
2. Update source adapters for patches, read context and capabilities. Move container get mutation
   side effects into the queue while preserving container migration results.
3. Remove zodParam exports/build entries and update docs with parser + schema.validate, including
   scalar URL codecs (paramNumber/paramEnum rather than JSON for every scalar).
4. Explain StoreId replacing storage prefix/absolute, stable name/id and explicit context Provider
   address. There is no automatic legacy mapper; applications may transfer known old keys once
   through the new format and schema pipeline.
5. Recommend a new storageKey for incompatible rollout. Keep the old key. Rollback restores the
   previous application using that key; new namespace edits are not automatically imported back.
   This planning change does not publish production releases.
6. Add minor changesets for affected public packages with BREAKING and migration links. Check
   dependency floors after bumps and document existing caret-range risks: this release cannot
   repair old publications. Coordinate affected bindings while retaining independent versions
   and the existing develop/main release flow.
7. Before archive, copy Durable decisions into ADRs and link short rules from AGENTS.md. Record
   the limited minor exception separately without changing policy for other releases.

## Open Questions

None are blocking. The exact internal key prefix/envelope tag can be chosen during implementation
and pinned by fixtures without changing logical addressing, scenarios or public API.

## Audit hardening approved on 2026-11-14

The audit exposed missing interleavings despite the original green suite. The user authorized
all reported correctness and flexibility fixes. After discussing a concrete layout/draft example,
the user also approved source-specific initial restoration settings while retaining shared defaults.

- Queue jobs have explicit operation identity/type and acknowledgement ownership, including container
  rewrites and namespace deletion. Superseding a reset transfers its waiters to acknowledged deletion
  rather than reporting success for an empty job. Flush captures the applicable operation fence;
  operations without live RecordState entries still contribute to durability/status/errors.
- Failed scope barriers block their own records, not independent scopes. A binding flush retries only
  applicable failures. Each binding's throttle controls its own ready patches; an idle slow binding
  cannot delay unrelated edits. Disconnect preserves already-observed dirty intent before detaching.
- A valid retry invalidates obsolete pending invalidation/deletion intent. User edits and future-version
  protection retain precedence. Reset remains a barrier rather than cache eviction.
- A dedicated optional SourcePort.rewriteContainer method handles staged container migrations. Opaque
  application meta never authorizes replacement or bypasses patch/version guards. This is an explicit
  source operation, not another persistence mode. Built-in IndexedDB ports provision missing object
  stores by safe schema upgrade, release/reopen owned connections on versionchange, and preserve others.
- URL adapters retain optimistic pending patches until location acknowledgement, merging new patches
  without losing previous unrendered edits and reconciling actual navigation/Back/Forward and foreign keys.
- Persistence registry identity depends on source engines/defaultSource, independently of surrounding
  dependency injection. Returned usePort identities are checked even when the hook function is stable.
  Fresh React render candidates remain outside the retained cache until commit. Abandoned render cannot
  reserve defaults or context; commit adopts the current context and converges concurrent owners on one
  canonical instance without ambient render I/O.
- Field helpers preserve separate decoder and validated output types and accept source aliases. Explicit
  named handles cannot collide with shorthand selectors or silently resolve unknown names. Reset validates
  all requested fields before changes, with typed paths where state is available through either binding.

These are refinements of the accepted single-engine architecture. They add no public mode, live
backend switching, distributed atomicity, implicit legacy transfer or automatic source fallback.

### Source-specific restore overrides

`PersistOptions.restore` accepts shared timeoutMs/externalChanges defaults and optional `sources`
overrides indexed by the effective registered source alias. For example, timeoutMs 2000 applies to
settingsApi while sources.draftsApi.timeoutMs 10000 gives draft loading more time; its externalChanges
can independently be apply. The plugin resolves these options before initial reads and merges only
that source's override, without mutating application configuration or creating fan-out/fallback.
Source-specific handle.restore still takes RestoreOptions rather than a whole multi-source map.
A pending restore keeps its original deadline; terminal explicit retries use the effective source
default unless their own timeout is supplied. Unknown override names are configuration errors before
I/O, while registered sources unused by a particular store are allowed. Cache hits retain their
committed instance lifecycle and effective policy.

## Second audit refinements approved on 2026-11-16

The user approved all reproduced second-audit correctness fixes, source-specific write policies and
explicit unlimited restoration. IndexedDB cross-tab notifications remain under discussion; its
optional subscribe capability is not added in this change.

- Capture defaults and assign addresses for all source bindings before any render seed or setup read.
  Source setup rolls back successful connections on later failure. Engine connection preflights all
  addresses/capabilities before acquiring ownership.
- Detached handles must await/retry retained dirty writes or reject disconnected access, never report
  false durability. Disposed reset and resetScope reject promptly. Authoritative absence releases stale
  future-version protection while adapter checks still guard subsequent races.
- External async reads capture binding generations and per-record revisions. Editing one record must
  not discard an unrelated clean record; obsolete responses must not cross reset/disconnect boundaries.
- Cached concurrent owners must use the same committed instance before descendant mount effects.
  Render-only candidates must still leave no retained reservation, ambient read or subscription.
- URL query commits preserve the current fragment. Navigation identity distinguishes own acknowledgements
  from external PUSH/REPLACE as well as POP, including externally chosen pending targets.
- Existing root throttleMs and clearOnDefault remain shared write defaults. Optional write.sources maps
  effective aliases to PersistWriteOptions overrides. Unknown aliases fail before any source I/O;
  unused registered sources remain valid. No new source fan-out, mode or fallback is introduced.
- RestoreOptions.timeoutMs accepts null as explicit unlimited waiting, including source overrides and
  explicit retries. Undefined inherits. A pending join cannot change its existing deadline.
  RestoreCallOptions contains only timeoutMs; externalChanges remains a lifecycle/source policy rather
  than an accepted-but-ignored option on handle.restore.

### Compatible cold cache ownership

Cold same-address React owners share only candidates with identical defaultValue reference and
ServiceRegistry identity. Omitted defaults use a stable empty seed. Candidate
references are weak and finalization removes abandoned index metadata; only commit establishes
retained cache/plugin ownership. Conflicting cold initialization is invalid and diagnosed at commit,
without a promise that React suppresses all effects after a commit-phase error. Existing committed
instances continue to win ordinary cache hits.

Render-scoped navigation changes a separate initialization service stamp, not the stable
PersistEngines identity. This excludes abandoned old-URL candidates from new initialization without
another source read or ambient render I/O. React Router ownership uses its documented navigation
state; the reserved metadata key is documented. Next lacks a public navigation ownership token, so
same-path external navigation identical to an outstanding own target remains explicitly ambiguous.

## Third audit refinements approved on 2026-11-16

The user approved the third audit's reproduced engine, URL, codec/type and cache-cleanup fixes.
The existing single-engine design, source policy options, compatible cold initialization contract,
explicit IndexedDB refresh choice and one-time release exception remain in force.

- Address ownership includes retained detached write intent. A new instance at an address must not
  coexist with replayable obsolete unsent writes; already-sent mutations remain ordered. Ownership
  supersession must explicitly transfer/cancel durability targets rather than acknowledge unpersisted
  intent or strand a flush. Default capture precedes connection, and intervening application edits
  must be observed before restoration can replace the comparison baseline.
- Promise handling recognizes valid cross-realm asynchronous values and assimilates them safely,
  while plain synchronous reads/writes remain synchronous. A foreign Promise is not record damage.
- URL sources distinguish pure render seed snapshots from committed operational reads/commits.
  Suspended/abandoned routing renders cannot redirect existing live-port operations. Cancelled or
  blocked routing commits must reconcile optimistic entries and settle their acknowledgement rather
  than leave cancelled intent pending forever. Preserve SSR, foreign params, fragments and ownership.
- Array equality composes the item codec's semantic equality. Array transport must distinguish an
  empty item from an empty array and preserve supported custom separators; retain legacy decoding
  when unambiguous. Non-finite numeric input rejects. Typed reset paths stringify numeric dictionary
  keys consistently with runtime field extraction and source-specific path validation.
- Cached plugins dispose in reverse setup order. Every cleanup runs despite other failures; cache
  metadata/membership is removed in all paths and cleanup errors remain observable after release.

## Fourth audit refinements approved on 2026-11-18

The user approved all five reproduced fourth-audit findings. These refinements preserve the accepted
single-engine architecture, source policies, compatible cold ownership and explicit IndexedDB refresh.

- JSON equality follows actual JSON serialization (including toJSON) before deterministic recursive
  ordering. Safe object construction preserves own special keys. Changed validated Dates and JSON
  objects must never compare equal merely because their serializable data was discarded.
- The outer cache container has its own committed lifetime, distinct from individual store entry
  keepalive/GC. Genuine container disposal releases every entry and plugin, even at infinite gcTime;
  StrictMode's synthetic disconnect/reconnect must not destroy retained state or duplicate setup.
- A shared capability lifecycle runner gives cached and noncached stores the same setup rollback,
  reverse cleanup and error aggregation guarantees. Cleanup failures do not skip remaining resources.
- External corrective intent is distinct from newer user intent. Proven cancellation of an old URL
  command releases an unnecessary correction instead of echoing Back, while real newer user edits
  and durability waiters retain their own outcomes.
- Decorator identities encode the field/source tuple structurally. Arbitrary valid property strings
  and source aliases cannot collide through delimiter concatenation; subclass override order stays.

## Fifth audit refinements approved on 2026-11-19

Explicit remove/clear requests keep active cache entries and capabilities usable until their last
observer leaves; the request then overrides keepalive. Ending the outer cache container forcibly
releases every entry. Public write queues release drain ownership atomically with observing an
empty queue, so late enqueues cannot borrow a completed acknowledgement.

React Router navigation ownership must be tracked independently from application location.state;
query commits preserve arbitrary state and retain cancellation/blocker and committed-render guards.
Default snapshots must preserve supported serialization behavior without invoking validation on
application defaults. Proven no-commit cancellation is a public adapter outcome through both binding
fronts; generic errors retain uncertain-write recovery semantics.

Active cache eviction is recorded in ADR 0031. React Router ownership uses generated keys observed
read-only, separately from arbitrary user state, as recorded in ADR 0032. Data-router synchronous key
publication is an integration precondition; unsupported delayed publication reports an uncertain
outcome instead of dropping retry intent. Default snapshots retain supported data descriptors and
serialization, with fail-fast guards for opaque slots rather than destructive read invalidation.
