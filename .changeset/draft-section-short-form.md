---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**The action bar's draft section reads as a glyph and a number per axis, and says the rest in
words once.**

It used to write `Unapplied` and then a worded pill per pending axis — `2 sorts`, `1 filter`,
`search`. Two defects. Two of the three segments are counted phrases and the third is a bare
word, so a pending search alone read `Unapplied search`, which parses as one noun phrase rather
than as a list; with all three it was `Unapplied 2 sorts 1 filter search`, a chain with no
conjunction. And since the selection and the draft became sections of one bar, that section has
half the width it used to.

The counts are now `Unapplied ⇅2 ▽1 ⌕` — each kit picks its own glyphs, an empty axis is still
not drawn, and search carries no number because it is only ever there or not, which is what
removes the grammar problem rather than papering over it. The words move into one string used
twice: the section's `aria-label`, and the tooltip over the counts. The screen-reader name is
strictly better than before, where it was the generic `Pending changes`.

New dictionary entry, `messages.draft.summary`. It is handed the segments the existing
`draft.sorts` / `draft.filters` / `draft.search` entries produced, plus `draft.label`, and joins
them — so an override of one segment carries into the long form, and the separators are the
language's rather than hardcoded:

```ts
messages: {
	draft: {
		summary: ({ label, parts }) => `${label}: ${parts.join(', ')}`, // the default
	},
}
```

Adding it is additive for a partial dictionary: messages resolve by a per-group merge, so an
override that names some of `draft` keeps the defaults for the rest. `draft.pending` stays as the
name for the case the bar cannot enumerate. A consumer who built a **complete** `GridMessages`
object rather than a partial one must add the key.

**New optional component slot, `core.Tooltip`** — `FEATURE_OPTIONAL_COMPONENTS`, beside `Root`,
`TableWrapper`, `TableScroll` and `Layout`, so it is additive: a kit written `satisfies
FullGridComponents` keeps compiling and keeps its current rendering. A kit that registers none
gets the counts rendered unchanged — the meaning is on the element as its accessible name either
way, so what is lost is the hint, not the information. Its contract is two props, `content` and
`children`, and it must adopt its child rather than wrap it: the grid hands it elements sitting
in a flex row. Both kits register one.
