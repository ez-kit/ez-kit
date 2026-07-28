import { describe, expect, it } from 'vitest'

import { createWriteQueue } from './write-queue'

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** A write function whose individual writes resolve only when `flushNext()` is called. */
function deferredWriter() {
	const calls: string[] = []
	const resolvers: (() => void)[] = []
	const write = (value: string): Promise<void> => {
		calls.push(value)
		return new Promise<void>((resolve) => {
			resolvers.push(resolve)
		})
	}
	const flushNext = (): void => {
		resolvers.shift()?.()
	}
	return { write, calls, flushNext }
}

describe('@ez-kit/va-store persist createWriteQueue', () => {
	it('serializes writes and drops superseded queued values (last-write-wins)', async () => {
		const writer = deferredWriter()
		const queue = createWriteQueue(writer.write)

		void queue.enqueue('v1') // starts immediately
		void queue.enqueue('v2') // queued behind v1…
		void queue.enqueue('v3') // …then superseded by v3 before it runs

		// Only the in-flight write has started; v2/v3 are still pending.
		expect(writer.calls).toEqual(['v1'])

		writer.flushNext() // resolve write(v1)
		await tick()

		// The queue drained to the latest value, skipping the superseded v2 entirely.
		expect(writer.calls).toEqual(['v1', 'v3'])
	})

	it('resolves every enqueue promise once the queue drains', async () => {
		const writer = deferredWriter()
		const queue = createWriteQueue(writer.write)

		const first = queue.enqueue('a')
		const second = queue.enqueue('b')
		writer.flushNext() // a
		await tick()
		writer.flushNext() // b
		await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined])
	})

	it('recovers after a failing write so later writes still run', async () => {
		const calls: string[] = []
		let failNext = true
		const queue = createWriteQueue((value: string) => {
			calls.push(value)
			if (failNext) {
				failNext = false
				return Promise.reject(new Error('write failed'))
			}
			return Promise.resolve()
		})

		await expect(queue.enqueue('x')).rejects.toThrow('write failed')
		await expect(queue.enqueue('y')).resolves.toBeUndefined()
		expect(calls).toEqual(['x', 'y'])
	})
})
