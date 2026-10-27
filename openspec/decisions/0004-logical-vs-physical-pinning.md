# 0004. Logical vocabulary where RTL flips the axis, physical where it does not

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)

## Decision

**Logical vocabulary where the axis flips under RTL, physical where it does not.** `align`, `Toolbar.start` / `.end` and column `pinning` are `start` / `end`; row pinning stays `top` / `bottom`. Two axes, not an inconsistency — do not unify. English labels stay `'Pin Left'` / `'Pin Right'`.

## Context, rationale and rejected alternatives

- **A logical vocabulary wherever the axis flips under RTL; a physical one only where RTL does
  not apply.** `align`, `Toolbar.start` / `Toolbar.end` **and column `pinning`** are logical
  (`start` / `end`). **Row pinning is `top` / `bottom`, and stays that way.** This entry used to
  read "align is logical, pinning is physical" — decided against a model that no longer exists,
  because TanStack Table v9 removed physical `left` / `right` from `Column.getStart` / `getAfter`
  / `pin()` entirely. The column rename reaches further than the option value: `ColumnPinSide`,
  `GridMenuIcon.PinStart` / `.PinEnd`, `messages.columnMenu.pinStart` / `.pinEnd`,
  `ColumnActionId.PinStart` / `.PinEnd` **and** the `'pin-start'` / `'pin-end'` ids they carry,
  the `data-pinned` / `data-pin-shadow` attribute **values**, and the `--dg-pin-start*` /
  `--dg-pin-end*` custom properties, which the structural stylesheet applies through
  `inset-inline-start` / `inset-inline-end`. **Column-logical beside row-physical is two different
  axes, not an inconsistency**: a vertical axis has no logical names and nothing about it flips
  under RTL, so do not "unify" them, in either direction. The English default labels stay
  `'Pin Left'` / `'Pin Right'` and both kits' glyphs stay `ArrowLeft` / `ArrowRight`, by the
  `moveStart: 'Move left'` rule already established — the key names the axis, the wording names
  what an LTR reader sees.
