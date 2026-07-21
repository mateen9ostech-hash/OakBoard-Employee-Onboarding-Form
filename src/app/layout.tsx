import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { VividRegistry } from '@/components/vivid'
import '@fontsource-variable/raleway'
import '@fontsource-variable/raleway/wght-italic.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'OakBoard',
  description: 'Employee onboarding plan builder for Oak Street Technologies.',
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
