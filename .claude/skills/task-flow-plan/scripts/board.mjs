#!/usr/bin/env node
// board.mjs — GitHub Projects v2 mechanics for the ez-kit board, behind simple commands.
//
// Usage:
//   node board.mjs show    <issue#>                 Print current status + linked PRs
//   node board.mjs status  <issue#> "<Status name>" Move the card to a status
//   node board.mjs comment <issue#> <body-file>     Post an issue comment from a file
//   node board.mjs list [<Status name>]             List board items (optionally filtered)
//
// All ids (project, Status field, option ids, per-issue item id) are resolved dynamically
// via the gh CLI, so nothing is hardcoded and the script survives board re-creation.

import { execFileSync } from 'node:child_process'

const OWNER = 'ez-kit'
const PROJECT = '2'
const REPO = 'ez-kit/ez-kit'
const ITEM_LIMIT = '200'

const SCOPE_HINT =
	'Missing gh scope. Run:  gh auth refresh -s read:project,project  then retry.'

/** Run a gh command, returning stdout. Surfaces the scope hint on auth-scope errors. */
function gh(args) {
	try {
		return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
	} catch (error) {
		const stderr = String(error.stderr || error.message || '')
		if (/read:project|required scopes|project scope/i.test(stderr)) {
			throw new Error(SCOPE_HINT + '\n\ngh said: ' + stderr.trim())
		}
		throw new Error('gh ' + args.join(' ') + ' failed:\n' + stderr.trim())
	}
}

function ghJson(args) {
	return JSON.parse(gh([...args, '--format', 'json']))
}

/** All board items (cards). Each has `.id` (project item id) and `.content.number`. */
function getItems() {
	return ghJson(['project', 'item-list', PROJECT, '--owner', OWNER, '--limit', ITEM_LIMIT]).items
}

/** The project item (card) for a given issue number. Throws if not on the board. */
function findItem(issueNumber) {
	const item = getItems().find((i) => i.content && i.content.number === issueNumber)
	if (!item) {
		throw new Error(`Issue #${issueNumber} is not on board ${OWNER}/${PROJECT}.`)
	}
	return item
}

/** The Status single-select field: { id, options: [{ id, name }] }. */
function getStatusField() {
	const fields = ghJson(['project', 'field-list', PROJECT, '--owner', OWNER]).fields
	const status = fields.find((f) => f.name === 'Status')
	if (!status) throw new Error('No "Status" field on the board.')
	return status
}

/** Project node id (needed by item-edit). */
function getProjectId() {
	return ghJson(['project', 'view', PROJECT, '--owner', OWNER]).id
}

function cmdShow(issueNumber) {
	const item = findItem(issueNumber)
	const prs = item.content?.['linked pull requests'] ?? item['linked pull requests'] ?? []
	console.log(`#${issueNumber} — ${item.content.title}`)
	console.log(`  status: ${item.status ?? '(none)'}`)
	console.log(`  item id: ${item.id}`)
	if (Array.isArray(prs) && prs.length) console.log(`  linked PRs: ${prs.join(', ')}`)
}

function cmdStatus(issueNumber, statusName) {
	const field = getStatusField()
	const option = field.options.find((o) => o.name.toLowerCase() === statusName.toLowerCase())
	if (!option) {
		const names = field.options.map((o) => o.name).join(', ')
		throw new Error(`Unknown status "${statusName}". Valid: ${names}`)
	}
	const item = findItem(issueNumber)
	const projectId = getProjectId()
	gh([
		'project',
		'item-edit',
		'--id',
		item.id,
		'--project-id',
		projectId,
		'--field-id',
		field.id,
		'--single-select-option-id',
		option.id,
	])
	console.log(`#${issueNumber}: ${item.status ?? '(none)'} → ${option.name}`)
}

function cmdComment(issueNumber, bodyFile) {
	if (!bodyFile) throw new Error('comment requires a <body-file> path.')
	gh(['issue', 'comment', String(issueNumber), '--repo', REPO, '--body-file', bodyFile])
	console.log(`#${issueNumber}: comment posted.`)
}

function cmdList(statusFilter) {
	const items = getItems()
	const rows = statusFilter
		? items.filter((i) => (i.status ?? '').toLowerCase() === statusFilter.toLowerCase())
		: items
	for (const i of rows) {
		console.log(`#${i.content?.number ?? '?'} [${i.status ?? '-'}] ${i.content?.title ?? ''}`)
	}
	console.log(`\n${rows.length} item(s)${statusFilter ? ` in "${statusFilter}"` : ''}.`)
}

function parseIssue(raw) {
	const n = Number(String(raw ?? '').replace(/^#/, ''))
	if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid issue number: ${raw}`)
	return n
}

function main() {
	const [cmd, a, b] = process.argv.slice(2)
	switch (cmd) {
		case 'show':
			return cmdShow(parseIssue(a))
		case 'status':
			return cmdStatus(parseIssue(a), b)
		case 'comment':
			return cmdComment(parseIssue(a), b)
		case 'list':
			return cmdList(a)
		default:
			console.error('Usage: board.mjs <show|status|comment|list> ...')
			process.exit(1)
	}
}

try {
	main()
} catch (error) {
	console.error('Error: ' + (error instanceof Error ? error.message : String(error)))
	process.exit(1)
}
