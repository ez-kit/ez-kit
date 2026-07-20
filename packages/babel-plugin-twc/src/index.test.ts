import { transformSync } from '@babel/core'
import { describe, expect, it } from 'vitest'

import babelPluginTwc from './index'

function transform(code: string): string {
	const result = transformSync(code, {
		configFile: false,
		babelrc: false,
		plugins: [babelPluginTwc],
		parserOpts: { plugins: ['jsx'] },
	})

	if (!result?.code) {
		throw new Error('Babel produced no output')
	}

	return result.code
}

const IMPORT = "import { twc } from '@ez-kit/twc';"

describe('name injection', () => {
	it('appends the variable name to an intrinsic call', () => {
		expect(transform(`${IMPORT}\nconst Button = twc.button({ base: 'px-4' });`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			const Button = twc.button({
			  base: 'px-4'
			}, "Button");"
		`)
	})

	it('appends the variable name to a wrapped-component call', () => {
		expect(transform(`${IMPORT}\nconst Link = twc(BaseLink, { base: 'underline' });`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			const Link = twc(BaseLink, {
			  base: 'underline'
			}, "Link");"
		`)
	})

	it('handles a let declaration', () => {
		expect(transform(`${IMPORT}\nlet Button = twc.button({});`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			let Button = twc.button({}, "Button");"
		`)
	})

	it('handles an exported declaration', () => {
		expect(transform(`${IMPORT}\nexport const Button = twc.button({});`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			export const Button = twc.button({}, "Button");"
		`)
	})

	it('resolves an aliased import', () => {
		expect(transform("import { twc as x } from '@ez-kit/twc';\nconst Button = x.button({ base: 'px-4' });"))
			.toMatchInlineSnapshot(`
			"import { twc as x } from '@ez-kit/twc';
			const Button = x.button({
			  base: 'px-4'
			}, "Button");"
		`)
	})

	it('transforms every declarator of a multi-declarator statement', () => {
		expect(transform(`${IMPORT}\nconst Button = twc.button({}), Card = twc.div({});`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			const Button = twc.button({}, "Button"),
			  Card = twc.div({}, "Card");"
		`)
	})
})

describe('idempotency', () => {
	it('leaves a hand-written name untouched', () => {
		expect(transform(`${IMPORT}\nconst Button = twc.button({ base: 'px-4' }, 'Custom');`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			const Button = twc.button({
			  base: 'px-4'
			}, 'Custom');"
		`)
	})

	it('leaves a hand-written name on a wrapped call untouched', () => {
		expect(transform(`${IMPORT}\nconst Link = twc(BaseLink, {}, 'Custom');`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			const Link = twc(BaseLink, {}, 'Custom');"
		`)
	})

	it('produces the same output when run twice', () => {
		const once = transform(`${IMPORT}\nconst Button = twc.button({ base: 'px-4' });`)

		expect(transform(once)).toBe(once)
	})
})

describe('calls it must not touch', () => {
	it('ignores a twc that is not imported from @ez-kit/twc', () => {
		expect(transform("import { twc } from 'other-lib';\nconst Button = twc.button({ base: 'px-4' });"))
			.toMatchInlineSnapshot(`
			"import { twc } from 'other-lib';
			const Button = twc.button({
			  base: 'px-4'
			});"
		`)
	})

	it('ignores a locally declared twc', () => {
		expect(transform('const twc = makeTwc();\nconst Button = twc.button({});')).toMatchInlineSnapshot(`
			"const twc = makeTwc();
			const Button = twc.button({});"
		`)
	})

	it('ignores a default export', () => {
		expect(transform(`${IMPORT}\nexport default twc.div({ base: 'px-4' });`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			export default twc.div({
			  base: 'px-4'
			});"
		`)
	})

	it('ignores a call used directly as a JSX child', () => {
		expect(transform(`${IMPORT}\nconst tree = <Wrapper>{twc.div({})}</Wrapper>;`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			const tree = <Wrapper>{twc.div({})}</Wrapper>;"
		`)
	})

	it('ignores an assignment expression', () => {
		expect(transform(`${IMPORT}\nfoo.bar = twc.div({ base: 'px-4' });`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			foo.bar = twc.div({
			  base: 'px-4'
			});"
		`)
	})

	it('ignores a computed member call', () => {
		expect(transform(`${IMPORT}\nconst Button = twc['button']({});`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			const Button = twc['button']({});"
		`)
	})

	it('ignores an intrinsic call whose second argument is not a name literal', () => {
		expect(transform(`${IMPORT}\nconst Button = twc.button({}, componentName);`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			const Button = twc.button({}, componentName);"
		`)
	})

	it('ignores a call whose arguments are spread', () => {
		expect(transform(`${IMPORT}\nconst Button = twc.button(...args);`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			const Button = twc.button(...args);"
		`)
	})

	it('ignores unrelated calls entirely', () => {
		expect(transform(`${IMPORT}\nconst value = compute({ base: 'px-4' });`)).toMatchInlineSnapshot(`
			"import { twc } from '@ez-kit/twc';
			const value = compute({
			  base: 'px-4'
			});"
		`)
	})
})
