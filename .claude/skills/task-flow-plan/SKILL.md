---
name: task-flow-plan
description: Grooming phase for the ez-kit GitHub Project board — analyze one or more backlog issues, agree a plan with the user, post it to each issue (RU), and move it Backlog → Ready. Use when the user says "task-flow-plan", "groom the backlog", "проанализируй задачи", gives a list of issue links/numbers to plan, or asks to prepare tasks for execution.
---

# task-flow-plan — grooming / planning phase

Turns raw **ez-kit / Project 2** backlog issues into **Ready** tasks with an approved
plan comment. This is the human-in-the-loop half of the workflow; it writes **no code**
and needs **no worktree**. Execution happens later via the separate `task-flow-execute`
skill, which consumes the Ready tasks this skill produces.

Board statuses: **Backlog → Ready → In progress → In review → Done**. This skill only
moves **Backlog → Ready**.

All board mechanics go through the shared script — never hand-roll GraphQL:

```bash
node .claude/skills/task-flow-plan/scripts/board.mjs list   [<Status>]
node .claude/skills/task-flow-plan/scripts/board.mjs show    <issue#>
node .claude/skills/task-flow-plan/scripts/board.mjs comment <issue#> <body-file>
node .claude/skills/task-flow-plan/scripts/board.mjs status  <issue#> "Ready"
```

If it reports a missing scope, run `gh auth refresh -s read:project,project` and retry.

## Input

The user gives one of:
- a **list of issue links or numbers** to groom, or
- an instruction to **fetch the backlog** ("возьми бэклог") — list it with
  `board.mjs list Backlog` and confirm which ones to groom.

You may groom **many** tasks in one session. Handle them **one at a time** (each has its
own approval gate) — the user can approve several in a row and stop whenever they want.

## Per-task loop

For each issue, in order:

1. **Analyze** — `gh issue view <N> --repo ez-kit/ez-kit`. Read the title/body. Pull the
   context it references: linked docs pages (issue bodies often include a
   `localhost:3000/docs/...` URL — map it to `apps/docs/` source and the relevant
   `packages/`), the components/files involved. Understand the real change before planning.
2. **Plan** — for a non-trivial task, build the plan via the **`omc-plan`** skill. For a
   genuinely trivial task, a short direct plan is fine (don't force the heavy workflow).
3. **Present & iterate** — show the plan to the user in **Russian**. Refine until they
   approve. **HUMAN GATE — nothing is written to the board until the user says "ок".**
4. **Record** — format the approved plan with `references/plan-template.md` (Russian),
   write it to a scratchpad file, then:
   ```bash
   node .claude/skills/task-flow-plan/scripts/board.mjs comment <N> <scratchpad>/plan-<N>.md
   node .claude/skills/task-flow-plan/scripts/board.mjs status  <N> "Ready"
   ```
5. Move to the next task.

## Plan quality (so execute can run autonomously)

The plan comment is the **only** context the autonomous executor gets. Make it
self-sufficient:
- Concrete steps, exact target files/packages.
- Any ez-kit constraints that apply (immutable vendored shadcn primitives, no styling in
  the shared react package, no magic strings, etc.).
- The verification expectation: which package's `lint/typecheck/test/build` must pass, and
  — for visual/UI/docs tasks — what the visual check should confirm (which page/route,
  what should be true). Say "не визуальная" explicitly when there's nothing to look at.
- Delivery: branch `issue-<N>-<slug>`, PR `Closes #<N>`.

## Guardrails

- Never move a task past **Ready**. Execution is `task-flow-execute`'s job.
- If an issue is already past Backlog, warn and ask before re-planning.
- One approval gate per task; never batch-approve without showing each plan.
