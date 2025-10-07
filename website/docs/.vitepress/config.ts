import { defineConfig, type HeadConfig } from 'vitepress'

const siteUrl = 'https://openauthcert.org'
const siteTitle = 'OpenAuthCert'
const siteDescription = 'An open, vendor-neutral registry of authentication interoperability badges.'

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: siteTitle,
      url: siteUrl,
      sameAs: [
        'https://github.com/openauthcert/openauthcert'
      ]
    },
    {
      '@type': 'WebSite',
      name: siteTitle,
      url: siteUrl,
      description: siteDescription
    }
  ]
}

const head: HeadConfig[] = [
  ['meta', { property: 'og:title', content: siteTitle }],
  ['meta', { property: 'og:description', content: siteDescription }],
  ['meta', { property: 'og:type', content: 'website' }],
  ['meta', { property: 'og:url', content: siteUrl }],
  ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ['link', { rel: 'canonical', href: siteUrl }],
  ['script', { type: 'application/ld+json' }, JSON.stringify(jsonLd)]
]

export default defineConfig({
  lang: 'en-US',
  title: siteTitle,
  description: siteDescription,
  head,
  themeConfig: {
    logo: '/favicon.ico',
    nav: [
      { text: 'Overview', link: '/' },
      { text: 'Registry', link: '/registry' },
      { text: 'Verify', link: '/verify' },
      { text: 'Spec', link: '/spec' }
    ],
    sidebar: {
      '/': [
        {
          text: 'Program Overview',
          items: [
            { text: 'Mission & Landing', link: '/' },
            { text: 'Governance', link: '/governance' },
            { text: 'Trust Model', link: '/trust' }
          ]
        },
        {
          text: 'Build & Maintain Badges',
          items: [
            { text: 'Badge Registry', link: '/registry' },
            { text: 'Verify a Badge', link: '/verify' },
            { text: 'Badge Specification', link: '/spec' },
            { text: 'Apply for Certification', link: '/apply' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/openauthcert/openauthcert' }
    ]
  },
  sitemap: {
    hostname: siteUrl
  },
  ignoreDeadLinks: [/^\/public_key\.pem$/],
  // Placeholder: analytics instrumentation can hook into this lifecycle.
  transformHead: (ctx) => ctx.head
})
