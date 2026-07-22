import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { VividRegistry } from '@/components/vivid'
import '@fontsource-variable/raleway'
import '@fontsource-variable/raleway/wght-italic.css'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ostonboarding.vercel.app'),
  title: {
    default: 'OakBoard - Employee Onboarding Plan Builder',
    template: '%s | OakBoard',
  },
  description: 'Employee onboarding plan builder for Oak Street Technologies.',
  openGraph: {
    title: 'OakBoard - Employee Onboarding Plan Builder',
    description: 'Create, manage, export, and share structured employee onboarding plans.',
    siteName: 'OakBoard',
    type: 'website',
  },
  icons: {
    icon: {
      url: '/oakboard-logo.svg',
      type: 'image/svg+xml',
    },
  },
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className="vvd-root" lang="en">
      <body>
        <VividRegistry />
        {children}
      </body>
    </html>
  )
}
