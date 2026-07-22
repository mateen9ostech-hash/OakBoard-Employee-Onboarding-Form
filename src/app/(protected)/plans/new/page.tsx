import type { Metadata } from 'next'
import WorkspaceClient from '@/components/workspace-client'

export const metadata: Metadata = {
  title: 'Create an Onboarding Plan',
}

export default function NewPlanPage() {
  return <WorkspaceClient initialView="new" />
}
