# Contract: `<DataGridDocsExample />` MDX Shortcode

**Status**: authoritative for the new shared MDX component that data-grid
doc pages use to embed runnable examples.

**Location**:
`apps/docs/components/data-grid-docs-example.tsx`

**Registered in**:
`apps/docs/components/mdx.tsx` (must be added to the components map that
Fumadocs feeds to mdx pages).

---

## Purpose

Wrap `DataGridSandpackExample`
(`apps/docs/shared/data-grid/sandpack/DataGridSandpackExample.tsx`) with an
in-page flavor toggle that lets a reader switch between the shadcn and
HeroUI bundles without leaving the page or duplicating the example content.

This shortcode is the **only** mechanism doc pages use to embed runnable
data-grid examples (FR-003, FR-006, FR-007).

---

## Public TypeScript surface

```ts
import type { DataGridSandpackExampleId } from '@/shared/data-grid/sandpack/DataGridSandpackExample'

export type DataGridDocsExampleFlavor = 'shadcn' | 'heroui'

export interface DataGridDocsExampleProps {
	/**
	 * Manifest slug from
	 * apps/docs/shared/data-grid/examples/manifest.json.
	 * Compile-time enforced via the DataGridSandpackExampleId union.
	 */
	exampleId: DataGridSandpackExampleId

	/**
	 * Initial flavor. Defaults to 'shadcn'.
	 * Pass to lock the toggle on a flavor-specific page.
	 */
	defaultType?: DataGridDocsExampleFlavor

	/**
	 * When true, hide the toggle. The page is responsible for explaining
	 * why only one flavor is shown. Defaults to false.
	 * Use this for pages whose appliesTo is 'shadcn' or 'heroui' only.
	 */
	lockFlavor?: boolean
}

export function DataGridDocsExample(props: DataGridDocsExampleProps): JSX.Element
```

The `exampleId` parameter MUST use the `DataGridSandpackExampleId` union
type re-exported from the existing
`apps/docs/shared/data-grid/sandpack/DataGridSandpackExample.tsx` so that
typos and stale slugs fail at typecheck rather than at runtime.

---

## Behavior

1. **Initial render**: renders the Sandpack preview for the example at
   `defaultType` (or `'shadcn'` if not given). Internally delegates to
   `<DataGridSandpackExample exampleId={…} type={…} />`.
2. **Toggle**: renders a small two-state segmented control (shadcn |
   HeroUI) above the Sandpack frame. Clicking switches the `type` prop fed
   to the underlying Sandpack component.
3. **State**: local `useState<'shadcn' | 'heroui'>`. NOT persisted across
   pages or reloads. NOT synced to URL (see research.md Decision 4).
4. **Loading**: while a flavor's bundle is loading (the underlying
   component already shows a "Loading…" frame), the toggle MUST remain
   visible and the un-clicked state MUST be styled in a way that
   communicates the active flavor.
5. **`lockFlavor`**: when `true`, the toggle is not rendered. Component
   shows only the example for `defaultType`. If `lockFlavor` is `true` but
   `defaultType` is omitted, this is a TypeScript error: the component
   requires `defaultType` when `lockFlavor` is true. (Enforce via a small
   discriminated union if it's cheap; otherwise enforce at runtime with a
   thrown error and a unit test that asserts the throw.)
6. **Errors**: if `exampleId` does not exist in the manifest (cannot
   happen at compile time due to the union type, but defensible against
   editor refactors), throw with a clear message:
   `"Unknown DataGridDocsExample exampleId: <value>"`. Caught by the
   Sandpack error boundary already in `DataGridSandpackExample`.
7. **Accessibility**:
   - The toggle is a `<div role="tablist">` with two
     `<button role="tab" aria-selected={…}>` children, OR a native radio
     group. Whichever the existing site already uses for similar toggles
     (no new pattern invented).
   - Focus order: toggle is reachable by Tab from the preceding heading
     and precedes the Sandpack iframe in focus order.
   - Active flavor is announced via `aria-selected` (or the radio
     selection state).
