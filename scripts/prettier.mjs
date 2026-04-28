import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const require = createRequire(import.meta.url)

function findRepoRoot(startDir) {
	let currentDir = startDir

	while (true) {
		if (existsSync(join(currentDir, 'pnpm-workspace.yaml'))) {
			return currentDir
		}

		const parentDir = dirname(currentDir)
		if (parentDir === currentDir) {
			throw new Error('Unable to locate monorepo root from current working directory.')
		}

		currentDir = parentDir
	}
}

function hasPositionalArgs(args) {
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index]

		if (arg === '--config' || arg === '--ignore-path') {
			index += 1
			continue
		}

		if (!arg.startsWith('-')) {
			return true
		}
	}

	return false
}

const currentFilePath = fileURLToPath(import.meta.url)
const scriptDir = dirname(currentFilePath)
const repoRoot = findRepoRoot(scriptDir)
const prettierBinPath = require.resolve('prettier/bin/prettier.cjs', {
	paths: [repoRoot],
})

const forwardedArgs = process.argv.slice(2)

if (forwardedArgs.includes('--config') || forwardedArgs.includes('--ignore-path')) {
	console.error('The shared Prettier runner manages --config and --ignore-path automatically.')
	process.exit(1)
}

const prettierArgs = [
	prettierBinPath,
	'--config',
	join(repoRoot, '.prettierrc.json'),
	'--ignore-path',
	join(repoRoot, '.gitignore'),
	'--ignore-path',
	join(repoRoot, '.prettierignore'),
	...forwardedArgs,
]

if (!hasPositionalArgs(forwardedArgs)) {
	prettierArgs.push('.')
}

const result = spawnSync(process.execPath, prettierArgs, {
	cwd: process.cwd(),
	stdio: 'inherit',
})

if (result.error) {
	throw result.error
}

process.exit(result.status ?? 1)
