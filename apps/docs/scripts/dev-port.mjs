// Port resolution for the docs dev server, shared by `scripts/dev-server.mjs` and
// `playwright.config.ts` so a Playwright run targets the very server `pnpm docs:dev`
// starts in this worktree instead of a port nothing listens on.
//
// Resolution order:
//   1. An explicit `PORT` env var always wins (lets a human pin a port).
//   2. Otherwise a deterministic candidate is derived from the worktree path, so the
//      same worktree keeps the same URL across restarts and several worktrees can run
//      `pnpm docs:dev` at once without colliding.
//   3. If that candidate is taken (hash collision, or a stale server), the next free
//      port in range is used instead.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import process from 'node:process'

const BASE_PORT = 3100
const PORT_RANGE = 900 // candidate ports live in [3100, 3999]

export function worktreeRoot() {
	try {
		return execFileSync('git', ['rev-parse', '--show-toplevel'], {
			encoding: 'utf8',
		}).trim()
	} catch {
		return process.cwd()
	}
}

export function deterministicPort(seed = worktreeRoot()) {
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

export async function resolvePort() {
	if (process.env.PORT) return Number(process.env.PORT)

	const start = deterministicPort()
	for (let i = 0; i < PORT_RANGE; i++) {
		const candidate = BASE_PORT + ((start - BASE_PORT + i) % PORT_RANGE)
		if (await isPortFree(candidate)) return candidate
	}
	return start
}
