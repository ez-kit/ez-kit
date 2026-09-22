# @ez-kit/data-grid-shadcn — Package Rules

## `src/components/ui/**` is immutable

Files under `src/components/ui/**` are vendored shadcn UI primitives — treat them as
upstream-sourced, not as a file you casually edit.

- Do NOT edit, refactor, restyle, or "fix" anything in `src/components/ui/`.
- Behavioral overrides (grid-aware `colSpan`, alignment, pinning, custom slots, etc.) live in `src/blocks/` adapters that wrap these primitives.
- If a primitive truly needs to change, propose an adapter in `src/blocks/` first. The vendored file stays untouched.

Caveat, so you don't go "fix" it: `table.tsx` is a **known exception** that predates this rule's
current wording — it already carries grid-layout modifications (`display: 'block'`,
`data-[pinned]:bg-muted/40`) directly in the vendored file rather than in a `blocks/` wrapper.
Don't use it as precedent for adding more such edits elsewhere; it's existing debt, not the
pattern to follow.

This rule applies to humans and to AI assistants — no exceptions.

This directory carried one exception, `action-bar.tsx` — hand-written rather than adapted from an
upstream shadcn component, and so freely editable despite the path. It has been **deleted**: it was
written and never wired up, so it shipped in the registry payload to every `npx shadcn add` while
authoring two slots this kit never renders. The bar it was meant for is hand-rolled in
`blocks/action-bar/ActionBar.tsx`, which explains there why an action-bar primitive's usual shape
cannot serve it. The rule above therefore applies to everything now under `components/ui/`, with no
exception — and do not re-add one here to "match" the heroui kit, which keeps its own copy because
its bar genuinely uses it.

## Registry distribution

This package is **not** published to npm (`private: true`). Instead `registry.config.mjs` +
`../../../../scripts/generate-shadcn-registry-manifest.mjs` describe it as a shadcn registry item;
`pnpm --filter @ez-kit/docs registry:build` compiles `registry.json` (via the official `shadcn
build` CLI) into `apps/docs/public/r/data-grid.json`, which external consumers install with
`npx shadcn add https://ez-kit-docs.vercel.app/r/data-grid.json`. That origin is not written here by
hand — it comes from `site.config.json` at the repo root, and `scripts/check-site-url.mjs` (run by
`pnpm lint`) fails if any `.md`/`.mdx` names a different one, so the install command in the docs can
never drift from the site that actually serves the JSON. `apps/docs/public/r/**` is gitignored, so the
file exists in production only because `apps/docs`' `build` script chains `registry:build` before
`next build`; `apps/docs/vercel.json` pins that as the deploy's `buildCommand` so a dashboard
default can't silently drop it and 404 the install URL with a green build.
`components/ui/**`, `blocks/**`, `hooks/**`,
`lib/**`, `data-grid.tsx` and `styles.css` are copied byte-for-byte into the consumer's project
(imports are rewritten from this package's `@grid-shadcn/*` alias to `@/*` as part of that build —
see `apps/docs/scripts/build-registry.mjs`). `index.ts`/`index.test.ts` are excluded — they exist
only for this repo's internal `workspace:*` consumption (`apps/docs`), not for registry consumers.

## Layering

`createDataGrid(components)` in `src/data-grid.tsx` is wired to `src/blocks/*` adapters (which may internally re-use `src/components/ui/*` primitives). Always add or override behavior in `src/blocks/`, never in `src/components/ui/`.

Examples already in place:

- `src/blocks/Td.tsx` wraps `TableCell` from `components/ui/table` and adds `gridColumn: 1 / span N` + `justify-center` when `colSpan > 1`, so empty/no-results fallback cells span the full row width on the CSS-Grid-based row layout.
