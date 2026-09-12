// Launches `next dev` on a port that is stable per git worktree, so several
// worktrees can run `pnpm docs:dev` at once without colliding on port 3000.
// The port itself is resolved by `./dev-port.mjs`, which `playwright.config.ts`
// reads too.
import { spawn } from 'node:child_process'
import process from 'node:process'

import { resolvePort, worktreeRoot } from './dev-port.mjs'

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
