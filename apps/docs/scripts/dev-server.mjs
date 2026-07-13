// Launches `next dev` on a port that is stable per git worktree, so several
// worktrees can run `pnpm docs:dev` at once without colliding on port 3000.
//
// Port resolution order:
//   1. An explicit `PORT` env var always wins (used by Playwright via PW_PORT,
//      and lets a human pin a port when they want to).
//   2. Otherwise a deterministic candidate is derived from the worktree path,
//      so the same worktree keeps the same URL across restarts.
//   3. If that candidate is taken (hash collision, or a stale server), the next
//      free port in range is used instead.
import { createHash } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:net'
import process from 'node:process'

const BASE_PORT = 3100
const PORT_RANGE = 900 // candidate ports live in [3100, 3999]

function worktreeRoot() {
	try {
		return execFileSync('git', ['rev-parse', '--show-toplevel'], {
			encoding: 'utf8',
		}).trim()
	} catch {
		return process.cwd()
	}
}

function deterministicPort(seed) {
	const offset = createHash('sha1').update(seed).digest().readUInt16BE(0) % PORT_RANGE
	return BASE_PORT + offset
}

function isPortFree(port) {
	return new Promise((resolve) => {
		const server = createServer()
		server.once('error', () => resolve(false))
		server.once('listening', () => server.close(() => resolve(true)))
		server.listen(port, '127.0.0.1')
	})
}

async function resolvePort() {
	if (process.env.PORT) return Number(process.env.PORT)

	const start = deterministicPort(worktreeRoot())
	for (let i = 0; i < PORT_RANGE; i++) {
		const candidate = BASE_PORT + ((start - BASE_PORT + i) % PORT_RANGE)
		if (await isPortFree(candidate)) return candidate
	}
	return start
}

const port = await resolvePort()
console.log(`\n▲ docs dev → http://localhost:${port}  (${worktreeRoot()})\n`)

const child = spawn('pnpm', ['exec', 'next', 'dev', '-p', String(port)], {
	stdio: 'inherit',
	env: { ...process.env, PORT: String(port) },
})
child.on('exit', (code, signal) => {
	if (signal) process.kill(process.pid, signal)
	else process.exit(code ?? 0)
})
