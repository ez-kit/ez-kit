export type Device = { id: number; name: string; favorite: boolean }

export class ValidationError extends Error {
	constructor(public readonly fieldErrors: { name: string }) {
		super('Please check the device name.')
	}
}

export const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 650))

/** A separate simulated server per mounted example; no external API or shared mutable data. */
export function createDemoApi() {
	let devices: Device[] = [
		{ id: 1, name: 'Weather station', favorite: false },
		{ id: 2, name: 'Desk sensor', favorite: true },
	]
	let nextId = 3
	return {
		async list(signal?: AbortSignal): Promise<Device[]> {
			await wait()
			signal?.throwIfAborted()
			return devices.map((device) => ({ ...device }))
		},
		create: async (name: string): Promise<Device> => {
			await wait()
			const trimmed = name.trim()
			if (trimmed.length < 3) throw new ValidationError({ name: 'Use at least 3 characters.' })
			if (devices.some((device) => device.name.toLowerCase() === trimmed.toLowerCase())) {
				throw new ValidationError({ name: 'This device name is already taken.' })
			}
			const device = { id: nextId++, name: trimmed, favorite: false }
			devices = [...devices, device]
			return { ...device }
		},
		setFavorite: async ({ id, favorite, fail }: { id: number; favorite: boolean; fail: boolean }): Promise<void> => {
			await wait()
			if (fail) throw new Error('The server rejected the change. The previous list has been restored.')
			devices = devices.map((device) => (device.id === id ? { ...device, favorite } : device))
		},
	}
}
