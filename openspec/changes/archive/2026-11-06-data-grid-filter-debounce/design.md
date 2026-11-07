# Design

## Context

See `proposal.md` for the motivation and the two delta specs for the observable contract.

`FilterTextInput` and `GlobalFilterInput` currently duplicate local draft, delayed-value, and commit-effect logic. `render-filter-input.tsx` routes standard registry editors directly to target setters, bypassing that logic. Both kits register their own text and number renderers, so fallback-only tests do not exercise the usual kit paths. Current draft tests do not consistently assert that freshly typed filters/search reach the applied snapshot.

`FilterModel.editor` already classifies text, single-number, range, discrete, and custom editors. `filtering.fields` shares filter targets and `columnFilters` with columns. `draftFeature` stores draft axes separately from applied state, suppresses outward callbacks during edits, and batches Apply. Clear commands currently call target setters or `table.setGlobalFilter(undefined)`, so observing changed values alone cannot identify a clear of an already-empty stored value.

Reviewed constraints: ADR 0001 (selector isolation, no memo), ADR 0003 (consumer-composed features), ADR 0005 (operator behavior from `input`), ADR 0007 (no feature-specific required kit slots), and ADR 0018 (existing config layers). This change does not supersede them.

## Goals / Non-Goals

**Goals:**

- One filter-input commit mechanism shared by standard registry renderers, the fallback, and search, independent of kit visuals.
- An explicit boundary between an input edit and a filter command; reliable cancellation even when a command leaves table state unchanged.
- Preserve editor-owned numeric parsing, synchronous setter APIs, combined Apply, and subscriptions scoped to the affected input.

**Non-Goals:**

- Debouncing table setters, outward callbacks, request clients, custom render functions, or the entire filter model.
- Changing form validation, editing/creating input behavior, numeric parsing, operator vocabulary, or filter value shapes.
- Adding a flush-all registry, a public debounce option, a required component slot, or another automatically registered core feature.

## Decisions

### 1. Durable: Debounce belongs to built-in input commits, not filter setters

Introduce a shared internal React hook and scalar-filter controller component in `data-grid/`. The controller owns immediate local value updates, one cancellable trailing timer, and the value commit callback. `renderFilterInput` stays a renderer factory: it returns mounted controllers rather than invoking hooks itself. Global search uses the same hook with its existing empty-search normalization.

Decide eligibility from the resolved model: `text` and `number` use the controller; `between`, `multiSelect`, `select`, `boolean`, `date`, `none`, and `custom` retain their immediate branches. This includes existing built-in types that resolve to a text or number editor, without adding a second type registry. Column-level custom components and project cell types resolved as custom remain outside automatic timing. A replacement renderer registered under a standard type classified as text/number receives that standard type's timing policy.

Pass each standard renderer its existing field/config props, with only scalar value and change handling adapted at the filter boundary. Resolve the filter model once, retain its immediate command setters, and pass local input state separately instead of constructing a second model or target. Do not add debounce inside `TextCellInput` or `NumberCellInput`: those components are also used by editing/creating. Keep fallback and standard text paths on the same controller; remove duplicated state/effect code when it becomes unused.

**Rejected:** putting timers in `FilterModel.setValue`, `table.setColumnFilters`, or callback emission. Those APIs serve operator commands and atomic external-panel writes, not just typing. Kit-local debounce would duplicate policy and drift again.

### 2. Durable: Draft mode writes directly into the table draft

Effective input delay is zero when `table.options.draft === true`; otherwise use the resolved configured delay. Immediate mode commits from the input change handler rather than an effect, so a subsequent button click or programmatic Apply sees the current parsed value. No input timer is scheduled in draft mode.

Keep `FilterModel.debounce` and resolved grid options as configured metadata. Do not change them to zero, which would make a UI execution choice alter model resolution. Update public docblocks and docs to distinguish configured from effective timing.

**Rejected:** retaining delayed input-local drafts and flushing all mounted controls before Apply. That would require every Apply entry point to discover inputs, would complicate batching, and would keep the reset race.

### 3. Durable: Explicit commands invalidate pending input independently of state equality

Use a private, table-scoped input coordination bridge. It carries invalidation scope (one target, the column-filter axis, global search, or all filters) and an operation origin; it is not a persisted state slice or an outward query notification.

Connect the bridge at the adapter's existing state-handler binding and explicit reset boundaries. Target/model writes, column setters, `setColumnFilters`, and `setGlobalFilter` must be observed before state equality can swallow a same-value operation. A whole-array filter write invalidates the axis it replaces; a single-target write invalidates only its target. Include `resetColumnFilters`, `resetGlobalFilter`, and the table-wide reset entry; preserve original signatures, updater evaluation, callback counts, and reset values. Do not install wrappers repeatedly during renders or add callbacks to the public config. Any table-method forwarding needed for an upstream reset that bypasses state handlers is installed once per table with stable identity and ownership-aware cleanup.

