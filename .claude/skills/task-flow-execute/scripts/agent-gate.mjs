#!/usr/bin/env node
// agent-gate.mjs — the objective gate for ONE task's worker. Deterministic, fail-fast,
// scoped to the affected package(s). Full command output is written to .agent-logs/*.log;
// only a one-line-per-step verdict (or the failing tail) reaches stdout — so the worker
// agent reads a short result instead of streaming a 226-page build log into its context.
//
// Run from the worktree ROOT:
//   node <repo>/.claude/skills/task-flow-execute/scripts/agent-gate.mjs \
//     --pkg @ez-kit/data-grid-core --pkg @ez-kit/data-grid-react [--docs]
//
// Order is fixed for correctness, not preference:
//   1. build   — `turbo run build` over the packages (turbo honours ^build, so each
//                package's dependencies are built first). REQUIRED before typecheck/test
//                because package exports resolve to ./dist, and turbo's test task itself
//                declares dependsOn ["^build"] — unbuilt deps make typecheck/test fail.
//   2. lint
//   3. typecheck
//   4. test
//   5. docs:build (only with --docs) — the Next production build; catches RSC / static-gen
//      / fumadocs `.source` errors invisible to lint+test, and produces the .next that
//      agent-visual serves via `next start`. Runs LAST so a cheap lint/type/test failure
//      short-circuits before the expensive build.
//
// Exits 0 only if every step passed; prints "GATE: PASS".

import { spawnSync } from 'node:child_process'
import { mkdirSync, openSync, closeSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'

const TAIL_LINES = 40
const DOCS_PKG = '@ez-kit/docs'

function parseArgs(argv) {
	const args = { pkgs: [], docs: false }
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--pkg') args.pkgs.push(argv[++i])
		else if (a === '--docs') args.docs = true
		else throw new Error(`unknown arg: ${a}`)
	}
	if (args.pkgs.length === 0 && !args.docs) {
		throw new Error('pass at least one --pkg <filter>, and/or --docs')
	}
	return args
}

function tail(file, n) {
	return readFileSync(file, 'utf8').split('\n').slice(-n).join('\n')
}

// Runs one step with stdout+stderr redirected straight to a file descriptor (no in-memory
// buffering, so a huge build log never bloats this process or the agent's context).
function runStep(name, command, logDir) {
	const logPath = path.join(logDir, `gate-${name}.log`)
	const fd = openSync(logPath, 'w')
	process.stdout.write(`▶ ${name} … `)
	const res = spawnSync(command[0], command.slice(1), { stdio: ['ignore', fd, fd] })
	closeSync(fd)
	if (res.status === 0) {
		process.stdout.write('✔\n')
		return
	}
	process.stdout.write('✘\n')
	const how = res.status === null ? `signal ${res.signal}` : `exit ${res.status}`
	console.error(`\nGATE FAILED at "${name}" (${how}). Last ${TAIL_LINES} lines of ${logPath}:\n`)
	console.error(tail(logPath, TAIL_LINES))
	process.exit(1)
}

function main() {
	const { pkgs, docs } = parseArgs(process.argv.slice(2))
	const logDir = path.resolve(process.cwd(), '.agent-logs')
	mkdirSync(logDir, { recursive: true })

	// Fresh-worktree fumadocs gotcha: a stale apps/docs/.source (fumadocs-mdx codegen) or
	// .next (turbopack cache) resolves `.source/*` against an old tree, and the first docs
	// build dies with "Module not found: collections/server". Clearing BOTH forces a clean
	// regen + build — there's nothing to reuse in a fresh worktree anyway, so the cost is
	// nil and it removes the flake. (.source alone was the culprit in one observed run.)
	const docsInvolved = docs || pkgs.includes(DOCS_PKG)
	if (docsInvolved) {
		const docsDir = path.resolve(process.cwd(), 'apps', 'docs')
		rmSync(path.join(docsDir, '.source'), { recursive: true, force: true })
		rmSync(path.join(docsDir, '.next'), { recursive: true, force: true })
	}

	if (pkgs.length > 0) {
		const pnpmFilters = pkgs.flatMap((p) => ['--filter', p])
		const turboFilters = pkgs.map((p) => `--filter=${p}`)
		runStep('build', ['pnpm', 'exec', 'turbo', 'run', 'build', ...turboFilters], logDir)
		runStep('lint', ['pnpm', ...pnpmFilters, 'lint'], logDir)
		runStep('typecheck', ['pnpm', ...pnpmFilters, 'typecheck'], logDir)
		runStep('test', ['pnpm', ...pnpmFilters, 'test'], logDir)
	}
	if (docs) {
		runStep('docs:build', ['pnpm', 'docs:build'], logDir)
	}

	console.log('\nGATE: PASS')
}

try {
	main()
} catch (error) {
	console.error('agent-gate: ' + (error instanceof Error ? error.message : String(error)))
	process.exit(2)
}
