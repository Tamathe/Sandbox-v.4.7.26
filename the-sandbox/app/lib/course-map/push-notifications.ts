// ── Push Notifications for Course Map ────────────────────────────────────────
// Handles browser push notification permission, subscription, and display.

export type CourseMapNotificationType =
  | 'collaboration_join'
  | 'node_updated'
  | 'snapshot_created'
  | 'comment_added'

interface PushSubscribePayload {
  courseId: string
  subscription: PushSubscriptionJSON
  notificationTypes: CourseMapNotificationType[]
}

/** Request Notification API permission from the user */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

/** Subscribe to push notifications for a course map */
export async function subscribeToPush(
  courseId: string,
  userEmail: string,
  types: CourseMapNotificationType[] = ['collaboration_join', 'node_updated', 'snapshot_created', 'comment_added']
): Promise<boolean> {
  try {
    const permission = await requestPushPermission()
    if (permission !== 'granted') return false

    if (!('serviceWorker' in navigator)) return false

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // In a real deployment, VAPID public key would come from the server
      // For now, we create a subscription if the push manager supports it
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: getVapidPublicKey(),
        })
      } catch {
        // Push manager not supported or VAPID key issue — use local notifications
        savePushPreference(courseId, types)
        return true
      }
    }

    const payload: PushSubscribePayload = {
      courseId,
      subscription: subscription.toJSON(),
      notificationTypes: types,
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': userEmail,
      },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      savePushPreference(courseId, types)
      return true
    }

    // API not available yet — save preference locally for future use
    savePushPreference(courseId, types)
    return true
  } catch {
    // Gracefully degrade — save preference locally
    savePushPreference(courseId, types)
    return true
  }
}

/** Unsubscribe from push notifications for a course map */
export async function unsubscribeFromPush(courseId: string, userEmail: string): Promise<boolean> {
  try {
    removePushPreference(courseId)

    const res = await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': userEmail,
      },
      body: JSON.stringify({ courseId }),
    })

    return res.ok
  } catch {
    // Preference already removed locally
    return true
  }
}

/** Check if push notifications are enabled for a course */
export function isPushEnabled(courseId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const prefs = JSON.parse(localStorage.getItem('course-map-push-prefs') || '{}')
    return !!prefs[courseId]
  } catch {
    return false
  }
}

/** Get notification types enabled for a course */
export function getPushTypes(courseId: string): CourseMapNotificationType[] {
  if (typeof window === 'undefined') return []
  try {
    const prefs = JSON.parse(localStorage.getItem('course-map-push-prefs') || '{}')
    return prefs[courseId] || []
  } catch {
    return []
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function savePushPreference(courseId: string, types: CourseMapNotificationType[]): void {
  try {
    const prefs = JSON.parse(localStorage.getItem('course-map-push-prefs') || '{}')
    prefs[courseId] = types
    localStorage.setItem('course-map-push-prefs', JSON.stringify(prefs))
  } catch {
    // Storage full or unavailable
  }
}

function removePushPreference(courseId: string): void {
  try {
    const prefs = JSON.parse(localStorage.getItem('course-map-push-prefs') || '{}')
    delete prefs[courseId]
    localStorage.setItem('course-map-push-prefs', JSON.stringify(prefs))
  } catch {
    // Storage full or unavailable
  }
}

function getVapidPublicKey(): BufferSource | string | null {
  // In production, this would be fetched from the server or set as an env var
  // For now, return null to let the push manager use defaults
  return null
}
