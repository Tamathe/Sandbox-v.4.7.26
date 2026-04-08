import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Strip PII before sending to Sentry
  beforeSend(event) {
    // Remove user email from events (FERPA compliance)
    if (event.user) {
      delete event.user.email
      delete event.user.username
    }
    return event
  },
})
