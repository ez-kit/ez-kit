# Scoped persistence migration

This is an explicitly approved **breaking minor** release of the store packages. It replaces the
previous persist behavior rather than introducing a `mode` or a second storage engine.
Update the binding (`@ez-kit/zu-store` or `@ez-kit/va-store`) and its shared dependencies together.
Use the same binding import paths for applications and custom source adapters.

## Before updating

- Keep the application's lockfile. Previously published caret ranges can resolve this incompatible
  engine minor on reinstall; raising dependency floors in new bindings cannot change old publications.
  Pin the previous compatible versions until the application is ready for the coordinated update.
- Back up existing data if it must be transferred. Prefer a new `storageKey` for the new application
  version so a still-open old application cannot replace its blob using the previous full-write logic.
- The packages still version independently. There is no fixed/linked changesets group and the
  repository's general semver policy does not change beyond this release exception.

## Register sources

```tsx
const adapters = {
	browser: localStorageAdapter({ storageKey: 'dashboard-layouts-v2' }),
	server: { port: serverPort },
}

<PersistProvider adapters={adapters} defaultSource='browser'>
	{children}
</PersistProvider>
```

The map key is authoritative, even when an existing adapter carries a different `source`.
The old array registration still works. A field's explicit source wins over defaultSource.
Missing or unknown source is now a configuration error with an address and available names.
Registering multiple sources does not create fallback or automatic fan-out.

Nested providers inherit the registry and can shadow a source name. They dispose only their own
engines. Keep ports and registration stable across renders; a new map containing the same ports is
fine. Changing ports, source names or defaultSource requires a remount. Recreate the corresponding
cache on account/backend changes: retained entries cannot silently adopt another birth registry.

## Use the existing cache address

```tsx
<cache.Scope path={['devices']}>
	<panel.Provider id='workspace'>{children}</panel.Provider>
</cache.Scope>
```

The logical record address is `{ store: { path, name, id }, field }`. Nested scopes append path
segments. Keep group names, IDs and paths stable across reloads. Storage `prefix` and `absolute`
options are replaced by this address; use `key` only to name the field inside its store address.

An ordinary context Provider may receive a full stable `address`. Without one it retains the named
singleton address; independent instances colliding within one source are rejected. Changing address
recreates the instance. Never use random values, mount order or React useId as persistence IDs.

Helpers/decorators can select aliases explicitly, for example localStorageField({ source: 'browser' }).
Their default source names remain unchanged; plain fields without source use defaultSource. A JSON
decoder returning unknown can be combined with a typed schema.validate through either helper front.
Explicit source handles validate the selected source; $persist/$url named sources do not collide with
legacy shorthand. Reset paths refer to persisted state paths and reject typos before mutations.

URL fields retain readable physical query keys and key/absolute/prefix projection, with collision
checks. They preserve unrelated parameters and push/replace/Back/Forward. URL does not advertise
version metadata or full reset of unmounted scoped records; unsupported operations fail explicitly.

## Replace zodParam with schema.validate

The `persist/validators/zod` subpath and `zodParam` are removed. Decode first, migrate an old
structure if necessary, then validate the current shape:

```ts
field((state) => state.layout, {
	parser: paramJson(),
	schema: {
		version: 2,
		minVersion: 1,
		migrate: migrateLayout,
		validate: (value) => layoutSchema.parse(value),
	},
})
```

Use the appropriate scalar codec for URL values, for example `paramNumber()` and
`schema: { validate: value => ratingSchema.parse(value) }` for a numeric rating. Zod is an
application dependency; the persist engine does not import it.

`migrate(unknown, fromVersion)` is a synchronous transformation without I/O. `validate(unknown)`
returns the current typed value, possibly normalized, or throws. Both callbacks are optional.
An absent version means 0; minVersion defaults to 0. Old unsupported or invalid records are
invalidated individually. Future records are left untouched and block automatic writes/deletes,
including a write after timeout before the initial value was read. Explicit reset may remove them.
Custom decoders must understand the serialized old payload before migrate can transform its value.

Adapter-level container version/migrate keeps its previous transformation rules. Its rewrite is
now staged through the engine queue so an obsolete read cannot overwrite a newer user action.

## Restore automatically and observe the result

```tsx
withPersist({ restore: { timeoutMs: 2000 }, fields })

function WorkspaceGate() {
	const status = usePersistStatus(panel.useStore())
	return status.restore === 'pending' ? <Loader /> : <Workspace />
}
```

