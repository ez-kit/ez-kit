/**
 * A network-free stand-in for an API, so every state of the gate can be reproduced on demand:
 * each call waits `delay` milliseconds and then resolves, or rejects when `fail` is set.
 */
export type FakeRequest = {
	delay?: number
	fail?: boolean
}

export type Device = {
	id: number
	name: string
	online: boolean
}

export type Stats = {
	online: number
	total: number
	checkedAt: string
}

const DEFAULT_DELAY = 800

const DEVICES: Device[] = [
	{ id: 1, name: 'Gateway', online: true },
	{ id: 2, name: 'Thermostat', online: true },
	{ id: 3, name: 'Door sensor', online: false },
]

function respond<T>(value: () => T, { delay = DEFAULT_DELAY, fail = false }: FakeRequest): Promise<T> {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (fail) reject(new Error('The server answered 503 Service Unavailable'))
			else resolve(value())
		}, delay)
	})
}

export function fetchDevices(request: FakeRequest = {}): Promise<Device[]> {
	return respond(() => DEVICES, request)
}

export function fetchStats(request: FakeRequest = {}): Promise<Stats> {
	return respond(
		() => ({
			online: DEVICES.filter((d) => d.online).length,
			total: DEVICES.length,
			checkedAt: new Date().toLocaleTimeString(),
		}),
		request,
	)
}
