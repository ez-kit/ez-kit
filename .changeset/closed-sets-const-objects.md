---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Give every remaining closed set in the data-grid a named `const` object, matching the fourteen
that already had one (`ColumnAlign`, `ColumnPinSide`, `ExpandingMode`, `RowActionsVariant`, …).

**No consumer code changes.** Each set is a `const` object **plus** a same-named union of the
bare literals, so `resizing: { mode: 'onEnd' }`, `filtering: { variant: 'popover' }`,
`pagination: { mode: 'infinite', trigger: 'manual' }` and `validateOn: 'blur'` compile exactly
as before and still need no import — a TS `enum` would have broken all four, which is why these
are const objects. The named members are additive: a new way to write the same values, for
anyone who prefers `ColumnResizeMode.OnEnd` to the string.

New from `@ez-kit/data-grid-core`: `MultiSortEvent`, `ColumnResizeMode`, `ColumnResizeDirection`,
`LoadMoreDirection`, `PaginationMode`, `ColumnSortUndefined`, `BadgeVariant`, `SystemColumnType`,
`ValidateOn`, `CommitStatus`, `DraftAxis`, `BetweenInputVariant`, `BetweenInputType`.

New from `@ez-kit/data-grid-react`: `SortDirection`, `HeaderSortDirection`, `FilterChipKind`,
`FilteringVariant`, `FilterChipsPosition`, `LoadMoreTrigger`.

Three props that spelled a set out inline now name it, so a kit can switch on the same symbol
the grid writes: `ThProps.pinned` / `TdProps.pinned` are `ColumnPinSide | false`,
`SortIndicatorProps.sortDir` is `SortDirection | false`, and `LoadMoreRowProps.trigger` is
`LoadMoreTrigger`. `PaginationConfig.mode` and `BetweenOperatorConfig.variant` gained names for
sets that previously had none. All are the same string literals as before.

`ColumnSortUndefined`'s const half carries only the two named members (`First`, `Last`); the
union keeps its `-1 | 1 | false` arms, which are TanStack's raw numbers and the absence of any
placement — neither is a named position.
