import type { MetadataRoute } from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oak-board-employee-onboarding-form.vercel.app').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: siteUrl, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${siteUrl}/help`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/privacy-policy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/terms-of-service`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
