#!/usr/bin/env node
// agent-push.mjs — the ONLY sanctioned way for a worker to push. The worker must never
// run a raw `git push`; it calls this instead.
//
// Policy is baked in, not delegated to the agent's judgement:
//   1. fast linters first — `lint` + `typecheck` on the affected package(s). Red → refuse
//      to push, print the failing tail, exit non-zero. This is the safety net that the
//      repo's husky `pre-push` (a full-monorepo `ci:fast`) used to provide.
//   2. green → `git push --no-verify -u origin HEAD`. `--no-verify` is hard-coded here so
//      the full `ci:fast` does NOT re-run on the hot path (the worker already ran the
//      authoritative gate via agent-gate) — but it is only ever reached AFTER this script's
//      own lint+typecheck passed. The agent cannot bypass verification; the script gates.
//
// Run from the worktree ROOT:
//   node <repo>/.claude/skills/task-flow-execute/scripts/agent-push.mjs \
//     --pkg @ez-kit/data-grid-core --pkg @ez-kit/data-grid-react

import { spawnSync } from 'node:child_process'
import { mkdirSync, openSync, closeSync, readFileSync } from 'node:fs'
import path from 'node:path'

const TAIL_LINES = 40

function parseArgs(argv) {
	const args = { pkgs: [] }
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--pkg') args.pkgs.push(argv[++i])
		else throw new Error(`unknown arg: ${a}`)
	}
	if (args.pkgs.length === 0) throw new Error('at least one --pkg <filter> is required')
	return args
}

function tail(file, n) {
	return readFileSync(file, 'utf8').split('\n').slice(-n).join('\n')
}

function runCheck(name, command, logDir) {
	const logPath = path.join(logDir, `push-${name}.log`)
	const fd = openSync(logPath, 'w')
	process.stdout.write(`▶ ${name} … `)
	const res = spawnSync(command[0], command.slice(1), { stdio: ['ignore', fd, fd] })
	closeSync(fd)
	if (res.status === 0) {
		process.stdout.write('✔\n')
		return
	}
	process.stdout.write('✘\n')
	console.error(`\nPUSH BLOCKED — "${name}" failed. Last ${TAIL_LINES} lines of ${logPath}:\n`)
	console.error(tail(logPath, TAIL_LINES))
	console.error('\nFix the failure and re-run agent-push. Nothing was pushed.')
	process.exit(1)
}

function main() {
	const { pkgs } = parseArgs(process.argv.slice(2))
	const logDir = path.resolve(process.cwd(), '.agent-logs')
	mkdirSync(logDir, { recursive: true })
	const pnpmFilters = pkgs.flatMap((p) => ['--filter', p])

	runCheck('lint', ['pnpm', ...pnpmFilters, 'lint'], logDir)
	runCheck('typecheck', ['pnpm', ...pnpmFilters, 'typecheck'], logDir)

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
