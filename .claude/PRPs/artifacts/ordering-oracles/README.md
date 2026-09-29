# Ordering oracles — review artifacts, not shipped code

Written during the review of DnD Phase 1 (`dnd-phase-1-core-drop-helpers`) to answer one question:
does `canDropColumn` / `canDropRow` allow exactly what repeated stepping through `moveColumn` /
`moveRow` allows? Rescued from a session-scoped scratchpad; nothing here runs in CI yet.

## Which file to use

| File              | What it does                                                                                                                                                                                                                              | Use it?                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `oracle2.ts`      | **Columns.** Drives the real step API, recovers the ids the source actually lands on from each `moveColumn` result, asserts set equality with `{t : canDropColumn(source, t)}` plus order equality per member. 13 fixtures × both scopes. | **Yes**                    |
| `oracle.ts`       | Columns, BFS over every order reachable by one legal step; asserts every order `dropColumn` produces is in that set.                                                                                                                      | Yes, complements `oracle2` |
| `oracle-rows2.ts` | **Rows.** Same shape as `oracle2`, plus `direction` agreement. 21 fixtures including six seeded sub-row arrangements and fully reversed projections.                                                                                      | **Yes**                    |
| `oracle-rows.ts`  | The **wrong** row model — kept as a record. See below.                                                                                                                                                                                    | **No**                     |
| `probe*.ts`       | One-off probes from the review rounds (band boundary, lock boundary, interleaved groups, termination).                                                                                                                                    | Reference only             |

All four oracles came back clean against the final implementation.

## The trap in `oracle-rows.ts`

It reported 27 failures and **every one was the oracle's own**. It committed each hop with
`applyRowMove(coreOrder, move)`, and `getCoreRowModel().rows` on a tree holds only top-level rows —
so a sub-row move was a silent no-op, the walk never advanced, and the oracle concluded "stepping
never lands on `c3`". That is the `isTopLevelRow` limitation `row-ordering-feature.ts` documents, not
a defect in the code under test.

`oracle-rows2.ts` commits by splicing the **full projected rendered order** and feeding it back as
`initialState.rowOrder`, which can name a child. It asserts that commit model's own fidelity first —
seeding the full projection must reproduce it exactly — and that assertion passes on every unseeded
fixture.

## What these oracles can and cannot tell you

They reach the rules through `canMoveColumn` / `canMoveRow`, so they **share `findNeighbourIndex`
with the code under test** and cannot say the rules are _right_. What they check independently is the
**composition**: `isColumnReachableByStepping` walks a static list once, while the oracle re-splices
the real order and rebuilds the table after every hop. That is exactly the class of bug the
reachability refactor could have introduced.

A rules-independent oracle would mean restating the rule list — the thing the design deliberately
forbids, because a second copy of those rules disagreed with the first four times (a pinned item
between two same-band siblings, a locked column, interleaved header groups, and a `rowOrder` naming a
sub-row). So "rules consistently applied" is checkable here and "rules correct" stays a reading
question.

## Before landing any of these in CI

They rebuild a table per hop, so a repo version wants a trimmed fixture list or a raised timeout.
