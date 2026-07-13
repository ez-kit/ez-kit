# Docs examples: replace Sandpack with isolated iframes

**Date:** 2026-07-13
**Status:** Approved design, ready for implementation planning
**Scope:** `apps/docs` only — no changes to published `@ez-kit/*` packages

## Problem

Live data-grid examples in `apps/docs` render through `@codesandbox/sandpack-react`.
Sandpack is an **in-browser bundler**: every `SandpackProvider` spins up a virtual
`node_modules`, transpiles the example, and renders it. Consequences observed:

- Slow first load and slow initialization per example.
- Switching examples re-creates the provider (`key={type-exampleId}`) → full
  re-bundle from scratch, so even after one example "installed", opening the next
  reloads everything.
- ~3.3 MB of generated bundle code committed under
  `shared/data-grid/sandpack/generated/`.
- A heavy prebuild (`scripts/build-sandpack.mjs`, ~350 lines) runs before every
  docs `dev`/`build`/`lint`/`typecheck`, including compiling a 100k+ per-kit
  `sandpack.css`.

Critically, **Sandpack's editor is already disabled** (`SandpackCodeEditor` is
commented out) — only `SandpackPreview` is used, and source is shown separately
via `DataGridSourcePanel`. So the in-browser bundler runs purely to render a live
preview that can be rendered natively. The **only** reason Sandpack was needed is
CSS isolation between UI kits: `data-grid-react` ships zero styles, and each kit's
`global.css` is global (`:root` vars, `@layer`, Tailwind) — rendering two kits in
one document collides. Sandpack isolated them because it lives in an iframe.

## Goal

Render each example as a real, statically-rendered Next.js page and embed it via a
plain `<iframe>`. This delivers the exact isolation Sandpack provided, without a
browser bundler, and removes the generated bundles and prebuild step entirely.

## Confirmed requirements

- **No code editor now**, but keep a seam for a future "open in sandbox"
  (CodeSandbox/StackBlitz) link. Not built this iteration.
- **SSR/SEO of example content is not required** — a pure iframe is acceptable.
- **Theme must sync** with the docs light/dark toggle.
- **Flavor switcher = real UI kits only** (`shadcn`, `HeroUI`; later `native`,
  `mui`, `chakra`). The old `shadcn-native` flavor — a fast inline fallback added
  to dodge slow Sandpack — is removed.

## Architecture

### 1. Example routes and CSS isolation

```
app/examples/
  layout.tsx                # shared: CSS reset, height-reporting + theme-receiving script
  [kit]/
    layout.tsx              # resolves kit, imports ONLY that kit's global.css
    [slug]/
      page.tsx              # dynamically imports and renders the example component
```

- `[kit]` ∈ `shadcn | heroui` (extensible). Invalid kit → `notFound()`.
- `[slug]` resolves against the existing `manifest.json`. Valid `kit × slug` pairs
  are produced by `generateStaticParams`, so example pages prerender statically.
- **Isolation:** each `[kit]/layout.tsx` imports its own
  `packages/data-grid/react/<kit>/src/global.css`. Separate iframe documents →
  zero style leakage, including portals (modals/popovers). The
  `buildHeroUiSandpackCss` / `buildShadcnSandpackCss` pipeline and the giant
  `sandpack.css` are deleted.
- The example component is the same source used today, wrapped in
  `DataGridTypeProvider type={kit}`. One source works for all kits — no
  duplication.

### 2. Example resolution — no codegen

`manifest.json` stays as **data** (not generated code): `slug → { sourceFile,
exportName }`. The route resolves the component with a dynamic import over a
static path prefix:

```tsx
const mod = await import(`@/shared/data-grid/examples/components/${sourceFile}`)
const Example = mod[exportName]
```

The bundler produces a context module from the static prefix. The generated
`data-grid-primitive.tsx` registry is no longer needed.

**Risk / validation:** fully-variable `import()` in the App Router (Turbopack) can
be finicky. The prototype validates this first. Fallback if it balks: a tiny
hand-maintained `slug → () => import(...)` map (one line per example). This does
not change any other part of the design.

### 3. Source panel — via `fs`, no codegen

`DataGridSourcePanel` stays, but is powered by a Server Component reading the file
directly:

```tsx
const source = await fs.readFile(absolutePathTo(sourceFile), 'utf8')
```

The string is passed to a client-side syntax highlighter. The example file is the
single source of truth — no `data-grid-source.ts`, no drift (unlike pasting into
MDX code blocks). Sandpack needed pre-extracted strings only because it ran in the
browser; a Server Component does not.

