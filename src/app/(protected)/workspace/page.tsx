import type { Metadata } from 'next'
import WorkspaceClient from '@/components/workspace-client'

export const metadata: Metadata = {
  title: 'Your Onboarding Workspace',
}

export default function WorkspacePage() {
  return <WorkspaceClient initialView="workspace" />
}
