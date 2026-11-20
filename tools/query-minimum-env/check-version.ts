import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

type Manifest = { version: string; devDependencies: Record<string, string>; peerDependencies: Record<string, string> }
const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as Manifest
const minimum = read('./package.json').devDependencies['@tanstack/react-query']
assert.ok(minimum)
assert.equal(read('./node_modules/@tanstack/react-query/package.json').version, minimum)
for (const name of ['query', 'qc']) {
	assert.equal(
		read(`../../packages/${name}/react/package.json`).peerDependencies['@tanstack/react-query'],
		`^${minimum}`,
	)
}
