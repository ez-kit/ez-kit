# Tasks

## 1. Addressing and source registration

- [x] 1.1 Add PersistAddress and canonical StoreId-based encoding in store-core; verify round trips, special characters and segment-prefix cases from store-persist-addressing.
- [x] 1.2 Resolve source/defaultSource and address at setup while retaining withPersist declarations until connection; check typed fields without source, unknown names and missing defaultSource.
- [x] 1.3 Normalize maps/arrays, merge nested registries and publish identical engines through context/service; verify aliases, duplicates, shadowing and parent survival after child unmount.
- [x] 1.4 Isolate render-scoped hooks in internal components and publish only a ready registry; verify reordered map keys preserve hooks and avoid repeated hydration.
- [x] 1.5 Connect cached StoreId and explicit context Provider address in both bindings; verify devices/users isolation, address changes, independent singleton collisions and idempotent reconnect.
- [x] 1.6 Retain birth registry/source and diagnose live replacement or cache reuse under another registry; verify remount/account changes and document Provider/cache lifetimes.

## 2. Partial ports, queue and errors

- [x] 2.1 Extend ReadCtx/CommitCtx with addresses and SourcePort capabilities while retaining Keyed and sync ports; add compile-time fixtures for ambient/render-scoped custom adapters through both bindings.
- [x] 2.2 Convert Web Storage/IndexedDB to diff patches preserving unknown/legacy/unmounted keys; verify whole-blob regressions and independent A/B edits.
- [x] 2.3 Move mutation ordering into the engine, separate desired/acknowledged revisions and coalesce patches by address; test A/B/C, independent addresses, delayed acknowledgements and rejected-write retries.
- [x] 2.4 Add Promise flush with a revision fence and guard scheduled callbacks after disposal; verify new actions do not expand the wait and disposed microtasks do not write.
- [x] 2.5 Route sync throws, async rejections and encode errors through the common reporter with address/addresses/scope; verify quota, IndexedDB read/backend failures and retained dirty/memory state.
- [x] 2.6 Adapt URL physical-key projection through read context, preserving push/replace and foreign parameters; test q=boots, Back/Forward and physical-key collision diagnostics.
- [x] 2.7 Update custom-adapter docs for partial commits, mutation acknowledgement and cross-tab/backend concurrency boundaries; typecheck examples and match capabilities to runtime checks.

## 3. Independent schemas and migrations

- [x] 3.1 Add schema version/minVersion/migrate/validate to accessor/decorator fronts; verify integer validation, omitted version as zero and validate output inference in Zustand/Valtio.
- [x] 3.2 Implement tagged envelopes and metadata/decode/migrate/validate/apply; test an old shape rejected by current validation before migration, and normalization rewrites.
- [x] 3.3 Invalidate individual old records without migrate, below-minimum versions and damaged data; verify bad details do not affect workspace and callbacks perform no I/O.
- [x] 3.4 Protect future versions during reads and adapter commit guards, including writes after timeout before the read completes; test blocked write/clearOnDefault and explicit reset permission.
- [x] 3.5 Separate container migration computation from staged generation-aware rewrite; preserve runMigration results and prevent stale container writes over neighboring user edits.
- [x] 3.6 Remove zodParam, validator subpaths, build entries and budgets in all three packages; update fixtures/docs to parser + schema.validate and verify build/typecheck without a runtime Zod dependency.

## 4. Automatic restoration and observability

- [x] 4.1 Prepare off-band tracking before the first client status and start one initial read per source binding; verify no duplicate snapshot/connect get and no consumer useEffect.
- [x] 4.2 Add generation/token/revision guards, editedSinceBirth and system-write origins; verify late apply after disconnect, user edits and return to default.
- [x] 4.3 Add timeout/abort/results and dirty-only flush; use fake timers to verify defaults are not written, user writes persist after timeout, and late resolve/reject/rewrite is ignored.
- [x] 4.4 Add handle getStatus/subscribe/restore and aggregate/per-source usePersistStatus; verify stable snapshots, first-frame pending, per-record diagnostics and absence from history/serialization.
- [x] 4.5 Correct useHydrated while retaining SSR URL seeding without ambient I/O; test async pending, terminal error/timeout, server/client consistency and mixed sync/async sources.
- [x] 4.6 Pin cache-hit, explicit retry and StrictMode lifecycle; test terminal timeout on remount, a new read after GC, obsolete instance responses and joining an existing restore deadline.
- [x] 4.7 Implement externalChanges without bypassing operation guards and update restore/cross-tab docs; verify ambient ignore by default, explicit apply and unchanged URL navigation.

