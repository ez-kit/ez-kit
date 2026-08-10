import { llms } from 'fumadocs-core/source'

import { getLLMText, source } from './source'

import type { Folder, Node } from 'fumadocs-core/page-tree'

const DOCS_URL_PREFIX = '/docs/'

/**
 * A top-level docs section marked `"root": true` in its `meta.json` — one per documented package.
 * Fumadocs shows only the current root section in the sidebar, so each one needs its own
 * navigation entries and its own scoped llms endpoints.
 */
export type DocsSection = {
	slug: string
	title: string
}

function isFolder(node: Node): node is Folder {
	return node.type === 'folder'
}

function findFirstPageUrl(node: Node): string | undefined {
	if (node.type === 'page') return node.url
	if (!isFolder(node)) return undefined

	for (const child of node.children) {
		const url = findFirstPageUrl(child)
		if (url) return url
	}

	return undefined
}

/** `/docs/data-grid/getting-started` → `data-grid` */
function sectionSlugFromFolder(folder: Folder): string | undefined {
	const url = folder.index?.url ?? findFirstPageUrl(folder)
	if (!url?.startsWith(DOCS_URL_PREFIX)) return undefined

	const [slug] = url.slice(DOCS_URL_PREFIX.length).split('/')

	return slug === '' ? undefined : slug
}

function buildSectionFolders(): Map<string, Folder> {
	const folders = new Map<string, Folder>()

	for (const node of source.pageTree.children) {
		if (!isFolder(node) || node.root !== true) continue

		const slug = sectionSlugFromFolder(node)
		if (slug) folders.set(slug, node)
	}

	return folders
}

const sectionFolders = buildSectionFolders()

export const docsSections: DocsSection[] = [...sectionFolders].map(([slug, folder]) => ({
	slug,
	title: typeof folder.name === 'string' ? folder.name : slug,
}))

/**
 * Fumadocs renders its own heading at the top of a generated index. Routes replace it with a
 * header naming the project or the package, so that the output has a single, meaningful H1.
 */
export function stripLeadingHeading(index: string): string {
	return index.startsWith('# ') ? index.slice(index.indexOf('\n') + 1).trimStart() : index
}

export function getSection(slug: string): DocsSection | undefined {
	return docsSections.find((section) => section.slug === slug)
}

/**
 * `llms.txt`-style index of a single section, or `undefined` when the section does not exist.
 *
 * Each child is rendered separately rather than passing the section folder to `indexNode()`:
 * the folder itself would become a list item wrapping everything one indent level deeper,
 * duplicating the section name that the route already puts in the header.
 */
export function getSectionIndex(slug: string): string | undefined {
	const folder = sectionFolders.get(slug)
	if (!folder) return undefined

	const renderer = llms(source)
	const nodes = folder.index ? [folder.index, ...folder.children] : folder.children

	return nodes.map((node) => renderer.indexNode(node)).join('\n')
}

/** Every page of a single section as one Markdown document. */
export async function getSectionFullText(slug: string): Promise<string | undefined> {
	if (!sectionFolders.has(slug)) return undefined

	const pages = source.getPages().filter((page) => page.slugs[0] === slug)

	return (await Promise.all(pages.map(getLLMText))).join('\n\n')
}
