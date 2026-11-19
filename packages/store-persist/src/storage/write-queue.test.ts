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

describe('@ez-kit/store-persist createWriteQueue', () => {
	it('starts a fresh drain for an enqueue between the last ACK and Promise reactions', async () => {
		const writer = deferredWriter()
		const queue = createWriteQueue(writer.write)
		const first = queue.enqueue('first')
		let second: Promise<void> | undefined
		writer.flushNext()
		queueMicrotask(() => {
			second = queue.enqueue('second')
		})
		await first
		expect(writer.calls).toEqual(['first', 'second'])
		let acknowledged = false
		void second?.then(() => {
			acknowledged = true
		})
		await Promise.resolve()
		expect(acknowledged).toBe(false)
		writer.flushNext()
		await second
		expect(acknowledged).toBe(true)
	})

	it('owns the drain before a writer synchronously enqueues a successor', async () => {
		const calls: string[] = []
		let successor: Promise<void> | undefined
		const queue = createWriteQueue((value: string) => {
			calls.push(value)
			if (value === 'first') successor = queue.enqueue('second')
			return Promise.resolve()
		})
		await queue.enqueue('first')
		await successor
		expect(calls).toEqual(['first', 'second'])
	})

	it('rejects the whole failed batch and never acknowledges its unsent successor', async () => {
		let rejectFirst!: (error: Error) => void
		const failure = new Error('transport failed')
		const calls: string[] = []
		const queue = createWriteQueue((value: string) => {
			calls.push(value)
			return value === 'first'
				? new Promise<void>((_, reject) => {
						rejectFirst = reject
					})
				: Promise.resolve()
		})
		const first = queue.enqueue('first')
		const second = queue.enqueue('second')
		const outcome = Promise.allSettled([first, second])
		rejectFirst(failure)
		expect(await outcome).toEqual([
			{ status: 'rejected', reason: failure },
			{ status: 'rejected', reason: failure },
		])
		await queue.enqueue('retry')
		expect(calls).toEqual(['first', 'retry'])
	})

	it('turns a synchronous writer failure into a rejected enqueue and permits retry', async () => {
		const queue = createWriteQueue((value: number) => {
			if (value === 1) throw new Error('synchronous transport failure')
			return Promise.resolve()
		})
		await expect(queue.enqueue(1)).rejects.toThrow('synchronous transport failure')
		await expect(queue.enqueue(2)).resolves.toBeUndefined()
	})

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
