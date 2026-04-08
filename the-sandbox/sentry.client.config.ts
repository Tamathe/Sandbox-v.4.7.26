import * as Sentry from '@sentry/nextjs'

// PERF-AUDIT: Core Sentry.init() runs synchronously so hydration errors are
// captured immediately. Heavy integrations (replayIntegration, browserTracingIntegration)
// are deferred via requestIdleCallback to avoid ~50ms of synchronous work on
// every page load. They are added after the browser is idle via addIntegration().
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay — capture 1% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  // Strip PII from breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
      // Don't send request body (may contain student data)
      if (breadcrumb.data) {
        delete breadcrumb.data.request_body
      }
    }
    return breadcrumb
  },
})

// Defer heavy integrations until the browser is idle
if (typeof window !== 'undefined') {
  const addHeavyIntegrations = () => {
    Sentry.addIntegration(Sentry.replayIntegration())
    Sentry.addIntegration(Sentry.browserTracingIntegration())
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(addHeavyIntegrations)
  } else {
    setTimeout(addHeavyIntegrations, 0)
  }
}
