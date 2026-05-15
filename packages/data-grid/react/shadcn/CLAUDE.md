# @ez-kit/data-grid-shadcn — Package Rules

## `src/components/ui/**` is immutable

Files under `src/components/ui/**` are vendored shadcn UI primitives. They are upstream-owned.

- Do NOT edit, refactor, restyle, or "fix" anything in `src/components/ui/`.
- Behavioral overrides (grid-aware `colSpan`, alignment, pinning, custom slots, etc.) live in `src/blocks/` adapters that wrap these primitives.
- If a primitive truly needs to change, propose an adapter in `src/blocks/` first. The vendored file stays untouched.

This rule applies to humans and to AI assistants — no exceptions.

## Layering

`createDataGrid(components)` in `src/data-grid.tsx` is wired to `src/blocks/*` adapters (which may internally re-use `src/components/ui/*` primitives). Always add or override behavior in `src/blocks/`, never in `src/components/ui/`.

Examples already in place:

- `src/blocks/Td.tsx` wraps `TableCell` from `components/ui/table` and adds `gridColumn: 1 / span N` + `justify-center` when `colSpan > 1`, so empty/no-results fallback cells span the full row width on the CSS-Grid-based row layout.
