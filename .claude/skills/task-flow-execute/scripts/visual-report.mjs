#!/usr/bin/env node
// visual-report.mjs — publish a worktree's visual-check screenshots to GitHub and assemble
// the "Visual verification" PR comment body.
//
// Companion to visual-check.mjs. Reads <in>/summary.json (written by visual-check), uploads
// each screenshot as an asset on a single shared prerelease (default tag `visual-artifacts`)
// so it gets a stable, inline-renderable URL, and writes <in>/report.md — the Markdown body
// the worker posts via `gh pr comment <PR> --body-file <in>/report.md`.
//
// Why release assets: nothing binary ever lands on the issue branch (main stays clean), it
// is fully gh-scriptable, and on a PUBLIC repo GitHub's camo proxy renders the asset URL
// inline. On a private repo neither this nor raw.githubusercontent renders — use the web
// upload CDN there instead.
//
// Asset names are prefixed `issue-<N>-<slug>.png` so many issues share one release without
// collisions; re-runs overwrite via --clobber.
//
// Usage:
//   node visual-report.mjs --in ./.visual --issue 20 --repo ez-kit/ez-kit \
//     [--tag visual-artifacts] [--verdict "looks correct — pagination nests infinite-scroll"]

import { execFile } from 'node:child_process'
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const DEFAULT_TAG = 'visual-artifacts'
const MAX_CONSOLE_ERRORS_SHOWN = 5
const MAX_ERROR_CHARS = 300

function parseArgs(argv) {
	const args = { in: './.visual', issue: null, repo: null, tag: DEFAULT_TAG, verdict: null }
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--in') args.in = argv[++i]
		else if (a === '--issue') args.issue = argv[++i]
		else if (a === '--repo') args.repo = argv[++i]
		else if (a === '--tag') args.tag = argv[++i]
		else if (a === '--verdict') args.verdict = argv[++i]
	}
	if (!args.issue) throw new Error('--issue <N> is required')
	if (!args.repo) throw new Error('--repo <owner/name> is required')
	return args
}

// Idempotent + race-tolerant: several workers may hit this at once. If the release is
// missing we create it; if a concurrent worker created it first, we swallow that and confirm.
async function ensureRelease(repo, tag) {
	try {
		await run('gh', ['release', 'view', tag, '--repo', repo])
		return
	} catch {
		// falls through to create
	}
	try {
		await run('gh', [
			'release', 'create', tag,
			'--repo', repo,
			'--target', 'main',
			'--prerelease',
			'--title', 'Visual verification artifacts',
			'--notes', 'Scratch bucket for task-flow-execute visual-check screenshots. Not a real release; safe to delete.',
		])
	} catch {
		// lost the create race — that's fine as long as it now exists
		await run('gh', ['release', 'view', tag, '--repo', repo])
	}
}

function assetUrl(repo, tag, name) {
	return `https://github.com/${repo}/releases/download/${tag}/${name}`
}

function statusLabel(r) {
	if (r.error) return `error: ${r.error}`
	if (r.httpStatus == null) return 'no response'
	return `HTTP ${r.httpStatus}`
}

async function main() {
	const args = parseArgs(process.argv.slice(2))
	const summary = JSON.parse(await readFile(path.join(args.in, 'summary.json'), 'utf8'))

	await ensureRelease(args.repo, args.tag)

	const lines = []
	lines.push(`## 🔍 Visual verification — issue #${args.issue}`)
	lines.push('')
	if (args.verdict) {
		lines.push(`**Verdict:** ${args.verdict}`)
		lines.push('')
	}
	lines.push(
		`Automated walkthrough (viewport ${summary.viewport.width}×${summary.viewport.height}, headless Chromium). Each screenshot below is what the worker actually looked at.`,
	)
	lines.push('')

	for (const r of summary.results) {
		const base = path.basename(r.screenshot)
		const assetName = `issue-${args.issue}-${base}`
		const localPrefixed = path.join(args.in, assetName)
		// Copy to a prefixed name so the asset is unique within the shared release.
		await copyFile(path.join(args.in, base), localPrefixed)
		await run('gh', ['release', 'upload', args.tag, localPrefixed, '--repo', args.repo, '--clobber'])

		lines.push(`### \`${r.path}\` — ${statusLabel(r)}`)
		lines.push('')
		lines.push(`![${r.path}](${assetUrl(args.repo, args.tag, assetName)})`)
		lines.push('')
		if (r.title) lines.push(`- **title:** ${r.title}`)
		const errs = Array.isArray(r.consoleErrors) ? r.consoleErrors : []
		lines.push(`- **console errors:** ${errs.length || 'none'}`)
		for (const e of errs.slice(0, MAX_CONSOLE_ERRORS_SHOWN)) {
			lines.push(`  - \`${String(e).replace(/`/g, "'").slice(0, MAX_ERROR_CHARS)}\``)
		}
		lines.push('')
	}

	lines.push(
		`<sub>Posted by task-flow-execute · screenshots hosted as assets on the \`${args.tag}\` prerelease (scratch).</sub>`,
	)

	const outPath = path.join(args.in, 'report.md')
	await writeFile(outPath, lines.join('\n'))
	// Print the body path so the worker can `gh pr comment --body-file "$(...)"`.
	console.log(outPath)
}

main().catch((error) => {
	console.error('visual-report failed: ' + (error instanceof Error ? error.message : String(error)))
	process.exit(1)
})