An input-origin commit carries its own token through this boundary: it must not invalidate newer local input as its controlled echo returns. An explicit external command does invalidate, even if its value equals stored state. Changed controlled values are reconciled separately as external replacement; a routine render with the same controlled value is not a reset command.

Invalidate pending work synchronously before the command is forwarded, then synchronize affected inputs to the resulting value. The timer captures a generation and validates it again before committing. This prevents a queued callback from winning after clear/reset/operator change. Scope operator work by target identity and operator id, while using `inputOf` and existing model transition rules for the operator's behavior. Changing operator never transfers pending text to the new operator, even when both operators accept a single value.

**Rejected:** only comparing committed values or array references. Same-value clears have no value difference, while routine controlled echoes and new array identities are not explicit resets. A public reset counter would expose input bookkeeping to consumers.

### 4. Number editors retain their value contract

Keep the controller generic over the value a renderer emits. Single-number callbacks deliver numbers or the existing empty value; do not stringify them or introduce a second parser. Raw signs and decimal text remain owned by the active number editor to the extent it supports them. Keyboard deletion follows the same timer as typing, including empty values; explicit clear bypasses the timer via the command boundary.

HeroUI's number control exposes `state.numberValue` as the value parsed during typing, but its ordinary `onChange` fires on blur/Enter. A filter-only observer reads that native parsed value without calling `commit()` or adding a parser, and restores raw text after its own controlled echo. Editing/creating do not enable the observer. Explicit numeric reset invalidation replaces the numeric editor instance so an unparsed partial value can also be cleared when the stored scalar has not changed.

Keep `BetweenInput` immediate, including numeric ranges. Test filtering separately from editing/creating to ensure shared kit renderers have not acquired a new delay or parsing behavior.

### 5. Explicit draft application

Filter inputs do not intercept Enter or apply the query. The Apply button and `table.draft.apply()` read the latest draft because edits reach it immediately. Numeric reset remounting uses a keyed React Fragment without adding DOM or keyboard context.

### 6. Lifecycle and execution safety

Schedule commits from edits, never from a mount effect that skips its first run with a ref. Mount and Strict Mode effect replay must not write filters. Cancel timers on unmount, target/operator replacement, and timing-mode changes; when entering draft mode, reconcile the latest valid local edit into the draft without leaving a timer behind. A timer firing after an unrelated render uses current callbacks without restarting its original deadline.

Preserve cancellation on unmount: closing a surface that actually unmounts its input discards uncommitted local input. Do not introduce a blur flush or unmount flush in this change. Inputs that remain mounted retain their timer. This is an explicit compatibility limit of input-local debounce, not a new promise to persist pending input across surfaces.

## Risks / Trade-offs

- Standard kit text/number filters now wait by default, and draft inputs change internal state on every edit. Mitigation: release-note the timing change, keep `debounce: 0`, and verify outward callbacks remain deferred under draft.
- Incorrect command scope could cancel another filter or emit extra requests. Mitigation: test same-value commands, simultaneous independent edits, batch writes, callback counts, and updater invocation counts.
- Controlled echoes could erase newer typing. Mitigation: distinguish input-origin writes from external commands and test delayed controlled round-trips and unrelated rerenders.
- Number controls differ between native shadcn input and HeroUI number control. Mitigation: exercise both real kit paths and preserve their existing parsing limitations rather than asserting identical raw formatting.
- More scalar input state could widen rerenders. Mitigation: subscribe to the affected target/axis, preserve stable values, and run existing render-isolation tests; do not add `React.memo`.
- A private command bridge may need core support at reset/write boundaries. Mitigation: preserve feature optionality, avoid new required kit slots, and keep invalidation out of table state, persistence, and query callbacks.

## Migration Plan

1. Add the regression matrix first, including real standard registry renderers and current Apply/reset failures.
2. Implement the shared controller and command invalidation bridge, then route search and built-in scalar branches through it.
3. Update docblocks and filtering/defaults/deferred-apply docs, add the appropriate changeset, and record the durable decisions in an ADR linked from `AGENTS.md` before archival. Do not name the private shadcn package in a changeset.
4. Verify affected packages and both kits' browser flows. No data migration or new dependency is needed. Consumers requiring immediate non-draft filtering can explicitly set `debounce: 0`.
5. If reverted, revert the input-policy and bridge changes together; do not leave an immediate-draft UI coupled to the old delayed-input lifecycle. Existing persisted filter values remain compatible in either version.
