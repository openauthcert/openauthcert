import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'OpenAuthCert',
  description: 'Open Authentication Certification Initiative',
  themeConfig: {
    nav: [
      { text: 'Docs', link: '/guide/overview' },
      { text: 'Registry', link: '/registry/index' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Governance',
          items: [
            { text: 'Overview', link: '/guide/overview' },
            { text: 'Lifecycle', link: '/guide/lifecycle' }
          ]
        }
      ],
      '/registry/': [
        {
          text: 'Badge Registry',
          items: [
            { text: 'Badges', link: '/registry/index' }
          ]
        }
      ]
    }
  }
})
