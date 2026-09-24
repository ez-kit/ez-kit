import { expect, test } from '@playwright/test'

/**
 * The docs serve every page as markdown too, by two routes that are one feature:
 * `/docs/<slug>.mdx`, and `/docs/<slug>` asked for with `Accept: text/markdown`. Both are
 * published URLs — `llms.txt` points agents at them — and both are decided in `proxy.ts`,
 * which rewrites to `/llms.mdx/docs/<slug>`.
 *
 * They are tested here rather than in a unit test because nothing below the running server
 * can see them: the rewrite is middleware, it runs before routing, and its destination is a
 * route handler. Both answered **404 for every page in the docs** until `proxy.ts` stopped
 * appending `/content.md` to a path no route serves — and that defect was invisible to lint,
 * typecheck, the build and the whole jsdom suite. Only a request finds it, so a request is
 * what guards it.
 */

/** One ordinary page, and one that is a section index — the two slug shapes the route sees. */
const PAGE = '/docs/data-grid/sorting'
const SECTION_INDEX = '/docs/data-grid/selection'

test.describe('a docs page as markdown', () => {
	test('serves the .mdx suffix as markdown', async ({ request }) => {
		const response = await request.get(`${PAGE}.mdx`)

		expect(response.status()).toBe(200)
		expect(response.headers()['content-type']).toContain('text/markdown')
		// The body is the page, not the shell: an HTML response would also be 200.
		expect(await response.text()).toContain(`# Sorting (${PAGE})`)
	})

	test('serves a section index by its own slug, without an /index segment', async ({ request }) => {
		const response = await request.get(`${SECTION_INDEX}.mdx`)

		expect(response.status()).toBe(200)
		expect(response.headers()['content-type']).toContain('text/markdown')
	})

	test('serves markdown to a client that asks for it by header', async ({ request }) => {
		const response = await request.get(PAGE, { headers: { Accept: 'text/markdown' } })

		expect(response.status()).toBe(200)
		expect(response.headers()['content-type']).toContain('text/markdown')
		expect(await response.text()).toContain(`# Sorting (${PAGE})`)
	})

	test('still serves HTML to a browser', async ({ request }) => {
		const response = await request.get(PAGE)

		expect(response.status()).toBe(200)
		expect(response.headers()['content-type']).toContain('text/html')
	})

	/**
	 * The renamed page, end to end. The redirect was added while the suffix route was broken, so
	 * it knowingly pointed one 404 at another; this asserts the whole chain now lands on real
	 * markdown, which is the thing a reader following an old link actually gets.
	 */
	test('redirects the old selection-bar slug and serves the renamed page as markdown', async ({ request }) => {
		const response = await request.get('/docs/data-grid/selection/selection-bar.mdx')

		expect(response.status()).toBe(200)
		expect(response.url()).toContain('/docs/data-grid/selection/action-bar.mdx')
		expect(response.headers()['content-type']).toContain('text/markdown')
	})
})
