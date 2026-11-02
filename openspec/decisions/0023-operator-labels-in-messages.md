# 0023. Ready-made operator labels live in the dictionary; two full dictionaries ship

- Status: Accepted
- Recorded: 2026-10-30
- Related: [0005-filter-operator-vocabulary](./0005-filter-operator-vocabulary.md), [0014-tree-shaking-guarantees](./0014-tree-shaking-guarantees.md)

## Decision

**The ready-made operators are labelled from `messages.operators`, and a definition's own `label`
always wins.** `FilterOperatorDef.label` is optional; `defaultOperators` carries none. The label is
settled once per column — `def.label`, else the group the definition's literal `labels` names
(`'date'` | `'boolean'`), else `messages.operators.common` by id, else the id with a development
warning — by `resolveOperatorLabel` / `resolveOperatorLabels` in core, applied by the React layer's
`toOperatorOptions`, so every surface reads `label: string`. The group follows the **definition**,
never the column's cell type. `resolveMessages` merges two levels deep (a group, then a record in
it). The package ships **`enMessages` and `ruMessages`** on `@ez-kit/data-grid-core/messages/en` and
`/ru`, each typed as the whole `GridMessages` and written out entry by entry (never spread over the
English), so a key added without its translation fails the package's own type check.

## Context, rationale and rejected alternatives

- **This supersedes one clause of ADR 0005** — "no `messages.operators`: a label is the definition's
  `label` … a translated grid passes a translated set". The rest of 0005 stands untouched: behaviour
  is read from `input`, never from the id; definitions are object literals of literals; `inputOf` is
  the one lookup. Looking a **label** up by id reads no behaviour off it.
- **Why the clause went.** With labels only on definitions a translated grid needed two channels —
  `messages` and a translated copy of `defaultOperators` — and no shipped dictionary could translate
  a grid on its own. The clause was a side effect of moving operators to bundle config (commit
  `0d2319a5`), not a decision with its own measurements.
- **Why the earlier `messages.operators` was removed, and why this one is different.** Before
  `0d2319a5` the dictionary grouped labels **by cell type** (`text`, `number`, `date`, `multi`,
  `empty`) and a lookup table mapped each cell type to a group. Once a set became arbitrary bundle
  config, that mapping was wrong for any project set: a `datetime` type built from the date set read
  the number wording, and a project operator under a built-in id was renamed by the dictionary. This
  design fixes both: the group is named **on the definition** (`labels: 'date'`), so it travels with
  the definition into any type's set, and an explicit `label` is never overridden. The old helper's
  name, `localizeOperators`, stays on the guard list in `operators/entry.test.ts`; the new ones are
  `resolveOperatorLabel(s)`.
- **Groups hold only the wordings that differ.** `common` names all fourteen ids; `date` holds the
  four comparisons that read as positions in time, `boolean` the two that read as statements. A group
  per cell type would duplicate twenty-five entries for six differences and reintroduce the
  type-keyed lookup this replaces.
- **Tree-shaking (ADR 0014) is unaffected.** `labels` is a literal on the definition, not a property
  read; the definitions no longer carry English, so `@ez-kit/data-grid-core/operators` shrank (budget
  retuned to 850 B) and the English labels live once, in `defaultMessages`. `tree-shaking.test.ts`
  pins that the set carries no English label and that `createTable` never reaches
  `@ez-kit/data-grid-core/messages`.
- **Shipped dictionaries.** The old reason for shipping none — a bundled translation lagging the keys
  is invisible until it renders — is answered by the type: a shipped dictionary is a full
  `GridMessages`, so the lag is a compile error in this repository. The cost is that every PR adding a
  key translates it into each shipped dictionary; two languages is the deliberate limit. Exports are
  `enMessages` / `ruMessages`, never a bare `ru`, which collides with `react-day-picker/locale` and
  `date-fns/locale` in the same shadcn file. The subpath is `messages/*`, not `locales/*` or `i18n`:
  `locale` already means a BCP 47 tag in these packages (`cell.config.locale`), and `i18n` promises a
  framework the dictionary is not.
- Guards: `core/src/features/operators/operator-label.test.ts`,
  `core/src/messages/shipped-dictionaries.test.ts`, `core/src/messages/resolve.test.ts`,
  `react/react/src/data-grid/filter-model.test.tsx`, `apps/docs/test/tree-shaking.test.ts`.
