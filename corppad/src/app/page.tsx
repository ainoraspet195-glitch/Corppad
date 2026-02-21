import { redirect } from 'next/navigation'

// Root always redirects: /app auth guard will send to /login if not authenticated
export default function RootPage() {
  redirect('/app')
}
