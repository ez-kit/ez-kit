#!/usr/bin/env node
// agent-visual.mjs — isolated, WARM visual verification for ONE worktree.
//
// Precondition: the docs app is already built (`agent-gate --docs` ran → apps/docs/.next
// exists). This script serves that PRODUCTION build via `next start` instead of a cold
// `next dev`, so every route is precompiled — no 30s first-hit compile timeouts (the old
// `test:visual`-over-`next dev` path burned ~18 min on exactly that). It boots the server
// on the given port, waits until it answers, runs visual-check.mjs against the paths, and
// always tears the server down.
//
// Run from the worktree ROOT:
//   node <repo>/.claude/skills/task-flow-execute/scripts/agent-visual.mjs \
//     --port 3101 /docs/data-grid/defaults [/more/paths ...]
//
// Writes screenshots + summary.json to apps/docs/.visual (scratch — never committed).
// The worker then Reads the PNGs and reasons over the result ("go look at the page once").

import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const READY_TIMEOUT_MS = 90_000
const POLL_INTERVAL_MS = 1_000
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

function parseArgs(argv) {
	const args = { port: null, paths: [] }
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--port') args.port = argv[++i]
		else args.paths.push(a)
	}
	if (!args.port) throw new Error('--port <port> is required')
	if (args.paths.length === 0) throw new Error('at least one <path> is required')
	return args
}

const sleep = (ms) =>
	new Promise((resolve) => {
		// setTimeout keeps the event loop alive just long enough between polls.
		const t = setTimeout(resolve, ms)
		if (typeof t.unref === 'function') t.unref()
	})

async function waitForServer(base, deadline) {
	while (Date.now() < deadline) {
		try {
			const res = await fetch(base, { redirect: 'manual' })
			// Any HTTP answer (even a redirect/404) means the server is up and serving.
			if (res.status > 0) return true
		} catch {
			// not up yet
		}
		await sleep(POLL_INTERVAL_MS)
	}
	return false
}

async function main() {
	const { port, paths } = parseArgs(process.argv.slice(2))
	const base = `http://localhost:${port}`
	const repoRoot = process.cwd()
	const appsDocs = path.join(repoRoot, 'apps', 'docs')

	// Serve the already-built app. `next start` respects PORT and serves apps/docs/.next.
	const server = spawn('pnpm', ['--filter', '@ez-kit/docs', 'start'], {
		cwd: repoRoot,
		env: { ...process.env, PORT: String(port) },
		stdio: 'ignore',
	})

	let exitCode = 1
	try {
		const up = await waitForServer(base, Date.now() + READY_TIMEOUT_MS)
		if (!up) {
			console.error(`agent-visual: server never became ready at ${base} within ${READY_TIMEOUT_MS}ms`)
			return
		}
		const visualCheck = path.join(SCRIPT_DIR, 'visual-check.mjs')
		const res = spawnSync(
			'node',
			[visualCheck, '--base', base, '--out', './.visual', ...paths],
			{ cwd: appsDocs, stdio: 'inherit' },
		)
		exitCode = res.status ?? 1
	} finally {
		server.kill('SIGTERM')
	}
	process.exit(exitCode)
}

main().catch((error) => {
	console.error('agent-visual: ' + (error instanceof Error ? error.message : String(error)))
	process.exit(1)
})
