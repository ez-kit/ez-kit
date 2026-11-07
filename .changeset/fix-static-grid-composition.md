---
'@ez-kit/data-grid-react': minor
---

Keep headers and row cells synchronized when a table is composed with static Header and Body children. Body now subscribes to column visibility and pinning, including its custom-content and virtualized branches. Visibility changes, start/end pinning and unpinning preserve row identity, focus and local cell state.

Expose Core through the React adapter's `features`, `features/all`, `operators`, `messages/en` and `messages/ru` subpaths, with runtime and type exports. React consumers can import feature sets, default operators and dictionaries without declaring Core as a direct dependency. The all-in feature set remains isolated from the root and individual-feature entries for tree shaking.

Make the other composition boundaries reactive as well: retained Row elements observe their visible cell list; Footer observes filtering, grouping and the row model; Pagination observes grouping; Header observes applied draft sorting and global search so select-all reflects the filtered rows. Publish data and column replacements to static descendants without changing table identity or rerendering them on unrelated host updates. Imperative `setData` also refreshes the React owner.

Retained HeaderCell, FooterCell and Cell elements now observe their displayed state, including sorting, selection, totals and pinned offsets. CreatingRow and ExpandedRow follow column order/grouping, and HeroUI updates its designated row header. Publish configuration changes such as manual pagination totals, supplied aggregates, messages and layout without changing the table identity; equivalent option wrappers and state-handler replacements retain host render isolation.