## 5. Record and scope reset

- [x] 5.1 Capture independent defaults once after Provider initialization and before hydration; verify nested object/Date reset, repeated reset and retained store identity.
- [x] 5.2 Add handle reset for all/selected source-binding fields; verify untouched fields, explicit future-version reset, deletion errors and flush retry.
- [x] 5.3 Implement complete removeScope in Web Storage/IndexedDB and provider-scoped resetScope with capability preflight; test active/retained/evicted/never-mounted records and no partial reset with unsupported URL.
- [x] 5.4 Queue reset as a barrier and apply scope generations to new connections; test read/reset, sent/queued write/reset/write, repeated reset and mounting during deletion.
- [x] 5.5 Add independent source outcomes and pending deletion after failure; test browser success/server failure without false rollback, retained memory defaults and blocked stale restoration.
- [x] 5.6 Document reset API, backend removeScope/conditional mutations and controlled integration; ensure page reset includes closed panels and never substitutes cache.clear for reset.

## 6. Binding integration and consumer migration

- [x] 6.1 Align zu-store/va-store exports, StoreProvider forwarding and typed wrappers with the engine; verify public entry builds, explicit source handles and compatible runWithMeta shorthand.
- [x] 6.2 Add mixed Zustand/Valtio integration sharing one source and checks for existing context/cache/URL consumers; run package suites to verify one writer and isolated manager-specific writes.
- [x] 6.3 Add a small docs example with localStorage, deferred backend, automatic restore gate, timeout and scope reset; browser-test loading -> timeout -> resize -> late response and the saved final width.
- [x] 6.4 Prepare migration guide/READMEs covering no mode, new addresses, removed storage prefix/absolute and zodParam, initial/external lifecycle, legacy keys/new storageKey; verify docs option/type guards and runnable snippets.
- [x] 6.5 Add minor changesets for affected packages with BREAKING, the explicit user exception and old caret-range warnings; verify independent versions, new binding dependency floors and no fixed/linked groups.

## 7. Integration acceptance and durable decisions

- [x] 7.1 Write ADRs for Durable decisions and the limited semver exception, linking short AGENTS.md rules; follow the decisions README and leave ADR 0015/0017 unchanged.
- [x] 7.2 Map all five specs to regression/integration tests and explicit adapter guarantees; ensure no uncovered requirements or distributed atomicity promises.
- [x] 7.3 Run affected verification, then the full sequential build/lint/typecheck/test/size gate from AGENTS.md; record results and separately confirm docs guards, URL routing adapters and both bindings.
- [x] 7.4 Run OpenSpec strict validation and verify separate old/new storageKey migration/rollback; confirm legacy namespaces remain untouched and runtime has no mode/legacy engine.

## 8. Audit hardening approved on 2026-11-14

- [x] 8.1 Give every queued mutation explicit acknowledgement ownership; make superseded reset waiters and flush/status include container rewrites and scope deletions with no live records.
- [x] 8.2 Preserve dirty edits on disconnect, cancel stale invalidation after a valid retry, isolate failed scope barriers/retries, and schedule throttles independently per binding; add permanent regressions.
- [x] 8.3 Stabilize persistence registry independently of unrelated services, diagnose returned render-scoped port replacement, and distinguish provisional React cache entries from committed retained instances; test Suspense abandonment, defaults and committed context.
- [x] 8.4 Preserve multiple URL patches while router navigation is pending; reconcile optimistic intent with location acknowledgement, foreign params and Back/Forward in both routing adapters.
- [x] 8.5 Separate staged container rewrites from public mutation metadata and provision multiple IndexedDB object stores safely; test arbitrary metadata, version guards, upgrades and existing connections.
- [x] 8.6 Preserve unknown decoder/typed validator inference through all field helpers, support explicit source aliases, disambiguate shorthand/named handles, reject unknown sources/fields before mutation, and improve typed reset paths through both bindings.
- [x] 8.7 Add source-keyed initial timeout/external-change overrides with inherited shared defaults, and update helpers, decorators, custom-adapter, cache, flush/reset and migration docs plus the scenario evidence matrix.
- [x] 8.8 Run focused regressions and affected verification, then the full sequential gate and browser flow; repeat strict OpenSpec validation, record limits, and update PR 299 with the fixes.

