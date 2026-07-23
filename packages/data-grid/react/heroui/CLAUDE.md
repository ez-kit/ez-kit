# @ez-kit/data-grid-heroui — Package Rules

## `src/components/ui/**` is NOT vendored — the shadcn immutability rule does not apply here

`packages/data-grid/react/shadcn/CLAUDE.md` declares `src/components/ui/**` immutable. That rule is **shadcn-specific**: it is justified by _provenance_ ("vendored shadcn UI primitives … upstream-owned"), not by the path. Nothing in this package is vendored, so nothing here inherits it.

`src/components/ui/action-bar.tsx` is **hand-written and freely editable.** It is a manual port of the shadcn file with radix / `cn` / `asChild` stripped out. The evidence:

- HeroUI does not publish an ActionBar — there is no such component in the v3 set.
- It imports `Button as HeroButton` from `@heroui/react` plus kit-local helpers (`../../hooks/use-as-ref`, `../../lib/compose-refs`) — no upstream primitive to sync against.
- Its history is three in-repo commits and zero vendor syncs: `deabf17 feat(data-grid): add action-bar to heroui`, `61a5563 fix(data-grid): heroui action bar`, `672f23c feat(data-grid): improve cell types`.
- This directory holds exactly one file; shadcn's holds 28. The asymmetry is the tell.

The `components/ui/` directory borrowed shadcn's convention without the meaning that makes it immutable. Edit `action-bar.tsx` when the task calls for it — no adapter dance required.

It is not, however, in good shape: it still writes `--heroui-*` v2 tokens (see "HeroUI v3 tokens" below). Some are unguarded and silently drop (`text-[hsl(var(--heroui-foreground))]`, `border-[hsl(var(--heroui-divider))]`); the rest render only via a hardcoded fallback, which pins them to one theme. Treat those as fair game to fix while you are in the file.

**Known limitation:** the path still reads as "vendored, don't touch" to anyone who has not read this file. Moving the file into `blocks/` would remove the cause rather than document it; that is a possible future task, deliberately out of scope here.

## Layering

`createDataGrid(components)` in `src/data-grid.tsx` is wired to `src/blocks/*` adapters. `src/blocks/selection/SelectionBar.tsx` wraps the `action-bar` primitive — the one consumer of `components/ui/`.

Add new components to `src/blocks/`. Do **not** extend `src/components/ui/` — keeping it at one file keeps the misleading path from spreading.

## Collection items: `items` + render prop, never conditional JSX

Any menu/list whose set of items **varies** (`Dropdown.Item`, `ListBox.Item`, …) must be driven by
`items={…}` plus a render-prop child — not by `{cond && <Item id='x'/>}` or a ternary between item sets:

```tsx
<Dropdown.Menu
	items={getItems(props)}
	onAction={onAction}
>
	{(item: RowPinMenuItem) => (
		<Dropdown.Item id={item.id}>
			{item.icon} {item.label}
		</Dropdown.Item>
	)}
</Dropdown.Menu>
```

react-aria stores each item as a CollectionNode whose `id` is **immutable**; feeding a mounted node a
different `id` throws `Cannot change the id of an item` (`react-aria/…/collections/Document.mjs`). With
conditional JSX, React can reconcile one item's fiber onto another's element — an unkeyed top-level
fragment gets unwrapped, so `{isPinned ? <Item id='unpin'/> : <><Item id='pin-top'/>…</>}` matched
`unpin` onto the live `pin-top` node and crashed row pinning (#140). A flat `{cond && <Item/>}` array
survives only because index alignment happens to hold — that is luck, not correctness.

The `items` path removes the hazard rather than working around it: `useCachedChildren` clones every
element with `key = props.id ?? item.key ?? item.id`, so React can never reuse a fiber across ids.

Build the item objects **fresh on each render**. `useCachedChildren` caches the rendered element in a
`WeakMap` keyed by item identity (invalidated only by the `dependencies` prop), so reused objects would
freeze the rendered item along with anything it closes over.

Statically-shaped lists (`SelectCell`, `SortMenu`'s asc/desc, `BooleanCell`) can stay as literal JSX —
their item set never changes shape. Mapped lists must keep `key={…}` as they already do.

## HeroUI v3 tokens

Do **not** write `--heroui-*` tokens: those are v2 names, this package is on v3, and they resolve to nothing — `hsl(var(--heroui-default-100))` is invalid at computed-value time and silently drops the whole declaration (this is what broke the inline selection bar's background, #68).

Use the v3 base tokens (`--foreground`, `--surface`, `--overlay`, `--separator`, `--border`, `--radius`, `--surface-shadow` / `--overlay-shadow`) or, preferably, their Tailwind utilities — HeroUI maps its semantic tokens into the Tailwind theme via `@theme inline`, so `bg-surface-secondary`, `text-foreground`, `border-separator` all exist. See the full note in `src/global.css` under "Data-grid HeroUI theme-driven classes".
