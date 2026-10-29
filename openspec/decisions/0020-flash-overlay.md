# 0020. The flash highlight is an overlay: the structural sheet places it, the kit paints it

- Status: Accepted
- Recorded: 2026-10-28
- Related: [0002-shadcn-vendored-primitives-and-registry](./0002-shadcn-vendored-primitives-and-registry.md), [0019-cell-flash-is-an-event](./0019-cell-flash-is-an-event.md)

## Decision

**A flashing cell carries `data-flash="flash" | "fade"`, `data-flash-status` and
`--dg-flash-fade-duration`; the
highlight is a `::after` overlay on the `td`, never the cell's own background.** The structural
stylesheet (`@ez-kit/data-grid-react/styles.css`) positions it — `absolute inset-0
pointer-events-none`, and `relative` on the `td` only when it is not pinned. Each kit paints it by
the cell's `data-flash-status` — `--dg-flash-background` for `default`, and
`--dg-flash-success-background`, `--dg-flash-warning-background`, `--dg-flash-error-background` for
the other three — all declared on the kit class, fades its `opacity` over
`--dg-flash-fade-duration` in the `fade` phase, and drops the transition under
`prefers-reduced-motion`. The React package writes the attribute and the variable, nothing else.

## Context, rationale and rejected alternatives

A pinned cell in both kits is `sticky`, painted with an opaque `--dg-pin-cell-background`, and
already wears a `box-shadow` for the pin edge.

- **Changing the cell's `background-color`** would make a pinned cell see-through for the length of
  the flash, so scrolled content showed under it, and the fade would animate the pin colour away
  and back.
- **An inset `box-shadow`** collides with the pin-edge shadow.
- **`element.animate()` from the React package** would author style in the one package that may not.

A status is a token, not a mechanism: one overlay, its colour picked by an attribute selector, so a
kit adds a status by declaring one more colour, and a consumer recolours one by overriding its token.
The status set is closed (`default | success | warning | error`); a fifth colour is a token
override, not a fifth status.

The overlay sits over any background and animates only its own opacity. `relative` is skipped on
pinned cells for the reason the resizable `th` skips it: it would cancel `sticky`. The positioning is
structural rather than per kit so that a third-party kit gets a working highlight by declaring one
colour, and cannot break pinning by positioning it itself.

The shadcn `styles.css` is registry payload (ADR 0002) with no uninstall, so switching mechanism
later is a change to every `shadcn add` consumer — hence a decision, not an implementation detail.

Guard: `apps/docs/test/css-custom-properties.test.ts` (the variables are both written and read);
`apps/docs/e2e/packages/data-grid/cell-flashing/cell-flashing.spec.ts` in both kits.
