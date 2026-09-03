import { fetchRows } from './server'

export function useData() {
	return fetchRows()
}
