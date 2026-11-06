# 0026. Filter input timing belongs to the React input boundary

- Status: Accepted
- Recorded: 2026-11-06
- Related: [0005-filter-operator-vocabulary](./0005-filter-operator-vocabulary.md), [0007-core-primitives-contract](./0007-core-primitives-contract.md), [0018-column-config-layers](./0018-column-config-layers.md)

## Decision

Built-in filter editors classified by `FilterModel.editor` as text or single-number, and global search, debounce user edits in the shared React input layer. With `draft: true`, they write into the table draft immediately; model metadata retains the configured delay. Model/table setters and panel batch writes remain synchronous, as do discrete and custom editors. Explicit clear/reset/replacement commands invalidate pending work independently of state equality, scoped to the target or axis they replace, through private coordination outside table state and persistence. Input-origin echoes do not erase newer typing. Numeric parsing stays with the kit. Enter does not apply the draft; application remains explicit through Apply or `table.draft.apply()`.

## Context, rationale and rejected alternatives

The fallback text input and global search had separate delayed local drafts, while registered text and number editors bypassed debounce. Draft Apply read table state before the local timer fired, and resetting an already-empty stored search could not cancel pending local text. Tests checked fallback timing and applied sorting, leaving the standard registry and freshly typed applied values unverified.

Delaying setters or outward callbacks was rejected: operator commands and external-panel batches use the same setters and must be observable synchronously. Kit-local timers were rejected because they duplicate policy and can also delay editing/creating renderers shared with filtering. A flush-all registry before Apply was rejected because it would have to discover every mounted input from every Apply entry point; writing directly into the existing table draft removes that extra pending layer instead.

Value equality alone cannot represent reset intent: a clear from empty to empty is still a command. Coordination uses the table's stable store identity, scopes target writes separately from whole-axis writes, and carries input origins without adding a state slice or another automatically registered feature. Reset forwarding and column-method forwarding preserve their receivers, updater semantics, and existing callback channels.

HeroUI's number field exposes a native parsed value while typing, but normally emits its change callback on blur/Enter. Its filter-only observer reads that native state and preserves raw text through controlled echoes; it does not parse independently or alter editing/creating behavior. Numeric reset invalidation also replaces the editor instance to clear partial text that has no parsed scalar value.

Regression guards are `data-grid/scalar-filter-debounce.test.tsx`, `data-grid/use-filter-input.test.tsx`, `data-grid/draft.test.tsx`, both kits' `blocks/filtering/debounce.test.tsx`, and the filtering browser suite. These cover configured timing, typed/deleted values, numeric types, command cancellation, independent targets, controlled echoes, lifecycle cleanup, and the applied query.
