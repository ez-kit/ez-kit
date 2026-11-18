---
'@ez-kit/store-core': minor
'@ez-kit/store-persist': minor
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

BREAKING: replace flat storage persistence with scoped `(StoreId, field)` records, independently
versioned schemas, automatic restore/status, acknowledged partial writes and record/full-scope reset.
Register sources through maps or arrays and optionally defaultSource; remount providers and caches
when their source registry changes. Ambient external updates now default to ignore; opt into apply.

Remove zodParam and validators/zod subpaths. Use a serialization parser plus schema.validate
(for example Zod.parse); migrate old decoded data before validation. Storage prefix/absolute
are replaced by StoreId scopes. URL query names and navigation remain readable.

This breaking minor is a one-time exception explicitly authorized by the user (ADR 0029).
Published older caret ranges can accept it: upgrade the store bindings and shared packages together
and pin versions if needed. Versions remain independent, with workspace:^ dependency floors expanded
to the new core/persistence releases. No fixed/linked group or public mode is introduced.

Use a new storageKey to retain the old namespace for rollback. Transfer old keys explicitly;
the new release does not automatically import or erase them. See packages/store-persist/MIGRATION.md.

Audit hardening preserves pending URL edits across delayed navigation, acknowledges reset/container
operations correctly, isolates scope failures and per-binding throttle windows, and adopts React cache
instances only on commit. Source-specific restore overrides, alias-aware typed helpers and validated
control selectors cover multiple backend policies. Custom staged container migrations use the separate
optional rewriteContainer operation; opaque application metadata cannot authorize replacement.
IndexedDB supports provisioning multiple object stores in an existing database.

Harden multi-source defaults and connection rollback, detached flush durability, per-record external
read validity, disposed reset handling and router fragment/navigation ownership. Add source-specific
write overrides and explicit null restore deadlines; split timeout-only RestoreCallOptions from
lifecycle RestoreOptions. IndexedDB cross-tab refresh remains explicit.

Simultaneous cold cached Providers for one address share initialization only when defaultValue
reference and services match; conflicting initializers now receive a commit-time diagnostic.
Different gcTime props remain supported and the first committed observer owns birth configuration.

Guard detached address generations and preconnection edits, preserve cross-realm Promise ACKs,
and separate pure router render snapshots from committed navigation. Handle cancelled data-router
commits without stale optimistic state. Compose array item equality, preserve empty/custom-delimiter
round trips with exceptional tagged frames, reject non-finite numeric input, and type numeric reset
paths. Cached teardown now reverses callbacks and releases all resources before aggregating errors.

Follow actual JSON serialization for equality, preserve special keys and decorator tuple identity,
and release all entries when their owning cache container unmounts. Share transactional setup and
failure-isolated reverse cleanup across cached and ordinary stores. Proven URL cancellation discards
only obsolete external corrections, preserving newer edits and avoiding Back/Forward loader echoes.
