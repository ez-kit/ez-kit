import { DataGridTypeProvider } from 'shared/DataGrid'

export default function Layout({ children }: { children: React.ReactNode }) {
	return <DataGridTypeProvider type='shadcn'>{children}</DataGridTypeProvider>
}
