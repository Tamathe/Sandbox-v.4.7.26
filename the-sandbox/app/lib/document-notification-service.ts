/**
 * Document upload notifications.
 *
 * When a document is uploaded with department or all_staff visibility,
 * notify relevant users so they know new content is available.
 */

import { prisma } from './prisma'
import { createNotification } from './notifications'

export async function notifyOnDocumentUpload(
  uploaderId: string,
  title: string,
  visibility: string,
  department?: string,
): Promise<void> {
  // Private docs → no notifications
  if (visibility === 'private' || (!visibility)) return

  try {
    const uploader = await prisma.user.findUnique({
      where: { id: uploaderId },
      select: { name: true },
    })
    const uploaderName = uploader?.name ?? 'Someone'

    let targetUsers: { id: string }[] = []

    if (visibility === 'department' && department) {
      targetUsers = await prisma.user.findMany({
        where: { department, id: { not: uploaderId } },
        select: { id: true },
      })
    } else if (visibility === 'all_staff') {
      targetUsers = await prisma.user.findMany({
        where: {
          role: { in: ['STAFF', 'ADMIN'] },
          id: { not: uploaderId },
        },
        select: { id: true },
      })
    }

    if (targetUsers.length === 0) return

    await Promise.allSettled(
      targetUsers.map((user) =>
        createNotification({
          userId: user.id,
          type: 'DOCUMENT_SHARED',
          title: `New document from ${uploaderName}`,
          body: `"${title}" was shared with ${visibility === 'department' ? 'your department' : 'all staff'}`,
          href: `/documents?search=${encodeURIComponent(title)}`,
        }),
      ),
    )
  } catch (err) {
    console.error('[DocumentNotifications] Failed to send notifications:', err)
  }
}