## 9. Second audit fixes approved on 2026-11-16

- [x] 9.1 Preserve detached flush durability, clear obsolete future-version blocks on authoritative absence, guard async external reads per record, make engine connection atomic, and reject resets after disposal; add regressions.
- [x] 9.2 Capture every source binding default before any source seeds/restores, and roll back successful source connections if later setup fails; test shared fields and ghost writers.
- [x] 9.3 Establish canonical same-address cached identity before descendant mount effects without retaining abandoned renders or performing ambient render I/O; test concurrent owners, Suspense, StrictMode and GC.
- [x] 9.4 Preserve URL fragments and distinguish external PUSH/REPLACE from pending own acknowledgements in routing adapters; retain intermediate acknowledgements and Back/Forward regressions.
- [x] 9.5 Add write.sources alias overrides for throttleMs/clearOnDefault, timeoutMs null for unlimited waiting, and timeout-only RestoreCallOptions through public bindings; validate before I/O and test effective aliases, inheritance and public consumer types.
- [x] 9.6 Update docs, READMEs, migration notes, changeset and scenario evidence for the second audit; explicitly leave IndexedDB cross-tab notifications outside this implementation pending discussion.
- [x] 9.7 Run affected and full sequential verification, browser flow and strict OpenSpec checks; record outcomes and update PR 299.

## 10. Third audit fixes approved on 2026-11-16

- [x] 10.1 Guard address ownership across detached retries/new instances, settle superseded flush fences, reconcile edits between captured defaults and connect, and support cross-realm asynchronous ports without changing sync semantics; add engine regressions.
- [x] 10.2 Separate pure URL render seeding from committed operational navigation refs in Next and React Router, and reconcile blocked/cancelled navigations without stale optimistic state; test concurrent Suspense and real router cancellation.
- [x] 10.3 Compose array item semantic equality, preserve empty string items and custom-separator round trips, reject non-finite numeric input, and support numeric dictionary reset paths through both public bindings; add codec, runtime and consumer type regressions.
- [x] 10.4 Run cached plugin cleanups in reverse order, isolate cleanup failures, and remove membership/metadata despite teardown errors; verify clear/remove/GC and observable failures.
- [x] 10.5 Add public integration evidence for mount-effect edits, cross-manager semantic codecs and URL render/commit lifecycle; update docs, migration notes, changeset and scenario trace with final contracts.
- [x] 10.6 Run affected verification, full sequential build/lint/typecheck/test/size and browser checks; repeat strict OpenSpec validation and update PR 299 with results.

## 11. Fourth audit fixes approved on 2026-11-18

- [x] 11.1 Make canonical JSON equality follow serialization semantics, including toJSON/Date, recursive array/object ordering and safe own special keys; verify validated Date edits and JSON field resets.
- [x] 11.2 Dispose all cache-owned entries when the outer cache Provider lifetime ends, preserving StrictMode synthetic reconnect, entry keepalive and independent cache containers; verify remount beneath a retained persistence registry.
- [x] 11.3 Share capability setup/rollback/reverse-teardown guarantees across cached and noncached stores; run all cleanups despite failures and preserve setup/rollback errors with permanent regressions.
- [x] 11.4 Distinguish external corrective revisions from newer user edits when an in-flight URL navigation is proven cancelled; prevent Back write-back and settle fences without dropping newer intent.
- [x] 11.5 Encode decorated field/source identity structurally without delimiter collisions; preserve subclass overrides, aliases and both binding fronts.
- [x] 11.6 Add public integration evidence and update documentation, migration notes, changeset and scenario trace for the fourth audit contracts.
- [x] 11.7 Run affected checks and full sequential build/lint/typecheck/test/size plus browser verification, repeat strict OpenSpec validation and update PR 299.

## Workflow follow-up

- After implementation and review, archive this change using the standard OpenSpec workflow. Archiving is not an implementation task and does not automatically release packages.
- Publish through the existing develop release flow after verifying the agreed minor exception. This planning change does not publish anything.
