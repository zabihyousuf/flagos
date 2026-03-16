export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  modules: [
    '@nuxtjs/supabase',
    'shadcn-nuxt',
  ],
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
  runtimeConfig: {
    supabase: {
      serviceKey: process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    },
    public: {
      engineUrl: process.env.NUXT_PUBLIC_ENGINE_URL ?? '',
      /** When true, sidebar shows items and section headers marked devOnly. When false, only production items are shown and sections with no production items are hidden. Omit to default to dev mode in development. */
      showDevSidebarItems: process.env.NUXT_PUBLIC_SHOW_DEV_SIDEBAR_ITEMS as string | undefined,
      /** When true, Settings > Billing shows "Activate Pro (dev only)". Only enabled in non-production (NODE_ENV !== 'production'). */
      showDevProOverride: process.env.NODE_ENV !== 'production',
    },
  },
  supabase: {
    redirect: false,
  },
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],
  shadcn: {
    prefix: '',
    componentDir: './components/ui',
  },
  app: {
    head: {
      title: 'FlagLab',
      meta: [
        { name: 'description', content: 'Design flag football plays, build playbooks, manage your roster, and simulate plays — all in one platform.' },
        { property: 'og:title', content: 'FlagLab' },
        { property: 'og:description', content: 'Your one platform for all things flag football.' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/android-chrome-512x512.png' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/android-chrome-192x192.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/android-chrome-512x512.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },
  nitro: {
    preset: 'vercel',
  },
})
