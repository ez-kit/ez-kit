---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

feat: the grid shell's wrapper and scrollport are slots, and `ref` declares the scroller

`core.TableWrapper` and `core.TableScroll` let a kit render the shell's two boxes itself. They are
**optional** — a kit that registers neither gets the plain `div`s as before — through a new
`FEATURE_OPTIONAL_COMPONENTS` tier that stays out of `ComponentsFor`, so `FullGridComponents` is
unchanged and an external kit that wrote `satisfies FullGridComponents` keeps compiling with no
change in rendering.

The contract is: spread every prop you receive, and land `ref` on the element that actually
scrolls. That `ref` is the declaration the package needed — it is what the pin shadows read, what
infinite scroll measures, what the virtualizer drives, and what gets stamped `data-scrollport`.

It replaces DOM sniffing. `resolveScrollElement`, `resolveVerticalScrollElement` and a
`getComputedStyle` overflow probe are gone: they existed because the shared `div` stayed the
scrollport no matter what a kit nested inside it.

**`@ez-kit/data-grid-heroui` changes its DOM.** `Table.Root` and `Table.ScrollContainer` moved up
into the `TableScroll` slot, so the container that really scrolls now carries
`data-slot='table-scroll'` and owns both axes directly. Consequences for anyone styling this kit:
`data-slot='table'` is now on the real `<table>` rather than on HeroUI's root, which takes
`data-slot='table-root'`, and `data-slot='table-scroll-container'` is gone. ~65 lines of this
kit's stylesheet — three rules that neutralized one box to hand the axes to the other, in opposite
directions depending on the mode — went with the arrangement that needed them, along with the
cause of #103 and #105.
