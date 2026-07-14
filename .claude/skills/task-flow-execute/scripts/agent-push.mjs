#!/usr/bin/env node
// agent-push.mjs — the ONLY sanctioned way for a worker to push. The worker must never
// run a raw `git push`; it calls this instead.
//
// Policy is baked in, not delegated to the agent's judgement:
//   `git push --no-verify -u origin HEAD`. `--no-verify` is hard-coded here so the repo's
//   husky `pre-push` (a full-monorepo `ci:fast`) does NOT re-run on the hot path — the
//   authoritative gate already ran build/lint/typecheck/test via agent-gate before this
//   point, so a second lint+typecheck here would be pure duplication.
//
// Run from the worktree ROOT:
//   node <repo>/.claude/skills/task-flow-execute/scripts/agent-push.mjs

import { spawnSync } from 'node:child_process'

function main() {
	process.stdout.write('▶ push … \n')
	const push = spawnSync('git', ['push', '--no-verify', '-u', 'origin', 'HEAD'], { stdio: 'inherit' })
	if (push.status !== 0) {
		console.error('\nagent-push: git push failed (see output above).')
		process.exit(push.status ?? 1)
	}
	console.log('\nPUSH: OK')
}

try {
	main()
} catch (error) {
	console.error('agent-push: ' + (error instanceof Error ? error.message : String(error)))
	process.exit(2)
}
