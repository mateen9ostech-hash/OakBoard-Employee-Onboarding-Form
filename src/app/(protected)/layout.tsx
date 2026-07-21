import type { ReactNode } from 'react'
import { requireFreshSession } from '@/lib/auth/server'

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireFreshSession()
  return children
}
