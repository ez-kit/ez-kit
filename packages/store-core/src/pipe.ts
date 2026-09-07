/**
 * A `with*` wrapper in its applied form: takes the store it is given, attaches its capability, and
 * returns the same instance widened by whatever surface that capability adds. Every wrapper is
 * curried — `withHistory({ limit: 20 })` builds the enhancer, applying it does the work — so the
 * options literal is checked against the state type the chain has accumulated so far.
 */
export type StoreEnhancer<In extends object, Out extends object> = (target: In) => Out

/**
 * Applies store enhancers left to right: `pipe(base, a, b)` is `b(a(base))`, written in the order
 * the capabilities attach. That order is load-bearing — `createContextStore`'s Provider runs each
 * capability's `setup` in attachment order — so reading the chain top to bottom now reads it in
 * setup order too, instead of inside out.
 *
 * Overloads carry the accumulated type through each step. The last one ends in a rest parameter, so a
 * chain longer than six still type-checks — every step past the sixth has to keep the type the sixth
 * produced, which is what a capability wrapper does anyway when it only attaches behaviour.
 */
export function pipe<A extends object>(base: A): A
export function pipe<A extends object, B extends object>(base: A, ab: StoreEnhancer<A, B>): B
export function pipe<A extends object, B extends object, C extends object>(
	base: A,
	ab: StoreEnhancer<A, B>,
	bc: StoreEnhancer<B, C>,
): C
export function pipe<A extends object, B extends object, C extends object, D extends object>(
	base: A,
	ab: StoreEnhancer<A, B>,
	bc: StoreEnhancer<B, C>,
	cd: StoreEnhancer<C, D>,
): D
export function pipe<A extends object, B extends object, C extends object, D extends object, E extends object>(
	base: A,
	ab: StoreEnhancer<A, B>,
	bc: StoreEnhancer<B, C>,
	cd: StoreEnhancer<C, D>,
	de: StoreEnhancer<D, E>,
): E
export function pipe<
	A extends object,
	B extends object,
	C extends object,
	D extends object,
	E extends object,
	F extends object,
>(
	base: A,
	ab: StoreEnhancer<A, B>,
	bc: StoreEnhancer<B, C>,
	cd: StoreEnhancer<C, D>,
	de: StoreEnhancer<D, E>,
	ef: StoreEnhancer<E, F>,
	...rest: StoreEnhancer<F, F>[]
): F
export function pipe(base: object, ...enhancers: StoreEnhancer<object, object>[]): object {
	return enhancers.reduce<object>((target, enhance) => enhance(target), base)
}
