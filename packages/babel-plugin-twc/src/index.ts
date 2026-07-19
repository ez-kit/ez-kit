import type { NodePath, PluginObj } from '@babel/core'
import type * as BabelTypes from '@babel/types'

/** The package the `twc` binding must come from for a call to be rewritten. */
const PACKAGE_NAME = '@ez-kit/twc'
/** The export name to resolve — respecting `import { twc as x }` aliases. */
const EXPORT_NAME = 'twc'

/**
 * Argument counts of a call that has **no** name argument yet:
 * `twc.button(config)` and `twc(Component, config)`.
 */
const INTRINSIC_ARGS_WITHOUT_NAME = 1
const WRAPPED_ARGS_WITHOUT_NAME = 2

/** Variable kinds whose declarator name may be lifted into the call. */
const NAMED_DECLARATION_KINDS: readonly string[] = ['const', 'let']

type BabelApi = { types: typeof BabelTypes }

/**
 * Is `name` bound by `import { twc } from '@ez-kit/twc'` (under any local alias)
 * in the scope of `path`? A local variable called `twc` is deliberately not.
 */
function isTwcBinding(path: NodePath, name: string, t: typeof BabelTypes): boolean {
	const binding = path.scope.getBinding(name)
	if (!binding?.path.isImportSpecifier()) {
		return false
	}

	const declaration = binding.path.parentPath
	if (!declaration.isImportDeclaration() || declaration.node.source.value !== PACKAGE_NAME) {
		return false
	}

	const { imported } = binding.path.node
	return t.isIdentifier(imported) ? imported.name === EXPORT_NAME : imported.value === EXPORT_NAME
}

/**
 * How many arguments this call carries when it has no name yet — or `null` when
 * the callee is not a `twc` call at all.
 *
 * - `twc.button(config)` → member call on the binding.
 * - `twc(Component, config)` → direct call of the binding.
 */
function argsCountWithoutName(path: NodePath<BabelTypes.CallExpression>, t: typeof BabelTypes): number | null {
	const { callee } = path.node

	if (t.isMemberExpression(callee) && !callee.computed && t.isIdentifier(callee.object)) {
		return isTwcBinding(path, callee.object.name, t) ? INTRINSIC_ARGS_WITHOUT_NAME : null
	}

	if (t.isIdentifier(callee)) {
		return isTwcBinding(path, callee.name, t) ? WRAPPED_ARGS_WITHOUT_NAME : null
	}

	return null
}

/**
 * Fills the optional component-name argument of `@ez-kit/twc` calls from the
 * variable they are assigned to:
 *
 * ```js
 * const Button = twc.button({ base: 'px-4' })
 * // → const Button = twc.button({ base: 'px-4' }, 'Button')
 * ```
 *
 * Idempotent: a call that already carries a name argument is left untouched.
 */
export default function babelPluginTwc({ types: t }: BabelApi): PluginObj {
	return {
		name: 'ez-kit-twc',
		visitor: {
			VariableDeclarator(path) {
				const { id, init } = path.node
				if (!t.isIdentifier(id) || !t.isCallExpression(init)) {
					return
				}

				const declaration = path.parentPath
				if (!declaration.isVariableDeclaration() || !NAMED_DECLARATION_KINDS.includes(declaration.node.kind)) {
					return
				}

				const callPath = path.get('init')
				if (!callPath.isCallExpression()) {
					return
				}

				// Any extra argument means the name is already there (or the call is
				// shaped in a way this plugin does not understand) — leave it alone.
				const expectedArgs = argsCountWithoutName(callPath, t)
				if (expectedArgs === null || init.arguments.length !== expectedArgs) {
					return
				}

				init.arguments.push(t.stringLiteral(id.name))
			},
		},
	}
}
