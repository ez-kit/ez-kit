/**
 * RESERVED seam (separate change). Reserves the shape of a manager-agnostic persist adapter so the
 * `./persist` subpath exists without committing a runtime implementation yet. No runtime code.
 */
export type InstanceAdapter<T> = {
	observe(instance: T, onChange: () => void): () => void
	read(instance: T, path: readonly string[]): unknown
	write(instance: T, path: readonly string[], value: unknown): void
}