Shared restore settings can be overridden with effective provider aliases:

```ts
restore: {
  timeoutMs: 2000,
  externalChanges: 'ignore',
  sources: { draftsApi: { timeoutMs: 10000, externalChanges: 'apply' } },
}
```

An unspecified source inherits the shared defaults. Overrides are resolved before the initial read;
unknown source names fail before I/O. A pending handle.restore still joins the original deadline.

No effect calling restore is needed. The core does not impose a two-second default: omit timeoutMs
to wait without a finite deadline. A timeout/read failure uses defaults for untouched fields and
never saves those defaults. User changes remain usable and are saved; old replies cannot apply,
rewrite or invalidate anything. An edit followed by a return to default still counts as an edit.

`useHydrated` now waits for all initial reads to reach ready/error/timeout. It reports that waiting
has ended, not that every record was valid or saved. `usePersistStatus` gives detailed restore/write
state and per-record outcomes. A cache-hit preserves the terminal result; eviction creates a new
lifecycle. A handle.restore call during pending joins that operation; after completion it starts an
explicit retry, still preserving user edits.

Ambient external changes are now ignored by default. Enable `restore.externalChanges: 'apply'`
explicitly if cross-tab updates should change the current UI. URL navigation remains reactive.

## Reset and flush

```ts
const handle = persistHandle(store, 'server')
await handle.reset({ fields: [['layout']] })
await handle.flush()

const persistence = usePersistence() // call this hook in the React component
const outcomes = await persistence.resetScope({
	path: ['devices'],
	sources: ['browser', 'server'],
})
```

Handle.reset without fields resets all persisted fields of that source-binding. Reset restores
the original initialization defaults, retains active store identity and removes overrides. Cache
clear/remove is still eviction and is not a substitute for reset.

ResetScope includes descendants and saved records of closed/evicted components. Sources defaults
to all visible sources, so select storage sources explicitly when URL is also mounted. Unsupported
full deletion is detected before any selected source changes memory. Outcomes report independent
success/failure per source; there is no distributed rollback.

The source queue orders an already-sent write before deletion, drops older pending writes and
orders new edits after deletion. Failed deletion leaves memory reset and the deletion pending for
retry. Flush waits for the revisions that existed at its call, not an unbounded stream of future
edits. It rejects on failed/blocked persistence; memory and dirty state stay available.

## Update custom adapters

SourcePort retains `get`, `set` and optional `subscribe` over Keyed. Get receives optional ReadCtx
with addressed fields and AbortSignal. Set receives diff, addresses and maximum supported versions.

- Apply **only** diff.set and diff.removed; absence from desired does not authorize deleting a key.
- Declare `capabilities: { recordVersions: true }` when supporting tagged record metadata. Guard
  normal writes and implicit deletions against existing future-version data using ctx.maxVersions.
  An explicitReset permits deletion, not arbitrary overwriting, of a future record.
- `patchKeyed` from the binding's `persist/storage` entry implements the in-memory patch and version
  guard. Backend updates need the equivalent server-side conditional mutation to avoid a race.
- Implement removeScope for complete persistent subtree deletion, including records without a live
  component. `removeKeyedScope` handles a fully enumerated Keyed; a server can use a prefix endpoint.
- Resolve a mutation Promise only after acknowledgment. Do not treat a lost response as proof the
  server did not commit. If commits may finish after network failures, use server revisions/generations.
- Subscribe reports external changes only; it must not echo its own writes into a pull.
- Container read migrations stage their rewrite through ReadCtx rather than writing from get; provide
  rewriteContainer(values) for the engine to execute/acknowledge this separate operation. Opaque
  application meta cannot request container replacement or bypass patch/version guards.

Sync throws and async rejections now reach onError/onPersistError with source, operation and
address/addresses or scope. Built-in Web Storage failures are no longer hidden behind a warning,
and IndexedDB read failures no longer look like missing data. Automatic failures are handled;
awaited flush/reset still reject so the caller can report unsuccessful durability.

Each binding keeps its own throttle; a slow idle panel does not delay another binding. Observed dirty
edits survive context disconnection, and failed scope barriers do not stall independent scope writes.
Flush includes applicable container rewrites and full-scope deletion acknowledgements even when no
live record entries exist. Superseding reset cannot acknowledge deletion merely by emptying a job.

