---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

feat(form): date and date-range fields

Two new field kinds — `date` and `daterange` — available from both the JSX API
(`form.DateField`, `form.DateRangeField`) and a schema (`FormFieldType.Date`,
`FormFieldType.DateRange`).

Every date is a **`YYYY-MM-DD` string**, and a range is `{ start, end }` of two of them under
a single `name`. No `Date` object ever enters form state: a calendar date has no time zone to
lose, and only a string survives `JSON.stringify` — which is what keeps a date field
describable by a backend-delivered document. Each kit converts at its own edge (React Aria's
`CalendarDate` for HeroUI, `Date` for shadcn's react-day-picker), so no date library reaches
the adapter or your values.

A range is a separate kind rather than a flag, because its value shape differs — which is
what keeps `name` narrowed to paths of the right type in both cases. Its value appears only
once **both** ends are picked; a half-picked range stays inside the picker.

`min` / `max` on a node bound what the calendar offers. Enforcement stays in
`validate: { min, max }`, which now accepts a `YYYY-MM-DD` string as well as a number — ISO
dates compare correctly as text, so no date-only constraint was needed. `parseFormSchema`
rejects a malformed day, an impossible one (`2026-02-31`), or a range default missing an end.

**Breaking for custom kits:** `FormComponents` gains `DateField` and `DateRangeField`; a kit
built against the old contract will not satisfy it until both are implemented.

Also: `buildValidator`'s `options` argument is now optional — a schema that names no rules
had nothing to pass, and omitting it used to throw.