8. **Styling**: uses existing project styling primitives (Tailwind v4
   classes consistent with the rest of `apps/docs/components/`). MUST NOT
   introduce a new design pattern unique to this component. MUST visually
   distinguish active from inactive state with more than color alone
   (e.g., font weight or underline) to meet WCAG SC 1.4.1.

---

## Forbidden behaviors

- MUST NOT mutate the manifest, the examples directory, or the
  `DataGridSandpackExample` component.
- MUST NOT introduce a new dependency in `apps/docs/package.json`.
- MUST NOT render any styling that contradicts the host page's theme
  (light/dark) — relies on the existing site's theming.
- MUST NOT persist state outside the component instance.
- MUST NOT read or write to `localStorage`, `sessionStorage`, cookies, or
  URL.
- MUST NOT add any `console.*` output in production builds (constitution
  workflow: no `console.log` in committed code).

---

## Test contract

Per Principle IV (NON-NEGOTIABLE), the component is implemented test-first.

### Vitest (apps/docs)

Required tests (each MUST fail before implementation):

1. **Default render** — given `exampleId='base-plain'` and no
   `defaultType`, the rendered output contains a Sandpack provider whose
   `type` resolves to `'shadcn'`. The toggle is rendered with two
   accessible options.
2. **Flavor switch** — clicking the HeroUI button updates the rendered
   Sandpack component's `type` prop to `'heroui'`. Asserts via the
   `useState`-driven re-render (mock the underlying component with a stub
   that captures its `type` prop).
3. **`defaultType` override** — given `defaultType='heroui'`, initial
   render uses `'heroui'`.
4. **`lockFlavor` hides the toggle** — given `lockFlavor` and
   `defaultType`, the toggle DOM nodes are absent.
5. **`lockFlavor` without `defaultType`** — runtime error (or TS error
   surfaced via a `@ts-expect-error` test) with a recognizable message.
6. **Accessibility** — the toggle has `role` semantics or radio inputs
   with `aria-selected` (or `checked`) reflecting current flavor.

Tests live in `apps/docs/tests/` (or co-located if that matches the
existing docs-app test layout) and run with the standard
`pnpm --filter @ez-kit/docs test` command.

### Playwright (apps/docs)

Required tests (visual regression):

1. **Light theme** — open one representative page (e.g.,
   `cells/cell-types`), screenshot at default Sandpack-ready state, then
   click HeroUI toggle, await load, screenshot again.
2. **Dark theme** — same flow, dark theme active.
3. **Keyboard** — Tab into the toggle, press arrow keys to switch (if the
   radio pattern is chosen) or Enter (if button pattern), screenshot.

Tests live in `apps/docs/tests/` and run with
`pnpm --filter @ez-kit/docs test:visual`. Updating snapshots is allowed
only when the visual change is intentional (the change is the goal).

---

## Implementation hints (non-normative)

- The component is small (target ~50–80 LoC). Resist over-engineering.
- Co-locate the toggle UI within the same file — splitting into two files
  for ~30 LoC of toggle markup costs more than it saves.
- Import `DataGridSandpackExample` and `DataGridSandpackExampleId` from
  the existing module — do not re-implement their types.
- The Sandpack frame already shows its own loading state; do not add a
  second loading skeleton.

---

## Integration with `apps/docs/components/mdx.tsx`

Registration adds one entry:

```ts
import { DataGridDocsExample } from './data-grid-docs-example'

// inside the existing components map:
{
  // ...existing entries...
  DataGridDocsExample,
}
```

After registration, every mdx file under
`apps/docs/content/docs/data-grid/**` can use `<DataGridDocsExample />`
without an explicit `import`. No other path under `apps/docs/content/docs/`
should use this component — keep its blast radius scoped to data-grid
docs.
