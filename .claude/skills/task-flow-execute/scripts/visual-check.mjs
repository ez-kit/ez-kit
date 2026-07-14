#!/usr/bin/env node
// visual-check.mjs — isolated, headless visual walkthrough for ONE worktree.
//
// Each execute worker runs its OWN copy of this against its OWN dev server port, so N
// workers verify in parallel with zero shared state (unlike the single shared playwright
// MCP browser). Launches its own Chromium, visits each path, and for each writes a
// screenshot + an accessibility snapshot, capturing HTTP status and console errors.
// Prints a JSON summary to stdout — the worker agent then Reads the screenshots and
// reasons over the result to decide pass/fail ("go look at the page once").
//
// Usage:
//   node visual-check.mjs --base http://localhost:3105 --out <dir> <path> [<path> ...]
//
// Example:
//   node visual-check.mjs --base http://localhost:3105 --out ./.visual \
//     "/docs/data-grid/state-persistence" "/docs/data-grid/migration"

import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// The script lives under .claude/skills (outside any node_modules tree), so a bare
// `import 'playwright'` can't resolve it. Resolve the package from the CURRENT WORKING
// DIRECTORY instead — workers run this with cwd = <worktree>/apps/docs, where playwright
// is installed. `playwright` is require-compatible.
const requireFromCwd = createRequire(pathToFileURL(path.join(process.cwd(), 'noop.js')))
// apps/docs depends on @playwright/test (not bare playwright); it re-exports `chromium`.
const { chromium } = requireFromCwd('@playwright/test')

const VIEWPORT = { width: 1280, height: 800 } // standard desktop; no breakpoints, no themes
const NAV_TIMEOUT_MS = 30_000

function parseArgs(argv) {
	const args = { base: null, out: './.visual', paths: [] }
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--base') args.base = argv[++i]
		else if (a === '--out') args.out = argv[++i]
		else args.paths.push(a)
	}
	if (!args.base) throw new Error('--base <url> is required')
	if (args.paths.length === 0) throw new Error('at least one <path> is required')
	return args
}

function slug(p) {
	const s = p.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9]+/g, '-')
	return s || 'root'
}

async function visit(page, base, p, outDir) {
	const url = base.replace(/\/+$/, '') + p
	const consoleErrors = []
	const onConsole = (msg) => {
		if (msg.type() === 'error') consoleErrors.push(msg.text())
	}
	const onPageError = (err) => consoleErrors.push(String(err))
	page.on('console', onConsole)
	page.on('pageerror', onPageError)

	let httpStatus = null
	let title = null
	let error = null
	const shot = path.join(outDir, `${slug(p)}.png`)
	const snap = path.join(outDir, `${slug(p)}.snapshot.txt`)
	try {
		const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })
		httpStatus = res ? res.status() : null
		// Wait for real content rather than network quiet: a Next server keeps connections
		// open (streaming / HMR in dev), so 'networkidle' can hang past the timeout on a
		// perfectly healthy page. A visible <main>/<h1> is a truer "page is ready" signal;
		// swallow the wait error so a page legitimately lacking them still gets screenshotted.
		await page.waitForSelector('main, h1, [role="main"]', { timeout: NAV_TIMEOUT_MS }).catch(() => {})
		title = await page.title()
		await page.screenshot({ path: shot, fullPage: true })
		// Accessibility tree is best-effort reference only: `page.accessibility` was removed
		// in newer Playwright, so guard it — a missing a11y snapshot must NOT mark the route
		// as errored (the screenshot, HTTP status, and console errors are the real signal).
		try {
			const tree = page.accessibility ? await page.accessibility.snapshot() : null
			await writeFile(snap, JSON.stringify(tree, null, 2))
		} catch {
			await writeFile(snap, 'null')
		}
	} catch (e) {
		error = e instanceof Error ? e.message : String(e)
	} finally {
		page.off('console', onConsole)
		page.off('pageerror', onPageError)
	}

	return { path: p, url, httpStatus, title, consoleErrors, error, screenshot: shot, snapshot: snap }
}

async function main() {
	const { base, out, paths } = parseArgs(process.argv.slice(2))
	await mkdir(out, { recursive: true })
	const browser = await chromium.launch()
	const results = []
	try {
		const context = await browser.newContext({ viewport: VIEWPORT })
		const page = await context.newPage()
		for (const p of paths) {
			results.push(await visit(page, base, p, out))
		}
	} finally {
		await browser.close()
	}
	const summary = { base, viewport: VIEWPORT, results }
	// Persist the summary next to the screenshots so the reviewer (and the agent's own
	// post-run read of the PNGs) can consume it — stdout alone is lost once work moves on.
	await writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2))
	console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
	console.error('visual-check failed: ' + (error instanceof Error ? error.message : String(error)))
	process.exit(1)
})
