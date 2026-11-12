import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('.', import.meta.url))
const generated = new URL('./generated/users.ts', import.meta.url)
const check = process.argv.includes('--check')
const before = check ? readFileSync(generated, 'utf8') : undefined
execFileSync('npm', ['exec', '--yes', '--package=orval@8.47.0', '--', 'orval', '--config', 'orval.config.ts'], {
	cwd,
	stdio: 'inherit',
})
execFileSync(
	process.execPath,
	[
		fileURLToPath(new URL('../../../../../node_modules/prettier/bin/prettier.cjs', import.meta.url)),
		'--write',
		fileURLToPath(generated),
	],
	{ cwd, stdio: 'inherit' },
)
if (check && before !== readFileSync(generated, 'utf8')) {
	throw new Error('Generated client changed. Review and include the regenerated file.')
}
