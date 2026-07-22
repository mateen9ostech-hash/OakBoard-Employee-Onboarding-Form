import type { Metadata } from 'next'
import WorkspaceClient from '@/components/workspace-client'
import { getArchivedPlans } from '@/lib/plans/server'

export const metadata: Metadata = {
  title: 'Archived Onboarding Plans',
}

export default async function ArchivedPlansPage() {
  const archivedPlans = await getArchivedPlans()
  return <WorkspaceClient initialArchivedPlans={archivedPlans} initialView="archived" />
}