### 4. `<ExampleFrame>` component

Replaces `DataGridSandpackExample`. Location: `apps/docs/components/example-frame.tsx`.

```tsx
<ExampleFrame kit={kit} slug={slug} />
```

Three standard mechanics:

1. **Lazy mount.** iframe renders with `loading="lazy"`; `src` is set only when the
   container enters the viewport (IntersectionObserver). A page with many examples
   does not boot many React apps at once.
2. **Auto height.** The child page (`app/examples/layout.tsx`) attaches a
   `ResizeObserver` to `body` and posts `{ type: 'ez-frame-height', height }` to the
   parent. `ExampleFrame` listens and sets `style.height`. Messages are verified via
   `event.source === iframe.contentWindow`. Fixes the main iframe pain for grids
   with expanding rows / pagination.
3. **Theme sync.** Initial theme via `src=".../[slug]?theme={light|dark}"` (no
   flash). Docs toggle (`next-themes`) → `{ type: 'ez-frame-theme', theme }` →
   child sets `class="dark"` on `html`.

Message protocol is one typed union (`ez-frame-ready | ez-frame-height |
ez-frame-theme`) in a shared module imported by both parent and child. The child's
`ez-frame-ready` gates theme posts so we never message a not-yet-ready iframe.

`ExampleFrame` knows nothing about data-grid — it is a reusable "embed an isolated
page with auto-height and theme" wrapper.

### 5. Switcher and MDX integration

`DataGridDocsExample` stays the MDX entry point — its public props (`exampleId`,
`defaultType`, `lockFlavor`) are unchanged, so **no MDX edits are needed**. Internals
change:

- `FlavorTabs` keeps its UI, but the list is real kits only (no `shadcn-native`).
  URL state (`?kit=`) + localStorage mirror via `useUrlState` stay.
- `FlavorExample` → renders `<ExampleFrame kit={flavor} slug={exampleId} />` instead
  of `DataGridSandpackExample`. Switching a tab changes the iframe `src` segment; the
  same iframe is reused, not recreated.
- `lockFlavor` still fixes the kit and hides tabs.
- `DataGridSourcePanel` and `ExampleCard` are preserved.

Removed from the graph: `DataGridSandpackExample.tsx`,
`shared/data-grid/sandpack/generated/*` (~3.3 MB), the `@codesandbox/sandpack-react`
dependency, and the Sandpack-specific parts of
`test/data-grid-docs-example.test.tsx` (adapted to the iframe render).

### 6. Build pipeline and cleanup

- **Delete `scripts/build-sandpack.mjs` entirely** (not shrink) and remove the
  `sandpack:build` prebuild hook from `dev`/`build`/`lint`/`typecheck`. Docs stop
  waiting on a bundle step before every run — this also addresses the "slow
  initialization" complaint at the dev-server level.
- Packages resolve from the workspace via Next; no browser bundling needed.
- CI: `pnpm --filter @ez-kit/docs typecheck|lint`, `next build` (runs
  `generateStaticParams` for examples), and one adapted Playwright smoke test:
  iframe loads, grid visible, reported height > 0, theme toggle changes background.

### 7. Deferred seams (designed, not built)

- **Open in sandbox.** `ExampleFrame` exposes an optional action slot in the frame
  corner. Later a CodeSandbox/StackBlitz link is built from the same `manifest` +
  `fs` sources. For now the slot renders nothing.
- **Vue / non-React kits.** The `[kit]` segment is the extension point. When Vue
  arrives, its examples are built by a separate Vite build into
  `public/examples-vue/[slug]/`, and `[kit]/[slug]/page.tsx` for `kit='vue-*'`
  serves an iframe/redirect to that static output instead of rendering a React
  component. `ExampleFrame`, the postMessage protocol, and the switcher are shared
  and unchanged. Approach B is thus encapsulated behind the same `[kit]` route
  without rewriting the React path.

## Rollout

1. **Prototype** one example end-to-end: `/examples/shadcn/base-sorting` +
   `ExampleFrame` with auto-height and theme sync. Validate dynamic `import()` on
   Turbopack. Compare speed/isolation against Sandpack.
2. On confirmation, migrate all examples (switcher + `DataGridDocsExample` internals),
   then delete the Sandpack code, generated bundles, dependency, and prebuild.

## Non-goals

- No changes to published `@ez-kit/*` packages.
- No interactive code editor this iteration.
- No Vue/MUI/Chakra examples this iteration (only the extension seam).
- No MDX authoring changes.
