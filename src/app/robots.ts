import type { MetadataRoute } from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oak-board-employee-onboarding-form.vercel.app').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/help', '/privacy-policy', '/terms-of-service'],
      disallow: ['/auth/', '/plans/', '/sign-in', '/workspace'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