IndexedDB can provision multiple storeName values in the same dbName without erasing existing stores.
Owned connections cooperate with versionchange; an externally blocked upgrade must be retried after
competing connections are released. Adapter container version/migrate remains a separate concern.

The queue coordinates one source owner. It is not a cross-tab lock, device synchronization protocol
or substitute for backend conditions. Independent built-in engines targeting one physical namespace
are diagnosed. Reuse the parent engine or choose distinct namespaces.

## Transfer old data explicitly and roll back safely

Legacy keys are preserved and never assigned a new StoreId by guessing. If transferring them, write
an application migration with a known mapping from each old key to its new PersistAddress. Use
serializePersistAddress and encodeRecord from your binding's persist entry; imported payloads with
no prior version are version 0. The normal restore pipeline then migrates and validates the value.
This is a one-time application migration, not a parallel runtime persistence implementation.

Without a transfer the new address starts at its default. An explicit resetScope only removes
recognizable addressed records; unrelated/legacy keys remain untouched. Keep old/new storageKey
separate during rollout. Rollback uses the previous application with the untouched old key; new
namespace edits are not automatically converted backwards.

Controlled dashboard components do not attach their own persist. The application can persist its
controlled state explicitly. Loader/fallback rendering, panel resize and component props remain
consumer responsibilities.

## Second-audit source policies and durability

Root throttleMs/clearOnDefault remain shared defaults. Optional write.sources overrides either
member by effective source alias, so one store can update URL immediately and throttle remote
writes for 500 ms. Unknown override aliases fail before any source reads, while unused registered
sources remain valid. This changes scheduling, not source selection or fan-out.

Set timeoutMs to null to disable an inherited deadline for a source or explicit terminal retry.
Omitted timeoutMs inherits and a pending restore still joins its original deadline. Explicit
handle.restore accepts the new timeout-only RestoreCallOptions; externalChanges is configured on
withPersist restore or restore.sources, not through an accepted-but-ignored retry argument.

Defaults for all source bindings are captured before any source seeds/restores. Failed multi-source
connection rolls back successful connections. Retained handles never report flush durability just
because their view disconnected, and reset calls on disposed engines reject promptly. An external
async read applies still-current records independently; unrelated edits do not discard the entire
snapshot. Authoritative absence clears obsolete future-version protection without removing normal
adapter version checks against later races.

Built-in IndexedDB still requires explicit handle.restore to observe another tab's writes. Its
externalChanges policy does not itself supply a notification transport; automatic cross-tab
notifications are outside the agreed scope.

For simultaneous cold cached Providers at one address, reuse the same defaultValue object and
services registry. Conflicting initializers are diagnosed at commit rather than silently losing
one owner's mount-effect changes. Different gcTime props remain supported: first committed
activation sets the entry lifetime. Warm cache hits still reuse their committed instance.

## Third-audit contracts

Optional SourcePort.getRenderSnapshot provides pure synchronous SSR/client seeding separately from
committed operational get/set. Custom ports without it retain the synchronous get fallback.
RenderScopedAdapter now accepts SyncReadSourcePort (sync get with possibly async acknowledged set);
SyncSourcePort remains the strict synchronous read/write contract. UrlDriver adds optional readRender
and permits a Promise from commit. Plain synchronous drivers retain synchronous behavior and typing.

Do not update an active router port's operational location from an uncommitted render. Built-in
adapters publish committed refs separately; React Router data-router completion/blocker observation
uses a read-only exported data context with runtime feature detection rather than patched methods.
Cancelled writes must reconcile authoritative location and report their outcome.

Retired detached intent cannot overwrite a newer address owner. Old superseded waiters settle
explicitly, while already-sent mutations and reset barriers remain ordered. Edits between render
baseline capture and connection are preserved, including child mount effects. Cross-realm Promise
results retain acknowledgement semantics instead of being treated as synchronous data.

Array equality now follows item codecs. Ordinary delimited arrays retain their representation;
exceptional empty-item/delimiter cases use a parser-owned tagged JSON frame. Existing unambiguous
legacy values remain readable, but an older decoder cannot read new framed writes. Keep the old
storage namespace for rollback. Numeric parsers reject Infinity and overflow. Typed reset paths
include stringified numeric dictionary/literal keys.

Cached plugin cleanup runs in reverse order and releases every callback/entry despite failures.
Manual remove/clear throws AggregateError after release; GC surfaces its aggregate through the
existing timer error path. Failed activation rolls successful setup back before reporting errors.
